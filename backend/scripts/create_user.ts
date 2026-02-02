import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'Brunooliveira1010@hotmail.com';
    const password = '123456';
    const name = 'Bruno';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name,
            password: hashedPassword,
            role: 'Viajante',
            rank: 'Estudante da Academia',
            level: 1,
            currentXp: 0
        },
    });

    console.log(`User created: ${user.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
