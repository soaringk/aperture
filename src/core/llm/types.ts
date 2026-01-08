import type { Message, Attachment } from '@/core/types';

export interface LLMStrategy {
    chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void, attachments?: Attachment[]): Promise<string>;
    chatSync(history: Message[], newMessage: string, systemPrompt?: string, attachments?: Attachment[]): Promise<string>;
}
