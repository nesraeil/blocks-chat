import { useState, useCallback, useRef } from 'react';
import { Message, Conversation, SSEEvent } from '../types';
import { apiClient } from '../api/client';

export function useChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    // Simple string to track which tool is currently running (null = no tool running)
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingContentRef = useRef('');

    // Load conversations
    const loadConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            const { conversations: convs } = await apiClient.getConversations();
            setConversations(convs);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Create new conversation
    const createConversation = useCallback(async () => {
        try {
            const { conversation } = await apiClient.createConversation();
            setConversations(prev => [conversation, ...prev]);
            setCurrentConversation(conversation);
            setMessages([]);
            return conversation;
        } catch (error) {
            console.error('Failed to create conversation:', error);
            throw error;
        }
    }, []);

    // Select conversation
    const selectConversation = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const { conversation, messages: msgs } = await apiClient.getConversation(id);
            setCurrentConversation(conversation);
            setMessages(msgs);
        } catch (error) {
            console.error('Failed to load conversation:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Delete conversation
    const deleteConversation = useCallback(async (id: string) => {
        try {
            await apiClient.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversation?.id === id) {
                setCurrentConversation(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    }, [currentConversation?.id]);

    // Send message
    const sendMessage = useCallback(async (content: string) => {
        let conversationId = currentConversation?.id;

        if (!conversationId) {
            const conversation = await createConversation();
            if (!conversation) return;
            conversationId = conversation.id;
        }

        // Add user message optimistically
        const userMessage: Message = {
            id: `temp-${Date.now()}`,
            conversation_id: conversationId,
            role: 'user',
            content,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);

        // Start streaming
        setIsStreaming(true);
        setStreamingContent('');
        streamingContentRef.current = '';
        setActiveTool(null);

        try {
            for await (const data of apiClient.streamChat(conversationId, content)) {
                try {
                    const event: SSEEvent = JSON.parse(data);

                    switch (event.type) {
                        case 'content_delta':
                            streamingContentRef.current += event.content || '';
                            setStreamingContent(prev => prev + (event.content || ''));
                            break;

                        case 'tool_call_started':
                            // Just track which tool is running
                            setActiveTool(event.tool || null);
                            break;

                        case 'tool_call_result':
                            // Tool finished - clear active tool
                            setActiveTool(null);
                            break;

                        case 'message_complete':
                        case 'done':
                            // Clear streaming state
                            setIsStreaming(false);
                            setStreamingContent('');
                            streamingContentRef.current = '';
                            setActiveTool(null);

                            // Reload messages from server to get full data including tool_result
                            if (conversationId) {
                                try {
                                    const { messages: updatedMsgs } = await apiClient.getConversation(conversationId);
                                    setMessages(updatedMsgs);
                                } catch {
                                    // Fallback: add message locally
                                    const finalContent = streamingContentRef.current;
                                    if (finalContent) {
                                        setMessages(prev => [...prev, {
                                            id: event.messageId || `msg-${Date.now()}`,
                                            conversation_id: conversationId,
                                            role: 'assistant',
                                            content: finalContent,
                                            created_at: new Date().toISOString()
                                        }]);
                                    }
                                }
                            }
                            break;

                        case 'error':
                            console.error('Stream error:', event.message);
                            break;
                    }
                } catch {
                    // Ignore JSON parse errors
                }
            }

            loadConversations();
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsStreaming(false);
            setStreamingContent('');
            setActiveTool(null);
        }
    }, [currentConversation, createConversation, loadConversations]);

    // Stop streaming
    const stopStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setActiveTool(null);
    }, []);

    // Clear all state (for logout/user switch)
    const clearAllState = useCallback(() => {
        setConversations([]);
        setCurrentConversation(null);
        setMessages([]);
        setIsLoading(false);
        setIsStreaming(false);
        setStreamingContent('');
        setActiveTool(null);
        streamingContentRef.current = '';
    }, []);

    return {
        conversations,
        currentConversation,
        messages,
        isLoading,
        isStreaming,
        streamingContent,
        activeTool,
        loadConversations,
        createConversation,
        selectConversation,
        deleteConversation,
        sendMessage,
        stopStreaming,
        clearAllState
    };
}
