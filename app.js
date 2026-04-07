// ============================================
// Natron IA — Entry Point (Hostinger Power-Boot)
// ============================================
require('dotenv').config();

try {
    console.log('🚀 Natron IA - Booting Server...');

    // 1) Inicia o servidor principal IMEDIATAMENTE
    require('./backend/dist/server.js');

    // 2) Sincronização de Banco em Background (Resiliência)
    if (!process.env.DATABASE_URL && process.env.DB_HOST) {
        const user = encodeURIComponent(process.env.DB_USER || '');
        const pass = encodeURIComponent(process.env.DB_PASS || '');
        const host = process.env.DB_HOST || '127.0.0.1';
        const port = process.env.DB_PORT || '3306';
        const name = process.env.DB_NAME || 'natron';
        process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;

        // Execução assíncrona para não travar o boot
        setTimeout(async () => {
            console.log('⚡ Background Sync: Verifying database consistency...');
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
                        } catch (e) {} // Ignora já existentes
                    }
                    console.log('✅ Tables synced.');
                }
                await connection.end();

                // Check Admin
                const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
                const prisma = new PrismaClient();
                const adminEmail = process.env.ADMIN_EMAIL || 'admin@natron.site';
                const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

                if (!adminExists) {
                    const bcrypt = require(path.join(__dirname, 'backend', 'node_modules', 'bcryptjs'));
                    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Zoinha1bruno', 10);
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
                    console.log(`✅ Admin ${adminEmail} Created.`);
                }
                await prisma.$disconnect();
            } catch (err) {
                console.error('⚠️ Silent sync error:', err.message);
            }
        }, 5000); // 5 segundos de delay para liberar o CPU para o Login
    }

} catch (error) {
    console.error('🚨 FATAL BOOT ERROR:', error.message);
}
