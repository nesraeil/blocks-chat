import { useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import { apiClient } from '../api/client';

const TOKEN_KEY = 'blocks_auth_token';

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true
    });

    // Load token from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        if (savedToken) {
            apiClient.setToken(savedToken);
            // Verify token is still valid
            apiClient.getMe()
                .then(({ user }) => {
                    setState({
                        user,
                        token: savedToken,
                        isLoading: false
                    });
                })
                .catch(() => {
                    // Token invalid, clear it
                    localStorage.removeItem(TOKEN_KEY);
                    apiClient.setToken(null);
                    setState({
                        user: null,
                        token: null,
                        isLoading: false
                    });
                });
        } else {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, []);

    const login = useCallback(async (email: string) => {
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const { token, user } = await apiClient.login(email);
            localStorage.setItem(TOKEN_KEY, token);
            apiClient.setToken(token);
            setState({
                user,
                token,
                isLoading: false
            });
            return { success: true };
        } catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed'
            };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiClient.logout();
        } catch {
            // Ignore logout errors
        }
        localStorage.removeItem(TOKEN_KEY);
        apiClient.setToken(null);
        setState({
            user: null,
            token: null,
            isLoading: false
        });
    }, []);

    return {
        user: state.user,
        isAuthenticated: !!state.user,
        isLoading: state.isLoading,
        login,
        logout
    };
}
