import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';
import * as readline from 'readline';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('🗑️  Deletar usuário específico\n');

    const email = await question('Digite o email do usuário para deletar: ');

    if (!email) {
        console.log('❌ Email não fornecido!');
        process.exit(1);
    }

    try {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log(`❌ Usuário com email "${email}" não encontrado!`);
            process.exit(1);
        }

        console.log(`\n👤 Usuário encontrado: ${user.name} (${user.email})`);
        const confirm = await question('Tem certeza que deseja deletar? (s/n): ');

        if (confirm.toLowerCase() !== 's') {
            console.log('❌ Operação cancelada!');
            process.exit(0);
        }

        // Delete in correct order
        console.log('\n📋 Deletando dados do usuário...');

        await prisma.activityLog.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Logs de atividades');

        await prisma.habitLog.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Logs de hábitos');

        await prisma.habit.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Hábitos');

        await prisma.task.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Tarefas');

        await prisma.transaction.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Transações');

        await prisma.financialConfig.deleteMany({ where: { userId: user.id } });
        console.log('  ✅ Configurações financeiras');

        await prisma.user.delete({ where: { id: user.id } });
        console.log('  ✅ Usuário');

        console.log(`\n✅ Usuário "${user.name}" deletado com sucesso!`);
        console.log('💡 Faça logout e crie uma nova conta para testar!');
    } catch (error) {
        console.error('❌ Erro ao deletar usuário:', error);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
