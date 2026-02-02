import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, CheckSquare, Target, Wallet, User, Upload, X } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const MobileNav: React.FC = () => {
    const location = useLocation();
    const { user, refreshUser } = useUser();
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const menuItems = [
        { path: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Início' },
        { path: '/atlas', icon: <Bot size={24} />, label: 'Friday' },
        { path: '/tasks', icon: <CheckSquare size={24} />, label: 'Tarefas' },
        { path: '/habits', icon: <Target size={24} />, label: 'Hábitos' },
        { path: '/finance', icon: <Wallet size={24} />, label: 'Finanças' },
    ];

    const getAvatarUrl = (url: string | null | undefined) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiBase = import.meta.env.VITE_API_URL || 'https://natron-ia.onrender.com/api';
        const base = apiBase.replace('/api', '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            await api.post('/auth/upload-avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await refreshUser();
            setShowProfileModal(false);
            setPreviewUrl(null);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Erro ao enviar foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const avatarUrl = getAvatarUrl(user?.avatarUrl);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 h-20 glass-card border-t border-white/10 px-6 flex items-center justify-between z-50">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500'}`}
                        >
                            <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white/10' : ''}`}>
                                {item.icon}
                            </div>
                        </Link>
                    );
                })}

                {/* Profile Avatar Button */}
                <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex flex-col items-center gap-1 transition-all duration-300 text-gray-500 hover:text-white"
                >
                    <div className="p-1 rounded-xl transition-all">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover border-2 border-[#00ff88]"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                                <User size={20} className="text-[#00ff88]" />
                            </div>
                        )}
                    </div>
                </button>
            </nav>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card p-6 w-full max-w-sm border border-[#333]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Foto de Perfil</h2>
                                <button
                                    onClick={() => {
                                        setShowProfileModal(false);
                                        setPreviewUrl(null);
                                    }}
                                    className="p-2 hover:bg-[#1a1a1a] rounded transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Current/Preview Avatar */}
                                <div className="flex justify-center">
                                    {previewUrl || avatarUrl ? (
                                        <img
                                            src={previewUrl || avatarUrl!}
                                            alt="Avatar"
                                            className="w-32 h-32 rounded-full object-cover border-4 border-[#00ff88]"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-[#00ff88]/20 flex items-center justify-center border-4 border-[#00ff88]">
                                            <User size={48} className="text-[#00ff88]" />
                                        </div>
                                    )}
                                </div>

                                {/* File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {/* Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full btn-secondary flex items-center justify-center gap-2"
                                    >
                                        <Upload size={18} />
                                        Escolher Foto
                                    </button>

                                    {previewUrl && (
                                        <button
                                            onClick={handleUpload}
                                            disabled={uploading}
                                            className="w-full btn-neon disabled:opacity-50"
                                        >
                                            {uploading ? 'Enviando...' : 'Salvar Foto'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MobileNav;
