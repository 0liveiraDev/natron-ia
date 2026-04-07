import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    console.log('📊 Inserindo transações de teste para a última semana...\n');

    try {
        // Get the first user
        const user = await prisma.user.findFirst();

        if (!user) {
            console.error('❌ Nenhum usuário encontrado! Crie um usuário primeiro.');
            process.exit(1);
        }

        console.log(`👤 Usando usuário: ${user.name} (${user.email})`);

        // Create transactions for the last 7 days
        const transactions = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            date.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

            // Create 1-3 random expenses per day
            const numExpenses = Math.floor(Math.random() * 3) + 1;

            for (let j = 0; j < numExpenses; j++) {
                const categories = ['alimentacao', 'transporte', 'lazer', 'saude'];
                const category = categories[Math.floor(Math.random() * categories.length)];
                const amount = Math.random() * 100 + 10; // R$ 10-110

                transactions.push({
                    userId: user.id,
                    amount: parseFloat(amount.toFixed(2)),
                    type: 'saida',
                    category,
                    description: `Teste ${category} - ${date.toLocaleDateString('pt-BR')}`,
                    date,
                });
            }

            // Maybe add some income
            if (Math.random() > 0.5) {
                transactions.push({
                    userId: user.id,
                    amount: parseFloat((Math.random() * 500 + 100).toFixed(2)),
                    type: 'entrada',
                    category: 'salario',
                    description: `Teste entrada - ${date.toLocaleDateString('pt-BR')}`,
                    date,
                });
            }
        }

        // Insert all transactions
        for (const transaction of transactions) {
            await prisma.transaction.create({
                data: transaction,
            });
            console.log(`✅ ${transaction.date.toLocaleDateString('pt-BR')}: ${transaction.type} - R$ ${transaction.amount} (${transaction.category})`);
        }

        console.log(`\n✅ ${transactions.length} transações criadas com sucesso!`);
        console.log('💡 Agora acesse o Dashboard para ver o gráfico "Custos da Semana"!');
    } catch (error) {
        console.error('❌ Erro ao inserir transações:', error);
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
