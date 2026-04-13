import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { cache, TTL } from '../lib/cache';

// ─────────────────────────────────────────────
// 🛡️ ESCUDO DE ESTABILIDADE — Dashboard Controller
// Cache com TTL + Queries unificadas (substituindo loops de múltiplas queries).
// ─────────────────────────────────────────────

// Get dashboard overview with all metrics
export const getOverview = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const cacheKey = `dashboard:overview:${userId}`;

        const cached = cache.get<object>(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Parallel queries — todas ao mesmo tempo
        const [habits, tasks, transactions, user] = await Promise.all([
            prisma.habit.findMany({
                where: { userId },
                include: {
                    logs: {
                        where: { date: { gte: startOfMonth } },
                    },
                },
            }),
            prisma.task.findMany({ where: { userId } }),
            prisma.transaction.findMany({
                where: { userId, date: { gte: startOfMonth } },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    currentXp: true,
                    rank: true,
                    xpPhysical: true,
                    xpDiscipline: true,
                    xpMental: true,
                    xpIntellect: true,
                    xpProductivity: true,
                    xpFinancial: true,
                },
            }),
        ]);

        const habitsCompletedToday = habits.filter(h =>
            h.logs.some(log => log.date >= startOfToday && log.completed)
        ).length;

        const habitsCompletedThisWeek = habits.reduce((sum, h) =>
            sum + h.logs.filter(log => log.date >= startOfWeek && log.completed).length, 0
        );

        const totalHabitLogs = habits.reduce((sum, h) => sum + h.logs.length, 0);
        const completedHabitLogs = habits.reduce((sum, h) =>
            sum + h.logs.filter(log => log.completed).length, 0
        );

        const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
        const tasksPending = tasks.filter(t => t.status === 'pending').length;

        const income = transactions
            .filter(t => t.type === 'income' || t.type === 'entrada')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense' || t.type === 'saida')
            .reduce((sum, t) => sum + t.amount, 0);

        const result = {
            user: {
                xp: user?.currentXp || 0,
                rank: user?.rank || 'Estudante da Academia',
                xpPhysical: user?.xpPhysical || 0,
                xpDiscipline: user?.xpDiscipline || 0,
                xpMental: user?.xpMental || 0,
                xpIntellect: user?.xpIntellect || 0,
                xpProductivity: user?.xpProductivity || 0,
                xpFinancial: user?.xpFinancial || 0,
            },
            habits: {
                total: habits.length,
                completedToday: habitsCompletedToday,
                completedThisWeek: habitsCompletedThisWeek,
                completionRate: totalHabitLogs > 0
                    ? Math.round((completedHabitLogs / totalHabitLogs) * 100)
                    : 0,
            },
            tasks: {
                total: tasks.length,
                pending: tasksPending,
                completed: tasksCompleted,
                completionRate: tasks.length > 0
                    ? Math.round((tasksCompleted / tasks.length) * 100)
                    : 0,
            },
            finance: {
                income,
                expenses,
                balance: income - expenses,
                savingsRate: income > 0
                    ? Math.round(((income - expenses) / income) * 100)
                    : 0,
            },
        };

        cache.set(cacheKey, result, TTL.DASHBOARD_OVERVIEW);
        res.json(result);
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
};

// Get weekly progress data
// 🛡️ OTIMIZADO: era 4 queries × 7 dias = 28 queries. Agora são 3 queries únicas.
export const getWeeklyProgress = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const weekOffset = parseInt(req.query.weekOffset as string) || 0;

        const cacheKey = `dashboard:weekly:${userId}:${weekOffset}`;
        const cached = cache.get<object>(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const baseDate = new Date(now);
        baseDate.setDate(now.getDate() + weekOffset * 7);

        // Intervalo da semana inteira
        const weekStart = new Date(baseDate);
        weekStart.setDate(baseDate.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(baseDate);
        weekEnd.setHours(23, 59, 59, 999);

        // 3 queries únicas em paralelo para a semana toda
        const [habitLogs, tasks, transactions] = await Promise.all([
            prisma.habitLog.findMany({
                where: {
                    habit: { userId },
                    date: { gte: weekStart, lte: weekEnd },
                    completed: true,
                },
                select: { date: true },
            }),
            prisma.task.findMany({
                where: {
                    userId,
                    status: 'completed',
                    updatedAt: { gte: weekStart, lte: weekEnd },
                },
                select: { updatedAt: true },
            }),
            prisma.transaction.findMany({
                where: {
                    userId,
                    date: { gte: weekStart, lte: weekEnd },
                },
                select: { date: true, amount: true, type: true },
            }),
        ]);

        // Agrupar em memória por dia
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            const dayHabits = habitLogs.filter(l => l.date >= startOfDay && l.date < endOfDay).length;
            const dayTasks = tasks.filter(t => t.updatedAt >= startOfDay && t.updatedAt < endOfDay).length;
            const dayTxns = transactions.filter(t => t.date >= startOfDay && t.date < endOfDay);

            const dayExpenses = dayTxns
                .filter(t => t.type === 'saida' || t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const dayIncome = dayTxns
                .filter(t => t.type === 'entrada' || t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            days.push({
                date: startOfDay.toISOString().split('T')[0],
                day: startOfDay.getDate(),
                habits: dayHabits,
                tasks: dayTasks,
                expenses: dayExpenses,
                income: dayIncome,
                xp: dayHabits * 10 + dayTasks * 25,
            });
        }

        const result = { days };
        cache.set(cacheKey, result, TTL.WEEKLY_PROGRESS);
        res.json(result);
    } catch (error) {
        console.error('Weekly progress error:', error);
        res.status(500).json({ error: 'Erro ao buscar progresso semanal' });
    }
};

// Get monthly statistics
export const getMonthlyStats = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const cacheKey = `dashboard:monthly:${userId}`;

        const cached = cache.get<object>(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [habits, tasks] = await Promise.all([
            prisma.habit.findMany({
                where: { userId },
                include: {
                    logs: {
                        where: { date: { gte: startOfMonth }, completed: true },
                    },
                },
            }),
            prisma.task.findMany({
                where: { userId, createdAt: { gte: startOfMonth } },
            }),
        ]);

        const weeks = [
            { week: 1, count: 0 },
            { week: 2, count: 0 },
            { week: 3, count: 0 },
            { week: 4, count: 0 },
        ];

        habits.forEach(habit => {
            habit.logs.forEach(log => {
                const weekNum = Math.floor((log.date.getDate() - 1) / 7);
                if (weekNum < 4) weeks[weekNum].count++;
            });
        });

        const tasksByStatus = {
            pending: tasks.filter(t => t.status === 'pending').length,
            completed: tasks.filter(t => t.status === 'completed').length,
        };

        const habitStats = habits.map(habit => ({
            name: habit.title,
            completed: habit.logs.length,
            total: new Date().getDate(),
            attribute: habit.attribute,
        }));

        const result = {
            habitsByWeek: weeks,
            tasksByStatus,
            totalHabits: habits.length,
            totalTasks: tasks.length,
            habitStats,
        };

        cache.set(cacheKey, result, TTL.MONTHLY_STATS);
        res.json(result);
    } catch (error) {
        console.error('Monthly stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas mensais' });
    }
};

// Get finance data by category
export const getFinanceByCategory = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const cacheKey = `dashboard:finance-category:${userId}`;

        const cached = cache.get<object>(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: startOfMonth } },
        });

        const expensesByCategory: { [key: string]: number } = {};
        const incomeByCategory: { [key: string]: number } = {};
        let totalExpenses = 0;
        let totalIncome = 0;

        transactions.forEach(t => {
            if (t.type === 'expense' || t.type === 'saida') {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
                totalExpenses += t.amount;
            } else if (t.type === 'income' || t.type === 'entrada') {
                incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
                totalIncome += t.amount;
            }
        });

        const expenseColors: { [key: string]: string } = {
            alimentacao: '#ff4d4d', transporte: '#ff8000', lazer: '#ff0055',
            saude: '#cc0000', educacao: '#ff3333', moradia: '#990000',
            assinaturas: '#ff6666', outros: '#bf4040',
        };
        const incomeColors: { [key: string]: string } = {
            salario: '#00ff88', freelance: '#00cc6a', investimentos: '#30d158',
            investimento: '#30d158', presente: '#008040', outros: '#66ffb3',
        };

        const result = {
            expenses: Object.entries(expensesByCategory).map(([category, amount]) => ({
                category, amount,
                percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
                color: expenseColors[category.toLowerCase()] || '#ff4d4d',
            })),
            income: Object.entries(incomeByCategory).map(([category, amount]) => ({
                category, amount,
                percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
                color: incomeColors[category.toLowerCase()] || '#00ff88',
            })),
            totalExpenses,
            totalIncome,
        };

        cache.set(cacheKey, result, TTL.FINANCE_CATEGORY);
        res.json(result);
    } catch (error) {
        console.error('Finance by category error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados por categoria' });
    }
};

// Get financial evolution (last 6 months)
// 🛡️ OTIMIZADO: era 1 query × 6 meses = 6 queries em loop. Agora é 1 única query.
export const getFinancialEvolution = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const cacheKey = `dashboard:evolution:${userId}`;

        const cached = cache.get<object[]>(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        // Uma única query para os 6 meses inteiros
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: sixMonthsAgo },
            },
            select: { date: true, amount: true, type: true },
        });

        // Agrupar em memória por mês
        const monthMap: { [key: string]: { income: number; expenses: number; date: Date } } = {};

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            monthMap[key] = { income: 0, expenses: 0, date };
        }

        transactions.forEach(t => {
            const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
            if (!monthMap[key]) return;
            if (t.type === 'income' || t.type === 'entrada') {
                monthMap[key].income += t.amount;
            } else if (t.type === 'expense' || t.type === 'saida') {
                monthMap[key].expenses += t.amount;
            }
        });

        const result = Object.values(monthMap).map(({ income, expenses, date }) => {
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
            return {
                month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
                fullDate: date.toISOString(),
                income,
                expenses,
            };
        });

        cache.set(cacheKey, result, TTL.FINANCE_EVOLUTION);
        res.json(result);
    } catch (error) {
        console.error('Financial evolution error:', error);
        res.status(500).json({ error: 'Erro ao buscar evolução financeira' });
    }
};
