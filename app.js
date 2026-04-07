// ============================================
// Natron IA — Entry Point (Padrão Hostinger)
// ============================================
require('dotenv').config();

try {
    if (!process.env.DATABASE_URL && process.env.DB_HOST) {
        const user = encodeURIComponent(process.env.DB_USER || '');
        const pass = encodeURIComponent(process.env.DB_PASS || '');
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = process.env.DB_PORT || '3306';
        const name = process.env.DB_NAME || 'natron';
        process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;

        console.log('🔄 Sincronizando banco de dados (Native NodeJS MySQL2 Mode)...');
        // Usar lógica assíncrona auto-contida para não travar o boot master caso falhe e seja transparente
        (async () => {
            try {
                // 1) CRIAR TABELAS POR VIA NATIVA PASSANDO POR CIMA DO PRISMA CLI
                const mysql = require('mysql2/promise');
                const fs = require('fs');
                const path = require('path');
                
                const connection = await mysql.createConnection({
                    host, port, user, password: pass, database: name, multipleStatements: true
                });

                console.log('🚀 Construindo ou Atualizando Tabelas no MySQL nativo...');
                const initSqlPath = path.join(__dirname, 'backend', 'prisma', 'init.sql');
                if (fs.existsSync(initSqlPath)) {
                    let sql = fs.readFileSync(initSqlPath, 'utf8');
                    const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
                    
                    for (let q of queries) {
                        try {
                            // Executamos de um por um
                            if(q !== '-- CreateTable' && !q.startsWith('--')) {
                                await connection.query(q);
                            }
                        } catch (qErr) {
                            // Ignora erros normais caso a tabela ou constraint já exista
                            if (!qErr.message.includes('already exists') && !qErr.message.includes('Duplicate')) {
                                console.error('Aviso de criação SQL:', qErr.message);
                            }
                        }
                    }
                    console.log('✅ Base de dados perfeitamente sincronizada com schema!');
                }
                await connection.end();

                // 2) SEEDING O USUÁRIO PADRÃO DO ADMIN POR VIA NATIVA (TypeScript TSX Bypassed)
                console.log('🚀 Conectando client do DB para checkup Admin...');
                const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
                const bcrypt = require(path.join(__dirname, 'backend', 'node_modules', 'bcryptjs'));
                const prisma = new PrismaClient();

                const adminEmail = process.env.ADMIN_EMAIL || 'admin@natron.site';
                const adminPass = process.env.ADMIN_PASSWORD || 'O112233';
                const adminExists = await prisma.user.findUnique({
                    where: { email: adminEmail }
                });

                const hashedPassword = await bcrypt.hash(adminPass, 10);

                if (!adminExists) {
                    console.log(`⚠️ Conta Admin (${adminEmail}) não encontrada. Inserindo nativamente...`);
                    await prisma.user.create({
                        data: {
                            name: 'Natron IA Admin',
                            email: adminEmail,
                            password: hashedPassword,
                            role: 'Admin',
                            rank: 'Mestre da Academia',
                            level: 100,
                            xpPhysical: 0,
                            xpDiscipline: 0,
                            xpMental: 0,
                            xpIntellect: 0,
                            xpProductivity: 0,
                            xpFinancial: 0,
                        }
                    });
                    console.log(`✅ Super Administrador pronto! Faça login com ${adminEmail}`);
                } else {
                    console.log('🔄 Atualizando senha do Administrador para garantir acesso...');
                    await prisma.user.update({
                        where: { email: adminEmail },
                        data: { password: hashedPassword }
                    });
                    console.log('✅ Senha do Administrador sincronizada com sucesso.');
                }
                
                // Finaliza seed nativamente
                await prisma.$disconnect();
                console.log('✅ Processo do Banco de Dados concluído e liberado.');
                
            } catch (dbError) {
                console.error('⚠️ Falha crítica ao sincronizar banco nativamente:', dbError.message);
            }
        })();
    }

    console.log('🚀 Iniciando Natron IA...');
    require('./backend/dist/server.js');
} catch (error) {
    console.error('🚨 ERRO CRÍTICO NO STARTUP:');
    console.error(error);
    console.error(error.stack);
    
    // Mantém o processo vivo a cada 10s para conseguir ler o erro no painel
    setInterval(() => {
        console.error('🚨 Servidor travado no erro de boot acima.');
    }, 10000);
}
