import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
const prisma = new PrismaClient();

const API_URL = 'http://127.0.0.1:3001/api';

async function main() {
    console.log('🧪 Iniciando teste de Integração (API) com Fetch...');

    // 1. Criar usuário no banco (pra agilizar)
    const email = `api_test_${Date.now()}@test.com`;
    const password = '123';

    // Create via API to get token? No, easier to seed user then login.
    // Or just manually create token?
    // Let's simpler: Create user directly in DB, then login via API to get token.

    // Register via API
    try {
        console.log('👤 Registrando usuário...');
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'API Tester', email, password })
        });
        const regData = await regRes.json();

        if (!regRes.ok) throw new Error(JSON.stringify(regData));

        const token = regData.token;
        const userId = regData.user.id;
        console.log(`✅ Registrado. Token obtido.`);

        // 2. Criar tarefa via API
        console.log('📝 Criando tarefa...');
        const taskRes = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Task API Test',
                xpValue: 10,
                attribute: 'PRODUTIVIDADE'
            })
        });
        const task = await taskRes.json();
        console.log(`✅ Tarefa criada: ${task.id}`);

        // 3. Completar tarefa via API
        console.log('✅ Completando tarefa...');
        await fetch(`${API_URL}/tasks/${task.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...task,
                status: 'completed'
            })
        });
        console.log('✅ Tarefa marcada como completed.');

        // Verificar XP
        const userAfter = await prisma.user.findUnique({ where: { id: userId } });
        console.log(`📊 XP Atual: ${userAfter?.currentXp} (Esperado: 10)`);

        // 4. DELETAR tarefa via API
        console.log('🗑️ Deletando tarefa via API...');
        const delRes = await fetch(`${API_URL}/tasks/${task.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`✅ Delete response: ${delRes.status}`);

        // Verificar XP final
        const userFinal = await prisma.user.findUnique({ where: { id: userId } });
        console.log(`📊 XP Final: ${userFinal?.currentXp} (Esperado: 0)`);

        if (userFinal?.currentXp === 0) {
            console.log('🎉 SUCESSO! XP foi removido.');
        } else {
            console.log('❌ FALHA! XP não foi removido.');
        }

        // Cleanup
        await prisma.user.delete({ where: { id: userId } });

    } catch (error: any) {
        console.error('❌ Erro no teste:', error);
    }
}

main()
    .finally(() => prisma.$disconnect());
