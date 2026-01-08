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
        <aside style={{
            width: isCollapsed ? '70px' : 'var(--sidebar-width)',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            transition: 'width 0.3s ease'
        }}>
            {/* Collapse Toggle - Floating or Fixed? Fixed at bottom or top. Let's put in Search row or separate */}

            {/* Top Bar: Search + Collapse Toggle */}
            <div style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: isCollapsed ? 'none' : '1px solid transparent' // Cleaner look
            }}>
                {/* Search Box */}
                {!isCollapsed ? (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                        flex: 1
                    }}>
                        <Search size={16} color="var(--text-tertiary)" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="input-reset"
                            style={{ marginLeft: '8px', fontSize: '0.85rem', width: '100%' }}
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                ) : (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {/* Centered search icon when collapsed? Or just the toggle. Lets keep toggle consistent. */}
                        {/* Actually toggle is better separate. */}
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    className="btn-reset"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        backgroundColor: isCollapsed ? 'transparent' : 'var(--bg-secondary)', // Subtle
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: isCollapsed ? 'auto' : '0', // Center if collapsed
                        width: isCollapsed ? '100%' : 'auto'
                    }}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Scrollable Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>

                {/* Section 1: Specialized Apps */}
                <div style={{ marginBottom: '32px', textAlign: isCollapsed ? 'center' : 'left' }}>
                    {!isCollapsed && <div className="nav-header">Specialized Apps</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                        {APPS.map(app => (
                            <button
                                key={app.id}
                                className="btn-reset"
                                onClick={() => onNewChat(app.id)}
                                title={isCollapsed ? app.title : ''}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center', // Changed for collapse
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <div style={{
                                    width: '32px', height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: '#fff',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{app.title[0]}</span>
                                </div>
                                {!isCollapsed && (
                                    <div>
                                        <div className="nav-item-title">{app.title}</div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section 2: Recent Chats */}
                <div style={{ textAlign: isCollapsed ? 'center' : 'left' }}>
                    {!isCollapsed && (
                        <div className="nav-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Recent Chats</span>
                            <span style={{ backgroundColor: '#e0e0e0', borderRadius: '4px', padding: '1px 6px', color: '#666', fontSize: '0.65rem' }}>{filteredConversations.length}</span>
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
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: isSelected ? '#fff' : 'transparent',
                                        boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                                        transition: 'all 0.2s',
                                        width: isCollapsed ? '40px' : 'auto',
                                        height: isCollapsed ? '40px' : 'auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: isCollapsed ? 'center' : 'flex-start'
                                    }}
                                >
                                    {!isCollapsed ? (
                                        <div className="nav-item-title" style={{ fontSize: '0.8rem', marginBottom: '0', color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)', textAlign: 'left', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </div>
                                    ) : (
                                        <MessageSquare size={16} color={isSelected ? 'var(--accent-primary)' : 'var(--text-tertiary)'} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>



            </div>
        </aside>
    );
};
