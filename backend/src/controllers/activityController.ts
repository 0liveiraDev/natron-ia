import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

export const getActivities = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { limit = 50 } = req.query;

        const activities = await prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
        });

        res.json(activities);
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: 'Erro ao buscar atividades' });
    }
};
