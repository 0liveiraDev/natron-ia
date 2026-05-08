"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTasks = exports.createTask = void 0;
const prisma_1 = require("../lib/prisma");
const activityService_1 = require("../services/activityService");
const xpService_1 = require("../services/xpService");
const createTask = async (req, res) => {
    try {
        const { title, description, dueDate, attribute, xpValue } = req.body;
        const userId = req.userId;
        const task = await prisma_1.prisma.task.create({
            data: {
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                userId,
                attribute: attribute || 'PRODUTIVIDADE',
                xpValue: xpValue || 5
            },
        });
        await (0, activityService_1.logActivity)(userId, 'task_created', `Tarefa criada: ${title}`);
        res.status(201).json(task);
    }
    catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    try {
        const userId = req.userId;
        const { status } = req.query;
        const where = { userId };
        if (status) {
            where.status = status;
        }
        const tasks = await prisma_1.prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        res.json(tasks);
    }
    catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
};
exports.getTasks = getTasks;
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, dueDate, attribute, xpValue } = req.body;
        const userId = req.userId;
        // Check if task is being completed or uncompleted
        const currentTask = await prisma_1.prisma.task.findUnique({ where: { id } });
        const isCompleting = status === 'completed' && currentTask?.status !== 'completed';
        const isUncompleting = status === 'pending' && currentTask?.status === 'completed';
        const task = await prisma_1.prisma.task.updateMany({
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
            await (0, activityService_1.logActivity)(userId, 'task_completed', `Tarefa concluída: ${currentTask.title}`);
            // Award XP
            if (currentTask.attribute !== 'FINANCEIRO') {
                await (0, xpService_1.addXp)(userId, currentTask.attribute, currentTask.xpValue);
            }
        }
        if (isUncompleting && currentTask) {
            await (0, activityService_1.logActivity)(userId, 'task_uncompleted', `Tarefa desmarcada: ${currentTask.title}`);
            // Remove XP
            if (currentTask.attribute !== 'FINANCEIRO') {
                await (0, xpService_1.removeXp)(userId, currentTask.attribute, currentTask.xpValue);
            }
        }
        res.json(task);
    }
    catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        console.log('🗑️ Deleting task:', { id, userId });
        // Get task before deleting to check if it was completed
        const task = await prisma_1.prisma.task.findUnique({
            where: { id }
        });
        console.log('📋 Task found:', task);
        if (!task || task.userId !== userId) {
            console.log('❌ Task not found or unauthorized');
            return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        // If task was completed, remove the XP
        if (task.status === 'completed' && task.attribute !== 'FINANCEIRO') {
            const xpToRemove = task.xpValue || 10; // Fallback to default
            console.log('⬇️ Removing XP:', { attribute: task.attribute, xpValue: xpToRemove });
            await (0, xpService_1.removeXp)(userId, task.attribute, xpToRemove);
        }
        await prisma_1.prisma.task.delete({
            where: { id },
        });
        console.log('✅ Task deleted successfully');
        await (0, activityService_1.logActivity)(userId, 'task_deleted', `Tarefa deletada: ${task.title}`);
        res.json({ message: 'Tarefa deletada com sucesso' });
    }
    catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
};
exports.deleteTask = deleteTask;
