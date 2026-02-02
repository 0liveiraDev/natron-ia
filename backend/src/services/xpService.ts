import { PrismaClient } from '@prisma/client';
import { logActivity } from './activityService';

const prisma = new PrismaClient();

// Rank thresholds - Naruto Ninja Hierarchy
const ranks = [
    { name: 'Estudante da Academia', minXp: 0 },
    { name: 'Genin', minXp: 100 },
    { name: 'Chunin', minXp: 500 },
    { name: 'Tokubetsu Jonin', minXp: 1200 },
    { name: 'Jonin', minXp: 2500 },
    { name: 'ANBU', minXp: 3000 },        // Classe Especial 1
    { name: 'Sannin', minXp: 5000 },      // Classe Especial 2
    { name: 'Kage', minXp: 8000 },        // Classe Especial 3 (Rank Máximo)
];

// Calculate rank based on total XP
export const calculateRank = (totalXp: number) => {
    let currentRank = ranks[0];
    let nextRank = null;

    for (let i = 0; i < ranks.length; i++) {
        if (totalXp >= ranks[i].minXp) {
            currentRank = ranks[i];
            nextRank = ranks[i + 1] || null;
        } else {
            break;
        }
    }

    return {
        rank: currentRank.name,
        minXp: currentRank.minXp,
        nextRankName: nextRank ? nextRank.name : 'Lenda',
        nextRankMinXp: nextRank ? nextRank.minXp : totalXp * 2, // No cap for last rank
    };
};

export const addXp = async (userId: string, category: string, amount: number) => {
    // Map generic category string to DB field if necessary
    // Enum values: FISICO, DISCIPLINA, MENTAL, INTELECTO, PRODUTIVIDADE, FINANCEIRO

    // Safety check for category
    const validCategories = ['FISICO', 'DISCIPLINA', 'MENTAL', 'INTELECTO', 'PRODUTIVIDADE', 'FINANCEIRO'];
    const targetCategory = validCategories.includes(category) ? category : 'PRODUTIVIDADE';

    const fieldName = `xp${targetCategory.charAt(0) + targetCategory.slice(1).toLowerCase()}`; // e.g., xpFisico -> xpPhysical (wait, schema is English)

    // Mapping schema fields
    const schemaMap: Record<string, string> = {
        'FISICO': 'xpPhysical',
        'DISCIPLINA': 'xpDiscipline',
        'MENTAL': 'xpMental',
        'INTELECTO': 'xpIntellect',
        'PRODUTIVIDADE': 'xpProductivity',
        'FINANCEIRO': 'xpFinancial'
    };

    const dbField = schemaMap[targetCategory];

    if (!dbField) return;

    // Fetch current user stats
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Calculate new total XP with conversion rate
    // Every 5 score points = 5 total XP (1.0 conversion rate)
    const XP_CONVERSION_RATE = 1.0;
    const currentTotal = user.currentXp || 0;
    const totalXpGained = amount * XP_CONVERSION_RATE;
    const newTotal = currentTotal + totalXpGained;

    // Calculate new stats
    const currentStat = (user as any)[dbField] || 0;
    const newStat = currentStat + amount;

    // Determine Rank
    const { rank } = calculateRank(newTotal);

    // Update User
    await prisma.user.update({
        where: { id: userId },
        data: {
            [dbField]: newStat,
            currentXp: newTotal,
            rank: rank,
        }
    });

    // Check for Rank Up (simple check)
    if (rank !== user.rank) {
        await logActivity(userId, 'rank_up', `Parabéns! Você alcançou o rank ${rank}!`);
    }

    return { rank, newTotal };
};

// NEW: Remove XP when uncompleting habits/tasks
export const removeXp = async (userId: string, category: string, amount: number) => {
    const validCategories = ['FISICO', 'DISCIPLINA', 'MENTAL', 'INTELECTO', 'PRODUTIVIDADE', 'FINANCEIRO'];
    const targetCategory = validCategories.includes(category) ? category : 'PRODUTIVIDADE';

    const schemaMap: Record<string, string> = {
        'FISICO': 'xpPhysical',
        'DISCIPLINA': 'xpDiscipline',
        'MENTAL': 'xpMental',
        'INTELECTO': 'xpIntellect',
        'PRODUTIVIDADE': 'xpProductivity',
        'FINANCEIRO': 'xpFinancial'
    };

    const dbField = schemaMap[targetCategory];
    if (!dbField) return;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // Calculate XP to remove with conversion rate
    const XP_CONVERSION_RATE = 1.0;
    const currentTotal = user.currentXp || 0;
    const totalXpLost = amount * XP_CONVERSION_RATE;
    const newTotal = Math.max(0, currentTotal - totalXpLost); // Don't go below 0

    // Calculate new attribute stat
    const currentStat = (user as any)[dbField] || 0;
    const newStat = Math.max(0, currentStat - amount); // Don't go below 0

    // Determine new rank
    const { rank } = calculateRank(newTotal);

    // Update user
    await prisma.user.update({
        where: { id: userId },
        data: {
            [dbField]: newStat,
            currentXp: newTotal,
            rank: rank,
        }
    });

    // Check for rank down
    if (rank !== user.rank) {
        await logActivity(userId, 'rank_change', `Seu rank mudou para ${rank}`);
    }

    return { rank, newTotal };
};
