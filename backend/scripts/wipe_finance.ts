
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpando TODOS os dados financeiros...\n');

    // Delete all transactions
    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log(`✅ Deletadas ${deletedTransactions.count} transações`);

    // Delete all financial configs
    const deletedConfigs = await prisma.financialConfig.deleteMany({});
    console.log(`✅ Deletadas ${deletedConfigs.count} configurações financeiras`);

    console.log('\n✨ Banco de dados limpo! Tudo zerado.');
}

main()
    .catch(e => {
        console.error('❌ Erro:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
