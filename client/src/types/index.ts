// User types
export interface User {
    id: string;
    email: string;
}

// Auth types
export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
}

export interface LoginResponse {
    token: string;
    user: User;
}

// Conversation types
export interface Conversation {
    id: string;
    user_id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

// Message types
export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    tool_name?: string;
    tool_input?: string;
    tool_result?: string;
    created_at: string;
}

// SSE Event types
export type SSEEventType =
    | 'content_delta'
    | 'tool_call_started'
    | 'tool_call_result'
    | 'message_complete'
    | 'error'
    | 'done';

export interface SSEEvent {
    type: SSEEventType;
    content?: string;
    tool?: string;
    input?: object;
    result?: object;
    messageId?: string;
    message?: string;
}

// API Response types
export interface ApiResponse<T> {
    data?: T;
    error?: string;
}
