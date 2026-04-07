import React from 'react';
import { useUser } from '../contexts/UserContext';
import { motion } from 'framer-motion';
import { User, Award, Zap, Shield, Book, Rocket, DollarSign } from 'lucide-react';

const Profile: React.FC = () => {
    const { user } = useUser();
    
    if (!user) return <div className="p-8 text-center">Carregando perfil...</div>;

    const stats = [
        { label: 'Físico', value: user.xpPhysical, icon: <Zap size={20} className="text-red-500" /> },
        { label: 'Disciplina', value: user.xpDiscipline, icon: <Shield size={20} className="text-blue-500" /> },
        { label: 'Mental', value: user.xpMental, icon: <Award size={20} className="text-purple-500" /> },
        { label: 'Intelecto', value: user.xpIntellect, icon: <Book size={20} className="text-yellow-500" /> },
        { label: 'Produtividade', value: user.xpProductivity, icon: <Rocket size={20} className="text-green-500" /> },
        { label: 'Financeiro', value: user.xpFinancial, icon: <DollarSign size={20} className="text-[#00ff88]" /> },
    ];

    const getAvatarUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiBase = import.meta.env.VITE_API_URL || 'https://natron-ia.onrender.com/api';
        const base = apiBase.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 rounded-2xl flex flex-col md:flex-row items-center gap-8 border border-white/5"
            >
                <div className="relative">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-[#00ff88] bg-[#1a1a1a] flex items-center justify-center">
                        {user.avatarUrl ? (
                            <img src={getAvatarUrl(user.avatarUrl) || ''} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <User size={64} className="text-[#00ff88]" />
                        )}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{user.name}</h1>
                    <p className="text-gray-400 text-lg">{user.email}</p>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
                        <span className="text-[#00ff88] font-bold tracking-wider uppercase">{user.rank} - Nível {user.level}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">XP Atual: {Math.floor(user.currentXp)}</p>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-8 rounded-2xl border border-white/5"
            >
                <h2 className="text-2xl font-bold text-white mb-6">Suas Especialidades</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-[#1a1a1a]/50 p-4 rounded-xl border border-white/5 flex flex-col items-center gap-2">
                            <div className="p-3 bg-black/40 rounded-full">
                                {stat.icon}
                            </div>
                            <span className="text-gray-400 font-medium">{stat.label}</span>
                            <span className="text-2xl font-bold text-white">{Math.floor(stat.value)} XP</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
