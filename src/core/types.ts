export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: number;
    tags?: string[]; // XML tags extracted or applied
    meta?: Record<string, any>; // For attachments or extra info
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

export interface AppConfig {
    id: string;
    title: string;
    description: string;
    systemPrompt: string;
    starters: Starter[];
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
