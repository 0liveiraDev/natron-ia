import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testDatabase() {
    try {
        console.log('🔍 Testando conexão com o banco de dados...');

        // Testar conexão
        await prisma.$connect();
        console.log('✅ Conexão com banco de dados OK');

        // Verificar usuários existentes
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });

        console.log(`\n📊 Total de usuários: ${users.length}`);

        if (users.length > 0) {
            console.log('\n👥 Usuários cadastrados:');
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} (${user.email})`);
            });
        } else {
            console.log('\n⚠️  Nenhum usuário cadastrado');
            console.log('\n🔧 Criando usuário de teste...');

            const hashedPassword = await bcrypt.hash('123456', 10);

            const testUser = await prisma.user.create({
                data: {
                    name: 'Usuário Teste',
                    email: 'teste@teste.com',
                    password: hashedPassword,
                },
            });

            console.log('✅ Usuário de teste criado:');
            console.log(`   Email: teste@teste.com`);
            console.log(`   Senha: 123456`);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();
