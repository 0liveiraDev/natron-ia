"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function resetPassword() {
    try {
        const email = 'Brunooliveira1010@hotmail.com';
        const newPassword = '123456';
        console.log(`🔧 Resetando senha para: ${email}`);
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log('✅ Senha resetada com sucesso!');
        console.log(`\n📧 Email: ${email}`);
        console.log(`🔑 Nova senha: ${newPassword}`);
        console.log('\n💡 Use essas credenciais para fazer login');
    }
    catch (error) {
        console.error('❌ Erro:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
resetPassword();
