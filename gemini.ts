import { GoogleGenAI, Type } from "@google/genai";
import { Axiom } from "./types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "./prompts";

const MODEL_NAME = 'gemini-2.5-flash-lite';

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Extracts axioms from the PDF.
 * This is called once when the file is uploaded.
 */
export const extractAxioms = async (pdfBase64: string, language: 'en' | 'ar' = 'en'): Promise<Axiom[]> => {
  const ai = getGeminiClient();
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        },
        {
          text: getAxiomExtractionPrompt(language)
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            axiom: { type: Type.STRING, description: "Scholarly key point or chapter-level title" },
            definition: { type: Type.STRING, description: "Deep academic summary" }
          },
          required: ["axiom", "definition"]
        }
      }
    }
  });

  try {
    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse axioms", e);
    return [];
  }
};

/**
 * Streams the chat response.
 * OPTIMIZATION: We only attach the PDF to the FIRST message in the history.
 * This prevents memory bloat and crashes with large PDFs during long conversations.
 */
export async function* chatWithResearchStream(
  pdfBase64: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  language: 'en' | 'ar' = 'en'
) {
  const ai = getGeminiClient();
  
  const contents = history.map((h, index) => {
    const parts: any[] = [{ text: h.text }];
    
    // CRITICAL FIX: Only attach the PDF to the very first user message.
    // Gemini's context window will remember the PDF content for subsequent turns.
    // This saves massive amounts of memory and prevents Render/Browser crashes.
    if (index === 0 && h.role === 'user' && pdfBase64) {
      parts.unshift({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      });
    }
    
    return {
      role: h.role === 'user' ? 'user' : 'model',
      parts
    };
  });

  const stream = await ai.models.generateContentStream({
    model: MODEL_NAME,
    contents: contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.6,
      thinkingConfig: { thinkingBudget: 8000 }
    }
  });

  for await (const chunk of stream) {
    yield chunk.text || "";
  }
}

export const generateConversationTitle = async (firstMessage: string, language: 'en' | 'ar' = 'en'): Promise<string> => {
  const ai = getGeminiClient();
  const prompt = language === 'ar' 
    ? `لخص جوهر هذه الرسالة في 6 كلمات بالضبط باللغة العربية: "${firstMessage}"`
    : `Summarize the essence of this message in exactly 6 words in English: "${firstMessage}"`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      role: 'user',
      parts: [{ text: prompt }]
    },
    config: {
      temperature: 0.7,
    }
  });

  let title = response.text?.trim() || (language === 'ar' ? "محادثة جديدة في الملاذ المعرفي" : "New Conversation in the Sanctuary");
  
  const words = title.split(/\s+/);
  if (words.length > 6) {
    title = words.slice(0, 6).join(' ');
  }
  
  return title;
};
