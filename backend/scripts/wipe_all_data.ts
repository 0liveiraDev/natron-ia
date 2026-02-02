import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  ATENÇÃO: Limpando TODOS os dados do banco de dados...\n');

    try {
        // Delete in correct order to respect foreign key constraints
        console.log('📋 Deletando logs de atividades...');
        await prisma.activityLog.deleteMany({});

        console.log('📋 Deletando logs de hábitos...');
        await prisma.habitLog.deleteMany({});

        console.log('📋 Deletando hábitos...');
        await prisma.habit.deleteMany({});

        console.log('📋 Deletando tarefas...');
        await prisma.task.deleteMany({});

        console.log('📋 Deletando transações financeiras...');
        await prisma.transaction.deleteMany({});

        console.log('📋 Deletando configurações financeiras...');
        await prisma.financialConfig.deleteMany({});

        console.log('👤 Deletando TODOS os usuários...');
        const result = await prisma.user.deleteMany({});

        console.log(`\n✅ Limpeza completa! ${result.count} usuários removidos.`);
        console.log('💡 Banco de dados zerado. Você pode começar do zero agora!');
    } catch (error) {
        console.error('❌ Erro ao limpar dados:', error);
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
