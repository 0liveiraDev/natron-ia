
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    const user = users[0];
    console.log(`=== FINANCIAL DEBUG FOR: ${user.name} ===\n`);

    // Get financial config
    const config = await prisma.financialConfig.findUnique({
        where: { userId: user.id }
    });

    console.log('FINANCIAL CONFIG:');
    console.log(`  Initial Reserve: ${config?.initialReserve || 0}`);
    console.log(`  Monthly Budget: ${config?.monthlyBudget || 0}\n`);

    // Get all transactions
    const allTransactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' }
    });

    console.log(`TOTAL TRANSACTIONS: ${allTransactions.length}\n`);

    if (allTransactions.length > 0) {
        console.log('ALL TRANSACTIONS:');
        allTransactions.forEach(t => {
            console.log(`  [${t.date.toISOString().split('T')[0]}] ${t.type.toUpperCase()} - ${t.category} - R$ ${t.amount} - "${t.description || 'N/A'}"`);
        });
        console.log('');
    }

    // Calculate totals
    const totalIncome = allTransactions
        .filter(t => t.type === 'entrada' || t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = allTransactions
        .filter(t => t.type === 'saida' || t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const calculatedBalance = (config?.initialReserve || 0) + totalIncome - totalExpenses;

    console.log('CALCULATIONS:');
    console.log(`  Total Income (entrada): R$ ${totalIncome.toFixed(2)}`);
    console.log(`  Total Expenses (saida): R$ ${totalExpenses.toFixed(2)}`);
    console.log(`  Initial Reserve: R$ ${(config?.initialReserve || 0).toFixed(2)}`);
    console.log(`  CALCULATED BALANCE: R$ ${calculatedBalance.toFixed(2)}\n`);

    // Check current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = allTransactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    console.log(`CURRENT MONTH (${currentMonth + 1}/${currentYear}): ${monthlyTransactions.length} transactions`);
    if (monthlyTransactions.length > 0) {
        monthlyTransactions.forEach(t => {
            console.log(`  [${t.date.toISOString().split('T')[0]}] ${t.type} - R$ ${t.amount}`);
        });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
