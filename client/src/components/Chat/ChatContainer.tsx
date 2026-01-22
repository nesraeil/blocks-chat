import { useState, FormEvent, useRef, useEffect } from 'react';
import { Message as MessageType } from '../../types';
import { Message } from './Message';
import './ChatContainer.css';

interface ChatContainerProps {
    messages: MessageType[];
    isStreaming: boolean;
    streamingContent: string;
    activeTool: string | null;
    onSendMessage: (content: string) => void;
    userEmail?: string;
}

// Tool categories with icons and examples
const toolCategories = [
    {
        id: 'create_page',
        name: 'Build Pages',
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
            </svg>
        ),
        examples: [
            'Build a signup form with email, password, and a "Get Started" button',
            'Create a team page with photo cards for 4 team members',
            'Design a product showcase with features, pricing, and testimonials',
        ]
    },
    {
        id: 'analyze_data',
        name: 'Analyze Data',
        icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
        ),
        examples: [
            'Analyze our Q1 survey scores: Product 8.2, Support 7.9, Delivery 6.5, Price 7.1',
            'Give me insights about our website traffic: Mon 1.2k, Tue 1.8k, Wed 2.1k, Thu 1.9k, Fri 3.2k, Sat 4.1k, Sun 2.8k',
            'Compare expenses: Rent $2400, Food $850, Transport $320, Utilities $180, Entertainment $290',
        ]
    }
];

// Tool display names for loading indicator
const toolDisplayNames: Record<string, string> = {
    create_page: 'Building your page',
    analyze_data: 'Analyzing your data'
};

export function ChatContainer({
    messages,
    isStreaming,
    streamingContent,
    activeTool,
    onSendMessage,
    userEmail,
}: ChatContainerProps) {
    const [input, setInput] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [displayedCategory, setDisplayedCategory] = useState<string | null>(null);
    const [activeToolHint, setActiveToolHint] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent, activeTool]);

    // Handle delayed content removal for collapse animation
    useEffect(() => {
        if (selectedCategory) {
            // When opening, show content immediately
            setDisplayedCategory(selectedCategory);
        } else if (displayedCategory) {
            // When closing, delay content removal until after animation
            const timer = setTimeout(() => {
                setDisplayedCategory(null);
            }, 400); // Match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [selectedCategory]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    // Detect which tool category the input might use
    useEffect(() => {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('page') || lowerInput.includes('form') || lowerInput.includes('landing')) {
            setActiveToolHint('create_page');
        } else if (lowerInput.includes('analyze') || lowerInput.includes('data') || lowerInput.includes('insight') || /\d+/.test(input)) {
            setActiveToolHint('analyze_data');
        } else {
            setActiveToolHint(null);
        }
    }, [input]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        onSendMessage(input.trim());
        setInput('');
        setSelectedCategory(null);
        setActiveToolHint(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleCategoryClick = (categoryId: string) => {
        setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    };

    const handleExampleClick = (example: string, categoryId: string) => {
        setInput(example);
        setActiveToolHint(categoryId);
        setSelectedCategory(null);
        textareaRef.current?.focus();
    };

    const activeToolIcon = toolCategories.find(c => c.id === activeToolHint);

    return (
        <div className="chat-container">
            {messages.length === 0 && !isStreaming ? (
                <div className="chat-empty">
                    <h2>How can I help you today?</h2>
                    <p>Choose a capability or just start typing</p>


                    {/* Category chips */}
                    <div className="tool-categories">
                        {toolCategories.map((category) => (
                            <button
                                key={category.id}
                                className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(category.id)}
                            >
                                <span className="category-icon">{category.icon}</span>
                                <span>{category.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Example prompts (animated expand/collapse) */}
                    <div className={`example-prompts ${selectedCategory ? 'expanded' : 'collapsed'}`}>
                        {displayedCategory && (() => {
                            const categoryData = toolCategories.find(c => c.id === displayedCategory);
                            if (!categoryData) return null;
                            return (
                                <>
                                    <span className="examples-label">Try something like:</span>
                                    {categoryData.examples.map((example, idx) => (
                                        <button
                                            key={idx}
                                            className="example-prompt"
                                            onClick={() => handleExampleClick(example, categoryData.id)}
                                        >
                                            <span className="example-icon">{categoryData.icon}</span>
                                            <span className="example-text">{example.split('\n')[0]}</span>
                                        </button>
                                    ))}
                                </>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div className="chat-messages">
                    {messages.map((message, index) => (
                        <Message
                            key={message.id}
                            message={message}
                            isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                            streamingContent={index === messages.length - 1 ? streamingContent : undefined}
                            userEmail={userEmail}
                        />
                    ))}

                    {/* Show tool loading indicator */}
                    {activeTool && (
                        <div className="tool-loading-indicator">
                            <div className="tool-spinner">
                                <svg viewBox="0 0 50 50" width="32" height="32">
                                    <circle className="spinner-track" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
                                    <circle className="spinner-path" cx="25" cy="25" r="20" fill="none" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                            </div>
                            <span className="tool-loading-text">
                                {toolDisplayNames[activeTool] || 'Working'}...
                            </span>
                        </div>
                    )}

                    {/* Show streaming message when we have content but no tool active */}
                    {isStreaming && !activeTool && messages[messages.length - 1]?.role !== 'assistant' && (
                        <Message
                            message={{
                                id: 'streaming',
                                conversation_id: '',
                                role: 'assistant',
                                content: '',
                                created_at: new Date().toISOString()
                            }}
                            isStreaming={true}
                            streamingContent={streamingContent}
                        />
                    )}

                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className="chat-input-container">
                <form onSubmit={handleSubmit} className="chat-input-form">
                    <div className="chat-input-wrapper">
                        {/* Tool hint icon */}
                        {activeToolIcon && (
                            <div className="input-tool-hint" title={`This will use ${activeToolIcon.name}`}>
                                {activeToolIcon.icon}
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            disabled={isStreaming}
                            rows={1}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary send-btn"
                            disabled={!input.trim() || isStreaming}
                        >
                            {isStreaming ? (
                                <span className="spinner"></span>
                            ) : (
                                <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <p className="chat-input-hint">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </form>
            </div>
        </div>
    );
}
