import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Resetting XP and stats for ALL users...\n');

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

    console.log(`✅ XP reset complete for ${result.count} users!`);
    console.log('\n💡 Refresh the page to see changes!');
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
