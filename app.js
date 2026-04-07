// ============================================
// Natron IA — Entry Point (Padrão Hostinger)
// ============================================
require('dotenv').config();

try {
    console.log('🚀 Iniciando Natron IA (Modo Flash Boot)...');
    
    // 1) Inicia o servidor principal IMEDIATAMENTE para evitar 503
    require('./backend/dist/server.js');

    // 2) Executa a manutenção do banco em segundo plano (Parallel Task)
    if (!process.env.DATABASE_URL && process.env.DB_HOST) {
        const user = encodeURIComponent(process.env.DB_USER || '');
        const pass = encodeURIComponent(process.env.DB_PASS || '');
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = process.env.DB_PORT || '3306';
        const name = process.env.DB_NAME || 'natron';
        process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;

        setTimeout(async () => {
            console.log('⚡ Iniciando manutenção paralela do banco de dados...');
            try {
                const mysql = require('mysql2/promise');
                const fs = require('fs');
                const path = require('path');
                
                const connection = await mysql.createConnection({
                    host, port, user, password: pass, database: name, multipleStatements: true
                });

                const initSqlPath = path.join(__dirname, 'backend', 'prisma', 'init.sql');
                if (fs.existsSync(initSqlPath)) {
                    let sql = fs.readFileSync(initSqlPath, 'utf8');
                    const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
                    for (let q of queries) {
                        try {
                            if(q !== '-- CreateTable' && !q.startsWith('--')) {
                                await connection.query(q);
                            }
                        } catch (e) {}
                    }
                }
                await connection.end();

                const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
                const bcrypt = require(path.join(__dirname, 'backend', 'node_modules', 'bcryptjs'));
                const prisma = new PrismaClient();

                const adminEmail = process.env.ADMIN_EMAIL || 'admin@natron.site';
                const adminPass = process.env.ADMIN_PASSWORD || 'Zoinha1bruno';
                const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
                const hashedPassword = await bcrypt.hash(adminPass, 10);

                if (!adminExists) {
                    await prisma.user.create({
                        data: {
                            name: 'Natron IA Admin',
                            email: adminEmail,
                            password: hashedPassword,
                            role: 'Admin',
                            rank: 'Mestre da Academia',
                            level: 100,
                        }
                    });
                    console.log(`✅ Admin ${adminEmail} Criado.`);
                } else {
                    await prisma.user.update({
                        where: { email: adminEmail },
                        data: { password: hashedPassword }
                    });
                    console.log('✅ Senha do Admin Sincronizada.');
                }
                await prisma.$disconnect();
            } catch (err) {
                console.error('⚠️ Silently ignored DB maintenance error:', err.message);
            }
        }, 2000); // Aguarda 2 segundos após o boot do server
    }
} catch (error) {
    console.error('🚨 ERRO CRÍTICO NO STARTUP:', error);
}
