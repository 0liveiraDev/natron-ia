import { PrismaClient } from '@prisma/client';
import { addXp, calculateRank } from './src/services/xpService';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No user found');
        return;
    }

    console.log(`Adding 300 XP to user ${user.name}...`);

    // We want 300 XP. Since conversion is 0.5 (10 score = 5 XP), we need to add 600 'attribute score'.
    // Or we can just bypass and directly use addXp which takes score.
    // addXp(userId, category, amount) -> amount is score.
    // To get 300 XP, we need amount = 600.

    const result = await addXp(user.id, 'INTELECTO', 4000);

    console.log('XP Added!');
    console.log('New Total:', result?.newTotal);
    console.log('New Rank:', result?.rank);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
