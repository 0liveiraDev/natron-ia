import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('❌ No users found.');
        return;
    }

    const user = users[0];
    console.log(`🔍 Debugging for: ${user.name}\n`);

    // 1. Check current XP
    console.log('=== CURRENT XP ===');
    console.log(`Total XP: ${user.currentXp}`);
    console.log(`Físico: ${user.xpPhysical}`);
    console.log(`Disciplina: ${user.xpDiscipline}`);
    console.log(`Mental: ${user.xpMental}`);
    console.log(`Intelecto: ${user.xpIntellect}`);
    console.log(`Produtividade: ${user.xpProductivity}`);
    console.log(`Financeiro: ${user.xpFinancial}\n`);

    // 2. Check habits and logs
    const habits = await prisma.habit.findMany({
        where: { userId: user.id },
        include: { logs: true }
    });
    console.log(`=== HABITS (${habits.length}) ===`);
    habits.forEach(h => {
        console.log(`- ${h.title}: ${h.logs.length} logs, Attribute: ${h.attribute}, XP Value: ${h.xpValue}`);
    });
    console.log();

    // 3. Check tasks
    const tasks = await prisma.task.findMany({
        where: { userId: user.id }
    });
    console.log(`=== TASKS (${tasks.length}) ===`);
    tasks.forEach(t => {
        console.log(`- ${t.title}: Attribute: ${t.attribute}`);
    });
    console.log();

    // 4. Check transactions (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const recentTransactions = await prisma.transaction.findMany({
        where: {
            userId: user.id,
            date: { gte: sevenDaysAgo }
        },
        orderBy: { date: 'desc' }
    });

    console.log(`=== TRANSACTIONS (Last 7 days: ${recentTransactions.length}) ===`);
    recentTransactions.forEach(t => {
        console.log(`- ${t.date.toLocaleDateString()}: ${t.type} R$ ${t.amount} (${t.category})`);
    });
    console.log();

    // 5. Weekly expenses by day
    console.log('=== WEEKLY EXPENSES (by day) ===');
    for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const dayExpenses = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                type: 'saida',
                date: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            }
        });

        const total = dayExpenses.reduce((sum, t) => sum + t.amount, 0);
        console.log(`${startOfDay.toLocaleDateString('pt-BR')}: R$ ${total.toFixed(2)} (${dayExpenses.length} transactions)`);
    }
    console.log();

    // 6. Test habit log creation and XP
    console.log('=== TESTING HABIT XP ===');
    if (habits.length > 0) {
        const testHabit = habits[0];
        console.log(`Testing with habit: ${testHabit.title}`);
        console.log(`Attribute: ${testHabit.attribute}, XP Value: ${testHabit.xpValue}`);
        console.log(`Current ${testHabit.attribute} XP: ${user[`xp${testHabit.attribute.charAt(0) + testHabit.attribute.slice(1).toLowerCase()}` as keyof typeof user]}`);
    }
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
