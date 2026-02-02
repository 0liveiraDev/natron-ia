import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('❌ No users found.');
        return;
    }

    const user = users[0];
    console.log(`🔄 Resetting XP for: ${user.name}\n`);

    // Reset all XP values to 0
    await prisma.user.update({
        where: { id: user.id },
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

    console.log('✅ XP reset complete!');
    console.log('\nNew values:');
    console.log('- currentXp: 0');
    console.log('- level: 1');
    console.log('- rank: Estudante da Academia');
    console.log('- All attribute XPs: 0');
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
