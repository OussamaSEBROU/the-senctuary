
import { GoogleGenAI, Type } from "@google/genai";
import { Axiom } from "./types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "./prompts";

const MODEL_NAME = 'gemini-2.5-flash';

export const getGeminiClient = () => {
  // In a production environment like Render, the API key should be in process.env.VITE_API_KEY or similar
  // The original code used process.env.API_KEY
  const apiKey = import.meta.env.VITE_API_KEY || process.env.API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

export const extractAxioms = async (pdfBase64: string, language: 'en' | 'ar' = 'en'): Promise<Axiom[]> => {
  try {
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

    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to extract axioms:", e);
    // Return a fallback or throw to be caught by the UI
    throw e;
  }
};

export async function* chatWithResearchStream(
  pdfBase64: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  language: 'en' | 'ar' = 'en'
) {
  try {
    const ai = getGeminiClient();
    
    const contents = history.map((h) => {
      const parts: any[] = [{ text: h.text }];
      if (h.role === 'user' && pdfBase64) {
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
  } catch (e) {
    console.error("Chat stream error:", e);
    throw e;
  }
}

export const generateConversationTitle = async (firstMessage: string, language: 'en' | 'ar' = 'en'): Promise<string> => {
  try {
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
  } catch (e) {
    console.error("Failed to generate title:", e);
    return language === 'ar' ? "محادثة جديدة في الملاذ المعرفي" : "New Conversation in the Sanctuary";
  }
};
