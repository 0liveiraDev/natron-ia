import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    const currentDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    const getAvatarUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiBase = import.meta.env.VITE_API_URL || 'https://natron-ia.onrender.com/api';
        const base = apiBase.replace('/api', '');
        const fullUrl = `${base}${url.startsWith('/') ? '' : '/'}${url}`;
        return fullUrl;
    };

    const getRankColor = (rank: string) => {
        const rankColors: Record<string, string> = {
            'Estudante da Academia': '#6b7280',
            'Genin': '#00ff88',
            'Chunin': '#fbbf24',
            'Tokubetsu Jonin': '#f97316',
            'Jonin': '#ef4444',
            'ANBU': '#e5e7eb',
            'Sannin': '#a855f7',
            'Kage': '#ffd700',
        };
        return rankColors[rank] || '#6b7280';
    };

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
                max = RANKS[i + 1]?.minXp || (xp * 1.5);
            } else {
                break;
            }
        }

        const progress = ((xp - min) / (max - min)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const installPWA = () => {
        alert('Para instalar o Natron IA:\n\nNo iPhone: Toque no ícone de Compartilhar e selecione "Adicionar à Tela de Início".\n\nNo Android/Chrome: Clique no menu (três pontos) e selecione "Instalar aplicativo".');
    };

    const xpPercentage = calculateXpPercentage(user?.currentXp || 0);
    const currentColor = getRankColor(user?.rank || 'Estudante da Academia');

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="glass-card border-b border-dark-600 px-4 sm:px-8 py-3 flex items-center justify-between z-30"
        >
            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-xl font-semibold capitalize truncate">
                        {currentDate}
                    </h2>

                    {/* Mobile Profile Info */}
                    {user && (
                        <div className="flex md:hidden items-center gap-2 ml-2 pl-2 border-l border-white/10 overflow-hidden">
                            <div
                                className="w-8 h-8 rounded-full overflow-hidden border-2 flex-shrink-0"
                                style={{ borderColor: currentColor }}
                            >
                                {user.avatarUrl ? (
                                    <img src={getAvatarUrl(user.avatarUrl) || ''} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-dark-600 flex items-center justify-center text-[10px] font-bold">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] font-bold truncate text-white uppercase tracking-wider leading-none">
                                        {user.name.split(' ')[0]}
                                    </span>
                                    <span
                                        className="text-[8px] font-black uppercase tracking-widest leading-none px-1 rounded-[2px]"
                                        style={{ color: currentColor, backgroundColor: `${currentColor}15` }}
                                    >
                                        {user.rank}
                                    </span>
                                </div>
                                <div className="w-20 h-1 bg-dark-600 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-neon-green to-neon-blue"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpPercentage}%` }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                    onClick={installPWA}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 transition-colors text-[10px] sm:text-sm font-bold text-[#00ff88]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span className="hidden sm:inline">Instalar App</span>
                    <span className="sm:hidden">Instalar</span>
                </button>

                <button
                    onClick={() => navigate('/atlas')}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                >
                    <Bot size={16} className="text-[#ff9500]" />
                    Falar com a Friday
                </button>
            </div>
        </motion.header>
    );
};

export default Header;
