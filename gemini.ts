
import { GoogleGenAI, Type } from "@google/genai";
import { Axiom } from "../types";
import { SYSTEM_INSTRUCTION, getAxiomExtractionPrompt } from "../prompts";

// The model version requested: gemini-2.5-flash
const MODEL_NAME = 'gemini-2.5-flash';

// Initialize the GoogleGenAI client with the environment variable API key
export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Extracts 6 axiomatic points from the PDF using the specified model
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
      // Thinking budget is supported in 2.5 series
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

// Chat with the researcher using streaming responses
export async function* chatWithResearchStream(
  pdfBase64: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  language: 'en' | 'ar' = 'en'
) {
  const ai = getGeminiClient();
  
  const contents = history.map((h) => {
    const parts: any[] = [{ text: h.text }];
    // Re-attach PDF data to user messages for multi-turn grounding
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
