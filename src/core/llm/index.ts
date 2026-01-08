import type { Message, Attachment } from '@/core/types';

const API_BASE_URL = 'http://localhost:3000';

export interface LLMStrategy {
    chat(history: Message[], newMessage: string, systemPrompt?: string, onStream?: (chunk: string) => void, attachments?: Attachment[]): Promise<string>;
}

/**
 * Unified LLM Service - calls the backend which handles provider selection
 */
class LLMService implements LLMStrategy {
    async chat(
        history: Message[],
        newMessage: string,
        systemPrompt?: string,
        onStream?: (chunk: string) => void,
        attachments?: Attachment[]
    ): Promise<string> {
        const messages = this.buildMessages(history, newMessage, systemPrompt, attachments);

        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, systemPrompt }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Request failed');
        }

        if (!response.body) throw new Error('ReadableStream not supported');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;
            if (onStream) onStream(chunk);
        }

        return fullText;
    }

    private buildMessages(
        history: Message[],
        newMessage: string,
        systemPrompt?: string,
        newAttachments?: Attachment[]
    ): any[] {
        const messages: any[] = [];

        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }

        for (const m of history) {
            if (m.attachments && m.attachments.length > 0) {
                const content: any[] = [{ type: 'text', text: m.content }];
                for (const a of m.attachments) {
                    if (a.mimeType.startsWith('image/')) {
                        content.push({
                            type: 'image_url',
                            image_url: { url: a.data.startsWith('data:') ? a.data : `data:${a.mimeType};base64,${a.data}` }
                        });
                    }
                }
                messages.push({ role: m.role, content });
            } else {
                messages.push({ role: m.role, content: m.content });
            }
        }

        // New message
        if (newAttachments && newAttachments.length > 0) {
            const content: any[] = [{ type: 'text', text: newMessage }];
            for (const a of newAttachments) {
                if (a.mimeType.startsWith('image/')) {
                    content.push({
                        type: 'image_url',
                        image_url: { url: a.data.startsWith('data:') ? a.data : `data:${a.mimeType};base64,${a.data}` }
                    });
                }
            }
            messages.push({ role: 'user', content });
        } else {
            messages.push({ role: 'user', content: newMessage });
        }

        return messages;
    }
}

export const llm = new LLMService();
