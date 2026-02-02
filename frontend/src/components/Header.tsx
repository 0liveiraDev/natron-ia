import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Smartphone, Monitor, LogOut } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useUser();
    const { logout } = useAuth();
    const { isMobileMode, toggleMobileMode } = useUI();
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');

        setIsInstalled(isStandalone);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            console.log('PWA was installed');
            setIsInstalled(true);
            setDeferredPrompt(null);
            window.location.reload();
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

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

    const installPWA = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } else {
            alert('Para instalar o Natron IA:\n\nNo iPhone: Toque no ícone de Compartilhar e selecione "Adicionar à Tela de Início".\n\nNo Android/Chrome: Clique no menu (três pontos) e selecione "Instalar aplicativo".');
        }
    };

    const xpPercentage = calculateXpPercentage(user?.currentXp || 0);
    const currentColor = getRankColor(user?.rank || 'Estudante da Academia');

    const showMobileProfile = isMobileMode || window.innerWidth < 768;

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
                    {user && showMobileProfile && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10 overflow-hidden">
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
                {/* Logout Button - Mobile Mode Only */}
                {isMobileMode && (
                    <button
                        onClick={() => {
                            clearUser();
                            logout();
                            window.location.href = '/login';
                        }}
                        className="p-2 rounded-lg text-red-500/80 hover:bg-red-500/10 transition-colors"
                        title="Sair"
                    >
                        <LogOut size={20} />
                    </button>
                )}

                {/* Mobile Mode Toggle */}
                <button
                    onClick={toggleMobileMode}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isMobileMode ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'hover:bg-white/5 text-gray-400'}`}
                    title={isMobileMode ? "Mudar para modo Desktop" : "Mudar para modo Mobile"}
                >
                    {isMobileMode ? <Smartphone size={18} /> : <Monitor size={18} />}
                    <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">
                        {isMobileMode ? "Mobile" : "Desktop"}
                    </span>
                </button>

                {!isInstalled && !isMobileMode && (
                    <button
                        onClick={installPWA}
                        className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 transition-colors text-[10px] sm:text-sm font-bold text-[#00ff88]"
                    >
                        <Bot size={16} className="hidden sm:inline" />
                        <span className="hidden sm:inline">Instalar App</span>
                        <span className="sm:hidden">Instalar</span>
                    </button>
                )}

                <button
                    onClick={() => navigate('/atlas')}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                >
                    <Bot size={16} className="text-[#ff9500]" />
                    <span className="hidden md:inline">Falar com a Friday</span>
                </button>
            </div>
        </motion.header>
    );
};

export default Header;
