"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHabitStats = exports.toggleHabitLog = exports.deleteHabit = exports.updateHabit = exports.getHabits = exports.createHabit = void 0;
const prisma_1 = require("../lib/prisma");
const activityService_1 = require("../services/activityService");
const xpService_1 = require("../services/xpService");
const createHabit = async (req, res) => {
    try {
        const { title, description, attribute, xpValue } = req.body;
        const userId = req.userId;
        const habit = await prisma_1.prisma.habit.create({
            data: {
                title,
                description,
                userId,
                attribute: attribute || 'PRODUTIVIDADE',
                xpValue: xpValue || 5
            },
        });
        await (0, activityService_1.logActivity)(userId, 'habit_created', `Hábito criado: ${title}`);
        res.status(201).json(habit);
    }
    catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({ error: 'Erro ao criar hábito' });
    }
};
exports.createHabit = createHabit;
const getHabits = async (req, res) => {
    try {
        const userId = req.userId;
        const habits = await prisma_1.prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    orderBy: { date: 'desc' },
                    take: 31,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(habits);
    }
    catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({ error: 'Erro ao buscar hábitos' });
    }
};
exports.getHabits = getHabits;
const updateHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const userId = req.userId;
        const habit = await prisma_1.prisma.habit.updateMany({
            where: { id, userId },
            data: { title, description },
        });
        res.json(habit);
    }
    catch (error) {
        console.error('Update habit error:', error);
        res.status(500).json({ error: 'Erro ao atualizar hábito' });
    }
};
exports.updateHabit = updateHabit;
const deleteHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        // 1. Get the habit to know which attribute and XP value it has
        const habit = await prisma_1.prisma.habit.findFirst({
            where: { id, userId },
            include: {
                logs: {
                    where: { completed: true }
                }
            }
        });
        if (!habit) {
            return res.status(404).json({ error: 'Hábito não encontrado' });
        }
        // 2. Calculate total XP to remove (logs * xpValue)
        const completedCount = habit.logs.length;
        if (completedCount > 0 && habit.attribute !== 'FINANCEIRO') {
            const totalXpToRemove = completedCount * habit.xpValue;
            await (0, xpService_1.removeXp)(userId, habit.attribute, totalXpToRemove);
        }
        // 3. Delete the habit (Cascade will delete logs)
        await prisma_1.prisma.habit.delete({
            where: { id },
        });
        await (0, activityService_1.logActivity)(userId, 'habit_deleted', `Hábito removido e XP subtraída: ${habit.title}`);
        res.json({ message: 'Hábito deletado e XP ajustada com sucesso' });
    }
    catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({ error: 'Erro ao deletar hábito' });
    }
};
exports.deleteHabit = deleteHabit;
const toggleHabitLog = async (req, res) => {
    try {
        const { habitId } = req.params;
        const { date } = req.body;
        const userId = req.userId;
        // Verificar se o hábito pertence ao usuário
        const habit = await prisma_1.prisma.habit.findFirst({
            where: { id: habitId, userId },
        });
        if (!habit) {
            return res.status(404).json({ error: 'Hábito não encontrado' });
        }
        const logDate = date ? new Date(date) : new Date();
        logDate.setHours(0, 0, 0, 0);
        // Verificar se já existe log para essa data
        const existingLog = await prisma_1.prisma.habitLog.findUnique({
            where: {
                habitId_date: {
                    habitId,
                    date: logDate,
                },
            },
        });
        if (existingLog) {
            // Remover log e XP
            await prisma_1.prisma.habitLog.delete({
                where: { id: existingLog.id },
            });
            // Remove XP when unmarking
            if (habit.attribute !== 'FINANCEIRO') {
                await (0, xpService_1.removeXp)(userId, habit.attribute, habit.xpValue);
            }
            res.json({ message: 'Log removido', completed: false });
        }
        else {
            // Criar log
            const log = await prisma_1.prisma.habitLog.create({
                data: {
                    habitId,
                    date: logDate,
                    completed: true,
                },
            });
            await (0, activityService_1.logActivity)(userId, 'habit_completed', `Hábito concluído: ${habit.title}`);
            // Award XP
            if (habit.attribute !== 'FINANCEIRO') {
                await (0, xpService_1.addXp)(userId, habit.attribute, habit.xpValue);
            }
            res.json({ message: 'Log criado', completed: true, log });
        }
    }
    catch (error) {
        console.error('Toggle habit log error:', error);
        res.status(500).json({ error: 'Erro ao marcar hábito' });
    }
};
exports.toggleHabitLog = toggleHabitLog;
const getHabitStats = async (req, res) => {
    try {
        const userId = req.userId;
        const { month, year } = req.query;
        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);
        const habits = await prisma_1.prisma.habit.findMany({
            where: { userId },
            include: {
                logs: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                },
            },
        });
        const daysInMonth = endDate.getDate();
        const totalPossible = habits.length * daysInMonth;
        const totalCompleted = habits.reduce((sum, habit) => sum + habit.logs.length, 0);
        const percentage = totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 0;
        // Calculate daily progress for the chart
        const dailyProgress = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Number(year), Number(month) - 1, day);
            const dateStr = date.toISOString().split('T')[0];
            let completedOnDay = 0;
            habits.forEach(habit => {
                if (habit.logs.some(log => log.date.toISOString().startsWith(dateStr))) {
                    completedOnDay++;
                }
            });
            dailyProgress.push({
                day,
                percentage: habits.length > 0 ? (completedOnDay / habits.length) * 100 : 0
            });
        }
        res.json({
            totalHabits: habits.length,
            totalCompleted,
            totalPossible,
            percentage: Math.round(percentage),
            habits,
            dailyProgress
        });
    }
    catch (error) {
        console.error('Get habit stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
};
exports.getHabitStats = getHabitStats;
