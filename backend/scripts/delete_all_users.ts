import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🔌 Conectando ao banco de dados (com retries)...\n');

    let connected = false;
    let retries = 5;

    while (!connected && retries > 0) {
        try {
            // Wake up database with a simple query
            await prisma.user.count();
            connected = true;
            console.log('✅ Conexão estabelecida!\n');
        } catch (error) {
            console.log(`⏳ Banco dormindo? Tentando novamente em 3s... (${retries} retries restantes)`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    if (!connected) {
        console.error('❌ Não foi possível conectar ao banco de dados após várias tentativas.');
        process.exit(1);
    }

    try {
        console.log('🗑️  Deletando TODOS os usuários do banco de dados...\n');

        // Delete in correct order to respect foreign key constraints
        console.log('📋 Deletando logs de atividades...');
        const activities = await prisma.activityLog.deleteMany({});
        console.log(`  ✅ ${activities.count} logs deletados`);

        console.log('📋 Deletando logs de hábitos...');
        const habitLogs = await prisma.habitLog.deleteMany({});
        console.log(`  ✅ ${habitLogs.count} logs deletados`);

        console.log('📋 Deletando hábitos...');
        const habits = await prisma.habit.deleteMany({});
        console.log(`  ✅ ${habits.count} hábitos deletados`);

        console.log('📋 Deletando tarefas...');
        const tasks = await prisma.task.deleteMany({});
        console.log(`  ✅ ${tasks.count} tarefas deletadas`);

        console.log('📋 Deletando transações financeiras...');
        const transactions = await prisma.transaction.deleteMany({});
        console.log(`  ✅ ${transactions.count} transações deletadas`);

        console.log('📋 Deletando configurações financeiras...');
        const configs = await prisma.financialConfig.deleteMany({});
        console.log(`  ✅ ${configs.count} configurações deletadas`);

        console.log('👤 Deletando TODOS os usuários...');
        const users = await prisma.user.deleteMany({});
        console.log(`  ✅ ${users.count} usuários deletados`);

        console.log(`\n✅ Limpeza completa!`);
        console.log('💡 Agora você pode criar novos usuários para testar!');
    } catch (error) {
        console.error('❌ Erro ao deletar usuários:', error);
        process.exit(1);
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
