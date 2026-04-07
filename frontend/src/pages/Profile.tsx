import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import { motion } from 'framer-motion';
import { User, Award, Zap, Shield, Book, Rocket, DollarSign } from 'lucide-react';

const Profile: React.FC = () => {
    const { user } = useUser();
    const { showToast, ToastContainer } = useToast();

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return showToast('As novas senhas não coincidem.', 'error');
        }
        
        setIsSubmittingPassword(true);
        try {
            await api.put('/auth/password', { oldPassword, newPassword });
            showToast('Senha alterada com sucesso!', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false);
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Erro ao alterar a senha.', 'error');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 relative">
            <ToastContainer />
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

            {/* Change Password Block */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-8 rounded-2xl border border-white/5"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Segurança</h2>
                    <button
                        onClick={() => setIsChangingPassword(!isChangingPassword)}
                        className="px-4 py-2 bg-[#00ff88]/10 text-[#00ff88] rounded-xl hover:bg-[#00ff88]/20 transition-colors font-medium border border-[#00ff88]/30"
                    >
                        {isChangingPassword ? 'Cancelar Alteração' : 'Alterar Senha'}
                    </button>
                </div>

                {isChangingPassword && (
                    <motion.form 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 pt-4 border-t border-white/5"
                        onSubmit={handleChangePassword}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">Senha Atual</label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">Nova Senha</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">Confirmar Nova</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                             <button
                                type="submit"
                                disabled={isSubmittingPassword}
                                className="px-6 py-2.5 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold rounded-xl hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all disabled:opacity-50"
                            >
                                {isSubmittingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                            </button>
                        </div>
                    </motion.form>
                )}
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
