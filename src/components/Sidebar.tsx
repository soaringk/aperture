import React, { useState } from 'react';
import { Search, MessageSquare, Plus } from 'lucide-react';
import { APPS } from '../config/apps';
import type { Conversation } from '../core/types';

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onNewChat: (appId: string) => void;
    onSelectConversation: (id: string) => void;
    onSearch: (query: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    currentConversationId,
    onNewChat,
    onSelectConversation,
    onSearch
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
        onSearch(val);
    };

    const formatTime = (ts: number) => {
        const date = new Date(ts);
        // Simple logic: if today, show time; else show date
        if (new Date().toDateString() === date.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 0',
            flexShrink: 0
        }}>
            {/* Search Bar */}
            <div style={{ padding: '0 16px 16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <Search size={16} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="Search history..."
                        className="input-reset"
                        style={{ marginLeft: '8px', width: '100%', fontSize: '0.9rem' }}
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* App List (New Chat) */}
            <div style={{ padding: '0 16px 24px' }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                }}>
                    New Chat
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {APPS.map(app => (
                        <button
                            key={app.id}
                            className="btn-ghost"
                            onClick={() => onNewChat(app.id)}
                            style={{
                                justifyContent: 'flex-start',
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px'
                            }}
                        >
                            <div style={{ marginRight: '10px' }}>
                                <Plus size={16} />
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {app.title}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* History List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                }}>
                    History
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {conversations.map(item => {
                        const isSelected = item.id === currentConversationId;
                        return (
                            <button
                                key={item.id}
                                className={isSelected ? 'btn-primary' : 'btn-ghost'}
                                onClick={() => onSelectConversation(item.id)}
                                style={{
                                    justifyContent: 'flex-start',
                                    width: '100%',
                                    padding: '10px 12px',
                                    height: 'auto',
                                    backgroundColor: isSelected ? 'var(--bg-tertiary)' : undefined, // Visual tweaks for active state if not using primary color
                                    color: isSelected ? 'var(--text-primary)' : undefined,
                                    border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent'
                                }}
                            >
                                <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                                    <MessageSquare size={16} style={{ minWidth: '16px', marginTop: '3px', color: 'var(--text-secondary)' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                        <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'left', fontWeight: isSelected ? 600 : 400 }}>
                                            {item.title}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {formatTime(item.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
};
