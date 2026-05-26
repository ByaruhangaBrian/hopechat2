import { GoogleGenerativeAI } from '@google/generative-ai';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

interface MessageContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * Unified function to generate Gemini responses with exponential backoff for 429 errors.
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

  const genAI = new GoogleGenerativeAI(finalApiKey);
  let attempt = 0;

  const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    const dynamicModel = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.3,
      }
    });

    attempt = 0; // Reset attempts for each model
    while (attempt < 2) { // 2 attempts per model to fail fast and try next
      try {
        console.log(`[gemini] Generating response for model: ${modelName} (Attempt ${attempt + 1})`);
        const chat = dynamicModel.startChat({
          history: history,
        });

        const result = await chat.sendMessage(text);
        const response = await result.response;
        const responseText = response.text();

        if (!responseText) {
          throw new Error('Gemini returned an empty response');
        }

        return responseText.trim();
      } catch (error: any) {
        attempt++;
        lastError = error;
        
        console.error(`[gemini] Error with model ${modelName}:`, {
          message: error?.message,
          status: error?.status,
        });

        const isRateLimit = 
          error?.status === 429 || 
          error?.message?.includes('429') || 
          error?.message?.toLowerCase().includes('rate limit');

        if (isRateLimit && attempt < 2) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        // If it's a 404 or other fatal error, break inner loop and try next model
        break;
      }
    }
  }

  console.error('[gemini] All models failed. Last error:', lastError);
  throw lastError || new Error('Gemini generation failed for all attempted models');
}
