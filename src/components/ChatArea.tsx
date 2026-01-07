import React, { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw } from 'lucide-react';
import { marked } from 'marked';
import type { AppConfig, Message } from '../core/types';

interface ChatAreaProps {
    currentApp: AppConfig;
    messages: Message[];
    isLoading: boolean;
    streamingContent: string;
    onSendMessage: (text: string, tags: string[]) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
    currentApp,
    messages,
    isLoading,
    streamingContent,
    onSendMessage
}) => {
    const [input, setInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSendMessage(input, tags);
        setInput('');
        // Keep tags? Maybe clear them.
        // setTags([]); // Optional: keep context or clear. Let's keep for now as per "Global session tags"
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Add Starter to Input
    const handleStarter = (starterText: string, starterTags?: string[]) => {
        setInput(starterText);
        if (starterTags) setTags(starterTags);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <header style={{
                height: 'var(--header-height)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div>
                    <h2 className="h3">{currentApp.title}</h2>
                    <p className="body-xs" style={{ color: 'var(--text-secondary)' }}>{currentApp.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {tags.map(t => (
                        <span key={t} className="chip">#{t}</span>
                    ))}
                    {/* <button className="btn-ghost" style={{fontSize: '0.8rem'}}>+ Tag</button> */}
                </div>
            </header>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '12px' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Try a starter:</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {currentApp.starters.map(s => (
                                <button key={s.label} className="chip" onClick={() => handleStarter(s.text, s.tags)} style={{ cursor: 'pointer', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-light)' }}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m) => (
                    <div key={m.id} style={{
                        display: 'flex',
                        marginBottom: '24px',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start'
                    }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            backgroundColor: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                            lineHeight: '1.6',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            {/* Needs markdown parsing */}
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) as string }} />
                        </div>
                    </div>
                ))}

                {streamingContent && (
                    <div style={{ display: 'flex', marginBottom: '24px', justifyContent: 'flex-start' }}>
                        <div style={{
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            lineHeight: '1.6',
                            opacity: 0.8
                        }}>
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(streamingContent) as string }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '24px', flexShrink: 0 }}>
                <div style={{
                    position: 'relative',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--bg-tertiary)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    {/* Tag Bar */}
                    <div style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        overflowX: 'auto'
                    }}>
                        <div className="chip" style={{ cursor: 'pointer', backgroundColor: 'var(--bg-primary)' }}>+ Tag</div>
                        <input
                            type="text"
                            placeholder="Add tags..."
                            className="input-reset"
                            style={{ fontSize: '0.8rem', minWidth: '60px' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value.trim();
                                    if (val) {
                                        setTags([...tags, val]);
                                        e.currentTarget.value = '';
                                    }
                                }
                            }}
                        />
                        <div style={{ flex: 1 }} />
                        {tags.length > 0 && <button className="btn-ghost" onClick={() => setTags([])} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Clear</button>}
                    </div>

                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="input-reset"
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            minHeight: '80px',
                            resize: 'none',
                            fontSize: '1rem',
                            outline: 'none',
                            backgroundColor: 'transparent'
                        }}
                    />

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        alignItems: 'center'
                    }}>
                        <button className="btn-ghost" title="Reset Context" onClick={() => { /* TODO: expose reset logic */ }}><RotateCcw size={18} /></button>
                        <button
                            className="btn-primary"
                            style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
                            onClick={handleSend}
                            disabled={isLoading}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
