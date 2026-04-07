import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { motion } from 'framer-motion';
import { useToast } from '../components/Toast';
import { Shield, ShieldAlert } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { Navigate } from 'react-router-dom';

interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    level: number;
    rank: string;
    isActive: boolean;
}

const AdminUsers: React.FC = () => {
    const { user } = useUser();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Redireciona se não for admin
    if (user && user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Erro ao carregar usuários', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleUserActive = async (id: string) => {
        try {
            const response = await api.put(`/admin/users/${id}/toggle-active`);
            showToast(response.data.message, 'success');
            setUsers(users.map(u => 
                u.id === id ? { ...u, isActive: response.data.isActive } : u
            ));
        } catch (error: any) {
            console.error('Toggle user active error:', error);
            showToast(error.response?.data?.error || 'Erro ao alterar status', 'error');
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-500/20 text-red-500 rounded-xl">
                    <ShieldAlert size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Painel Administrativo</h1>
                    <p className="text-gray-400">Gerencie os usuários cadastrados na plataforma</p>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden border border-white/5"
            >
                <div className="p-6 border-b border-white/5 bg-[#1a1a1a]/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield size={20} className="text-[#00ff88]" />
                        Usuários Cadastrados
                        <span className="ml-2 bg-[#00ff88]/20 text-[#00ff88] text-xs py-1 px-2 rounded-full">
                            {users.length} usuários
                        </span>
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/40 text-gray-400 border-b border-white/5">
                                <th className="p-4 font-medium text-sm">Nome</th>
                                <th className="p-4 font-medium text-sm">E-mail</th>
                                <th className="p-4 font-medium text-sm">Papel</th>
                                <th className="p-4 font-medium text-sm">Nível / Rank</th>
                                <th className="p-4 font-medium text-sm">Cadastro</th>
                                <th className="p-4 font-medium text-sm">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Carregando usuários...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 text-white font-medium">{u.name}</td>
                                        <td className="p-4 text-gray-400">{u.email}</td>
                                        <td className="p-4">
                                            {u.role === 'admin' ? (
                                                <span className="inline-block px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded-lg font-bold uppercase tracking-wider">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-500 text-xs rounded-lg font-bold uppercase tracking-wider">
                                                    Usuário
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm">Lv. {u.level}</span>
                                                <span className="text-gray-500 text-xs">{u.rank}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => toggleUserActive(u.id)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                    u.isActive
                                                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30'
                                                        : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/30'
                                                }`}
                                            >
                                                {u.isActive ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminUsers;
