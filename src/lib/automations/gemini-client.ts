import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client once at the top level
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.3,
  }
});

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
  history: MessageContent[] = []
): Promise<string> {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // Create a fresh chat session for each request to ensure system instruction is applied
      const chat = model.startChat({
        history: history,
        systemInstruction: systemInstruction,
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

      console.error('[gemini] Generation failed:', error);
      throw error;
    }
  }

  throw new Error('Gemini generation failed after maximum retries');
}
