import { GoogleGenAI, Type } from '@google/genai';
import { searchSheets } from '@/lib/integrations/google-sheets';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { logAIUsage, type AIUsageAction } from '@/lib/ai-usage';
import { getCreditCost, type CreditAction } from '@/lib/credits';
import { stageTestOffer } from '@/lib/tests/runtime';

const MAX_RETRIES = 3;

const CREDIT_ACTION_BY_AI_ACTION: Record<AIUsageAction, CreditAction> = {
  chat_response: 'ai_chat',
  image_analysis: 'ai_chat',
  voice_transcription: 'ai_chat',
  document_summary: 'ai_chat',
  flow_execution: 'interactive_form',
};

export interface GeminiCallOptions {
  /** Which ai_usage_logs action this call maps to. Defaults to 'chat_response'. */
  action?: AIUsageAction
  /** Extra context stored in ai_usage_logs.metadata (conversation_id, contact_id, ...). */
  metadata?: Record<string, unknown>
  /**
   * Which business tools to make available to the model. Defaults to
   * `['search_business_data']` when a businessId is present (unchanged
   * behavior). Callers that want the AI to offer tests must opt in explicitly.
   */
  tools?: ReadonlyArray<'search_business_data' | 'start_test'>
}

async function getGlobalGeminiKey(): Promise<string> {
  try {
    const { data } = await supabaseAdmin()
      .from('system_settings')
      .select('value')
      .eq('id', 'platform_credentials')
      .maybeSingle();
    return data?.value?.gemini_global_key || '';
  } catch {
    return '';
  }
}
const INITIAL_BACKOFF_MS = 1000;

interface MessageContent {
  role: 'user' | 'model' | 'function';
  parts: { text?: string; functionCall?: any; functionResponse?: any }[];
}

/**
 * Unified function to generate Gemini responses with exponential backoff for 429 errors.
 * Supports tool calling for Google Sheets if businessId is provided.
 */
export async function generateGeminiResponse(
  text: string,
  systemInstruction: string,
  history: MessageContent[] = [],
  apiKey?: string,
  businessId?: string,
  /** Gemini explicit cache reference. When set, systemInstruction is already in the cache. */
  cachedContent?: string,
  options: GeminiCallOptions = {},
): Promise<string> {
  const globalKey = apiKey ? '' : await getGlobalGeminiKey();
  const finalApiKey = apiKey || globalKey || process.env.GEMINI_API_KEY || '';
  if (!finalApiKey) {
    throw new Error('Gemini API key is missing');
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  let attempt = 0;

  // Standardize model to gemini-2.5-flash as requested
  const MODEL_NAME = 'gemini-2.5-flash';

  const action = options.action ?? 'chat_response';
  const startedAt = Date.now();
  let promptTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;

  // Resolve the credit cost up front so it overlaps the network wait.
  const creditCostPromise = businessId
    ? getCreditCost(CREDIT_ACTION_BY_AI_ACTION[action])
    : Promise.resolve(0);

  const recordUsage = async (success: boolean, errorMessage: string | null): Promise<void> => {
    if (!businessId) return;
    await logAIUsage({
      businessId,
      action,
      model: MODEL_NAME,
      inputTokens: promptTokens,
      outputTokens,
      totalTokens: totalTokens || promptTokens + outputTokens,
      latencyMs: Date.now() - startedAt,
      creditsUsed: success ? await creditCostPromise : 0,
      success,
      errorMessage,
      metadata: options.metadata,
    });
  };

  // Load integration config to dynamically adjust tool parameter descriptions
  let toolDescription = 'The search query (e.g., a product name, order ID, or keyword).';
  if (businessId) {
    try {
      const db = supabaseAdmin();
      const { data: integration } = await db
        .from('business_integrations')
        .select('config, is_enabled')
        .eq('business_id', businessId)
        .eq('type', 'google_sheets')
        .maybeSingle();

      if (integration?.is_enabled) {
        const { data: spreadsheets } = await db
          .from('business_spreadsheets')
          .select('name, description, reference_column')
          .eq('business_id', businessId)
          .eq('is_enabled', true)
          .order('name');

        if (spreadsheets && spreadsheets.length > 0) {
          const sheetList = spreadsheets.map(s =>
            `"${s.name}"${s.description ? ` (${s.description})` : ''}`
          ).join(', ');
          toolDescription = `The exact reference value the customer provided (e.g., "1002" or "DEF-1155"). Do NOT include the spreadsheet name, column name, or any extra words — just the value.`;
        } else if ((integration.config as any)?.reference_column) {
          const refCol = (integration.config as any).reference_column.trim();
          toolDescription = `The search query (specifically looking up values matching the '${refCol}' column in the spreadsheet).`;
        }
      }
    } catch (e) {
      console.error('[gemini-client] failed to read dynamic tool config:', e);
    }
  }

  const enabledTools = options.tools ?? (businessId ? ['search_business_data'] : [])
  const declarations: Array<Record<string, unknown>> = []

  if (enabledTools.includes('search_business_data')) {
    declarations.push({
      name: 'search_business_data',
      description: 'Search the business spreadsheet for information like inventory, pricing, or order status.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: toolDescription
          },
          spreadsheet: {
            type: Type.STRING,
            description: 'The name of the spreadsheet to search (e.g., "Products", "Orders"). Optional — if omitted, all spreadsheets are searched.'
          }
        },
        required: ['query']
      }
    })
  }

  if (enabledTools.includes('start_test')) {
    declarations.push({
      name: 'start_test',
      description:
        'Offer one of this business\'s tests (quiz/exam/assessment) to the customer. Call this ONLY when the customer clearly wants to take a test. If the customer did NOT name a specific test, offer the ENTRY screening test — its intro questions ask what they need and route them automatically; do NOT ask which test. It stages the offer for confirmation — it does NOT start anything; the customer must confirm first.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          test_id: {
            type: Type.STRING,
            description: 'The id of the test to offer, taken from the AVAILABLE TESTS list in your instructions.'
          },
          test_title: {
            type: Type.STRING,
            description: 'The exact title of the test, so you can name it in your confirmation question.'
          }
        },
        required: ['test_id']
      }
    })
  }

  const tools: any = declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;

  const contents: MessageContent[] = [
    ...history,
    { role: 'user', parts: [{ text: text }] }
  ];

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`[gemini] Generating response with @google/genai | model: ${MODEL_NAME} (Attempt ${attempt + 1})`);

      let response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          ...(cachedContent
            ? { cachedContent, temperature: 0.3, tools: tools }
            : { systemInstruction, temperature: 0.3, tools: tools }
          ),
        }
      });

      if (response.usageMetadata) {
        promptTokens += response.usageMetadata.promptTokenCount ?? 0;
        outputTokens += response.usageMetadata.candidatesTokenCount ?? 0;
        totalTokens += response.usageMetadata.totalTokenCount ?? 0;
      }

      // Handle function calls if any
      const parts = response.candidates?.[0]?.content?.parts || [];
      const functionCall = parts.find((p: any) => p.functionCall)?.functionCall;

      if (functionCall && businessId) {
        console.log(`[gemini] AI requested tool call: ${functionCall.name}`, functionCall.args);
        
        let result = 'No data found.';
        if (functionCall.name === 'search_business_data') {
          const query = (functionCall.args as any)?.query;
          const spreadsheetName = (functionCall.args as any)?.spreadsheet;
          if (query) {
            result = await searchSheets(businessId, query, spreadsheetName);
          }
        } else if (functionCall.name === 'start_test') {
          if (!businessId) {
            result = 'Tests cannot be offered here. Do not call this tool.';
          } else {
            const testId = String((functionCall.args as any)?.test_id ?? '').trim();
            const contactId = String(options.metadata?.contact_id ?? '').trim();
            const conversationId = String(options.metadata?.conversation_id ?? '').trim();
            if (!testId || !contactId || !conversationId) {
              result = 'Missing context to stage the test offer. Do not call this tool.'
            } else {
              const offer = await stageTestOffer({ businessId, contactId, conversationId, testId });
              if (offer.ok) {
                result = `Offer for "${offer.title}" is staged and waiting; the customer has NOT started yet. Confirm with a short question naming the test — the customer will confirm before it begins.`;
              } else if (offer.reason === 'already_in_test') {
                result = 'The customer is already inside an active test right now. Do not offer another one at this time.';
              } else if (offer.reason === 'already_attempted') {
                result = 'That test is once per phone number and this customer has already finished it. Do not offer it.';
              } else if (offer.reason === 'test_unavailable') {
                result = 'That test id is not active or does not belong to this business. Do not offer it; pick from AVAILABLE TESTS only.';
              } else {
                result = 'The test could not be offered right now. Do not offer it.';
              }
            }
          }
        }

        // Add the model's function call and our response to the conversation
        contents.push({ role: 'model', parts: [{ functionCall }] });
        contents.push({
          role: 'function' as any,
          parts: [{
            functionResponse: {
              name: functionCall.name,
              response: { content: result }
            }
          }]
        } as any);

        // Generate final response with tool results
        response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents,
          config: {
            ...(cachedContent
              ? { cachedContent, temperature: 0.3, tools: tools }
              : { systemInstruction, temperature: 0.3, tools: tools }
            ),
          }
        });
      }

      if (response.usageMetadata) {
        promptTokens += response.usageMetadata.promptTokenCount ?? 0;
        outputTokens += response.usageMetadata.candidatesTokenCount ?? 0;
        totalTokens += response.usageMetadata.totalTokenCount ?? 0;
      }

      const responseText = response.text;

      if (!responseText) {
        throw new Error('Gemini returned an empty response');
      }

      await recordUsage(true, null);
      return responseText.trim();
    } catch (error: any) {
      attempt++;
      
      console.error(`[gemini] Error with model ${MODEL_NAME}:`, {
        message: error?.message,
        status: error?.status,
      });

      const isRateLimit = 
        error?.status === 429 || 
        error?.message?.includes('429') || 
        error?.message?.toLowerCase().includes('rate limit');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(`[gemini] Rate limited. Retrying in ${backoff}ms (Attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      await recordUsage(false, error?.message ?? 'Gemini request failed');
      throw error;
    }
  }

  throw new Error('Gemini generation failed after maximum retries');
}
