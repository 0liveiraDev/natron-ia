"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    // Buscar TODOS os usuários
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.log('Nenhum usuário encontrado.');
        return;
    }
    console.log(`Encontrados ${users.length} usuários. Adicionando dados para todos...`);
    const today = new Date();
    // Função auxiliar para criar datas passadas
    const daysAgo = (days) => {
        const date = new Date();
        date.setDate(today.getDate() - days);
        return date;
    };
    // Dados para inserir
    const incomes = [
        { amount: 5000, category: 'salario', description: 'Salário Mensal', date: daysAgo(2) },
        { amount: 1500, category: 'freelance', description: 'Projeto Freela', date: daysAgo(5) },
        { amount: 200, category: 'investimentos', description: 'Dividendos', date: daysAgo(1) },
    ];
    const expenses = [
        { amount: 150.50, category: 'alimentacao', description: 'Supermercado', date: daysAgo(0) }, // Hoje
        { amount: 89.90, category: 'alimentacao', description: 'Jantar Fora', date: daysAgo(1) },
        { amount: 350.00, category: 'lazer', description: 'Show', date: daysAgo(2) },
        { amount: 49.90, category: 'assinaturas', description: 'Netflix', date: daysAgo(3) },
        { amount: 29.90, category: 'assinaturas', description: 'Spotify', date: daysAgo(3) },
        { amount: 120.00, category: 'transporte', description: 'Uber da semana', date: daysAgo(4) },
        { amount: 2500.00, category: 'moradia', description: 'Aluguel', date: daysAgo(5) },
        { amount: 450.00, category: 'educacao', description: 'Curso Online', date: daysAgo(6) },
    ];
    for (const user of users) {
        console.log(`Processando usuário: ${user.name} (${user.email})`);
        // 1. Criar Entradas (Income)
        for (const income of incomes) {
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'entrada',
                    amount: income.amount,
                    category: income.category,
                    description: income.description,
                    date: income.date,
                },
            });
        }
        console.log(`✅ Adicionadas ${incomes.length} entradas para ${user.name}.`);
        // 2. Criar Saídas (Expenses)
        for (const expense of expenses) {
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'saida',
                    amount: expense.amount,
                    category: expense.category,
                    description: expense.description,
                    date: expense.date,
                },
            });
        }
        console.log(`✅ Adicionadas ${expenses.length} saídas para ${user.name}.`);
    }
    console.log('🚀 Dados de teste financeiros inseridos com sucesso para todos os usuários!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
