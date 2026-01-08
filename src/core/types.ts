export interface Attachment {
    name: string;
    mimeType: string;
    data: string; // Base64 or Blob URL (for local persistence, base64 is safer in IDB)
}

export interface Message {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: number;
    tags?: string[]; // XML tags extracted or applied
    meta?: Record<string, unknown>; // For attachments or extra info
    attachments?: Attachment[];
}

export interface Conversation {
    id: string;
    appId: string; // The ID of the app used (e.g., 'translator', 'social')
    title: string;
    createdAt: number;
    updatedAt: number;
    lastMessagePreview?: string;
    tags?: string[]; // Global tags for the session
}

import type { PresetContext } from '@/config/contexts';

export interface AppConfig {
    id: string;
    title: string;
    description: string;
    systemPrompt: string;
    starters: Starter[];
    presets?: PresetContext[];
}

export interface Starter {
    label: string;
    text: string; // The text to fill in the input
    tags?: string[]; // Tags to apply (optional, translated to XML)
}

export interface LLMRequest {
    messages: Message[];
    systemPrompt?: string;
    temperature?: number;
}
