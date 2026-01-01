
import { GoogleGenAI, Type } from "@google/genai";
import { Axiom } from "./types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "./prompts";

const MODEL_NAME = 'gemini-2.5-flash';

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * يولد عنواناً جوهرياً للمحادثة يحاكي أسلوب Gemini.
 * الشرط: 7 كلمات بالضبط تلخص روح الحوار.
 */
export const generateEssenceTitle = async (text: string, language: 'en' | 'ar' = 'en'): Promise<string> => {
  const ai = getGeminiClient();
  const prompt = language === 'ar' 
    ? `قم بصياغة عنوان لهذه المحادثة بناءً على النص التالي بحيث يكون "7 كلمات بالضبط". يجب أن يكون العنوان عميقاً وجوهرياً وبأسلوب منصة Gemini. أخرج الـ 7 كلمات فقط وبدون أي مقدمات أو علامات ترقيم: \n\n${text}`
    : `Summarize the essence of this conversation into EXACTLY 7 words. The title must be profound and conceptual in Gemini style. Output ONLY the 7 words: \n\n${text}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 50,
      }
    });
    
    let title = response.text?.trim() || "";
    // تنظيف النص وضمان عدد الكلمات
    title = title.replace(/[#*`_\[\]()]/g, '').replace(/\n/g, ' ').trim();
    const words = title.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length > 7) {
      return words.slice(0, 7).join(' ');
    } else if (words.length > 0) {
      return words.join(' ');
    }
    
    return language === 'ar' ? "تأملات معرفية معمقة في جوهر المخطوطة" : "Deep Knowledge Reflections on the Manuscript";
  } catch (e) {
    return language === 'ar' ? "حوار بحثي في صلب المادة العلمية" : "Research Dialogue in Core Scientific Material";
  }
};

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

export async function* chatWithResearchStream(
  pdfBase64: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  language: 'en' | 'ar' = 'en'
) {
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
}
