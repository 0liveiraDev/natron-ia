import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetXp() {
    try {
        // Reset XP for all users (or you can filter by email)
        const result = await prisma.user.updateMany({
            data: {
                currentXp: 0,
                xpPhysical: 0,
                xpDiscipline: 0,
                xpMental: 0,
                xpIntellect: 0,
                xpProductivity: 0,
                xpFinancial: 0,
                rank: 'Estudante da Academia'
            }
        });

        console.log(`✅ XP resetado para ${result.count} usuário(s)!`);
        console.log('Todos os atributos foram zerados e rank voltou para "Estudante da Academia"');
    } catch (error) {
        console.error('❌ Erro ao resetar XP:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetXp();
