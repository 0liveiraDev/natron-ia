import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activityService';
import { addXp, removeXp } from '../services/xpService';

const prisma = new PrismaClient();

export const createHabit = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, attribute, xpValue } = req.body;
        const userId = req.userId!;

        const habit = await prisma.habit.create({
            data: {
                title,
                description,
                userId,
                attribute: attribute || 'PRODUTIVIDADE',
                xpValue: xpValue || 5
            },
        });

        await logActivity(userId, 'habit_created', `Hábito criado: ${title}`);

        res.status(201).json(habit);
    } catch (error) {
        console.error('Create habit error:', error);
        res.status(500).json({ error: 'Erro ao criar hábito' });
    }
};

export const getHabits = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const habits = await prisma.habit.findMany({
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
    } catch (error) {
        console.error('Get habits error:', error);
        res.status(500).json({ error: 'Erro ao buscar hábitos' });
    }
};

export const updateHabit = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        const userId = req.userId!;

        const habit = await prisma.habit.updateMany({
            where: { id, userId },
            data: { title, description },
        });

        res.json(habit);
    } catch (error) {
        console.error('Update habit error:', error);
        res.status(500).json({ error: 'Erro ao atualizar hábito' });
    }
};

export const deleteHabit = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        await prisma.habit.deleteMany({
            where: { id, userId },
        });

        res.json({ message: 'Hábito deletado com sucesso' });
    } catch (error) {
        console.error('Delete habit error:', error);
        res.status(500).json({ error: 'Erro ao deletar hábito' });
    }
};

export const toggleHabitLog = async (req: AuthRequest, res: Response) => {
    try {
        const { habitId } = req.params;
        const { date } = req.body;
        const userId = req.userId!;

        // Verificar se o hábito pertence ao usuário
        const habit = await prisma.habit.findFirst({
            where: { id: habitId, userId },
        });

        if (!habit) {
            return res.status(404).json({ error: 'Hábito não encontrado' });
        }

        const logDate = date ? new Date(date) : new Date();
        logDate.setHours(0, 0, 0, 0);

        // Verificar se já existe log para essa data
        const existingLog = await prisma.habitLog.findUnique({
            where: {
                habitId_date: {
                    habitId,
                    date: logDate,
                },
            },
        });

        if (existingLog) {
            // Remover log e XP
            await prisma.habitLog.delete({
                where: { id: existingLog.id },
            });

            // Remove XP when unmarking
            if (habit.attribute !== 'FINANCEIRO') {
                await removeXp(userId, habit.attribute, habit.xpValue);
            }

            res.json({ message: 'Log removido', completed: false });
        } else {
            // Criar log
            const log = await prisma.habitLog.create({
                data: {
                    habitId,
                    date: logDate,
                    completed: true,
                },
            });

            await logActivity(userId, 'habit_completed', `Hábito concluído: ${habit.title}`);

            // Award XP
            if (habit.attribute !== 'FINANCEIRO') {
                await addXp(userId, habit.attribute, habit.xpValue);
            }

            res.json({ message: 'Log criado', completed: true, log });
        }
    } catch (error) {
        console.error('Toggle habit log error:', error);
        res.status(500).json({ error: 'Erro ao marcar hábito' });
    }
};

export const getHabitStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { month, year } = req.query;

        const startDate = new Date(Number(year), Number(month) - 1, 1);
        const endDate = new Date(Number(year), Number(month), 0);

        const habits = await prisma.habit.findMany({
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
    } catch (error) {
        console.error('Get habit stats error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
};
