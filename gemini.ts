
import { GoogleGenAI } from "@google/generative-ai";
import { Axiom } from "./types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "./prompts";

// استخدام النموذج المطلوب من قبل المستخدم
const MODEL_NAME = 'gemini-2.5-flash';

export const getGeminiClient = () => {
  // الأولوية لـ VITE_API_KEY (Vite) ثم API_KEY (Render/Process)
  const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : "");
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing! Ensure VITE_API_KEY is set in your environment.");
  }
  
  return new GoogleGenAI(apiKey as string);
};

export const extractAxioms = async (pdfBase64: string, language: 'en' | 'ar' = 'en'): Promise<Axiom[]> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    
    const prompt = getAxiomExtractionPrompt(language);
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // تنظيف النص المستخرج لضمان الحصول على JSON صالح
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to extract axioms:", e);
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
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // تحويل التاريخ إلى التنسيق المطلوب لـ SDK
    const contents = history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // إضافة الملف والرسالة الحالية
    const currentParts: any[] = [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64
        }
      },
      { text: message }
    ];

    const chatSession = model.startChat({
      history: contents,
      generationConfig: {
        temperature: 0.6,
      },
    });

    const result = await chatSession.sendMessageStream(currentParts);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  } catch (e) {
    console.error("Chat stream error:", e);
    throw e;
  }
}

export const generateConversationTitle = async (firstMessage: string, language: 'en' | 'ar' = 'en'): Promise<string> => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = language === 'ar' 
      ? `لخص جوهر هذه الرسالة في 6 كلمات بالضبط باللغة العربية: "${firstMessage}"`
      : `Summarize the essence of this message in exactly 6 words in English: "${firstMessage}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let title = response.text().trim() || (language === 'ar' ? "محادثة جديدة" : "New Conversation");
    
    const words = title.split(/\s+/);
    if (words.length > 6) {
      title = words.slice(0, 6).join(' ');
    }
    
    return title;
  } catch (e) {
    console.error("Failed to generate title:", e);
    return language === 'ar' ? "محادثة جديدة" : "New Conversation";
  }
};
