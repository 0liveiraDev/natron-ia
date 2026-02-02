import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../services/api';

import DonutChart from '../components/charts/DonutChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';

const Dashboard: React.FC = () => {
    const [overview, setOverview] = useState<any>(null);
    const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
    const [financeData, setFinanceData] = useState<any>(null);
    const [monthlyStats, setMonthlyStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [overviewRes, weeklyRes, monthlyRes, financeRes] = await Promise.all([
                api.get('/dashboard/overview'),
                api.get('/dashboard/weekly-progress'),
                api.get('/dashboard/monthly-stats'),
                api.get('/finance/by-category')
            ]);

            setOverview(overviewRes.data);
            setWeeklyProgress(weeklyRes.data.days);
            setMonthlyStats(monthlyRes.data);
            setFinanceData(financeRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-green"></div>
            </div>
        );
    }

    // Prepare chart data
    const expenseData = financeData?.expenses?.map((item: any) => ({
        name: item.category,
        value: item.amount,
        color: item.color,
        percentage: item.percentage
    })) || [];

    const incomeData = financeData?.income?.map((item: any) => ({
        name: item.category,
        value: item.amount,
        color: item.color,
        percentage: item.percentage
    })) || [];

    // Habit Statistics from monthly stats - show individual habits
    const attributeColors: Record<string, string> = {
        'FISICO': '#ff3b30',      // Red
        'DISCIPLINA': '#ffd60a',  // Yellow
        'MENTAL': '#b800ff',      // Purple
        'INTELECTO': '#ff9500',   // Orange
        'PRODUTIVIDADE': '#0a84ff', // Blue
        'FINANCEIRO': '#00ff88'   // Green
    };

    const habitStats = monthlyStats?.habitStats?.map((habit: any) => ({
        name: habit.name,
        value: habit.completed,
        maxValue: habit.total,
        color: attributeColors[habit.attribute] || '#8e8e93'
    })) || [];

    // Goals Progress (Placeholder logic using tasks/habits since 'Method' isn't fully defined)
    // Assuming active goals = pending tasks + active habits
    const activeGoals = (overview?.tasks?.pending || 0) + (overview?.habits?.total || 0);
    const completedGoals = (overview?.tasks?.completed || 0) + (overview?.habits?.completedToday || 0); // Simplified logic
    const totalGoals = activeGoals + completedGoals;
    const goalsProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Weekly Costs from API data - ensure minimum visible height
    const weeklyCostsRaw = weeklyProgress.map((day: any) => day.expenses || 0);
    const maxWeeklyCost = Math.max(...weeklyCostsRaw, 1);
    const weeklyCosts = weeklyCostsRaw.map(cost => {
        if (cost === 0) return 0;
        // Ensure at least 10% height for visibility
        const percentage = (cost / maxWeeklyCost) * 100;
        return Math.max(percentage, 10);
    });

    console.log('📊 Weekly Progress Data:', weeklyProgress);
    console.log('💰 Weekly Costs Raw:', weeklyCostsRaw);
    console.log('📈 Weekly Costs Normalized:', weeklyCosts);

    // Weekly Income - calculate from weeklyProgress (need to add income field to backend)
    const weeklyIncome = weeklyProgress.reduce((sum: number, day: any) => sum + (day.income || 0), 0);

    return (
        <div className="space-y-6 p-6 overflow-y-auto custom-scrollbar h-[calc(100vh-2rem)]">
            {/* Top Row - Overview & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Visual Geral - Level & Hexagon */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="dashboard-card relative overflow-hidden min-h-[400px]"
                >
                    <div className="absolute top-4 left-4 z-10">
                        <h2 className="text-xl font-bold text-[#8e8e93]">VISÃO GERAL</h2>
                    </div>

                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button className="bg-[#1a1a1a] px-3 py-1 rounded text-xs hover:bg-[#2a2a2a] transition">Dia</button>
                        <button className="bg-[#ff3b30] px-3 py-1 rounded text-xs">Mês</button>
                    </div>

                    <div className="flex flex-col items-center justify-center h-full mt-8">
                        {/* Hexagon Shape / Level Indicator */}
                        <div className="relative w-80 h-80 flex items-center justify-center">
                            {/* Outer Labels - Positioned outside hexagon at vertices */}
                            <span className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-2 text-xs text-[#ff3b30] uppercase tracking-wider font-semibold">Físico</span>
                            <span className="absolute top-1/4 right-0 translate-x-6 -translate-y-2 text-xs text-[#ffd60a] uppercase tracking-wider font-semibold">Disciplina</span>
                            <span className="absolute bottom-1/4 right-0 translate-x-2 translate-y-1 text-xs text-[#b800ff] uppercase tracking-wider font-semibold">Mental</span>
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-2 text-xs text-[#ff9500] uppercase tracking-wider font-semibold">Intelecto</span>
                            <span className="absolute bottom-1/4 left-0 -translate-x-10 translate-y-2 text-xs text-[#0a84ff] uppercase tracking-wider font-semibold">Produtividade</span>
                            <span className="absolute top-1/4 left-0 -translate-x-6 -translate-y-2 text-xs text-[#00ff88] uppercase tracking-wider font-semibold">Financeiro</span>

                            {/* Hexagon Container */}
                            <div className="relative w-64 h-64 flex items-center justify-center">
                                {/* Simple SVG Hexagon Representation - Background Grid */}
                                <svg viewBox="0 0 100 100" className="w-full h-full absolute opacity-20">
                                    <polygon points="50 5, 95 27, 95 72, 50 95, 5 72, 5 27" fill="none" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="50" y2="5" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="95" y2="27" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="95" y2="72" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="50" y2="95" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="5" y2="72" stroke="#fff" strokeWidth="1" />
                                    <line x1="50" y1="50" x2="5" y2="27" stroke="#fff" strokeWidth="1" />
                                </svg>

                                {/* Dynamic Filled Hexagon based on attributes */}
                                <svg viewBox="0 0 100 100" className="w-full h-full absolute">
                                    {(() => {
                                        // Calculate points based on attribute values (0-100 scale)
                                        const maxRadius = 45; // Max distance from center
                                        const center = 50;

                                        // Get attribute values (normalize to 0-100 scale)
                                        const fisico = Math.min((overview?.user?.xpPhysical || 0) / 100 * 100, 100);
                                        const disciplina = Math.min((overview?.user?.xpDiscipline || 0) / 100 * 100, 100);
                                        const mental = Math.min((overview?.user?.xpMental || 0) / 100 * 100, 100);
                                        const intelecto = Math.min((overview?.user?.xpIntellect || 0) / 100 * 100, 100);
                                        const produtividade = Math.min((overview?.user?.xpProductivity || 0) / 100 * 100, 100);
                                        const financeiro = Math.min((overview?.user?.xpFinancial || 0) / 100 * 100, 100);

                                        // Calculate hexagon vertices based on attribute values
                                        // Top (FÍSICO)
                                        const p1x = center;
                                        const p1y = center - (fisico / 100 * maxRadius);

                                        // Top Right (DISCIPLINA)
                                        const p2x = center + (disciplina / 100 * maxRadius * 0.866);
                                        const p2y = center - (disciplina / 100 * maxRadius * 0.5);

                                        // Bottom Right (MENTAL)
                                        const p3x = center + (mental / 100 * maxRadius * 0.866);
                                        const p3y = center + (mental / 100 * maxRadius * 0.5);

                                        // Bottom (INTELECTO)
                                        const p4x = center;
                                        const p4y = center + (intelecto / 100 * maxRadius);

                                        // Bottom Left (PRODUTIVIDADE)
                                        const p5x = center - (produtividade / 100 * maxRadius * 0.866);
                                        const p5y = center + (produtividade / 100 * maxRadius * 0.5);

                                        // Top Left (FINANCEIRO)
                                        const p6x = center - (financeiro / 100 * maxRadius * 0.866);
                                        const p6y = center - (financeiro / 100 * maxRadius * 0.5);

                                        const points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y} ${p5x},${p5y} ${p6x},${p6y}`;

                                        return (
                                            <>
                                                {/* Filled polygon with gradient */}
                                                <defs>
                                                    <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.6" />
                                                        <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.5" />
                                                        <stop offset="100%" stopColor="#b800ff" stopOpacity="0.4" />
                                                    </linearGradient>
                                                </defs>

                                                {/* Colored reference lines from center to vertices - rendered BEHIND polygon */}
                                                <line x1="50" y1="50" x2={p1x} y2={p1y} stroke="#ff3b30" strokeWidth="2" opacity="0.7" />
                                                <line x1="50" y1="50" x2={p2x} y2={p2y} stroke="#ffd60a" strokeWidth="2" opacity="0.7" />
                                                <line x1="50" y1="50" x2={p3x} y2={p3y} stroke="#b800ff" strokeWidth="2" opacity="0.7" />
                                                <line x1="50" y1="50" x2={p4x} y2={p4y} stroke="#ff9500" strokeWidth="2" opacity="0.7" />
                                                <line x1="50" y1="50" x2={p5x} y2={p5y} stroke="#0a84ff" strokeWidth="2" opacity="0.7" />
                                                <line x1="50" y1="50" x2={p6x} y2={p6y} stroke="#00ff88" strokeWidth="2" opacity="0.7" />

                                                <polygon
                                                    points={points}
                                                    fill="url(#hexGradient)"
                                                    stroke="#00d4ff"
                                                    strokeWidth="2"
                                                    opacity="0.8"
                                                />
                                            </>
                                        );
                                    })()}
                                </svg>

                                <div className="text-center z-10">
                                    <div className="text-5xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xp || 0}</div>
                                    <div className="text-xs text-[#8e8e93] tracking-widest uppercase mt-1">Score</div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Stats */}
                        <div className="grid grid-cols-3 gap-6 sm:gap-12 mt-6 w-full px-4 sm:px-12">
                            <div className="text-center">
                                <div className="text-[10px] text-[#ff3b30] uppercase mb-1">Físico</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpPhysical || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#ffd60a] uppercase mb-1">Disciplina</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpDiscipline || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#b800ff] uppercase mb-1">Mental</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpMental || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#ff9500] uppercase mb-1">Intelecto</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpIntellect || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#00d4ff] uppercase mb-1">Produtividade</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpProductivity || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-[#00ff88] uppercase mb-1">Financeiro</div>
                                <div className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{overview?.user?.xpFinancial || 0}</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side - Charts Grid */}
                <div className="grid grid-rows-1 xl:grid-rows-2 gap-6">
                    {/* Top Right - Progress & Goals */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Weekly Habits Chart */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="dashboard-card flex flex-col justify-between"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold uppercase text-gray-400">Tarefas Diárias - Últimos 7 dias</h3>
                                <span className="text-xs text-gray-500">🔥</span>
                            </div>
                            <div className="h-24 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={weeklyProgress}>
                                        <Line type="monotone" dataKey="habits" stroke="#ff3b30" strokeWidth={3} dot={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a24', border: 'none', borderRadius: '4px' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Goals Progress */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="dashboard-card flex flex-col items-center justify-center relative"
                        >
                            <h3 className="absolute top-6 left-6 text-xs font-bold uppercase text-gray-400">Progresso de Metas</h3>

                            <div className="relative w-24 h-24 mt-4">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="50%" cy="50%" r="40" stroke="#1a1a1a" strokeWidth="8" fill="none" />
                                    <circle
                                        cx="50%" cy="50%" r="40"
                                        stroke="#ff3b30" strokeWidth="8" fill="none"
                                        strokeDasharray={251.2}
                                        strokeDashoffset={251.2 * (1 - (goalsProgress / 100))}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{goalsProgress}%</span>
                                </div>
                            </div>

                            <div className="flex justify-between w-full px-4 mt-4 text-[10px] text-gray-400">
                                <div className="text-center">
                                    <div className="text-[#ff9500] font-bold text-sm">{activeGoals}</div>
                                    <div>Ativas</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[#8e8e93] font-bold text-sm">{completedGoals}</div>
                                    <div>Completas</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-white font-bold text-sm">{totalGoals}</div>
                                    <div>Total</div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Bottom Right - Statistics List */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="dashboard-card overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-4 sticky top-0 pb-2 z-10 border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                            <h3 className="text-sm font-bold uppercase" style={{ color: 'var(--text-primary)' }}>Estatísticas 2026</h3>
                            <span className="text-xs text-[#8e8e93]">📈</span>
                        </div>
                        {habitStats.length > 0 ? (
                            <HorizontalBarChart data={habitStats} />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                                <p>Nenhuma estatística registrada</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Bottom Row - Finance */}
            <div className="grid grid-cols-1 gap-6">

                {/* Gastos por Categoria - Donut */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="dashboard-card"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase">Gastos por Categoria</h3>
                        <span className="text-xs text-gray-400">$</span>
                    </div>
                    {expenseData.length > 0 ? (
                        <DonutChart data={expenseData} centerText="Total" centerValue={`R$ ${(financeData?.totalExpenses || 0).toFixed(2)}`} />
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                            Nenhum gasto registrado
                        </div>
                    )}
                </motion.div>

                {/* Entradas da Semana placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="dashboard-card flex flex-col items-center justify-center p-8 text-center"
                >
                    <div className="flex w-full justify-between items-center mb-auto">
                        <h3 className="text-sm font-bold uppercase text-[#00ff88]">Entradas da Semana</h3>
                        <span className="text-xs text-[#00ff88]">↗</span>
                    </div>

                    <div className="my-auto">
                        {weeklyIncome > 0 ? (
                            <>
                                <span className="text-4xl text-[#8e8e93] font-bold block mb-2">R$ {weeklyIncome.toFixed(2)}</span>
                                <p className="text-gray-400 text-sm">Total de entradas</p>
                            </>
                        ) : (
                            <>
                                <span className="text-4xl text-gray-600 block mb-2">$</span>
                                <p className="text-gray-400 text-sm">Nenhuma entrada esta semana</p>
                            </>
                        )}
                    </div>
                </motion.div>

                {/* Entradas por Categoria - Donut */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="dashboard-card"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold uppercase">Entradas por Categoria</h3>
                        <span className="text-xs text-[#8e8e93]">$</span>
                    </div>
                    {incomeData.length > 0 ? (
                        <DonutChart data={incomeData} centerText="Total" centerValue={`R$ ${(financeData?.totalIncome || 0).toFixed(2)}`} />
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                            Nenhuma entrada registrada
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;
