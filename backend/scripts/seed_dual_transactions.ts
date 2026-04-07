
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    const user = users[0];
    console.log(`Seeding transactions for user: ${user.name}`);

    // Transaction 1: TODAY (Feb)
    await prisma.transaction.create({
        data: {
            amount: 50.00,
            type: 'saida',
            category: 'alimentacao',
            description: 'Teste Fevereiro (Agora)',
            date: new Date(),
            userId: user.id
        }
    });

    // Transaction 2: LAST MONTH (Jan)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await prisma.transaction.create({
        data: {
            amount: 75.00,
            type: 'saida',
            category: 'transporte',
            description: 'Teste Janeiro (Passado)',
            date: lastMonth,
            userId: user.id
        }
    });

    console.log(`Created 2 transactions.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
