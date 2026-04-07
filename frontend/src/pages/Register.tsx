import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { motion } from 'framer-motion';
import { useToast } from '../components/Toast';

const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const { refreshUser } = useUser();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await register(name, email, password);
            await refreshUser(); // Load user data including name
            showToast('Conta criada com sucesso!', 'success');
            navigate('/dashboard');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Erro ao criar conta', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0f] relative overflow-hidden">
            <ToastContainer />
            
            {/* Animated Background Orbs */}
            <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} 
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#00ff88]/20 rounded-full blur-[100px] md:blur-[120px] pointer-events-none" 
            />
            <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }} 
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[-10%] right-[-10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-[#00d4ff]/10 rounded-full blur-[120px] md:blur-[150px] pointer-events-none" 
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-5xl flex rounded-2xl md:rounded-3xl overflow-hidden glass-card border border-white/5 shadow-2xl z-10"
            >
                {/* Left Side - Branding (Hidden on mobile) */}
                <div className="hidden lg:flex lg:w-1/2 bg-black/40 p-12 flex-col justify-between relative border-r border-white/5 overflow-hidden">
                    <div className="z-10 relative">
                        <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight">Natron <span className="text-[#00ff88]">IA</span></h1>
                        <p className="text-gray-400 text-lg leading-relaxed">O seu sistema inteligente para dominar saúde, produtividade e finanças em um só lugar.</p>
                    </div>
                    
                    <div className="relative h-64 w-full z-10 flex items-center justify-center">
                        {/* Visual representation of the AI / Core */}
                        <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute w-48 h-48 rounded-full border border-dashed border-[#00ff88]/30 flex items-center justify-center"
                        >
                           <motion.div 
                               animate={{ rotate: -360 }} 
                               transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                               className="w-32 h-32 rounded-full border border-[#00d4ff]/40 flex items-center justify-center"
                           >
                               <motion.div 
                                   animate={{ scale: [1, 1.1, 1] }}
                                   transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                   className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00d4ff] shadow-[0_0_40px_rgba(0,255,136,0.6)]" 
                               />
                           </motion.div>
                        </motion.div>
                    </div>

                    <div className="z-10 relative">
                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />Físico</span>
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#ffd60a]" />Mente</span>
                            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />Finanças</span>
                        </div>
                    </div>
                    
                    {/* Dark subtle overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Right Side - Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 xl:p-16 bg-[#1a1a24]/80 backdrop-blur-xl flex flex-col justify-center">
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Natron <span className="text-[#00ff88]">IA</span></h1>
                        <p className="text-gray-400 text-sm">Sistema de Produtividade Pessoal</p>
                    </div>
                    
                    <h2 className="text-3xl font-bold mb-2 text-white">Criar Conta</h2>
                    <p className="text-gray-400 mb-8 font-medium">Junte-se e comece sua jornada de evolução.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Nome Completo</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all placeholder:text-gray-600"
                                    placeholder="Seu nome"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all placeholder:text-gray-600"
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Senha (Mín. 6 caracteres)</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#242435]/50 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] hover:from-[#00cc6a] hover:to-[#00aacc] text-black font-bold py-3.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Criando Conta...' : 'Cadastrar na Plataforma'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/10 text-center">
                        <p className="text-sm text-gray-400 font-medium">
                            Já possui uma conta?{' '}
                            <Link to="/login" className="text-[#00ff88] hover:text-[#00d4ff] transition-colors font-bold">
                                Fazer Login
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
