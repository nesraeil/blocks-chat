import { User, Conversation, Message, LoginResponse } from '../types';

const API_BASE = '/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null): void {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    // Auth endpoints
    async login(email: string): Promise<LoginResponse> {
        return this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async getMe(): Promise<{ user: User }> {
        return this.request<{ user: User }>('/auth/me');
    }

    async logout(): Promise<void> {
        await this.request('/auth/logout', { method: 'POST' });
    }

    // Conversation endpoints
    async getConversations(): Promise<{ conversations: Conversation[] }> {
        return this.request<{ conversations: Conversation[] }>('/conversations');
    }

    async createConversation(title?: string): Promise<{ conversation: Conversation }> {
        return this.request<{ conversation: Conversation }>('/conversations', {
            method: 'POST',
            body: JSON.stringify({ title })
        });
    }

    async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
        return this.request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`);
    }

    async deleteConversation(id: string): Promise<void> {
        await this.request(`/conversations/${id}`, { method: 'DELETE' });
    }

    // Chat endpoint - returns EventSource for SSE
    sendMessage(conversationId: string, message: string): EventSource {
        // We need to use POST with fetch and handle SSE manually
        // because EventSource only supports GET requests
        const controller = new AbortController();

        fetch(`${API_BASE}/chat/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ message }),
            signal: controller.signal
        }).then(response => {
            if (!response.ok) {
                throw new Error('Chat request failed');
            }
            return response;
        });

        // Create a custom EventSource-like object
        const eventSource = {
            _controller: controller,
            close: () => controller.abort()
        } as unknown as EventSource;

        return eventSource;
    }

    // Alternative: fetch with streaming for SSE POST requests
    async *streamChat(conversationId: string, message: string): AsyncGenerator<string> {
        const response = await fetch(`${API_BASE}/chat/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Chat request failed');
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    yield line.slice(6);
                }
            }
        }

        // Process any remaining data
        if (buffer.startsWith('data: ')) {
            yield buffer.slice(6);
        }
    }
}

export const apiClient = new ApiClient();
