import { useEffect, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatContainer } from './components/Chat/ChatContainer';
import './App.css';

function App() {
    const { user, isAuthenticated, isLoading: authLoading, login, logout } = useAuth();
    const {
        conversations,
        currentConversation,
        messages,
        isStreaming,
        streamingContent,
        activeTool,
        loadConversations,
        createConversation,
        selectConversation,
        deleteConversation,
        sendMessage,
        clearAllState
    } = useChat();

    const previousUserIdRef = useRef<string | null>(null);

    // Clear chat state when user changes (logout or different user logs in)
    useEffect(() => {
        const currentUserId = user?.id || null;

        if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
            clearAllState();
        }

        previousUserIdRef.current = currentUserId;
    }, [user?.id, clearAllState]);

    // Load conversations when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            loadConversations();
        }
    }, [isAuthenticated, loadConversations]);

    if (authLoading) {
        return (
            <div className="app-loading">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginForm onLogin={login} isLoading={authLoading} />;
    }

    return (
        <div className="app">
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversation?.id || null}
                onSelectConversation={selectConversation}
                onNewConversation={createConversation}
                onDeleteConversation={deleteConversation}
                onLogout={logout}
                userEmail={user?.email || ''}
            />
            <main className="app-main">
                <ChatContainer
                    messages={messages}
                    isStreaming={isStreaming}
                    streamingContent={streamingContent}
                    activeTool={activeTool}
                    onSendMessage={sendMessage}
                    userEmail={user?.email}
                />
            </main>
        </div>
    );
}

export default App;
