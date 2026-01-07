import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { useAppLogic } from '../hooks/useAppLogic';
import '../index.css';

export const Layout: React.FC = () => {
    const {
        currentApp,
        messages,
        conversations,
        currentConversationId,
        isLoading,
        streamingContent,
        startNewChat,
        sendMessage,
        setCurrentConversationId
    } = useAppLogic();

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onNewChat={startNewChat}
                onSelectConversation={setCurrentConversationId}
                onSearch={(q: string) => { console.log('Search not impl in DB yet', q) }}
            />
            <main style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <ChatArea
                    currentApp={currentApp}
                    messages={messages}
                    isLoading={isLoading}
                    streamingContent={streamingContent}
                    onSendMessage={sendMessage}
                />
            </main>
        </div>
    );
};
