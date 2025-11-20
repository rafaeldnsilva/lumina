import { GoogleGenAI, Content, Part } from "@google/genai";
import { ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Edits an image based on a text prompt using Gemini 2.5 Flash Image.
 */
export const editRoomImage = async (base64Image: string, prompt: string): Promise<string> => {
  // Clean base64 string if needed
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: `Edit this interior design image. Instruction: ${prompt}. Maintain the structural integrity of the room but apply the requested style or changes strictly. High quality, photorealistic.`,
          },
        ],
      },
      config: {
        // Flash image doesn't support responseMimeType: 'image/jpeg' usually, 
        // but it returns an image in the response parts.
      }
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Chat with the interior design consultant using Gemini 3 Pro Preview.
 * Includes Google Search grounding for shoppable links.
 */
export const chatWithConsultant = async (
  history: ChatMessage[], 
  currentImageBase64: string | null, 
  newMessage: string
): Promise<{ text: string; groundingChunks?: any[] }> => {
  
  try {
    const contents: Content[] = [];

    // Convert history to API format
    // Limit history to last 10 turns to prevent context bloat, though Pro has large context.
    const recentHistory = history.slice(-10);

    recentHistory.forEach(msg => {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }]
      });
    });

    const newParts: Part[] = [{ text: newMessage }];

    // Attach the current image context to the latest user message if available
    if (currentImageBase64) {
        const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        newParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64
            }
        });
        newParts.push({
            text: "\n[System: The above image is the current state of the user's room.]"
        });
    }

    contents.push({
      role: 'user',
      parts: newParts
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: "You are an expert Interior Design Consultant. Your goal is to help users design their dream space. You can see the current state of their room design. Provide helpful advice on layout, colors, and decor. When the user asks for products, use Google Search to find real, shoppable links. Be concise, friendly, and professional.",
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "I couldn't generate a response. Please try again.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    return { text, groundingChunks };

  } catch (error) {
    console.error("Chat error:", error);
    return { text: "Sorry, I encountered an error while connecting to the design consultant." };
  }
};
