
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    const user = users[0];
    const userId = user.id;

    console.log('=== SIMULATING FRONTEND API CALLS ===\n');

    // Simulate /transactions endpoint
    const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
    });

    console.log('1. GET /transactions');
    console.log(`   Returns: ${transactions.length} transactions`);
    transactions.forEach(t => {
        console.log(`   - ${t.date.toISOString()} | ${t.type} | ${t.category} | R$ ${t.amount}`);
    });

    // Simulate /finance/dashboard endpoint
    const [allTransactions, config] = await Promise.all([
        prisma.transaction.findMany({ where: { userId } }),
        prisma.financialConfig.findUnique({ where: { userId } })
    ]);

    const initialReserve = config?.initialReserve || 0;
    const income = allTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
    const expenses = allTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
    const balance = initialReserve + income - expenses;

    console.log('\n2. GET /finance/dashboard');
    console.log(`   Balance: R$ ${balance.toFixed(2)}`);
    console.log(`   Income: R$ ${income.toFixed(2)}`);
    console.log(`   Expenses: R$ ${expenses.toFixed(2)}`);

    // Simulate /finance/evolution endpoint (last 6 months)
    const now = new Date();
    console.log('\n3. GET /finance/evolution');

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthTransactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: { gte: date, lt: nextMonth },
            },
        });

        let monthIncome = 0;
        let monthExpenses = 0;

        monthTransactions.forEach(t => {
            if (t.type === 'income' || t.type === 'entrada') {
                monthIncome += t.amount;
            } else if (t.type === 'expense' || t.type === 'saida') {
                monthExpenses += t.amount;
            }
        });

        const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
        console.log(`   ${monthLabel}: Income=${monthIncome}, Expenses=${monthExpenses}`);
    }

    // Check current month filtering
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    console.log(`\n4. CURRENT MONTH FILTER (${currentMonth + 1}/${currentYear})`);
    console.log(`   Filtered: ${currentMonthTransactions.length} transactions`);
    currentMonthTransactions.forEach(t => {
        console.log(`   - ${t.date.toISOString().split('T')[0]} | ${t.type} | R$ ${t.amount}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
