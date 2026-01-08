import type { Message, Attachment } from '@/core/types';
import type { LLMStrategy } from './types';
import { GeminiStrategy } from './gemini';
import { OpenAIStrategy } from './openai';

const ENV_PROVIDER = import.meta.env.VITE_LLM_PROVIDER;
const ENV_BASE_URL = import.meta.env.VITE_LLM_BASE_URL;
const ENV_MODEL = import.meta.env.VITE_LLM_MODEL;

export class LLMService {
    private strategy: LLMStrategy;

    constructor() {
        const provider = (ENV_PROVIDER).toLowerCase();
        const model = ENV_MODEL;

        if (provider === 'openai') {
            this.strategy = new OpenAIStrategy(model, ENV_BASE_URL);
        } else {
            this.strategy = new GeminiStrategy(model);
        }
    }

    async chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void, attachments?: Attachment[]): Promise<string> {
        return this.strategy.chat(history, newMessage, systemPrompt, onStream, attachments);
    }

    async chatSync(history: Message[], newMessage: string, systemPrompt?: string, attachments?: Attachment[]): Promise<string> {
        return this.strategy.chatSync(history, newMessage, systemPrompt, attachments);
    }
}

export const llm = new LLMService();
