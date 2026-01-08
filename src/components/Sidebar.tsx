import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { APPS } from '@/config/apps';
import type { Conversation } from '@/core/types';

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onNewChat: (appId: string) => void;
    onSelectConversation: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    currentConversationId,
    onNewChat,
    onSelectConversation
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchTerm(val);
    };

    const filteredConversations = conversations.filter(c =>
        !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase())
    );



    return (
        <aside className="glass" style={{
            width: isCollapsed ? '80px' : 'var(--sidebar-width)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 50,
            background: 'rgba(255, 255, 255, 0.4)' // Extra subtle for sidebar
        }}>
            {/* Top Bar: Search + Collapse Toggle */}
            <div style={{
                padding: '20px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                height: 'var(--header-height)',
                flexShrink: 0
            }}>
                {/* Search Box */}
                {!isCollapsed ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.5)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        flex: 1,
                        transition: 'all 0.2s'
                    }} onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--text-tertiary)'}
                        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
                        <Search size={16} color="var(--text-tertiary)" />
                        <input
                            type="text"
                            placeholder="Find..."
                            className="input-reset"
                            style={{ marginLeft: '8px', fontSize: '0.9rem', width: '100%', color: 'var(--text-primary)' }}
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                ) : (
                    <div style={{ flex: 1 }} />
                )}

                {/* Toggle Button */}
                <button
                    className="btn-reset"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: isCollapsed ? '100%' : 'auto',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--border-subtle)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Section 1: Specialized Apps */}
                <div style={{ textAlign: isCollapsed ? 'center' : 'left' }}>
                    {!isCollapsed && <div className="nav-header">Tools</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                        {APPS.map(app => (
                            <button
                                key={app.id}
                                className="btn-reset"
                                onClick={() => onNewChat(app.id)}
                                title={isCollapsed ? app.title : ''}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-glass-strong)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '10px',
                                    background: 'white',
                                    boxShadow: 'var(--shadow-sm)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    color: 'var(--text-primary)'
                                }}>
                                    <span style={{ fontWeight: 700, fontSize: '15px' }}>{app.title[0]}</span>
                                </div>
                                {!isCollapsed && (
                                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                        {app.title}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 2: Recent Chats */}
                <div style={{ textAlign: isCollapsed ? 'center' : 'left' }}>
                    {!isCollapsed && (
                        <div className="nav-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>History</span>
                            <span style={{
                                backgroundColor: 'rgba(0,0,0,0.05)',
                                borderRadius: '6px',
                                padding: '2px 6px',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.65rem',
                                fontWeight: 600
                            }}>{filteredConversations.length}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                        {filteredConversations.map(item => {
                            const isSelected = item.id === currentConversationId;
                            return (
                                <button
                                    key={item.id}
                                    className="btn-reset"
                                    onClick={() => onSelectConversation(item.id)}
                                    title={isCollapsed ? item.title : ''}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: isSelected ? 'white' : 'transparent',
                                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                        border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                                        transition: 'all 0.2s',
                                        width: isCollapsed ? '44px' : 'auto',
                                        height: isCollapsed ? '44px' : 'auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                                    }}
                                    onMouseEnter={e => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.4)';
                                    }}
                                    onMouseLeave={e => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {!isCollapsed ? (
                                        <div style={{
                                            fontSize: '0.9rem',
                                            marginBottom: '0',
                                            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            textAlign: 'left',
                                            width: '100%',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            fontWeight: isSelected ? 500 : 400
                                        }}>
                                            {item.title}
                                        </div>
                                    ) : (
                                        <MessageSquare size={18} color={isSelected ? '#2563eb' : 'var(--text-tertiary)'} />
                                    )}
                                </button>
                            );
                        })}
                        {filteredConversations.length === 0 && !isCollapsed && (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                No history found
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </aside>
    );
};
