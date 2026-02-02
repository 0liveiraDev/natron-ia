
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    const user = users[0];
    console.log(`Creating CURRENT MONTH transactions for: ${user.name}\n`);

    const now = new Date();

    // Create 3 transactions for THIS MONTH
    const transactions = [
        {
            amount: 1500.00,
            type: 'entrada',
            category: 'salario',
            description: 'Salário Mensal',
            date: new Date(now.getFullYear(), now.getMonth(), 1), // First day of month
        },
        {
            amount: 50.00,
            type: 'saida',
            category: 'alimentacao',
            description: 'Almoço',
            date: new Date(now.getFullYear(), now.getMonth(), 5),
        },
        {
            amount: 30.00,
            type: 'saida',
            category: 'transporte',
            description: 'Uber',
            date: now, // Today
        }
    ];

    for (const t of transactions) {
        await prisma.transaction.create({
            data: {
                ...t,
                userId: user.id
            }
        });
        console.log(`✅ Created: ${t.type} - R$ ${t.amount} - ${t.description}`);
    }

    console.log(`\n✨ Created ${transactions.length} transactions for ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
