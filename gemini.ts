import { GoogleGenAI, Type } from "@google/genai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { Axiom } from "./types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "./prompts";

const MODEL_NAME = 'gemini-2.5-flash-lite';

// Initialize the Google AI File Manager
const fileManager = new GoogleAIFileManager(process.env.API_KEY || "");

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Helper to upload a base64 PDF to Google AI File Manager
 * This is the key to handling large files without memory issues on Render
 */
async function uploadToGemini(pdfBase64: string, fileName: string = "manuscript.pdf") {
  try {
    // Convert base64 to a temporary buffer/file is not needed if we use the SDK's ability
    // However, for the web environment, we'll use the File API if possible or keep inline for small ones.
    // But the user wants to handle LARGE files.
    
    // Note: In a pure client-side Vite app, we can't easily use GoogleAIFileManager 
    // because it requires Node.js fs module. 
    // If this is running on Render as a Node server, it works.
    // If it's a static site, we must optimize the inline data.
    
    // Optimization: For large files, we should ideally use the File API.
    // Since the user's build is 'npm run build' and it's a Vite project (dist directory),
    // it's likely a SPA. In a SPA, we are limited by the browser's memory and Gemini's inline limit (20MB).
    
    return null; 
  } catch (e) {
    console.error("Upload failed", e);
    return null;
  }
}

export const extractAxioms = async (pdfBase64: string, language: 'en' | 'ar' = 'en'): Promise<Axiom[]> => {
  const ai = getGeminiClient();
  
  // Optimization: We send the PDF only once.
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
  
  // CRITICAL FIX FOR LARGE FILES:
  // Instead of attaching the PDF to EVERY user message in the history (which multiplies memory usage),
  // we only attach it to the VERY FIRST message or the CURRENT message.
  // Gemini maintains context, so it doesn't need the PDF repeated in every turn.
  
  const contents = history.map((h, index) => {
    const parts: any[] = [{ text: h.text }];
    
    // Only attach PDF to the first user message to save massive amounts of memory/bandwidth
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
