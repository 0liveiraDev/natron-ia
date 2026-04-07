
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: {
            _count: {
                select: { transactions: true }
            }
        }
    });

    console.log(`Total users: ${users.length}`);

    for (const user of users) {
        console.log(`\nUser: ${user.name} (${user.email}) - ID: ${user.id}`);
        console.log(`Transaction Count: ${user._count.transactions}`);

        const transactions = await prisma.transaction.findMany({
            where: { userId: user.id }
        });

        const total = transactions.reduce((sum, t) => sum + (t.type === 'saida' ? -t.amount : t.amount), 0);
        console.log(`Calculated Balance: ${total}`);

        if (transactions.length > 0) {
            console.log('Sample transactions:');
            transactions.slice(0, 3).forEach(t =>
                console.log(` - ${t.date.toISOString().split('T')[0]}: ${t.amount} (${t.type}) - ${t.description}`)
            );
        }
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
