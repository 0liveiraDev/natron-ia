import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { motion } from 'framer-motion';
import { useToast } from '../components/Toast';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { refreshUser } = useUser();
    const navigate = useNavigate();
    const { showToast, ToastContainer } = useToast();

    // Clean up any corrupted tokens on mount
    useEffect(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await login(email, password);
            await refreshUser(); // Load user data including avatar
            showToast('Login realizado com sucesso!', 'success');
            navigate('/dashboard');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Erro ao fazer login', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
            <ToastContainer />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Natron IA</h1>
                    <p className="text-gray-400">Sistema de Produtividade Pessoal</p>
                </div>

                <div className="glass-card p-8">
                    <h2 className="text-2xl font-bold mb-6">Entrar</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-neon"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            Não tem uma conta?{' '}
                            <Link to="/register" className="text-neon-green hover:underline">
                                Cadastre-se
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
