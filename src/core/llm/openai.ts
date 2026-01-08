import OpenAI from 'openai';
import type { Message, Attachment } from '@/core/types';
import type { LLMStrategy } from './types';

const ENV_API_KEY = import.meta.env.VITE_LLM_API_KEY;

export class OpenAIStrategy implements LLMStrategy {
    private client: OpenAI;
    private modelName: string;

    constructor(modelName: string, baseURL?: string) {
        this.modelName = modelName;
        this.client = new OpenAI({
            apiKey: ENV_API_KEY,
            baseURL: baseURL,
            dangerouslyAllowBrowser: true
        });
    }

    async chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void, attachments?: Attachment[]): Promise<string> {
        const messages = this.buildMessages(history, newMessage, systemPrompt, attachments);

        if (onStream) {
            const stream = await this.client.chat.completions.create({
                model: this.modelName,
                messages,
                stream: true
            });

            let fullText = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullText += content;
                    onStream(content);
                }
            }
            return fullText;
        }

        return this.chatSync(history, newMessage, systemPrompt, attachments);
    }

    async chatSync(history: Message[], newMessage: string, systemPrompt?: string, attachments?: Attachment[]): Promise<string> {
        const messages = this.buildMessages(history, newMessage, systemPrompt, attachments);
        const response = await this.client.chat.completions.create({
            model: this.modelName,
            messages,
            stream: false
        });
        return response.choices[0]?.message?.content || '';
    }

    private buildMessages(history: Message[], newMessage: string, systemPrompt?: string, newAttachments?: Attachment[]): OpenAI.Chat.ChatCompletionMessageParam[] {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        history.forEach(m => {
            if (m.attachments && m.attachments.length > 0) {
                const content: any[] = [{ type: 'text', text: m.content }];
                m.attachments.forEach(a => {
                    if (a.mimeType.startsWith('image/')) {
                        content.push({
                            type: 'image_url',
                            image_url: { url: a.data.startsWith('data:') ? a.data : `data:${a.mimeType};base64,${a.data}` }
                        });
                    }
                });
                messages.push({ role: m.role as any, content });
            } else {
                messages.push({ role: m.role as any, content: m.content });
            }
        });

        // New Message
        if (newAttachments && newAttachments.length > 0) {
            const content: any[] = [{ type: 'text', text: newMessage }];
            newAttachments.forEach(a => {
                if (a.mimeType.startsWith('image/')) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: a.data.startsWith('data:') ? a.data : `data:${a.mimeType};base64,${a.data}` }
                    });
                }
            });
            messages.push({ role: 'user', content });
        } else {
            messages.push({ role: 'user', content: newMessage });
        }

        return messages;
    }
}
