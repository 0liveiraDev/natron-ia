import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { CheckSquare, Trash2 } from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    dueDate?: string;
    createdAt: string;
    xpValue?: number;
}

const Tasks: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [loading, setLoading] = useState(false);
    const { showToast, ToastContainer } = useToast();
    const { refreshUser } = useUser();

    useEffect(() => {
        fetchTasks();
    }, [filter]);

    const fetchTasks = async () => {
        try {
            const params = filter !== 'all' ? `?status=${filter}` : '';
            const response = await api.get(`/tasks${params}`);
            setTasks(response.data);
        } catch (error) {
            showToast('Erro ao carregar tarefas', 'error');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/tasks', { title, description, dueDate: dueDate || null });
            showToast('Tarefa criada com sucesso!', 'success');
            setShowModal(false);
            setTitle('');
            setDescription('');
            setDueDate('');
            fetchTasks();
        } catch (error) {
            showToast('Erro ao criar tarefa', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (task: Task) => {
        try {
            const newStatus = task.status === 'pending' ? 'completed' : 'pending';
            await api.put(`/tasks/${task.id}`, { ...task, status: newStatus });
            fetchTasks();
            await refreshUser(); // Update XP in sidebar immediately
        } catch (error) {
            showToast('Erro ao atualizar tarefa', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar esta tarefa?')) return;

        try {
            await api.delete(`/tasks/${id}`);
            showToast('Tarefa deletada com sucesso!', 'success');
            fetchTasks();
        } catch (error) {
            showToast('Erro ao deletar tarefa', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <ToastContainer />

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    Tarefas <CheckSquare size={32} className="text-[#8e8e93] animate-pulse" />
                </h1>
                <button onClick={() => setShowModal(true)} className="btn-neon">
                    + Nova Tarefa
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filter === 'all' ? 'btn-neon' : 'btn-secondary'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filter === 'pending' ? 'btn-neon' : 'btn-secondary'
                        }`}
                >
                    Pendentes
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${filter === 'completed' ? 'btn-neon' : 'btn-secondary'
                        }`}
                >
                    Concluídas
                </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-4">
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`dashboard-card ${task.status === 'completed' ? 'opacity-60' : ''
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <button
                                onClick={() => handleToggleStatus(task)}
                                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                                    ? 'bg-neon-green border-neon-green'
                                    : 'border-gray-500 hover:border-neon-green'
                                    }`}
                            >
                                {task.status === 'completed' && <span className="text-dark-900 text-sm">✓</span>}
                            </button>

                            <div className="flex-1">
                                <h3
                                    className={`text-lg font-semibold mb-1 ${task.status === 'completed' ? 'line-through text-gray-500' : ''
                                        }`}
                                >
                                    {task.title}
                                </h3>
                                {task.description && (
                                    <p className="text-sm text-gray-400 mb-2">{task.description}</p>
                                )}
                                {task.dueDate && (
                                    <p className="text-xs text-gray-500">
                                        📅 {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded-full border border-neon-green/20">
                                    +{task.xpValue || 5} XP
                                </span>
                                <button
                                    onClick={() => handleDelete(task.id)}
                                    className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {tasks.length === 0 && (
                <div className="dashboard-card p-12 text-center">
                    <p className="text-gray-400 text-lg">
                        Nenhuma tarefa encontrada. Crie sua primeira tarefa!
                    </p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-8 max-w-md w-full"
                    >
                        <h2 className="text-2xl font-bold mb-6">Nova Tarefa</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Título</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: Estudar React"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input-field"
                                    placeholder="Detalhes sobre a tarefa..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Data de Vencimento (opcional)</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="input-field"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button type="submit" disabled={loading} className="flex-1 btn-neon">
                                    {loading ? 'Criando...' : 'Criar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 btn-secondary"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
