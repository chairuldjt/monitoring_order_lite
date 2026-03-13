'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    profile_image?: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    handleAuthError: (error: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            const userData = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (userData && token) {
                try {
                    setUser(JSON.parse(userData));
                    const response = await fetch('/api/user/profile');
                    if (!response.ok) {
                        if (response.status === 401) {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            setUser(null);
                        }
                    } else {
                        const result = await response.json();
                        setUser(result.data);
                        localStorage.setItem('user', JSON.stringify(result.data));
                    }
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
    };

    const refreshUser = async () => {
        try {
            const response = await fetch('/api/user/profile');
            const result = await response.json();
            if (response.ok) {
                const updatedUser = result.data;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
            }
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    };

    const handleAuthError = (error: any) => {
        if (error?.status === 401 || error?.response?.status === 401) {
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, handleAuthError }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
