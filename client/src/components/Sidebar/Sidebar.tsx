import { Conversation } from '../../types';
import './Sidebar.css';

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
    onLogout: () => void;
    userEmail: string;
}

export function Sidebar({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onLogout,
    userEmail
}: SidebarProps) {
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="/logo.png" alt="Blocks" className="logo-image" />
                    <span className="logo-text">Blocks</span>
                </div>
                <button className="btn btn-primary new-chat-btn" onClick={onNewConversation}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Chat
                </button>
            </div>

            <div className="sidebar-conversations">
                <div className="conversations-label">Recent Chats</div>
                <div className="conversations-list">
                    {conversations.length === 0 ? (
                        <div className="no-conversations">
                            <p>No conversations yet</p>
                            <p className="hint">Start a new chat to begin</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                                onClick={() => onSelectConversation(conv.id)}
                            >
                                <div className="conversation-icon">
                                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="conversation-content">
                                    <div className="conversation-title">{conv.title}</div>
                                    <div className="conversation-date">{formatDate(conv.updated_at)}</div>
                                </div>
                                <button
                                    className="conversation-delete btn btn-ghost btn-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteConversation(conv.id);
                                    }}
                                    title="Delete conversation"
                                >
                                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="avatar">
                        {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <div className="user-email">{userEmail}</div>
                    </div>
                </div>
                <button className="btn btn-ghost btn-icon logout-btn" onClick={onLogout} title="Logout">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </aside>
    );
}
