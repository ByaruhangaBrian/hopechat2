import { GoogleGenAI, Type } from '@google/genai';
import { searchSheets } from '@/lib/integrations/google-sheets';

const MAX_RETRIES = 3;
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
  businessId?: string
): Promise<string> {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!finalApiKey) {
    throw new Error('Gemini API key is missing');
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  let attempt = 0;

  // Standardize model to gemini-2.5-flash as requested
  const MODEL_NAME = 'gemini-2.5-flash';

  const tools: any = businessId ? [
    {
      functionDeclarations: [
        {
          name: 'search_business_data',
          description: 'Search the business spreadsheet for information like inventory, pricing, or order status.',
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: 'The search query (e.g., a product name, order ID, or keyword).'
              }
            },
            required: ['query']
          }
        }
      ]
    }
  ] : undefined;

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
          systemInstruction: systemInstruction,
          temperature: 0.3,
          tools: tools,
        }
      });

      // Handle function calls if any
      const parts = response.candidates?.[0]?.content?.parts || [];
      const functionCall = parts.find((p: any) => p.functionCall)?.functionCall;

      if (functionCall && businessId) {
        console.log(`[gemini] AI requested tool call: ${functionCall.name}`, functionCall.args);
        
        let result = 'No data found.';
        if (functionCall.name === 'search_business_data') {
          const query = (functionCall.args as any)?.query;
          if (query) {
            result = await searchSheets(businessId, query);
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
            systemInstruction: systemInstruction,
            temperature: 0.3,
            tools: tools,
          }
        });
      }

      const responseText = response.text;

      if (!responseText) {
        throw new Error('Gemini returned an empty response');
      }

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

      throw error;
    }
  }

  throw new Error('Gemini generation failed after maximum retries');
}
