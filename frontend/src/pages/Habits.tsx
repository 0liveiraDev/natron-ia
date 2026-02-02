import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import { ChevronLeft, ChevronRight, Plus, Trash2, Target, ChevronDown } from 'lucide-react';

interface Log {
    id: string;
    date: string;
    completed: boolean;
}

interface Habit {
    id: string;
    title: string;
    description?: string;
    xpValue: number;
    logs: Log[];
}

interface DailyProgress {
    day: number;
    percentage: number;
}

const Habits: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState('');
    const [newHabitAttribute, setNewHabitAttribute] = useState('PRODUTIVIDADE');
    const { showToast, ToastContainer } = useToast();
    const { refreshUser } = useUser();

    // Fetch data whenever month changes
    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        try {
            const month = currentDate.getMonth() + 1;
            const year = currentDate.getFullYear();

            const response = await api.get(`/habits/stats?month=${month}&year=${year}`);
            setHabits(response.data.habits);
            setDailyProgress(response.data.dailyProgress);
        } catch (error) {
            showToast('Erro ao carregar rotina', 'error');
        }
    };

    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleToggle = async (habitId: string, day: number) => {
        // Construct explicit YYYY-MM-DD string to avoid timezone issues
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}T00:00:00`;

        try {
            await api.post(`/habits/${habitId}/toggle`, { date: dateStr });
            // Refresh data and user XP
            fetchData();
            await refreshUser(); // Update XP in sidebar immediately
        } catch (error) {
            showToast('Erro ao atualizar hábito', 'error');
        }
    };

    const handleCreateHabit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/habits', { title: newHabitTitle, attribute: newHabitAttribute });
            showToast('Hábito criado!', 'success');
            setShowModal(false);
            setNewHabitTitle('');
            setNewHabitAttribute('PRODUTIVIDADE');
            fetchData();
        } catch (error) {
            showToast('Erro ao criar hábito', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este hábito?')) return;
        try {
            await api.delete(`/habits/${id}`);
            showToast('Hábito excluído', 'success');
            fetchData();
        } catch (error) {
            showToast('Erro ao excluir', 'error');
        }
    };

    // Helper to get days in month
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const todayDay = new Date().getDate();
    const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();



    return (
        <div className="space-y-6 sm:space-y-8 pb-24 md:pb-10">
            <ToastContainer />

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                    HÁBITOS <Target size={28} className="text-red-600 animate-pulse" />
                </h1>

                <div className="flex items-center justify-between w-full lg:w-auto gap-4 bg-[#0f0f0f] rounded-xl sm:rounded-full px-4 py-2 border border-[#1a1a1a]">
                    <button onClick={() => handleMonthChange('prev')} className="p-1 hover:text-red-500 transition"><ChevronLeft size={20} /></button>
                    <span className="text-xs sm:text-sm font-bold uppercase w-full sm:w-32 text-center text-gray-300">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => handleMonthChange('next')} className="p-1 hover:text-red-500 transition"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* Main Content Space */}
            <div className="space-y-6">

                {/* Progresso do Mês Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card border border-[#333]/50">
                    <h3 className="text-xs sm:text-sm font-bold uppercase mb-4 text-gray-400">Progresso do Mês</h3>
                    <div className="h-[120px] sm:h-[150px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyProgress}>
                                <defs>
                                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                                <XAxis dataKey="day" hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                    labelFormatter={(day) => `Dia ${day}`}
                                    formatter={(val: number) => [`${val.toFixed(0)}%`, 'Conclusão']}
                                />
                                <Area type="monotone" dataKey="percentage" stroke="#dc2626" fill="url(#colorProgress)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Grade de Hábitos (Heatmap) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="dashboard-card border border-[#333]/50 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 pl-2">
                        <h3 className="text-sm font-bold uppercase text-gray-400">Grade de Hábitos</h3>
                        <button onClick={() => setShowModal(true)} className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-lg shadow-red-600/20">
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="overflow-x-auto pb-4 custom-scrollbar">
                        <div className="min-w-[800px]">
                            {/* Header Days */}
                            <div className="grid grid-cols-[200px_1fr] gap-2 mb-4 border-b border-[#333] pb-2">
                                <div className="text-xs text-gray-500 font-bold uppercase flex items-center">Hábito</div>
                                <div className="grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
                                    {daysArray.map(day => (
                                        <div key={day} className="flex flex-col items-center gap-1">
                                            <span className={`text-[10px] font-bold ${isCurrentMonth && day === todayDay ? 'text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md' : 'text-gray-600'}`}>
                                                {day}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rows */}
                            <div className="space-y-4">
                                {habits.map((habit) => (
                                    <div key={habit.id} className="grid grid-cols-[200px_1fr] gap-2 items-center group hover:bg-[#1a1a1a]/40 p-1 rounded-lg transition">
                                        {/* Habit Name & Mini Bar */}
                                        <div className="pr-4">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="text-sm font-medium text-gray-200 truncate">{habit.title}</p>
                                                <button onClick={() => handleDelete(habit.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-red-600 transition-all duration-500"
                                                        style={{ width: `${(habit.logs.length / daysInMonth) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex flex-col items-end min-w-[40px]">
                                                    <span className="text-[10px] text-gray-500 font-mono leading-none">
                                                        {(habit.logs.length / daysInMonth * 100).toFixed(0)}%
                                                    </span>
                                                    <span className="text-neon-green text-[9px] font-bold leading-none mt-0.5">
                                                        +{habit.logs.length * (habit.xpValue || 5)} XP
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Days Grid */}
                                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
                                            {daysArray.map(day => {
                                                const year = currentDate.getFullYear();
                                                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                                                const dayStr = String(day).padStart(2, '0');
                                                const dateTarget = `${year}-${month}-${dayStr}`;

                                                const isDone = habit.logs.some(log => log.date.startsWith(dateTarget));

                                                return (
                                                    <div key={day} className="flex justify-center">
                                                        <button
                                                            onClick={() => handleToggle(habit.id, day)}
                                                            className={`
                                                                w-5 h-5 rounded-[4px] flex items-center justify-center transition-all duration-200
                                                                ${isDone ? 'bg-[#8e8e93] text-black shadow-[0_0_8px_rgba(0,255,136,0.3)]' : 'bg-[#1a1a1a] border border-[#333] hover:border-[#666]'}
                                                             `}
                                                            title={`Dia ${day}: ${isDone ? 'Concluído' : 'Pendente'}`}
                                                        >
                                                            {isDone && (
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-md border border-[#333]">
                        <h2 className="text-xl font-bold mb-4">Novo Hábito</h2>
                        <form onSubmit={handleCreateHabit} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Título</label>
                                <input
                                    type="text"
                                    value={newHabitTitle}
                                    onChange={(e) => setNewHabitTitle(e.target.value)}
                                    className="input-field"
                                    placeholder="Ex: Ler 10 páginas"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Atributo</label>
                                <div className="relative">
                                    <select
                                        value={newHabitAttribute}
                                        onChange={(e) => setNewHabitAttribute(e.target.value)}
                                        className="input-field w-full appearance-none cursor-pointer"
                                    >
                                        <option value="FISICO" className="bg-[#1a1a1a]">Físico</option>
                                        <option value="DISCIPLINA" className="bg-[#1a1a1a]">Disciplina</option>
                                        <option value="MENTAL" className="bg-[#1a1a1a]">Mental</option>
                                        <option value="INTELECTO" className="bg-[#1a1a1a]">Intelecto</option>
                                        <option value="PRODUTIVIDADE" className="bg-[#1a1a1a]">Produtividade</option>
                                        <option value="FINANCEIRO" className="bg-[#1a1a1a]">Financeiro</option>
                                        <option value="NENHUM" className="bg-[#1a1a1a]">Nenhum</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition">Salvar</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Habits;
