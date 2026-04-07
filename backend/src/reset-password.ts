import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const email = 'Brunooliveira1010@hotmail.com';
        const newPassword = '123456';

        console.log(`🔧 Resetando senha para: ${email}`);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });

        console.log('✅ Senha resetada com sucesso!');
        console.log(`\n📧 Email: ${email}`);
        console.log(`🔑 Nova senha: ${newPassword}`);
        console.log('\n💡 Use essas credenciais para fazer login');

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
