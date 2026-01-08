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

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onNewChat={startNewChat}
                onSelectConversation={setCurrentConversationId}
            />
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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
