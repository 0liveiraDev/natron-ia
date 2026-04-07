
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('No users found.');
        return;
    }

    const user = users[0];
    console.log(`Clearing transactions for user: ${user.name}`);

    const config = await prisma.financialConfig.deleteMany({
        where: { userId: user.id }
    });
    console.log(`Deleted financial config.`);

    const { count } = await prisma.transaction.deleteMany({
        where: { userId: user.id }
    });

    console.log(`Deleted ${count} transactions.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
