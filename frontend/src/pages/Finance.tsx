import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useUser } from '../contexts/UserContext';
import DonutChart from '../components/charts/DonutChart';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, TrendingDown, Target, Settings, Plus, Trash2, Search, PiggyBank, Utensils, Gamepad2, Tv, Zap, Home, Pill, Car, BookOpen, Briefcase } from 'lucide-react';

interface Transaction {
    id: string;
    amount: number;
    type: string;
    category: string;
    description?: string;
    date: string;
}

interface FinancialConfig {
    monthlyBudget: number;
    initialReserve: number;
    categoryBudgets: Record<string, number>;
}

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    alimentacao: { label: 'Alimentação', icon: <Utensils size={16} />, color: '#ff9500' },
    lazer: { label: 'Lazer', icon: <Gamepad2 size={16} />, color: '#ff2d55' },
    assinaturas: { label: 'Assinaturas', icon: <Tv size={16} />, color: '#b800ff' },
    outros: { label: 'Outros', icon: <Zap size={16} />, color: '#8e8e93' },
    moradia: { label: 'Moradia', icon: <Home size={16} />, color: '#00d4ff' },
    saude: { label: 'Saúde', icon: <Pill size={16} />, color: '#30d158' },
    transporte: { label: 'Transporte', icon: <Car size={16} />, color: '#ff3b30' },
    educacao: { label: 'Educação', icon: <BookOpen size={16} />, color: '#ffc107' },
    salario: { label: 'Salário', icon: <Briefcase size={16} />, color: '#00ff88' },
    investimento: { label: 'Investimento', icon: <TrendingUp size={16} />, color: '#30d158' },
};

const Finance: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [config, setConfig] = useState<FinancialConfig>({ monthlyBudget: 0, initialReserve: 0, categoryBudgets: {} });
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configMode, setConfigMode] = useState<'general' | 'monthly' | 'categories'>('general');
    const { showToast, ToastContainer } = useToast();
    const { refreshUser } = useUser();

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');

    // Form states
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'entrada' | 'saida'>('saida');
    const [category, setCategory] = useState('alimentacao');
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);

    // Config Form
    const [tempBudget, setTempBudget] = useState('');
    const [tempReserve, setTempReserve] = useState('');
    const [tempCategoryBudgets, setTempCategoryBudgets] = useState<Record<string, number>>({});

    const [evolutionData, setEvolutionData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [transactionsRes, dashboardRes, evolutionRes] = await Promise.all([
                api.get('/transactions'),
                api.get('/finance/dashboard'),
                api.get('/finance/evolution'),
            ]);
            setTransactions(transactionsRes.data);
            setEvolutionData(evolutionRes.data);
            if (dashboardRes.data.config) {
                setConfig(dashboardRes.data.config);
                setTempBudget(dashboardRes.data.config.monthlyBudget.toString());
                setTempReserve(dashboardRes.data.config.initialReserve.toString());
                setTempCategoryBudgets(dashboardRes.data.config.categoryBudgets || {});
            }
        } catch (error) {
            showToast('Erro ao carregar dados financeiros', 'error');
        }
    };

    // Filter transactions by selected month
    const monthlyTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === currentDate.getMonth() &&
                tDate.getFullYear() === currentDate.getFullYear();
        });
    }, [transactions, currentDate]);

    // Filtered List for UI
    const displayedTransactions = useMemo(() => {
        return monthlyTransactions
            .filter(t => {
                const searchLower = searchTerm.toLowerCase();
                const descriptionMatch = t.description ? t.description.toLowerCase().includes(searchLower) : false;
                const categoryLabel = CATEGORIES[t.category]?.label;
                const categoryMatch = categoryLabel ? categoryLabel.toLowerCase().includes(searchLower) : false;

                const matchesSearch = descriptionMatch || categoryMatch;
                const matchesType = filterType === 'all' || t.type === filterType;
                return matchesSearch && matchesType;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [monthlyTransactions, searchTerm, filterType]);

    // Totals
    const monthlyIncome = monthlyTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthlyTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
    const globalBalance = config.initialReserve +
        transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0) -
        transactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);

    const budgetProgress = config.monthlyBudget > 0 ? (monthlyExpenses / config.monthlyBudget) * 100 : 0;
    const remainingBudget = Math.max(0, config.monthlyBudget - monthlyExpenses);

    // Savings Rate (User Request: "Economizou %")
    const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

    // Category Calculations
    const categoryExpenses = useMemo(() => {
        return monthlyTransactions
            .filter(t => t.type === 'saida')
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);
    }, [monthlyTransactions]);

    const categoryData = useMemo(() => {
        const total = Object.values(categoryExpenses).reduce((a, b) => a + b, 0);
        return Object.entries(categoryExpenses)
            .map(([key, value]) => ({
                name: CATEGORIES[key]?.label || key,
                value,
                percentage: total > 0 ? (value / total) * 100 : 0,
                color: CATEGORIES[key]?.color || '#fff',
                icon: CATEGORIES[key]?.icon || <Zap size={16} />
            }))
            .sort((a, b) => b.value - a.value);
    }, [categoryExpenses]);

    // Handlers
    const handleMonthChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') newDate.setMonth(newDate.getMonth() - 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleCreateTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Remove thousand separators (dots) and convert comma to decimal point
            // Examples: "1.000" -> "1000", "1.000,50" -> "1000.50", "1000" -> "1000"
            const cleanAmount = amount.replace(/\./g, '').replace(',', '.');

            await api.post('/transactions', {
                amount: parseFloat(cleanAmount),
                type,
                category,
                description,
                date: new Date(transactionDate).toISOString()
            });
            showToast('Transação criada!', 'success');
            setShowTransactionModal(false);
            setAmount('');
            setDescription('');
            setTransactionDate(new Date().toISOString().split('T')[0]); // Reset to today
            fetchData();
            await refreshUser(); // Update XP in real-time
        } catch (error) {
            showToast('Erro ao criar transação', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir esta transação?')) return;
        try {
            await api.delete(`/transactions/${id}`);
            showToast('Transação removida', 'success');
            fetchData();
            await refreshUser(); // Update XP in real-time
        } catch (error) {
            showToast('Erro ao remover', 'error');
        }
    };

    const handleUpdateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put('/finance/config', {
                monthlyBudget: parseFloat(tempBudget),
                initialReserve: parseFloat(tempReserve),
                categoryBudgets: tempCategoryBudgets
            });
            setConfig({
                monthlyBudget: parseFloat(tempBudget),
                initialReserve: parseFloat(tempReserve),
                categoryBudgets: tempCategoryBudgets
            });
            showToast('Configurações salvas!', 'success');
            setShowConfigModal(false);
        } catch (error) {
            showToast('Erro ao salvar configurações', 'error');
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="space-y-6 sm:space-y-8 pb-24 md:pb-10">
            <ToastContainer />

            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div className="flex items-center justify-between w-full xl:w-auto">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                        FINANCEIRO <Wallet size={28} className="text-[#00ff88] animate-pulse" />
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center justify-between bg-[#0f0f0f] rounded-xl sm:rounded-full px-4 py-2 border border-[#1a1a1a] flex-1 sm:flex-none">
                        <button onClick={() => handleMonthChange('prev')} className="p-1 hover:text-[#00ff88] transition"><ChevronLeft size={20} /></button>
                        <span className="text-xs sm:text-sm font-bold uppercase w-full sm:w-32 text-center text-gray-300">
                            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => handleMonthChange('next')} className="p-1 hover:text-[#00ff88] transition"><ChevronRight size={20} /></button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => { setConfigMode('general'); setShowConfigModal(true); }} className="flex-1 sm:flex-none btn-secondary flex items-center justify-center gap-2 py-2.5">
                            <Settings size={16} /> <span className="sm:inline">Config</span>
                        </button>
                        <button onClick={() => setShowTransactionModal(true)} className="flex-1 sm:flex-none btn-neon flex items-center justify-center gap-2 py-2.5">
                            <Plus size={16} /> <span className="sm:inline">Nova</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Values Row (Top) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
                {/* Saldo Global (Featured) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card group bg-[#00ff88]/5 border-[#00ff88]/20">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-[#00ff88]/20 text-[#00ff88]">
                            <Wallet size={24} />
                        </div>
                        <span className="text-xs text-[#00ff88] uppercase font-bold">Saldo Total</span>
                    </div>
                    <div className="text-3xl font-bold text-[#00ff88]">{formatCurrency(globalBalance)}</div>
                    <div className="text-[10px] text-[#00ff88]/70 mt-1">Acumulado + Reserva</div>
                </motion.div>

                {/* Economizou % */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="dashboard-card group bg-[#00ff88]/5 border-[#00ff88]/20">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-[#00ff88]/20 text-[#00ff88]">
                            <PiggyBank size={24} />
                        </div>
                        <span className="text-xs text-[#00ff88] uppercase font-bold">Economizou</span>
                    </div>
                    <div className="text-3xl font-bold text-[#00ff88]">{savingsRate}%</div>
                    <div className="text-[10px] text-[#00ff88]/70 mt-1">da renda mensal guardada</div>
                </motion.div>

                {/* Reserva Inicial */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="dashboard-card group bg-[#00d4ff]/5 border-[#00d4ff]/20">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-[#00d4ff]/20 text-[#00d4ff]">
                            <Target size={24} />
                        </div>
                        <span className="text-xs text-[#00d4ff] uppercase font-bold">Reserva</span>
                    </div>
                    <div className="text-3xl font-bold text-[#00d4ff]">{formatCurrency(config.initialReserve)}</div>
                    <div className="text-[10px] text-[#00d4ff]/70 mt-1">Valor fixo</div>
                </motion.div>

                {/* Entradas (Smaller) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="dashboard-card group bg-[#00ff88]/5 border-[#00ff88]/20">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-[#00ff88]/20 text-[#00ff88]">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-xs text-[#00ff88] uppercase font-bold">Entradas</span>
                    </div>
                    <div className="text-xl font-bold text-[#00ff88]">{formatCurrency(monthlyIncome)}</div>
                </motion.div>

                {/* Saídas (Smaller) */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="dashboard-card group bg-[#ff3b30]/5 border-[#ff3b30]/20">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 rounded-lg bg-[#ff3b30]/20 text-[#ff3b30]">
                            <TrendingDown size={20} />
                        </div>
                        <span className="text-xs text-[#ff3b30] uppercase font-bold">Saídas</span>
                    </div>
                    <div className="text-xl font-bold text-[#ff3b30]">{formatCurrency(monthlyExpenses)}</div>
                </motion.div>
            </div>

            {/* Evolution Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="dashboard-card">
                <h3 className="text-xs sm:text-sm font-bold uppercase mb-6 text-white">Evolução nos últimos 6 meses</h3>
                <div className="h-[180px] sm:h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={evolutionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="#666"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #333', borderRadius: '8px' }}
                                formatter={(value: number) => [formatCurrency(value), '']}
                            />
                            <Line type="monotone" dataKey="income" stroke="#00ff88" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#00ff88' }} name="Entradas" />
                            <Line type="monotone" dataKey="expenses" stroke="#ff3b30" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#ff3b30' }} name="Saídas" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center flex-wrap gap-4 sm:gap-6 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-[#00ff88] rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-gray-400">Entradas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-[#ff3b30] rounded-full"></div>
                        <span className="text-[10px] sm:text-xs text-gray-400">Saídas</span>
                    </div>
                </div>
            </motion.div>

            {/* Orçamento Mensal Bar */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                    <h3 className="text-xs sm:text-sm font-bold uppercase flex items-center gap-2">
                        <Settings size={14} className="text-gray-400" /> Orçamento Mensal
                    </h3>
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                        <span className="text-[10px] sm:text-xs text-gray-500">{config.monthlyBudget > 0 ? `${budgetProgress.toFixed(1)}% utilizado` : 'Não definido'}</span>
                        <button onClick={() => { setConfigMode('monthly'); setShowConfigModal(true); }} className="text-[10px] sm:text-xs text-gray-500 hover:text-white flex items-center gap-1">
                            <Settings size={12} /> Editar
                        </button>
                    </div>
                </div>

                <div className="relative h-3 sm:h-4 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(budgetProgress, 100)}%` }}
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${budgetProgress > 100 ? 'bg-[#ff3b30]' : 'bg-[#00ff88]'}`}
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-between mt-2 gap-1 text-[10px] sm:text-xs">
                    <span className="text-gray-400">
                        Gasto: <span className="text-white font-bold">{formatCurrency(monthlyExpenses)}</span> de <span className="text-gray-500">{formatCurrency(config.monthlyBudget)}</span>
                    </span>
                    <span className={`${remainingBudget > 0 ? 'text-[#00ff88]' : 'text-[#ff3b30]'} font-bold`}>
                        Restante: {formatCurrency(remainingBudget)}
                    </span>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gastos por Categoria (Donut) */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card min-h-[420px]">
                    <h3 className="text-sm font-bold uppercase mb-6">Gastos por Categoria</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <DonutChart data={categoryData} centerText="Total" centerValue={formatCurrency(monthlyExpenses)} />
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                {categoryData.slice(0, 4).map((cat: any) => (
                                    <div key={cat.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-sm text-gray-400 flex items-center gap-2">{cat.icon} {cat.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                            Nenhum gasto neste mês
                        </div>
                    )}
                </motion.div>

                {/* Orçamento por Categoria (List) */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="dashboard-card">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold uppercase">Orçamento por Categoria</h3>
                        <button onClick={() => { setConfigMode('categories'); setShowConfigModal(true); }} className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                            <Settings size={12} /> Editar
                        </button>
                    </div>

                    <div className="space-y-6 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                        {Object.keys(CATEGORIES).map(catKey => {
                            const budget = config.categoryBudgets[catKey] || 0;
                            if (budget === 0) return null; // Only show configured budgets

                            const spent = categoryExpenses[catKey] || 0;
                            const progress = (spent / budget) * 100;
                            const categoryInfo = CATEGORIES[catKey];

                            return (
                                <div key={catKey}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryInfo.color }} />
                                        <span className="text-gray-400">{categoryInfo.icon}</span>
                                        <span className="font-bold flex-1">{categoryInfo.label}</span>
                                    </div>

                                    <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden mb-1">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(progress, 100)}%` }}
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ backgroundColor: categoryInfo.color }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-gray-400">{formatCurrency(spent)} / {formatCurrency(budget)}</span>
                                        <span className={`${progress > 100 ? 'text-[#ff3b30]' : 'text-gray-500'}`}>{progress.toFixed(0)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(config.categoryBudgets).length === 0 && (
                            <p className="text-center text-gray-500 py-10">Configure orçamentos por categoria nas configurações.</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Transactions List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="dashboard-card">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <h3 className="text-xs sm:text-sm font-bold uppercase">Transações do Mês</h3>

                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <div className="relative flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-10 pr-4 py-2.5 sm:py-2 text-sm text-white focus:outline-none focus:border-[#00ff88]"
                            />
                        </div>
                        <select
                            value={filterType}
                            onChange={(e: any) => setFilterType(e.target.value)}
                            className="bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 sm:py-2 text-sm text-white focus:outline-none cursor-pointer"
                        >
                            <option value="all">Todas as transações</option>
                            <option value="entrada">Apenas Entradas</option>
                            <option value="saida">Apenas Saídas</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-3">
                    {displayedTransactions.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <p className="mb-2 text-sm sm:text-base">Nenhuma transação encontrada neste mês.</p>
                            <p className="text-[10px] sm:text-xs text-gray-600">
                                Use as setas ← → acima para navegar entre os meses ou clique em "Nova" para adicionar.
                            </p>
                        </div>
                    )}
                    {displayedTransactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-[#1a1a1a]/40 hover:bg-[#1a1a1a] transition border border-transparent hover:border-[#333] group overflow-hidden">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="hidden sm:block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORIES[t.category]?.color || '#808080' }} />
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm sm:text-base text-white truncate">{t.description || CATEGORIES[t.category]?.label}</p>
                                    <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500 mt-0.5">
                                        <span className="whitespace-nowrap">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1 truncate max-w-[100px] sm:max-w-none">
                                            {CATEGORIES[t.category]?.icon} <span className="truncate">{CATEGORIES[t.category]?.label}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 sm:gap-6 shrink-0 ml-4">
                                <span className={`font-mono font-bold text-sm sm:text-base whitespace-nowrap ${t.type === 'entrada' ? 'text-[#00ff88]' : 'text-[#ff3b30]'}`}>
                                    {t.type === 'entrada' ? '+' : '-'} {formatCurrency(t.amount)}
                                </span>
                                <button onClick={() => handleDelete(t.id)} className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Config Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-lg border border-[#333] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Settings size={20} />
                            {configMode === 'general' && 'Configurações'}
                            {configMode === 'monthly' && 'Orçamento Mensal'}
                            {configMode === 'categories' && 'Limites por Categoria'}
                        </h2>
                        <form onSubmit={handleUpdateConfig} className="space-y-6">

                            {/* General / Initial Reserve */}
                            {configMode === 'general' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-[#00d4ff]/10 rounded-lg border border-[#00d4ff]/20 mb-4">
                                        <h3 className="text-sm font-bold text-[#00d4ff] uppercase mb-2">Reserva Inicial</h3>
                                        <p className="text-xs text-gray-400 mb-4">Este valor é somado ao seu saldo total, representando economias prévias.</p>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Valor da Reserva</label>
                                            <input type="number" value={tempReserve} onChange={(e) => setTempReserve(e.target.value)} className="input-field border-[#00d4ff]/30 focus:border-[#00d4ff]" placeholder="R$ 0,00" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Monthly Budget Only */}
                            {configMode === 'monthly' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-[#00ff88] uppercase">Definir Teto de Gastos</h3>
                                    <div>
                                        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Orçamento Mensal Total</label>
                                        <input type="number" value={tempBudget} onChange={(e) => setTempBudget(e.target.value)} className="input-field" placeholder="R$ 0,00" />
                                    </div>
                                </div>
                            )}

                            {/* Category Budgets Only */}
                            {configMode === 'categories' && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-[#00d4ff] uppercase">Limites por Categoria</h3>
                                    <p className="text-xs text-gray-500 mb-4">Defina quanto quer gastar em cada área.</p>

                                    {Object.keys(CATEGORIES).map(catKey => (
                                        <div key={catKey} className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 w-32">
                                                <span className="text-gray-400">{CATEGORIES[catKey].icon}</span>
                                                <span className="text-xs font-bold text-gray-400">{CATEGORIES[catKey].label}</span>
                                            </div>
                                            <input
                                                type="number"
                                                value={tempCategoryBudgets[catKey] || ''}
                                                onChange={(e) => setTempCategoryBudgets({ ...tempCategoryBudgets, [catKey]: parseFloat(e.target.value) || 0 })}
                                                className="input-field flex-1"
                                                placeholder="Sem limite"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6 pt-4 border-t border-[#333]">
                                <button type="button" onClick={() => setShowConfigModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-neon">Salvar</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Transaction Modal & Other Modals... (Keep existing logic for Transaction Modal if needed, just minor styling updates) */}
            {/* Reusing existing transaction modal but updated with correct categories */}
            {showTransactionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-full max-w-md border border-[#333]">
                        <h2 className="text-xl font-bold mb-4">Nova Transação</h2>
                        <form onSubmit={handleCreateTransaction} className="space-y-4">
                            <div className="flex gap-2 p-1 bg-[#1a1a1a] rounded-lg">
                                <button type="button" onClick={() => setType('entrada')} className={`flex-1 py-2 rounded-md transition font-bold text-sm ${type === 'entrada' ? 'bg-[#00ff88] text-black' : 'text-gray-400 hover:text-white'}`}>Entrada</button>
                                <button type="button" onClick={() => setType('saida')} className={`flex-1 py-2 rounded-md transition font-bold text-sm ${type === 'saida' ? 'bg-[#ff3b30] text-white' : 'text-gray-400 hover:text-white'}`}>Saída</button>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Valor</label>
                                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required className="input-field text-xl" placeholder="R$ 0,00" />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Categoria</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                                    {Object.entries(CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Data</label>
                                <input
                                    type="date"
                                    value={transactionDate}
                                    onChange={(e) => setTransactionDate(e.target.value)}
                                    required
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Descrição</label>
                                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" placeholder="Ex: Mercado" />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                                <button type="submit" className="flex-1 btn-neon">Salvar</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Finance;
