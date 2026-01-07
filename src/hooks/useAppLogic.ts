import { useState, useEffect, useCallback } from 'react';
import { db } from '../core/db';
import { llm } from '../core/llm';
import { APPS } from '../config/apps';
import type { Conversation, Message } from '../core/types';

export function useAppLogic() {
    const [currentAppId, setCurrentAppId] = useState<string>(APPS[0].id);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');

    // computed
    const currentApp = APPS.find(a => a.id === currentAppId) || APPS[0];

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
        };
        loadMsgs();
    }, [currentConversationId]);

    // Create new chat
    const startNewChat = async (appId: string) => {
        const app = APPS.find(a => a.id === appId) || APPS[0];
        // We don't create the DB entry until the first message usually,
        // OR we create it immediately. Let's create immediately for simplicity to have an ID.
        const conv = await db.createConversation(app.id, `New ${app.title} Chat`);
        setConversations(prev => [conv, ...prev]);
        setCurrentAppId(app.id);
        setCurrentConversationId(conv.id);
        setMessages([]);
    };

    // Switch App (in current chat or new chat)
    // PRD: "App switching doesn't jump page, just switches config for current session"
    // But usage of 'New Chat' vs 'Switch Config' is subtle.
    // For now: Clicking sidebar app = New Chat.
    // Dropdown in header = Switch Config (Not implemented yet).
    // Let's implement Sidebar App Click = Start New Chat.

    // Send Message
    const sendMessage = async (text: string, tags: string[] = []) => {
        if (!text.trim()) return;

        let convId = currentConversationId;
        if (!convId) {
            // Should have been created by startNewChat, but just in case
            const conv = await db.createConversation(currentAppId, text.slice(0, 20));
            convId = conv.id;
            setCurrentConversationId(convId);
            setConversations(prev => [conv, ...prev]);
        }

        // 1. Save User Message
        const userMsg: Omit<Message, 'conversationId' | 'id'> = {
            role: 'user',
            content: text,
            createdAt: Date.now(),
            tags
        };
        const savedUserMsg = await db.addMessage(convId, userMsg);
        setMessages(prev => [...prev, savedUserMsg]);

        // 2. Prepare for LLM
        setIsLoading(true);
        setStreamingContent('');

        // Construct history for LLM (exclude the one we just added to local state to avoid dupes if we passed it differently, but here we just pass current confirmed messages)
        // Actually we need to include the new message in what we send to LLM
        // const historyForLlm = [...messages, savedUserMsg];

        try {
            // 3. System Prompt preparation
            // Inject tags into system prompt or user message?
            // PRD says: "User selects tags -> XML tags injected into final request"
            // We can append tags to the user message content OR format them.
            // Let's append them to the user text in the LLM view if they are not visible?
            // "Input area supports... tags... client converts to XML and injects"
            // Let's create a "formatted content" for the LLM.

            let finalPrompt = text;
            if (tags.length > 0) {
                // Simple XML mapping
                // e.g. <lang>ru</lang>, <context>airport</context>
                // We need a mapping from Tag Label to XML.
                // For now, let's just assume the tag string IS the value or we format it.
                // PRD: "User inputs 'Airport' -> <context>airport</context>"
                // Use a simple helper or just wrap them.
                const xmlTags = tags.map(t => `<tag>${t}</tag>`).join('\n'); // Simplified for now
                finalPrompt = `${xmlTags}\n${text}`;
            }

            // We call LLM with history.
            // Note: `llm.chat` handles `history` + `newMessage`.
            // `history` arg should be PREVIOUS messages.

            const assistantResponseText = await llm.chat(
                messages, // Pass previous messages
                finalPrompt, // Pass new message with injected tags
                currentApp.systemPrompt,
                (chunk: string) => {
                    setStreamingContent(prev => prev + chunk);
                }
            );

            // 4. Save Assistant Message
            const assistantMsg: Omit<Message, 'conversationId' | 'id'> = {
                role: 'assistant',
                content: assistantResponseText,
                createdAt: Date.now()
            };

            const savedAssistantMsg = await db.addMessage(convId, assistantMsg);
            setMessages(prev => [...prev, savedAssistantMsg]);

            // Update title if it's the first exchange?
            if (messages.length === 0) {
                // Generate title logic or just use user text
                await db.updateConversation(convId, { title: text.slice(0, 30) });
                loadHistory(); // refresh list
            }

        } catch (e) {
            console.error(e);
            // TODO: Handle error UI
        } finally {
            setIsLoading(false);
            setStreamingContent('');
        }
    };

    return {
        currentApp,
        currentConversationId,
        conversations,
        messages,
        isLoading,
        streamingContent,
        startNewChat,
        loadHistory,
        sendMessage,
        setCurrentConversationId
    };
}
