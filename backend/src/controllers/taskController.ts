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
            if (currentTask.attribute !== 'FINANCEIRO') {
                await addXp(userId, currentTask.attribute, currentTask.xpValue);
            }
        }

        if (isUncompleting && currentTask) {
            await logActivity(userId, 'task_uncompleted', `Tarefa desmarcada: ${currentTask.title}`);
            // Remove XP
            if (currentTask.attribute !== 'FINANCEIRO') {
                await removeXp(userId, currentTask.attribute, currentTask.xpValue);
            }
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
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../../debug_b.log');

        const log = (msg: string) => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
            console.log(msg);
        };

        log(`🗑️ Deleting task: ${id} for user ${userId}`);

        // Get task before deleting to check if it was completed
        const task = await prisma.task.findUnique({
            where: { id }
        });

        log(`📋 Task found: ${JSON.stringify(task)}`);

        if (!task || task.userId !== userId) {
            log('❌ Task not found or unauthorized');
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }

        // If task was completed, remove the XP
        if (task.status === 'completed' && task.attribute !== 'FINANCEIRO') {
            const xpToRemove = task.xpValue || 5; // Fallback to 5 just in case
            log(`⬇️ Removing XP: attribute=${task.attribute}, amount=${xpToRemove}`);

            const result = await removeXp(userId, task.attribute, xpToRemove);
            log(`✅ XP Removing Result: ${JSON.stringify(result)}`);
        } else {
            log(`ℹ️ No XP removal needed. Status=${task.status}, Attribute=${task.attribute}`);
        }

        await prisma.task.delete({
            where: { id },
        });

        log('✅ Task deleted successfully from DB');

        await logActivity(userId, 'task_deleted', `Tarefa deletada: ${task.title}`);

        res.json({ message: 'Tarefa deletada com sucesso' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
};
