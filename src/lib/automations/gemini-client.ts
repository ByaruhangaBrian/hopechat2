import { GoogleGenAI } from '@google/genai';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface MessageContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Unified function to generate Gemini responses with exponential backoff for 429 errors.
 * Uses the new @google/genai SDK as requested.
 */
export async function generateGeminiResponse(
  text: string,
  systemInstruction: string,
  history: MessageContent[] = [],
  apiKey?: string
): Promise<string> {
  const finalApiKey = apiKey || process.env.GEMINI_API_KEY || '';
  if (!finalApiKey) {
    throw new Error('Gemini API key is missing');
  }

  const ai = new GoogleGenAI({ apiKey: finalApiKey });
  let attempt = 0;

  // Standardize model to gemini-2.5-flash as requested
  const MODEL_NAME = 'gemini-2.5-flash';

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`[gemini] Generating response with @google/genai | model: ${MODEL_NAME} (Attempt ${attempt + 1})`);

      // The new SDK syntax: ai.models.generateContent
      // systemInstruction is inside config
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          ...history,
          { role: 'user', parts: [{ text: text }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.3,
        }
      });

      // The new SDK response structure
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
