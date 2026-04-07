import { PrismaClient } from '@prisma/client';
import { addXp, removeXp } from '../src/services/xpService';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Iniciando teste de lógica de XP...');

    // 1. Criar usuário de teste
    const email = `test_xp_${Date.now()}@test.com`;
    const user = await prisma.user.create({
        data: {
            name: 'Test Wrapper',
            email,
            password: 'hashed_password',
            xpProductivity: 0,
            currentXp: 0,
            rank: 'Estudante da Academia'
        }
    });
    console.log(`👤 Usuário criado: ${user.email} (XP: ${user.currentXp})`);

    // 2. Criar tarefa
    const task = await prisma.task.create({
        data: {
            title: 'Tarefa de Teste XP',
            userId: user.id,
            attribute: 'PRODUTIVIDADE',
            xpValue: 5,
            status: 'pending'
        }
    });
    console.log(`📝 Tarefa criada: ${task.title} (Status: ${task.status}, XP Value: ${task.xpValue})`);

    // 3. Simular conclusão da tarefa (Adicionar XP)
    console.log('\n--- Concluindo Tarefa ---');
    await prisma.task.update({
        where: { id: task.id },
        data: { status: 'completed' }
    });

    const xpAdded = await addXp(user.id, task.attribute, task.xpValue);
    console.log(`➕ XP Adicionado. Rank: ${xpAdded?.rank}, Total: ${xpAdded?.newTotal}`);

    // Verificar user
    const userAfterAdd = await prisma.user.findUnique({ where: { id: user.id } });
    console.log(`👤 Usuário após completar: XP=${userAfterAdd?.currentXp} (Esperado: 5)`);

    if (userAfterAdd?.currentXp !== 5) {
        console.error('❌ ERRO: XP não foi adicionado corretamente!');
    }

    // 4. Simular deleção da tarefa (Remover XP)
    console.log('\n--- Deletando Tarefa ---');

    // Lógica do controller: Check status -> Remove XP -> Delete
    const taskToDelete = await prisma.task.findUnique({ where: { id: task.id } });

    if (taskToDelete?.status === 'completed') {
        console.log(`⬇️ Removendo XP para tarefa completada...`);
        const xpRemoved = await removeXp(user.id, taskToDelete.attribute, taskToDelete.xpValue);
        console.log(`➖ XP Removido. Rank: ${xpRemoved?.rank}, Total: ${xpRemoved?.newTotal}`);
    }

    await prisma.task.delete({ where: { id: task.id } });
    console.log('🗑️ Tarefa deletada.');

    // Verificar user final
    const userFinal = await prisma.user.findUnique({ where: { id: user.id } });
    console.log(`👤 Usuário final: XP=${userFinal?.currentXp} (Esperado: 0)`);

    if (userFinal?.currentXp !== 0) {
        console.error('❌ ERRO: XP não foi removido corretamente!');
        console.log('User state:', userFinal);
    } else {
        console.log('✅ SUCESSO: XP removido corretamente e voltou a zero.');
    }

    // Limpeza
    await prisma.user.delete({ where: { id: user.id } });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
