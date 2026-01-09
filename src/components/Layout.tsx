import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { useAppLogic } from '@/hooks/useAppLogic';
import '../index.css';

export const Layout: React.FC = () => {
    const {
        currentApp,
        messages,
        conversations,
        currentConversationId,
        isLoading,
        streamingContent,
        error,
        startNewChat,
        sendMessage,
        rerunMessage,
        setCurrentConversationId,
        clearError
    } = useAppLogic();

    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onNewChat={startNewChat}
                onSelectConversation={setCurrentConversationId}
                isCollapsed={isCollapsed}
                onToggle={() => setIsCollapsed(!isCollapsed)}
            />
            {/* Main Content Area - Drawer Effect */}
            <main style={{
                // Fixed width: full viewport minus the *collapsed* sidebar width (80px).
                // This ensures the content is always the "correct" wide width.
                // When sidebar expands (to 280px), it pushes this fixed-width block
                // to the right, causing the right side to overflow off-screen.
                width: 'calc(100vw - 80px)',
                minWidth: 'calc(100vw - 80px)',
                flexShrink: 0,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                // Optional: visual separator
                borderLeft: '1px solid var(--border-subtle)'
            }}>
                <ChatArea
                    currentApp={currentApp}
                    messages={messages}
                    isLoading={isLoading}
                    streamingContent={streamingContent}
                    error={error}
                    onSendMessage={sendMessage}
                    onRerunMessage={rerunMessage}
                    onClearError={clearError}
                    onSelectApp={startNewChat}
                />
            </main>
        </div>
    );
};
