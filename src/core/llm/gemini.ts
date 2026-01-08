import { GoogleGenAI } from '@google/genai';
import type { Message, Attachment } from '@/core/types';
import type { LLMStrategy } from './types';

const ENV_API_KEY = import.meta.env.VITE_LLM_API_KEY;

export class GeminiStrategy implements LLMStrategy {
    private client: GoogleGenAI;
    private modelName: string;

    constructor(modelName: string) {
        this.modelName = modelName;
        this.client = new GoogleGenAI({ apiKey: ENV_API_KEY });
    }

    async chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void, attachments?: Attachment[]): Promise<string> {
        const contents = this.buildContents(history, newMessage, attachments);

        if (onStream) {
            const response = await this.client.models.generateContentStream({
                model: this.modelName,
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: 32768
                }
            });

            let fullText = '';
            for await (const chunk of response) {
                const text = chunk.text || '';
                if (text) {
                    fullText += text;
                    onStream(text);
                }
            }
            return fullText;
        }

        return this.chatSync(history, newMessage, systemPrompt, attachments);
    }

    async chatSync(history: Message[], newMessage: string, systemPrompt?: string, attachments?: Attachment[]): Promise<string> {
        const contents = this.buildContents(history, newMessage, attachments);

        const response = await this.client.models.generateContent({
            model: this.modelName,
            contents,
            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 32768
            }
        });

        return response.text || '';
    }

    private buildContents(history: Message[], newMessage: string, newAttachments?: Attachment[]): any[] {
        const contents: any[] = [];

        // History
        history.forEach(m => {
            const parts: any[] = [{ text: m.content }];
            if (m.attachments) {
                m.attachments.forEach(a => {
                    parts.push({
                        inlineData: {
                            mimeType: a.mimeType,
                            data: a.data.split(',')[1] || a.data // Handle data:image/png;base64,...
                        }
                    });
                });
            }
            contents.push({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts
            });
        });

        // New Message
        const newParts: any[] = [{ text: newMessage }];
        if (newAttachments) {
            newAttachments.forEach(a => {
                newParts.push({
                    inlineData: {
                        mimeType: a.mimeType,
                        data: a.data.split(',')[1] || a.data
                    }
                });
            });
        }
        contents.push({ role: 'user', parts: newParts });

        return contents;
    }
}
