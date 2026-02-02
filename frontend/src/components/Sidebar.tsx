import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useToast } from './Toast';
import { useUser } from '../contexts/UserContext';
import { Camera, LogOut, LayoutDashboard, Bot, CheckSquare, Target, Wallet } from 'lucide-react';

const Sidebar: React.FC = () => {
    const location = useLocation();
    const { showToast } = useToast();
    const { user, refreshUser, clearUser } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const prevRankRef = useRef<string | undefined>(undefined);

    const getAvatarUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiBase = import.meta.env.VITE_API_URL || 'https://natron-ia.onrender.com/api';
        const base = apiBase.replace('/api', '');
        const fullUrl = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
        console.log('🖼️ Avatar URL:', fullUrl);
        return fullUrl;
    };

    useEffect(() => {
        if (user?.rank) {
            // If we have a previous rank and it differs from current, trigger animation
            if (prevRankRef.current && prevRankRef.current !== user.rank) {
                setIsLevelingUp(true);
                const timer = setTimeout(() => setIsLevelingUp(false), 2000);
                return () => clearTimeout(timer);
            }
            // Update ref
            prevRankRef.current = user.rank;
        }
    }, [user?.rank]);

    const menuItems = [
        { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { path: '/atlas', icon: <Bot size={20} />, label: 'Friday' },
        { path: '/tasks', icon: <CheckSquare size={20} />, label: 'Tarefas' },
        { path: '/habits', icon: <Target size={20} />, label: 'Hábitos' },
        { path: '/finance', icon: <Wallet size={20} />, label: 'Financeiro' },
    ];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Limit file size (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Arquivo muito grande (Max 5MB)', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            await api.post('/auth/avatar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            showToast('Foto de perfil atualizada!', 'success');
            await refreshUser(); // Refresh user data from context
        } catch (error) {
            console.error('Upload avatar error:', error);
            showToast('Erro ao atualizar foto', 'error');
        }
    };

    const handleLogout = () => {
        clearUser(); // Clear UserContext
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // Get rank-specific colors
    const getRankColor = (rank: string) => {
        const rankColors: Record<string, { border: string, shadow: string, bg: string, text: string }> = {
            'Estudante da Academia': {
                border: '#6b7280', // Gray
                shadow: 'rgba(107, 116, 128, 0.3)',
                bg: 'rgba(107, 116, 128, 0.1)',
                text: '#9ca3af'
            },
            'Genin': {
                border: '#00ff88', // Green - Fixed from Gray
                shadow: 'rgba(0, 255, 136, 0.3)',
                bg: 'rgba(0, 255, 136, 0.1)',
                text: '#00ff88'
            },
            'Chunin': {
                border: '#fbbf24', // Yellow
                shadow: 'rgba(251, 191, 36, 0.3)',
                bg: 'rgba(251, 191, 36, 0.1)',
                text: '#fbbf24'
            },
            'Tokubetsu Jonin': {
                border: '#f97316', // Orange
                shadow: 'rgba(249, 115, 22, 0.3)',
                bg: 'rgba(249, 115, 22, 0.1)',
                text: '#f97316'
            },
            'Jonin': {
                border: '#ef4444', // Red
                shadow: 'rgba(239, 68, 68, 0.3)',
                bg: 'rgba(239, 68, 68, 0.1)',
                text: '#ef4444'
            },
            'ANBU': {
                border: '#e5e7eb', // Light Gray/White
                shadow: 'rgba(255, 255, 255, 0.2)',
                bg: 'rgba(255, 255, 255, 0.05)',
                text: '#e5e7eb'
            },
            'Sannin': {
                border: '#a855f7', // Purple
                shadow: 'rgba(168, 85, 247, 0.3)',
                bg: 'rgba(168, 85, 247, 0.1)',
                text: '#a855f7'
            },
            'Kage': {
                border: '#ffd700', // Gold
                shadow: 'rgba(255, 215, 0, 0.5)',
                bg: 'rgba(255, 215, 0, 0.1)',
                text: '#ffd700'
            },
        };
        return rankColors[rank] || rankColors['Estudante da Academia'];
    };

    const currentRankColor = getRankColor(user?.rank || 'Estudante da Academia');

    const calculateXpPercentage = (xp: number) => {
        const RANKS = [
            { name: 'Estudante da Academia', minXp: 0 },
            { name: 'Genin', minXp: 100 },
            { name: 'Chunin', minXp: 500 },
            { name: 'Tokubetsu Jonin', minXp: 1200 },
            { name: 'Jonin', minXp: 2500 },
            { name: 'ANBU', minXp: 3000 },
            { name: 'Sannin', minXp: 5000 },
            { name: 'Kage', minXp: 8000 },
        ];

        let min = 0;
        let max = 100;

        for (let i = 0; i < RANKS.length; i++) {
            if (xp >= RANKS[i].minXp) {
                min = RANKS[i].minXp;
                max = RANKS[i + 1]?.minXp || (xp * 1.5); // Fallback for last rank
            } else {
                break;
            }
        }

        const progress = ((xp - min) / (max - min)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    return (
        <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            className="w-64 h-screen glass-card border-r border-dark-600 p-6 flex flex-col"
        >
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="relative group mb-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <motion.div
                        className="w-24 h-24 rounded-full overflow-hidden border-2 p-0.5"
                        animate={isLevelingUp ? {
                            scale: [1, 1.25, 1],
                            borderColor: [currentRankColor.border, currentRankColor.text, currentRankColor.border],
                            boxShadow: [
                                `0 0 15px ${currentRankColor.shadow}`,
                                `0 0 30px ${currentRankColor.border}`,
                                `0 0 15px ${currentRankColor.shadow}`
                            ]
                        } : {
                            scale: 1,
                            borderColor: currentRankColor.border,
                            boxShadow: `0 0 15px ${currentRankColor.shadow}`
                        }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                    >
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1a1a] flex items-center justify-center relative">
                            {user?.avatarUrl ? (
                                <img src={getAvatarUrl(user.avatarUrl) || ''} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-gray-500">{user?.name?.charAt(0).toUpperCase()}</span>
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} className="text-white" />
                            </div>
                        </div>
                    </motion.div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {/* Content Container */}
                <div className="flex flex-col items-center w-full px-4 mt-2">

                    {/* Welcome Text (Name) */}
                    <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                        Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}!
                    </h2>

                    {/* Rank Badge */}
                    <div
                        className="inline-block px-3 py-0.5 rounded-full border mb-2 relative overflow-hidden"
                        style={{
                            backgroundColor: currentRankColor.bg,
                            borderColor: `${currentRankColor.border}33`,
                        }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.p
                                key={user?.rank || 'default'}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className="text-[10px] font-bold uppercase tracking-wider block"
                                style={{ color: currentRankColor.text }}
                            >
                                {user?.rank || 'Estudante da Academia'}
                            </motion.p>
                        </AnimatePresence>
                    </div>

                    {/* Progress Bar with smooth animation */}
                    <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden border border-[#333]">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#8e8e93] to-[#00ccff]"
                            initial={{ width: 0 }}
                            animate={{ width: `${calculateXpPercentage(user?.currentXp || 0)}%` }}
                            transition={{
                                type: "spring",
                                stiffness: 100,
                                damping: 15,
                                duration: 0.5
                            }}
                        />
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={Math.floor(user?.currentXp || 0)}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.3 }}
                            className="text-[10px] text-gray-500 mt-1 font-mono"
                        >
                            {Math.floor(user?.currentXp || 0)} XP
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path}>
                            <div className={`sidebar-item ${isActive ? 'active' : ''}`}>
                                <span className="text-xl">{item.icon}</span>
                                <span className="font-medium">{item.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-4 border-t border-[#333]">
                <button onClick={handleLogout} className="flex items-center gap-3 transition w-full px-4 py-2 rounded-lg hover:bg-red-500/10" style={{ color: 'var(--text-secondary)' }}>
                    <LogOut size={18} />
                    <span className="text-sm font-bold">Sair</span>
                </button>
            </div>
        </motion.aside >
    );
};

export default Sidebar;
