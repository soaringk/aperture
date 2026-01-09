import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowUp, Plus, Paperclip, X, Sparkles, Command, FileText, RefreshCw } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { AppConfig, Message, Attachment } from '@/core/types';
import { PRESET_CONTEXTS } from '@/config/contexts';
import type { PresetContext } from '@/config/contexts';
import { APPS } from '@/config/apps';

interface ChatAreaProps {
    currentApp: AppConfig | null;
    messages: Message[];
    isLoading: boolean;
    streamingContent: string;
    error: string | null;
    onSendMessage: (text: string, tags: string[], attachments: Attachment[]) => void;
    onRerunMessage: () => void;
    onClearError: () => void;
    onSelectApp: (appId: string) => void;
}

/**
 * Silky Smooth Streaming Component
 * Animates text character by character for a more natural feel
 */
const SmoothStreaming: React.FC<{ content: string; isLoading: boolean }> = ({ content, isLoading }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!content) {
            setDisplayedContent('');
            return;
        }

        // Variable speed based on queue length to catch up if behind
        const tick = () => {
            setDisplayedContent(prev => {
                if (prev.length >= content.length) return prev;

                const remaining = content.length - prev.length;
                // Type faster if we have a lot to catch up
                const chunk = remaining > 50 ? 5 : remaining > 20 ? 3 : 1;

                return content.slice(0, prev.length + chunk);
            });

            // Randomize delay slightly for natural feel (10-30ms)
            // Faster if we are far behind
            const delay = content.length - displayedContent.length > 50 ? 5 : Math.random() * 20 + 10;
            timerRef.current = setTimeout(tick, delay);
        };

        if (displayedContent.length < content.length) {
            tick();
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [content, displayedContent]);

    // Force sync when loading stops to ensure we show everything
    useEffect(() => {
        if (!isLoading && content) {
            setDisplayedContent(content);
        }
    }, [isLoading, content]);

    const sanitizedHtml = useMemo(() => {
        const rawHtml = marked.parse(displayedContent) as string;
        return DOMPurify.sanitize(rawHtml);
    }, [displayedContent]);

    return (
        <div className="markdown-content" style={{ position: 'relative', lineHeight: 1.75 }}>
            <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} style={{ display: 'inline' }} />
            {isLoading && (
                <span className="cursor-blink" style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '1.2em',
                    backgroundColor: 'var(--text-primary)',
                    marginLeft: '2px',
                    verticalAlign: 'text-bottom',
                    opacity: 0.7
                }} />
            )}
        </div>
    );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
    currentApp,
    messages,
    isLoading,
    streamingContent,
    error,
    onSendMessage,
    onRerunMessage,
    onClearError,
    onSelectApp
}) => {
    const [input, setInput] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [showContextSelector, setShowContextSelector] = useState(false);
    const [showInputContextSelector, setShowInputContextSelector] = useState(false);
    const [contextSearch, setContextSearch] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Local state to hold the "active" data being displayed.
    // This allows us to freeze the UI during a transition while props change in the background.
    const [activeApp, setActiveApp] = useState<AppConfig | null>(currentApp);
    const [activeMessages, setActiveMessages] = useState<Message[]>(messages);
    const prevAppIdRef = useRef<string | undefined>(currentApp?.id);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredContexts = useMemo(() => {
        // Use app-specific presets if available, otherwise global defaults
        const sourceContexts = activeApp?.presets || PRESET_CONTEXTS;
        return sourceContexts.filter(c =>
            c.label.toLowerCase().includes(contextSearch.toLowerCase()) ||
            c.tags.some(t => t.toLowerCase().includes(contextSearch.toLowerCase()))
        );
    }, [activeApp?.id, activeApp?.presets, contextSearch]);

    const handleAddContext = (ctx: PresetContext) => {
        const newTags = [...new Set([...tags, ...ctx.tags])];
        setTags(newTags);
        setShowContextSelector(false);
        setShowInputContextSelector(false);
        setContextSearch('');
    };

    const handleCustomContext = () => {
        if (contextSearch.trim()) {
            setTags([...new Set([...tags, contextSearch.trim()])]);
            setShowContextSelector(false);
            setShowInputContextSelector(false);
            setContextSearch('');
        }
    };

    const toggleGlobalContext = () => {
        if (!showContextSelector) {
            setShowInputContextSelector(false);
        }
        setShowContextSelector(!showContextSelector);
    };

    const toggleInputContext = () => {
        if (!showInputContextSelector) {
            setShowContextSelector(false);
        }
        setShowInputContextSelector(!showInputContextSelector);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeMessages, streamingContent]);

    // Sync messages if we are on the same app
    useEffect(() => {
        if (currentApp?.id === activeApp?.id) {
            setActiveMessages(messages);
        }
    }, [messages, currentApp?.id, activeApp?.id]);

    // Close context menus when switching apps
    useEffect(() => {
        setShowContextSelector(false);
        setShowInputContextSelector(false);
    }, [currentApp?.id]);

    // Silky smooth transition logic:
    // When currentApp.id changes, we fade out, swap the local state, then fade in.
    useEffect(() => {
        if (currentApp?.id === prevAppIdRef.current) return;

        let isCancelled = false;
        setIsTransitioning(true);

        // 1. Wait for fade-out to complete (matches transition duration)
        const transitionTimeout = setTimeout(() => {
            if (isCancelled) return;

            // 2. Mid-transition swap (hidden from user)
            setActiveApp(currentApp);
            setActiveMessages(messages);
            setTags([]);
            setInput('');
            setAttachments([]);
            setContextSearch('');
            prevAppIdRef.current = currentApp?.id;

            // 3. Brief pause to ensure DOM has updated before fading back in
            setTimeout(() => {
                if (isCancelled) return;
                setIsTransitioning(false);
            }, 50);
        }, 200);

        return () => {
            isCancelled = true;
            clearTimeout(transitionTimeout);
        };
    }, [currentApp?.id, messages]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setAttachments(prev => [...prev, {
                    name: file.name,
                    mimeType: file.type,
                    data: base64
                }]);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSend = () => {
        if ((!input.trim() && attachments.length === 0) || isLoading) return;
        onSendMessage(input, tags, attachments);
        setInput('');
        setAttachments([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStarter = (starterText: string, starterTags?: string[]) => {
        setInput(starterText);
        if (starterTags) setTags(starterTags);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            opacity: isTransitioning ? 0 : 1,
            transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '24px',
            position: 'relative'
        }}>
            {/* Header Area */}
            <header className="glass" style={{
                height: 'var(--header-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--radius-md)',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                flexShrink: 0,
                background: 'rgba(255, 255, 255, 0.65)',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--bg-primary) 0%, #fff 100%)',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <Sparkles size={20} strokeWidth={1.5} style={{ opacity: 0.8 }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            margin: 0,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {currentApp?.title || 'Welcome'}
                        </h2>
                        <p style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            margin: 0,
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {currentApp?.description || 'Select a tool to begin'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                    <div className="nav-header" style={{ margin: 0, padding: 0, fontSize: '0.65rem', opacity: 0.7 }}>Global Context</div>
                    <button
                        className="btn-reset"
                        onClick={toggleGlobalContext}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            background: showContextSelector ? 'var(--accent-soft)' : 'transparent',
                            color: showContextSelector ? 'var(--accent-primary)' : 'var(--text-tertiary)'
                        }}
                    >
                        <Plus size={18} />
                    </button>

                    {showContextSelector && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowContextSelector(false)} />
                            <div className="glass-panel" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '12px',
                                width: '280px',
                                borderRadius: 'var(--radius-md)',
                                zIndex: 100,
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                background: 'rgba(255, 255, 255, 0.98)',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2), var(--shadow-card)'
                            }}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search or Create..."
                                    className="input-reset"
                                    style={{ borderBottom: '1px solid var(--border-subtle)', padding: '8px', fontSize: '0.9rem' }}
                                    value={contextSearch}
                                    onChange={e => setContextSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCustomContext()}
                                />
                                <div style={{ overflowY: 'auto', maxHeight: '240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {filteredContexts.map(ctx => (
                                        <button
                                            key={ctx.id}
                                            className="btn-reset"
                                            style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', transition: 'background 0.2s', textAlign: 'left' }}
                                            onClick={() => handleAddContext(ctx)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ctx.label}</div>
                                            {ctx.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ctx.description}</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '24px', paddingRight: '12px', scrollBehavior: 'smooth' }}>
                {!activeApp && activeMessages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '40px',
                        animation: 'fadeIn 0.8s ease-out'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'inline-flex',
                                padding: '24px',
                                borderRadius: '32px',
                                background: 'linear-gradient(135deg, #fff 0%, var(--bg-primary) 100%)',
                                boxShadow: 'var(--shadow-glow)',
                                color: 'var(--accent-primary)',
                                marginBottom: '24px',
                                border: '1px solid white'
                            }}>
                                <Sparkles size={48} strokeWidth={1} />
                            </div>
                            <h1 style={{
                                fontSize: '2.5rem',
                                fontWeight: 800,
                                letterSpacing: '-0.03em',
                                marginBottom: '12px',
                                background: 'var(--accent-gradient)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                APERTURE
                            </h1>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '1.1rem', fontWeight: 400 }}>
                                Intelligent Workflow Partner
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '640px', width: '100%' }}>
                            {APPS.map(app => (
                                <button
                                    key={app.id}
                                    onClick={() => onSelectApp(app.id)}
                                    className="glass"
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '20px',
                                        textAlign: 'left',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        background: 'rgba(255, 255, 255, 0.5)'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{app.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{app.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeApp && activeMessages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '80px', gap: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {activeApp.starters.map((s, idx) => (
                                <button
                                    key={s.label}
                                    onClick={() => handleStarter(s.text, s.tags)}
                                    className="glass"
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px 20px',
                                        width: '260px',
                                        textAlign: 'left',
                                        transition: 'all 0.3s',
                                        animation: `fadeIn 0.5s ease-out ${idx * 0.1}s both`,
                                        background: 'white',
                                        border: '1px solid var(--border-light)'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.borderColor = 'var(--border-light)';
                                    }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{s.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {s.text}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeMessages.map((m, idx) => {
                    const isLastUserMessage = m.role === 'user' && (
                        idx === activeMessages.length - 1 ||
                        (idx === activeMessages.length - 2 && activeMessages[activeMessages.length - 1]?.role === 'assistant')
                    );

                    return (
                        <div key={m.id} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '32px',
                            animation: `fadeIn 0.4s ease-out`
                        }}>
                            <div style={{
                                maxWidth: m.role === 'user' ? '70%' : '90%',
                                padding: m.role === 'user' ? '12px 20px' : '0 12px', // Minimal padding via containment for AI
                                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '0',
                                backgroundColor: m.role === 'user' ? 'white' : 'transparent',
                                color: 'var(--text-primary)',
                                boxShadow: m.role === 'user' ? 'var(--shadow-sm)' : 'none',
                                border: m.role === 'user' ? '1px solid var(--border-subtle)' : 'none'
                            }}>
                                {m.attachments && m.attachments.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        {m.attachments.map((a, i) => (
                                            <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', background: '#f5f5f5', border: '1px solid var(--border-light)' }}>
                                                {a.mimeType.startsWith('image/') ? (
                                                    <img src={a.data} alt={a.name} style={{ maxWidth: '200px', maxHeight: '200px', display: 'block' }} />
                                                ) : (
                                                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                                        <FileText size={16} />
                                                        <span>{a.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {m.role === 'user' ? (
                                    <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.content}</div>
                                ) : (
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content) as string) }} />
                                )}
                            </div>

                            {/* Rerun button */}
                            {isLastUserMessage && (
                                <button
                                    className="btn-reset"
                                    onClick={onRerunMessage}
                                    disabled={isLoading}
                                    title="Regenerate"
                                    style={{
                                        marginTop: '8px',
                                        marginRight: '8px',
                                        padding: '6px 10px',
                                        borderRadius: '20px',
                                        color: 'var(--text-tertiary)',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-subtle)',
                                        opacity: isLoading ? 0.5 : 1,
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.75rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; } }}
                                    onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; } }}
                                >
                                    <RefreshCw size={12} />
                                    <span>Regenerate</span>
                                </button>
                            )}
                        </div>
                    );
                })}

                {streamingContent && (
                    <div style={{ display: 'flex', marginBottom: '32px', justifyContent: 'flex-start' }}>
                        <div style={{
                            maxWidth: '90%',
                            padding: '0 12px', // Consistency with AI message style
                        }}>
                            <SmoothStreaming content={streamingContent} isLoading={isLoading} />
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <div className="glass" style={{
                            padding: '12px 20px',
                            borderRadius: '12px',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            maxWidth: '100%',
                            wordBreak: 'break-word'
                        }}>
                            <Sparkles size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>{error}</div>
                            <button className="btn-reset" onClick={onClearError} style={{ color: 'inherit', opacity: 0.6, flexShrink: 0 }}><X size={14} /></button>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* Pending Attachments */}
                {attachments.length > 0 && (
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        marginBottom: '12px',
                        overflowX: 'auto',
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        {attachments.map((a, i) => (
                            <div key={i} style={{
                                position: 'relative',
                                width: '64px',
                                height: '64px',
                                borderRadius: '12px',
                                background: 'white',
                                border: '1px solid var(--border-light)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                {a.mimeType.startsWith('image/') ? (
                                    <img src={a.data} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                ) : (
                                    <FileText size={24} style={{ color: 'var(--text-tertiary)' }} />
                                )}
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: 'var(--text-primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid white',
                                        boxShadow: 'var(--shadow-sm)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="glass-panel" style={{
                    borderRadius: '24px',
                    padding: '8px',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: 'rgba(255, 255, 255, 0.85)'
                }} onFocusCapture={e => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                }} onBlurCapture={e => {
                    e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.85)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                }}>

                    {/* Tags Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', flexWrap: 'wrap' }}>
                        <Command size={14} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-label)', letterSpacing: '0.05em' }}>CONTEXT</span>

                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn-reset"
                                style={{ color: 'var(--text-tertiary)', display: 'flex', padding: '4px', borderRadius: '4px', transition: 'background 0.2s' }}
                                onClick={toggleInputContext}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Plus size={16} />
                            </button>
                            {showInputContextSelector && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowInputContextSelector(false)} />
                                    <div className="glass-panel" style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        marginBottom: '12px',
                                        width: '260px',
                                        borderRadius: '16px',
                                        zIndex: 100,
                                        padding: '12px',
                                        animation: 'fadeIn 0.2s ease-out',
                                        background: 'rgba(255, 255, 255, 0.98)',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 -10px 40px -10px rgba(0,0,0,0.2), var(--shadow-card)'
                                    }}>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="Search..."
                                            className="input-reset"
                                            style={{ borderBottom: '1px solid var(--border-subtle)', padding: '6px', fontSize: '0.85rem', marginBottom: '8px' }}
                                            value={contextSearch}
                                            onChange={e => setContextSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCustomContext()}
                                        />
                                        <div style={{ overflowY: 'auto', maxHeight: '180px', display: 'flex', flexDirection: 'column' }}>
                                            {filteredContexts.map(ctx => (
                                                <button
                                                    key={ctx.id}
                                                    className="btn-reset"
                                                    style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'left' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-soft)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => handleAddContext(ctx)}
                                                >
                                                    {ctx.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {tags.map(t => (
                            <span key={t} style={{
                                fontSize: '0.8rem',
                                background: 'white',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                                {t}
                                <button className="btn-reset" onClick={() => setTags(tags.filter(x => x !== t))} style={{ color: 'var(--text-tertiary)' }}><X size={12} /></button>
                            </span>
                        ))}
                    </div>

                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className="input-reset"
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            minHeight: '60px',
                            maxHeight: '300px',
                            resize: 'none',
                            fontSize: '1rem',
                            lineHeight: 1.6,
                            color: 'var(--text-primary)'
                        }}
                    />

                    <div style={{
                        padding: '8px 16px 8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <button className="btn-reset" title="Attach" onClick={() => fileInputRef.current?.click()} style={{ padding: '6px', borderRadius: '8px', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Paperclip size={18} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                accept="image/*,application/pdf,text/*"
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                <kbd style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '4px', border: '1px solid var(--border-subtle)' }}>Shift + Return</kbd> to newline
                            </span>
                        </div>

                        <button
                            className="btn-reset"
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && attachments.length === 0)}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: isLoading || (!input.trim() && attachments.length === 0) ? 'var(--border-light)' : 'var(--text-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: isLoading || (!input.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
                                padding: 0
                            }}
                        >
                            <div style={{ margin: 'auto' }}><ArrowUp size={20} /></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
