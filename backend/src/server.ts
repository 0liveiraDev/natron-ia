import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import path from 'path';
import fs from 'fs';

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
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Natron IA API is running' });
});

// Serve Frontend (React Build)
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Natron IA running on http://localhost:${PORT}`);

    // Background: ensure admin exists and has correct role (non-blocking)
    setTimeout(async () => {
        try {
            const { PrismaClient } = await import('@prisma/client');
            const bcrypt = await import('bcryptjs');
            const prisma = new PrismaClient();

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
                // Fix: promote existing user to Admin
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { role: 'Admin', rank: 'Mestre da Academia', level: 100 }
                });
            }
            await prisma.$disconnect();
        } catch (e) {}
    }, 5000);
});
