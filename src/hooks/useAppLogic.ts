import { useState, useEffect, useCallback } from 'react';
import { db } from '@/core/db';
import { llm } from '@/core/llm';
import { logger } from '@/core/logger';
import { APPS } from '@/config/apps';
import type { Conversation, Message, Attachment } from '@/core/types';

export function useAppLogic() {
    const [currentAppId, setCurrentAppId] = useState<string | null>(null);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    // computed - null means show tool picker
    const currentApp = currentAppId ? APPS.find(a => a.id === currentAppId) || null : null;

    // Load history list
    const loadHistory = useCallback(async () => {
        const list = await db.getConversations();
        setConversations(list);
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Load messages when conversation changes
    useEffect(() => {
        if (!currentConversationId) {
            setMessages([]);
            return;
        }
        const loadMsgs = async () => {
            const msgs = await db.getMessages(currentConversationId);
            setMessages(msgs);
            // Auto-set appId if not set
            const conv = await db.getConversation(currentConversationId);
            if (conv && conv.appId !== currentAppId) {
                setCurrentAppId(conv.appId);
            }
        };
        loadMsgs();
    }, [currentConversationId, currentAppId]);

    // Create new chat
    const startNewChat = async (appId: string) => {
        const app = APPS.find(a => a.id === appId) || APPS[0];
        setCurrentAppId(app.id);
        setCurrentConversationId(null);
        setMessages([]);
        setError(null);
        setStreamingContent('');
    };

    const generateXmlTags = (tags: string[]) => {
        return tags.map(t => `<context>${t}</context>`).join('\n');
    };

    // Send Message
    const sendMessage = async (text: string, tags: string[] = [], attachments: Attachment[] = []) => {
        if ((!text.trim() && attachments.length === 0) || !currentAppId || !currentApp) return;
        setError(null);

        let convId = currentConversationId;
        if (!convId) {
            const previewText = text.trim() ? text.slice(0, 20) : (attachments[0]?.name || 'File Attachment');
            const conv = await db.createConversation(currentAppId!, previewText);
            convId = conv.id;
            setCurrentConversationId(convId);
            setConversations(prev => [conv, ...prev]);
        }

        // 1. Save User Message
        const userMsg: Omit<Message, 'conversationId' | 'id'> = {
            role: 'user',
            content: text,
            createdAt: Date.now(),
            tags,
            attachments
        };
        const savedUserMsg = await db.addMessage(convId, userMsg);
        setMessages(prev => [...prev, savedUserMsg]);

        // 2. Prepare for LLM
        setIsLoading(true);
        setStreamingContent('');

        try {
            // 3. System Prompt & Context
            let finalPrompt = text;
            if (tags.length > 0) {
                const xmlTags = generateXmlTags(tags);
                finalPrompt = `${xmlTags}\n${text}`;
            }

            const assistantResponseText = await llm.chat(
                messages,
                finalPrompt,
                currentApp.systemPrompt,
                (chunk: string) => {
                    setStreamingContent(prev => prev + chunk);
                },
                attachments
            );

            // 4. Save Assistant Message
            const assistantMsg: Omit<Message, 'conversationId' | 'id'> = {
                role: 'assistant',
                content: assistantResponseText,
                createdAt: Date.now()
            };

            const savedAssistantMsg = await db.addMessage(convId, assistantMsg);
            setMessages(prev => [...prev, savedAssistantMsg]);

            // Update title if it's the first exchange
            if (messages.length === 0) {
                const titleText = text.trim() ? text.slice(0, 30) : (attachments[0]?.name || 'New Chat');
                await db.updateConversation(convId, { title: titleText });
                loadHistory();
            }

        } catch (e: unknown) {
            const err = e as Error;
            logger.error('LLM request failed', err);
            setError(err.message || 'Request failed');
        } finally {
            setIsLoading(false);
            setStreamingContent('');
        }
    };

    const clearError = () => setError(null);

    return {
        currentApp,
        currentConversationId,
        conversations,
        messages,
        isLoading,
        streamingContent,
        lastMessage: messages[messages.length - 1],
        error,
        startNewChat,
        loadHistory,
        sendMessage,
        setCurrentConversationId,
        clearError
    };
}
