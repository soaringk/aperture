import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import type { Message } from './types';

// Env Config
const ENV_PROVIDER = import.meta.env.VITE_LLM_PROVIDER || 'gemini';
const ENV_API_KEY = import.meta.env.VITE_LLM_API_KEY;
const ENV_BASE_URL = import.meta.env.VITE_LLM_BASE_URL;
const ENV_MODEL = import.meta.env.VITE_LLM_MODEL || 'gemini-1.5-flash';

if (!ENV_API_KEY) {
  console.warn('VITE_LLM_API_KEY is not set. LLM features will fail.');
}

// Interface for Strategy Pattern
interface LLMStrategy {
  chat(
    history: Message[],
    newMessage: string,
    systemPrompt?: string,
    onStream?: (chunk: string) => void
  ): Promise<string>;
}

// --- Strategies ---

class GeminiStrategy implements LLMStrategy {
  private client: any; // GoogleGenAI instance
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.client = new GoogleGenAI({ apiKey: ENV_API_KEY || '' });
  }

  async chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void): Promise<string> {
    const contents = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // System instruction config
    const config = {
      model: this.modelName,
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: 8192 },
    };

    try {
      // Use loose typing or specific known method 'getGenerativeModel'
      const model = this.client.getGenerativeModel(config);
      const chatSession = model.startChat({ history: contents });

      const result = await chatSession.sendMessageStream(newMessage);

      let fullText = '';
      for await (const chunk of result.stream) {
        const text = chunk.text ? chunk.text() : (chunk as any).text || '';
        fullText += text;
        if (onStream) onStream(text);
      }
      return fullText;
    } catch (e) {
      console.error('Gemini Error:', e);
      throw e;
    }
  }
}

class OpenAIStrategy implements LLMStrategy {
  private client: OpenAI;
  private modelName: string;

  constructor(modelName: string, baseURL?: string) {
    this.modelName = modelName;
    this.client = new OpenAI({
      apiKey: ENV_API_KEY || 'dummy',
      baseURL: baseURL || undefined,
      dangerouslyAllowBrowser: true
    });
  }

  async chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void): Promise<string> {
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Convert history
    history.forEach(m => {
      messages.push({ role: m.role, content: m.content });
    });

    // Add new message
    messages.push({ role: 'user', content: newMessage });

    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          if (onStream) onStream(content);
        }
      }
      return fullText;
    } catch (e) {
      console.error('OpenAI Error:', e);
      throw e;
    }
  }
}

// --- Service ---

export class LLMService {
  private strategy: LLMStrategy;

  constructor() {
    const provider = ENV_PROVIDER.toLowerCase();
    const model = ENV_MODEL;

    // Factory
    if (provider === 'openai') {
      this.strategy = new OpenAIStrategy(model, ENV_BASE_URL);
    } else {
      // Default to Gemini
      this.strategy = new GeminiStrategy(model);
    }
  }

  async chat(
    history: Message[],
    newMessage: string,
    systemPrompt?: string,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    return this.strategy.chat(history, newMessage, systemPrompt, onStream);
  }
}

export const llm = new LLMService();
