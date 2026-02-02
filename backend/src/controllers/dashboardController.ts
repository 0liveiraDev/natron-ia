import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get dashboard overview with all metrics
export const getOverview = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get habits stats
        const habits = await prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    where: {
                        date: { gte: startOfMonth },
                    },
                },
            },
        });

        const habitsCompletedToday = habits.filter(h =>
            h.logs.some(log =>
                log.date >= startOfToday && log.completed
            )
        ).length;

        const habitsCompletedThisWeek = habits.reduce((sum, h) =>
            sum + h.logs.filter(log => log.date >= startOfWeek && log.completed).length,
            0
        );

        const totalHabitLogs = habits.reduce((sum, h) => sum + h.logs.length, 0);
        const completedHabitLogs = habits.reduce((sum, h) =>
            sum + h.logs.filter(log => log.completed).length,
            0
        );

        // Get tasks stats
        const tasks = await prisma.task.findMany({
            where: { userId },
        });

        const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
        const tasksPending = tasks.filter(t => t.status === 'pending').length;

        // Get finance stats
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startOfMonth },
            },
        });

        const income = transactions
            .filter(t => t.type === 'income' || t.type === 'entrada')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense' || t.type === 'saida')
            .reduce((sum, t) => sum + t.amount, 0);

        // Get user data with XP and attributes
        const user = await prisma.user.findUnique({
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
        });

        res.json({
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
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
    }
};

// Get weekly progress data
export const getWeeklyProgress = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const days = [];

        // Get last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(endOfDay.getDate() + 1);

            // console.log(`[WeeklyProgress] Check date: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);

            // Get habits for this day
            const habitLogs = await prisma.habitLog.findMany({
                where: {
                    habit: { userId },
                    date: {
                        gte: startOfDay,
                        lt: endOfDay,
                    },
                    completed: true,
                },
            });

            // Get tasks for this day
            const tasks = await prisma.task.findMany({
                where: {
                    userId,
                    status: 'completed',
                    updatedAt: {
                        gte: startOfDay,
                        lt: endOfDay,
                    },
                },
            });

            // Get expenses for this day
            const expenses = await prisma.transaction.findMany({
                where: {
                    userId,
                    type: 'saida',
                    date: {
                        gte: startOfDay,
                        lt: endOfDay,
                    },
                },
            });

            // console.log(`[WeeklyProgress] Day ${i}: Expenses count=${expenses.length}`);

            // Get income for this day
            const income = await prisma.transaction.findMany({
                where: {
                    userId,
                    type: 'entrada',
                    date: {
                        gte: startOfDay,
                        lt: endOfDay,
                    },
                },
            });

            const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
            const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
            const xp = (habitLogs.length * 10) + (tasks.length * 25);

            days.push({
                date: startOfDay.toISOString().split('T')[0],
                day: startOfDay.getDate(),
                habits: habitLogs.length,
                tasks: tasks.length,
                expenses: totalExpenses,
                income: totalIncome,
                xp,
            });
        }

        res.json({ days });
    } catch (error) {
        console.error('Weekly progress error:', error);
        res.status(500).json({ error: 'Erro ao buscar progresso semanal' });
    }
};

// Get monthly statistics
export const getMonthlyStats = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get habits by week
        const habits = await prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    where: {
                        date: { gte: startOfMonth },
                        completed: true,
                    },
                },
            },
        });

        const weeks = [
            { week: 1, count: 0 },
            { week: 2, count: 0 },
            { week: 3, count: 0 },
            { week: 4, count: 0 },
        ];

        habits.forEach(habit => {
            habit.logs.forEach(log => {
                const weekNum = Math.floor((log.date.getDate() - 1) / 7);
                if (weekNum < 4) {
                    weeks[weekNum].count++;
                }
            });
        });

        // Get tasks by status
        const tasks = await prisma.task.findMany({
            where: {
                userId,
                createdAt: { gte: startOfMonth },
            },
        });

        const tasksByStatus = {
            pending: tasks.filter(t => t.status === 'pending').length,
            completed: tasks.filter(t => t.status === 'completed').length,
        };

        // Individual habit statistics
        const habitStats = habits.map(habit => ({
            name: habit.title,
            completed: habit.logs.length,
            total: new Date().getDate(), // Days in current month so far
            attribute: habit.attribute, // For color coding
        }));

        res.json({
            habitsByWeek: weeks,
            tasksByStatus,
            totalHabits: habits.length,
            totalTasks: tasks.length,
            habitStats, // Individual habit statistics
        });
    } catch (error) {
        console.error('Monthly stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas mensais' });
    }
};

// Get finance data by category
export const getFinanceByCategory = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: startOfMonth },
            },
        });

        // Group expenses by category
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

        // Convert to array with percentages
        // Red-ish colors for expenses
        const expenseColors: { [key: string]: string } = {
            alimentacao: '#ff4d4d',   // Red
            transporte: '#ff8000',    // Orange
            lazer: '#ff0055',         // Pink/Red
            saude: '#cc0000',         // Dark Red
            educacao: '#ff3333',      // Light Red
            moradia: '#990000',       // Deep Red
            assinaturas: '#ff6666',   // Soft Red
            outros: '#bf4040',        // Brownish Red
        };

        // Green-ish colors for income
        const incomeColors: { [key: string]: string } = {
            salario: '#00ff88',       // Neon Green
            freelance: '#00cc6a',     // Medium Green
            investimentos: '#30d158', // iOS Green
            investimento: '#30d158',  // iOS Green (Singular)
            presente: '#008040',      // Dark Green
            outros: '#66ffb3',        // Light Green
        };

        // Fallback colors if category not matches
        const defaultExpenseColor = '#ff4d4d';
        const defaultIncomeColor = '#00ff88';

        const expenses = Object.entries(expensesByCategory).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
            color: expenseColors[category.toLowerCase()] || defaultExpenseColor,
        }));

        const income = Object.entries(incomeByCategory).map(([category, amount]) => ({
            category,
            amount,
            percentage: totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0,
            color: incomeColors[category.toLowerCase()] || defaultIncomeColor,
        }));

        res.json({
            expenses,
            income,
            totalExpenses,
            totalIncome,
        });
    } catch (error) {
        console.error('Finance by category error:', error);
        res.status(500).json({ error: 'Erro ao buscar dados por categoria' });
    }
};

// Get financial evolution (last 6 months)
export const getFinancialEvolution = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const evolution = [];
        const now = new Date();

        // Iterate last 6 months (including current)
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

            const transactions = await prisma.transaction.findMany({
                where: {
                    userId,
                    date: {
                        gte: date,
                        lt: nextMonth,
                    },
                },
            });

            let income = 0;
            let expenses = 0;

            transactions.forEach(t => {
                if (t.type === 'income' || t.type === 'entrada') {
                    income += t.amount;
                } else if (t.type === 'expense' || t.type === 'saida') {
                    expenses += t.amount;
                }
            });

            const monthContext = date.toLocaleDateString('pt-BR', { month: 'short' });
            // Capitalize first letter (e.g., "jan")
            const monthLabel = monthContext.charAt(0).toUpperCase() + monthContext.slice(1);

            evolution.push({
                month: monthLabel,
                fullDate: date.toISOString(), // useful for sorting if needed
                income,
                expenses,
            });
        }

        res.json(evolution);
    } catch (error) {
        console.error('Financial evolution error:', error);
        res.status(500).json({ error: 'Erro ao buscar evolução financeira' });
    }
};
