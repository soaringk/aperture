import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Conversation, Message } from '@/core/types';
import { v4 as uuidv4 } from 'uuid';

interface AppDB extends DBSchema {
    conversations: {
        key: string;
        value: Conversation;
        indexes: { 'by-updated': number };
    };
    messages: {
        key: string;
        value: Message;
        indexes: { 'by-conversation': string };
    };
}

const DB_NAME = 'antigravity-app-db';
const DB_VERSION = 1;

class DBService {
    private dbPromise: Promise<IDBPDatabase<AppDB>>;

    constructor() {
        this.dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Conversations store
                const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                convStore.createIndex('by-updated', 'updatedAt');

                // Messages store
                const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                msgStore.createIndex('by-conversation', 'conversationId');
            },
        });
    }

    async createConversation(appId: string, title: string = 'New Conversation'): Promise<Conversation> {
        const db = await this.dbPromise;
        const now = Date.now();
        const conversation: Conversation = {
            id: uuidv4(),
            appId,
            title,
            createdAt: now,
            updatedAt: now,
        };
        await db.put('conversations', conversation);
        return conversation;
    }

    async getConversation(id: string): Promise<Conversation | undefined> {
        const db = await this.dbPromise;
        return db.get('conversations', id);
    }

    async getConversations(limit: number = 50): Promise<Conversation[]> {
        const db = await this.dbPromise;
        const all = await db.getAllFromIndex('conversations', 'by-updated');
        // IDB returns ascending by default, we want descending (newest first)
        return all.reverse().slice(0, limit);
    }

    async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
        const db = await this.dbPromise;
        const conv = await db.get('conversations', id);
        if (!conv) return;
        await db.put('conversations', { ...conv, ...updates, updatedAt: Date.now() });
    }

    async deleteConversation(id: string): Promise<void> {
        const db = await this.dbPromise;
        await db.delete('conversations', id);
        // Also delete messages
        // Note: iterating to delete might be slow if many messages, but for local usage it's fine.
        // A better way is using a range if we indexed on conversationId.
        const tx = db.transaction('messages', 'readwrite');
        const index = tx.store.index('by-conversation');
        let cursor = await index.openCursor(IDBKeyRange.only(id));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
    }

    async addMessage(conversationId: string, message: Omit<Message, 'conversationId' | 'id'>): Promise<Message> {
        const db = await this.dbPromise;
        const fullMessage: Message = {
            ...message,
            id: uuidv4(),
            conversationId,
        };

        // Use transaction to ensure both message and conversation update happen
        const tx = db.transaction(['messages', 'conversations'], 'readwrite');
        await tx.objectStore('messages').add(fullMessage);

        const convStore = tx.objectStore('conversations');
        const conv = await convStore.get(conversationId);
        if (conv) {
            // Update preview and time
            conv.updatedAt = Date.now();
            conv.lastMessagePreview = message.content.slice(0, 100);
            await convStore.put(conv);
        }

        await tx.done;
        return fullMessage;
    }

    async getMessages(conversationId: string): Promise<Message[]> {
        const db = await this.dbPromise;
        return db.getAllFromIndex('messages', 'by-conversation', conversationId);
    }

    async searchHistory(query: string): Promise<{ conversationId: string, messageId: string, content: string, snippet: string }[]> {
        const db = await this.dbPromise;
        // Simple full scan implementation for now.
        // For larger datasets, a full-text search engine (e.g. FlexSearch) usually sits on top.
        // But filtering all messages is acceptable for < 10k messages locally.
        const allMessages = await db.getAll('messages');
        const lowerQuery = query.toLowerCase();

        const results = allMessages.filter(m => m.content.toLowerCase().includes(lowerQuery));

        return results.map(m => {
            const index = m.content.toLowerCase().indexOf(lowerQuery);
            const snippetStart = Math.max(0, index - 20);
            const snippetEnd = Math.min(m.content.length, index + query.length + 50);
            const snippet = (snippetStart > 0 ? '...' : '') + m.content.substring(snippetStart, snippetEnd) + (snippetEnd < m.content.length ? '...' : '');

            return {
                conversationId: m.conversationId,
                messageId: m.id,
                content: m.content,
                snippet
            };
        });
    }
}

export const db = new DBService();
