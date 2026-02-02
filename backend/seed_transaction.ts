
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    const user = users[0];
    console.log(`Seeding transaction for user: ${user.name}`);

    // Create a transaction for TODAY
    const t1 = await prisma.transaction.create({
        data: {
            amount: 50.00,
            type: 'saida',
            category: 'alimentacao',
            description: 'Teste de Sistema (Script)',
            date: new Date(),
            userId: user.id
        }
    });

    console.log(`Created transaction: ${t1.id} - ${t1.date.toISOString()}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
