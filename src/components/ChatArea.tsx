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

        // If content jumped significantly, just sync it (initial load)
        if (content.length - displayedContent.length > 50) {
            setDisplayedContent(content);
            return;
        }

        const tick = () => {
            if (displayedContent.length < content.length) {
                setDisplayedContent(prev => content.slice(0, prev.length + 2)); // Add 2 chars at a time for speed/smoothness balance
                timerRef.current = setTimeout(tick, 15);
            }
        };

        tick();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [content]);

    // Cleanup on stop loading
    useEffect(() => {
        if (!isLoading) {
            setDisplayedContent(content);
        }
    }, [isLoading, content]);

    const sanitizedHtml = useMemo(() => {
        const rawHtml = marked.parse(displayedContent) as string;
        return DOMPurify.sanitize(rawHtml);
    }, [displayedContent]);

    return (
        <div className="markdown-content" style={{ position: 'relative' }}>
            <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} style={{ display: 'inline' }} />
            {isLoading && (
                <span style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '1.2em',
                    backgroundColor: 'var(--text-primary)',
                    marginLeft: '4px',
                    borderRadius: '1px',
                    animation: 'blink 0.8s infinite',
                    verticalAlign: 'text-bottom'
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredContexts = PRESET_CONTEXTS.filter(c =>
        c.label.toLowerCase().includes(contextSearch.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(contextSearch.toLowerCase()))
    );

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    // Refined transition logic (still using effect but with better scheduling and cleanup)
    useEffect(() => {
        let isCancelled = false;

        // Use requestAnimationFrame or setTimeout to move out of the render phase
        const timeoutId = setTimeout(() => {
            if (isCancelled) return;
            setIsTransitioning(true);

            const transitionTimeout = setTimeout(() => {
                if (isCancelled) return;
                setTags([]);
                setInput('');
                setAttachments([]);
                setIsTransitioning(false);
            }, 150);

            return () => clearTimeout(transitionTimeout);
        }, 0);

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [currentApp?.id]);

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
            transform: isTransitioning ? 'translateY(12px)' : 'translateY(0)',
            transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            padding: '24px'
        }}>
            {/* Header Area */}
            <header className="glass" style={{
                height: 'var(--header-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-card)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {currentApp?.title || '欢迎'}
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                            {currentApp?.description || '请选择一个专业工具开始对话'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                    <div className="nav-header" style={{ margin: 0, padding: 0, fontSize: '0.65rem' }}>Global Context</div>
                    <button
                        className="btn-reset glass"
                        onClick={() => setShowContextSelector(!showContextSelector)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s'
                        }}
                    >
                        <Plus size={16} />
                    </button>

                    {showContextSelector && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowContextSelector(false)} />
                            <div className="glass" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '12px',
                                width: '280px',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-card)',
                                zIndex: 20,
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="搜索或自定义..."
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
                                            style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', transition: 'background 0.2s' }}
                                            onClick={() => handleAddContext(ctx)}
                                        >
                                            <div style={{ fontWeight: 600 }}>{ctx.label}</div>
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
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '24px', paddingRight: '12px' }}>
                {!currentApp && messages.length === 0 && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '40px',
                        animation: 'fadeIn 0.6s ease-out'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'inline-flex',
                                padding: '16px',
                                borderRadius: '24px',
                                background: 'var(--accent-soft)',
                                color: 'var(--accent-primary)',
                                marginBottom: '20px'
                            }}>
                                <Sparkles size={40} strokeWidth={1.5} />
                            </div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>
                                A P E R T U R E
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 400 }}>
                                你的智能工作流伙伴
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '640px', width: '100%' }}>
                            {APPS.map(app => (
                                <button
                                    key={app.id}
                                    onClick={() => onSelectApp(app.id)}
                                    className="glass"
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        textAlign: 'left',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.border = '1px solid var(--text-tertiary)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.border = '1px solid var(--border-subtle)';
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{app.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{app.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {currentApp && messages.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '60px', gap: '24px' }}>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {currentApp.starters.map((s, idx) => (
                                <button
                                    key={s.label}
                                    onClick={() => handleStarter(s.text, s.tags)}
                                    className="glass"
                                    style={{
                                        cursor: 'pointer',
                                        borderRadius: '20px',
                                        padding: '20px',
                                        width: '260px',
                                        textAlign: 'left',
                                        transition: 'all 0.3s',
                                        animation: `fadeIn 0.5s ease-out ${idx * 0.1}s both`
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>{s.label}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                                        {s.text}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, idx) => {
                    // Show rerun button on the last user message (either the very last message, or second-to-last if last is assistant)
                    const isLastUserMessage = m.role === 'user' && (
                        idx === messages.length - 1 ||
                        (idx === messages.length - 2 && messages[messages.length - 1]?.role === 'assistant')
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
                                padding: m.role === 'user' ? '12px 20px' : '24px',
                                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : 'var(--radius-md)',
                                backgroundColor: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                color: m.role === 'user' ? 'white' : 'var(--text-primary)',
                                boxShadow: m.role === 'user' ? '0 4px 12px rgba(0,0,0,0.1)' : 'var(--shadow-card)',
                                border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)'
                            }}>
                                {m.attachments && m.attachments.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        {m.attachments.map((a, i) => (
                                            <div key={i} style={{ borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(0,0,0,0.05)' }}>
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
                                    <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                                ) : (
                                    <div className="markdown-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content) as string) }} />
                                )}
                            </div>
                            {/* Rerun button - show below last user message */}
                            {isLastUserMessage && (
                                <button
                                    className="btn-reset"
                                    onClick={onRerunMessage}
                                    disabled={isLoading}
                                    title="Rerun"
                                    style={{
                                        marginTop: '8px',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        color: 'var(--text-tertiary)',
                                        opacity: isLoading ? 0.3 : 0.6,
                                        transition: 'opacity 0.2s',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem'
                                    }}
                                    onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '1'; }}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                                >
                                    <RefreshCw size={12} />
                                    <span>Rerun</span>
                                </button>
                            )}
                        </div>
                    );
                })}

                {streamingContent && (
                    <div style={{ display: 'flex', marginBottom: '32px', justifyContent: 'flex-start' }}>
                        <div className="glass" style={{
                            maxWidth: '90%',
                            padding: '24px',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-card)',
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
                            color: '#d32f2f',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1px solid rgba(211, 47, 47, 0.1)'
                        }}>
                            <Sparkles size={16} />
                            {error}
                            <button className="btn-reset" onClick={onClearError} style={{ color: 'inherit', opacity: 0.6 }}><X size={14} /></button>
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
                        marginBottom: '8px',
                        overflowX: 'auto',
                        background: 'rgba(255,255,255,0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(4px)'
                    }}>
                        {attachments.map((a, i) => (
                            <div key={i} style={{
                                position: 'relative',
                                width: '64px',
                                height: '64px',
                                borderRadius: '8px',
                                background: 'white',
                                border: '1px solid var(--border-light)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {a.mimeType.startsWith('image/') ? (
                                    <img src={a.data} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                                ) : (
                                    <FileText size={24} style={{ color: 'var(--text-tertiary)' }} />
                                )}
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{
                                        position: 'absolute',
                                        top: '-6px',
                                        right: '-6px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        background: 'var(--text-primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid white',
                                        padding: 0,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="glass" style={{
                    borderRadius: '24px',
                    padding: '8px',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'box-shadow 0.3s'
                }} onFocusCapture={e => e.currentTarget.style.boxShadow = '0 12px 48px rgba(0,0,0,0.08)'}>

                    {/* Tags Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', flexWrap: 'wrap' }}>
                        <Command size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-label)', letterSpacing: '0.05em' }}>CONTEXT</span>

                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn-reset"
                                style={{ color: 'var(--text-tertiary)', display: 'flex', padding: '4px' }}
                                onClick={() => setShowInputContextSelector(!showInputContextSelector)}
                            >
                                <Plus size={16} />
                            </button>
                            {showInputContextSelector && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowInputContextSelector(false)} />
                                    <div className="glass" style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        marginBottom: '12px',
                                        width: '260px',
                                        borderRadius: '16px',
                                        boxShadow: 'var(--shadow-card)',
                                        zIndex: 20,
                                        padding: '12px',
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="搜索..."
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
                                                    style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem' }}
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
                                fontSize: '0.75rem',
                                background: 'white',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-light)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 500
                            }}>
                                {t}
                                <button className="btn-reset" onClick={() => setTags(tags.filter(x => x !== t))}><X size={10} /></button>
                            </span>
                        ))}
                    </div>

                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入消息，开启灵感..."
                        className="input-reset"
                        style={{
                            width: '100%',
                            padding: '16px 20px',
                            minHeight: '80px',
                            maxHeight: '300px',
                            resize: 'none',
                            fontSize: '1rem',
                            lineHeight: 1.6
                        }}
                    />

                    <div style={{
                        padding: '8px 16px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid hsla(var(--h), 10%, 90%, 0.3)'
                    }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <button className="btn-reset" title="上传" onClick={() => fileInputRef.current?.click()}>
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
                                <kbd style={{ background: '#eee', padding: '2px 4px', borderRadius: '4px', marginRight: '4px' }}>Shift</kbd>+<kbd style={{ background: '#eee', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px' }}>Enter</kbd> 换行
                            </span>
                        </div>

                        <button
                            className="btn-reset"
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && attachments.length === 0)}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '14px',
                                background: isLoading || (!input.trim() && attachments.length === 0) ? 'var(--accent-soft)' : 'var(--accent-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                cursor: isLoading || (!input.trim() && attachments.length === 0) ? 'not-allowed' : 'pointer',
                                padding: 0
                            }}
                        >
                            <div style={{ margin: 'auto' }}><ArrowUp size={22} /></div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
