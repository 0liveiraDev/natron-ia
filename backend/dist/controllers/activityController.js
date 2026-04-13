"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivities = void 0;
const prisma_1 = require("../lib/prisma");
const getActivities = async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50 } = req.query;
        const activities = await prisma_1.prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
        });
        res.json(activities);
    }
    catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: 'Erro ao buscar atividades' });
    }
};
exports.getActivities = getActivities;
