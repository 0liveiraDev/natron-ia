import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const resetAllXp = async (req: Request, res: Response) => {
    try {
        console.log('🔄 Emergency Reset: Zeroing XP for ALL users...');

        const result = await prisma.user.updateMany({
            data: {
                currentXp: 0,
                level: 1,
                rank: 'Estudante da Academia',
                xpPhysical: 0,
                xpDiscipline: 0,
                xpMental: 0,
                xpIntellect: 0,
                xpProductivity: 0,
                xpFinancial: 0,
            }
        });

        console.log(`✅ Reset complete. Impacted ${result.count} users.`);

        res.json({
            message: 'Todas as experiências foram zeradas com sucesso!',
            usersAffected: result.count
        });
    } catch (error) {
        console.error('Reset XP error:', error);
        res.status(500).json({ error: 'Erro ao zerar experiências', details: error instanceof Error ? error.message : String(error) });
    }
};
