
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found in database.');
        return;
    }

    const user = users[0];
    console.log(`Using user: ${user.name} (${user.email}) - ID: ${user.id}`);

    // Check Stats
    console.log(`XP Financial: ${user.xpFinancial}`);
    console.log(`Current XP: ${user.currentXp}`);

    // Check Transactions
    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
    });

    console.log(`Found ${transactions.length} transactions in total.`);

    if (transactions.length === 0) {
        console.log('No transactions found.');
    } else {
        console.log('--- Last 5 Transactions ---');
        transactions.slice(0, 5).forEach(t => {
            console.log(`ID: ${t.id} | Date: ${t.date.toISOString()} | Type: ${t.type} | Cat: ${t.category} | Amount: ${t.amount}`);
        });
    }

    // Simulate Dashboard Calculation for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    console.log(`--- Dashboard Simulation ---`);
    console.log(`Current System Date: ${now.toISOString()} (Month: ${currentMonth + 1})`);
    console.log(`Transactions in this month: ${monthlyTransactions.length}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
