import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('❌ No users found.');
        return;
    }

    const user = users[0];
    console.log(`🌱 Seeding data for: ${user.name}\n`);

    // Update User XP
    await prisma.user.update({
        where: { id: user.id },
        data: {
            currentXp: 67,
            rank: 'Iniciante',
            xpPhysical: 15,
            xpDiscipline: 12,
            xpMental: 10,
            xpIntellect: 8,
            xpProductivity: 14,
            xpFinancial: 8
        }
    });
    console.log('✅ Updated user XP to 67');

    // Create Habits
    const habits = [
        { title: 'Devocional', description: 'Fazer devocional diário', attribute: 'MENTAL' as const },
        { title: 'Ler 3 capítulos da bíblia', description: 'Leitura bíblica', attribute: 'MENTAL' as const },
        { title: 'Dieta', description: 'Seguir plano alimentar', attribute: 'FISICO' as const },
        { title: 'Beber 4L de água', description: 'Hidratação diária', attribute: 'FISICO' as const },
        { title: 'Organizar quarto', description: 'Manter quarto organizado', attribute: 'DISCIPLINA' as const },
        { title: '45 minutos de inglês', description: 'Estudar inglês', attribute: 'INTELECTO' as const },
        { title: 'Ler 30 páginas por dia', description: 'Leitura diária', attribute: 'INTELECTO' as const },
        { title: 'Cardio', description: 'Exercício cardiovascular', attribute: 'FISICO' as const }
    ];

    for (const habit of habits) {
        await prisma.habit.create({
            data: {
                ...habit,
                userId: user.id
            }
        });
    }
    console.log(`✅ Created ${habits.length} habits`);

    // Create Tasks
    const tasks = [
        { title: 'Estudar React', attribute: 'INTELECTO' as const },
        { title: 'Fazer exercícios', attribute: 'FISICO' as const },
        { title: 'Meditar 15min', attribute: 'MENTAL' as const },
        { title: 'Revisar finanças', attribute: 'FINANCEIRO' as const }
    ];

    for (const task of tasks) {
        await prisma.task.create({
            data: {
                ...task,
                userId: user.id
            }
        });
    }
    console.log(`✅ Created ${tasks.length} tasks`);

    // Create Financial Transactions (Current Month)
    const now = new Date();
    const transactions = [
        { amount: 1500, type: 'entrada', category: 'salario', description: 'Salário Mensal', date: new Date(now.getFullYear(), now.getMonth(), 1) },
        { amount: 200, type: 'saida', category: 'alimentacao', description: 'Mercado', date: new Date(now.getFullYear(), now.getMonth(), 5) },
        { amount: 150, type: 'saida', category: 'transporte', description: 'Uber', date: new Date(now.getFullYear(), now.getMonth(), 7) },
        { amount: 80, type: 'saida', category: 'lazer', description: 'Cinema', date: new Date(now.getFullYear(), now.getMonth(), 10) },
        { amount: 100, type: 'saida', category: 'assinaturas', description: 'Netflix + Spotify', date: new Date(now.getFullYear(), now.getMonth(), 12) }
    ];

    for (const t of transactions) {
        await prisma.transaction.create({
            data: {
                ...t,
                userId: user.id
            }
        });
    }
    console.log(`✅ Created ${transactions.length} transactions`);

    // Create Financial Config
    await prisma.financialConfig.upsert({
        where: { userId: user.id },
        update: {
            initialReserve: 500,
            monthlyBudget: 1000
        },
        create: {
            userId: user.id,
            initialReserve: 500,
            monthlyBudget: 1000
        }
    });
    console.log('✅ Set financial config (Reserve: R$ 500, Budget: R$ 1000)');

    // Skip activities - model doesn't exist in schema
    console.log('⏭️  Skipped activities (model not in schema)');

    console.log('\n🎉 Dashboard seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - XP: 67 (Rank: Iniciante)`);
    console.log(`   - Habits: ${habits.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log(`   - Balance: R$ ${500 + 1500 - 530} (Reserve + Income - Expenses)`);
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
