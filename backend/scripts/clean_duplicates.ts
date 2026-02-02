import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('❌ No users found.');
        return;
    }

    const user = users[0];
    console.log(`🧹 Cleaning duplicates for: ${user.name}\n`);

    // Get all habits
    const habits = await prisma.habit.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${habits.length} habits`);

    // Group by title
    const habitsByTitle = new Map<string, typeof habits>();
    habits.forEach(h => {
        if (!habitsByTitle.has(h.title)) {
            habitsByTitle.set(h.title, []);
        }
        habitsByTitle.get(h.title)!.push(h);
    });

    // Keep first of each title, delete rest
    let deleted = 0;
    for (const [title, duplicates] of habitsByTitle.entries()) {
        if (duplicates.length > 1) {
            console.log(`\n"${title}": ${duplicates.length} duplicates`);
            // Keep the first one, delete the rest
            for (let i = 1; i < duplicates.length; i++) {
                await prisma.habitLog.deleteMany({
                    where: { habitId: duplicates[i].id }
                });
                await prisma.habit.delete({
                    where: { id: duplicates[i].id }
                });
                deleted++;
                console.log(`  ✅ Deleted duplicate #${i}`);
            }
        }
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${deleted} duplicate habits.`);
    console.log(`Remaining: ${habits.length - deleted} unique habits`);
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
