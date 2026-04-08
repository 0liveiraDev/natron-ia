import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
    rank: string;
    level: number;
    currentXp: number;
    xpPhysical: number;
    xpDiscipline: number;
    xpMental: number;
    xpIntellect: number;
    xpProductivity: number;
    xpFinancial: number;
}

interface UserContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    updateUserXp: (xpGained: number) => void;
    clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error: any) {
            console.error('Error fetching user:', error);
            // ONLY clear token on 401 (truly invalid token)
            // Do NOT clear on network errors, timeouts, 500s etc
            if (error?.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        await fetchUser();
    };

    // Optimistic update for immediate UI feedback
    const updateUserXp = (xpGained: number) => {
        if (user) {
            setUser({
                ...user,
                currentXp: user.currentXp + xpGained
            });
        }
    };

    // Clear user data on logout
    const clearUser = () => {
        setUser(null);
        setLoading(false);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token) {
            // No token = instant redirect to login, no loading needed
            setLoading(false);
            return;
        }

        // Has token = try to fetch user data with short timeout
        let isCancelled = false;
        const timeoutId = setTimeout(() => {
            if (!isCancelled) {
                console.warn('User fetch timeout - releasing loading state');
                setLoading(false);
            }
        }, 1500); // 1.5 second timeout for ultra-fast fallback

        fetchUser().finally(() => {
            if (!isCancelled) {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        });

        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, []);

    return (
        <UserContext.Provider value={{ user, loading, refreshUser, updateUserXp, clearUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
