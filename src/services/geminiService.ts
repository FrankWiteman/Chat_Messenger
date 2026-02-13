
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore errors
  }
  return '';
};

const apiKey = getApiKey();

let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({ apiKey });
}

export const generateAIResponse = async (_history: {role: 'user' | 'model', text: string}[], userMessage: string): Promise<string> => {
  if (!aiClient) {
    return "BBM AI is offline. Please configure your API key.";
  }

  try {
    const model = 'gemini-2.5-flash';
    
    const chat = aiClient.chats.create({
      model: model,
      config: {
        systemInstruction: "You are BBM AI, a helpful assistant inside the BBM Reborn app. Keep your responses concise, friendly, and helpful. You can use emojis. If asked about the app, mention features like PING and PINs.",
      }
    });
    
    // _history is reserved for future stateful context usage.
    
    const result = await chat.sendMessage({ message: userMessage });
    return result.text || "";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the network right now. Try again later.";
  }
};
