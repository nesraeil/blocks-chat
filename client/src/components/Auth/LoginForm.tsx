import { useState, FormEvent } from 'react';
import './LoginForm.css';

interface LoginFormProps {
    onLogin: (email: string) => Promise<{ success: boolean; error?: string }>;
    isLoading: boolean;
}

export function LoginForm({ onLogin, isLoading }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim()) {
            setError('Please enter your email');
            return;
        }

        const result = await onLogin(email.trim());
        if (!result.success && result.error) {
            setError(result.error);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card">
                <div className="login-header">
                    <div className="login-logo">
                        <img src="/logo.png" alt="Blocks" style={{ width: 64, height: 64, borderRadius: 8 }} />
                    </div>
                    <h1>Welcome to Blocks</h1>
                    <p className="login-subtitle">Build applications through intelligent conversation</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            disabled={isLoading}
                            autoFocus
                            autoComplete="email"
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="error-icon">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Continue with Email'
                        )}
                    </button>
                </form>

                <p className="login-footer">
                    By continuing, you agree to our Terms of Service
                </p>
            </div>

            <div className="login-background">
                <div className="bg-gradient bg-gradient-1"></div>
                <div className="bg-gradient bg-gradient-2"></div>
                <div className="bg-gradient bg-gradient-3"></div>
            </div>
        </div>
    );
}
