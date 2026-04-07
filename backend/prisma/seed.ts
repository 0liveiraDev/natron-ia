import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const defaultHash = await bcrypt.hash('123456', 10);
    const adminHash = await bcrypt.hash('Zoinha1bruno', 10);

    const users = [
        { name: 'Administrador Master', email: 'admin@natron.site', password: adminHash, role: 'Admin', isActive: true, level: 99, rank: 'Líder do Sistema' },
        { name: 'João Ativo Teste', email: 'joao@teste.com', password: defaultHash, role: 'Viajante', isActive: true },
        { name: 'Maria Inativa', email: 'maria@teste.com', password: defaultHash, role: 'Viajante', isActive: false },
        { name: 'Carlos Viajante', email: 'carlos@teste.com', password: defaultHash, role: 'Viajante', isActive: true },
        { name: 'Fernanda Rank', email: 'fernanda@teste.com', password: defaultHash, role: 'Viajante', isActive: true, level: 5, xpPhysical: 500, xpMental: 300, rank: 'Desbravador' },
    ];

    console.log('Iniciando o processo de inserção de usuários falsos...');

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: u,
            create: u
        });
        console.log(`Usuário inserido/atualizado: ${u.email}`);
    }
    
    console.log('Todos os usuários falsos foram carregados no banco!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
