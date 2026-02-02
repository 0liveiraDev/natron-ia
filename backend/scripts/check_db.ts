import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking latest user avatarUrl format...\n');
    const user = await prisma.user.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, avatarUrl: true, createdAt: true }
    });

    if (user) {
        console.log('✅ Found User:');
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log('❌ No users found in database.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
