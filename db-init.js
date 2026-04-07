const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('./backend/node_modules/bcryptjs');

async function init() {
    console.log('⚡ DB-INIT: Starting background maintenance...');
    
    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || '3306',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        multipleStatements: true
    };

    try {
        // 1) Sync Tables
        const connection = await mysql.createConnection(dbConfig);
        const initSqlPath = path.join(__dirname, 'backend', 'prisma', 'init.sql');
        if (fs.existsSync(initSqlPath)) {
            let sql = fs.readFileSync(initSqlPath, 'utf8');
            const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
            for (let q of queries) {
                try { if(!q.startsWith('--')) await connection.query(q); } catch (e) {}
            }
        }
        await connection.end();

        // 2) Sync Admin
        const prisma = new PrismaClient();
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@natron.site';
        const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });

        if (!adminExists) {
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
            console.log(`✅ Admin Created.`);
        }
        await prisma.$disconnect();
    } catch (err) {
        console.error('❌ DB-INIT Error:', err.message);
    }
}

init();
