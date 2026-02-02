import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activityService';
import { addXp, removeXp } from '../services/xpService';

const prisma = new PrismaClient();

export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, dueDate, attribute, xpValue } = req.body;
        const userId = req.userId!;

        const task = await prisma.task.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                userId,
                attribute: attribute || 'PRODUTIVIDADE',
                xpValue: xpValue || 5
            },
        });

        await logActivity(userId, 'task_created', `Tarefa criada: ${title}`);

        res.status(201).json(task);
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { status } = req.query;

        const where: any = { userId };
        if (status) {
            where.status = status;
        }

        const tasks = await prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.json(tasks);
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, status, dueDate, attribute, xpValue } = req.body;
        const userId = req.userId!;

        // Check if task is being completed or uncompleted
        const currentTask = await prisma.task.findUnique({ where: { id } });
        const isCompleting = status === 'completed' && currentTask?.status !== 'completed';
        const isUncompleting = status === 'pending' && currentTask?.status === 'completed';

        const task = await prisma.task.updateMany({
            where: { id, userId },
            data: {
                title,
                description,
                status,
                dueDate: dueDate ? new Date(dueDate) : null,
                attribute,
                xpValue
            },
        });

        if (isCompleting && currentTask) {
            await logActivity(userId, 'task_completed', `Tarefa concluída: ${currentTask.title}`);
            // Award XP
            await addXp(userId, currentTask.attribute, currentTask.xpValue);
        }

        if (isUncompleting && currentTask) {
            await logActivity(userId, 'task_uncompleted', `Tarefa desmarcada: ${currentTask.title}`);
            // Remove XP
            await removeXp(userId, currentTask.attribute, currentTask.xpValue);
        }

        res.json(task);
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        await prisma.task.deleteMany({
            where: { id, userId },
        });

        res.json({ message: 'Tarefa deletada com sucesso' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
};
