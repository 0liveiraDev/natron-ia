import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import path from 'path';
import fs from 'fs';
import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

dotenv.config();

// Build DATABASE_URL from individual env vars if not already set (Hostinger compatibility)
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASS || '';
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || '3306';
    const name = process.env.DB_NAME || 'natron';
    process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve absolute path for uploads
const getRootPath = () => {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'uploads'))) return cwd;
    if (fs.existsSync(path.join(cwd, 'backend', 'uploads'))) return path.join(cwd, 'backend');
    return cwd;
};

const ROOT_PATH = getRootPath();
const UPLOADS_PATH = process.env.STORAGE_PATH || path.join(ROOT_PATH, 'uploads');

// Ensure upload directories exist silently
['receipts', 'avatars'].forEach(dir => {
    const fullPath = path.join(UPLOADS_PATH, dir);
    try { fs.mkdirSync(fullPath, { recursive: true }); } catch (e) {}
});

// Middlewares
app.use(cors({
    origin: ['https://natron.site', 'http://natron.site', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_PATH));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', async (req, res) => {
    try {
        // Testa a conexão com o banco de dados
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', message: 'Natron IA API is running', db: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'degraded', message: 'API running but DB unreachable' });
    }
});

// Serve Frontend (React Build)
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// ==========================================
// 🛡️ ESCUDO DE ESTABILIDADE — Crash Protection
// uncaughtException DEVE encerrar o processo.
// Deixar vivo após exception não tratada = servidor em estado zumbi (causa 503).
// O PM2 reinicia automaticamente após process.exit(1).
// ==========================================
process.on('uncaughtException', (error) => {
    const ts = new Date().toISOString();
    console.error(`\n[❌ UNCAUGHT EXCEPTION] ${ts}`);
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // Aguarda 1s para garantir que os logs acima sejam gravados antes de encerrar
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    const ts = new Date().toISOString();
    console.error(`\n[❌ UNHANDLED REJECTION] ${ts}`);
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    // Rejeições não tratadas não encerram o processo, mas são logadas com contexto
});

// ==========================================
// GRACEFUL SHUTDOWN — libera conexões MySQL corretamente
// ==========================================
const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
    try {
        await prisma.$disconnect();
        console.log('✅ Prisma disconnected.');
    } catch (e) {
        console.error('Error disconnecting Prisma:', e);
    }
    process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const server = app.listen(PORT, () => {
    console.log(`🚀 Natron IA running on http://localhost:${PORT}`);

    // Background: ensure admin exists and has correct role (non-blocking)
    setTimeout(async () => {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@natron.site';
            const exists = await prisma.user.findUnique({ where: { email: adminEmail } });

            if (!exists) {
                const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Zoinha1bruno', 10);
                await prisma.user.create({
                    data: {
                        name: 'Natron IA Admin',
                        email: adminEmail,
                        password: hash,
                        role: 'Admin',
                        rank: 'Mestre da Academia',
                        level: 100,
                    }
                });
            } else if (exists.role !== 'Admin') {
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { role: 'Admin', rank: 'Mestre da Academia', level: 100 }
                });
            }
        } catch (e) {
            console.error('Admin seed error:', e);
        }
    }, 5000);
});
