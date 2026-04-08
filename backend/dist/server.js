"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
// Build DATABASE_URL from individual env vars if not already set (Hostinger compatibility)
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
    const user = process.env.DB_USER || 'root';
    const pass = process.env.DB_PASS || '';
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = process.env.DB_PORT || '3306';
    const name = process.env.DB_NAME || 'natron';
    process.env.DATABASE_URL = `mysql://${user}:${pass}@${host}:${port}/${name}`;
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Resolve absolute path for uploads
const getRootPath = () => {
    const cwd = process.cwd();
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'uploads')))
        return cwd;
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'backend', 'uploads')))
        return path_1.default.join(cwd, 'backend');
    return cwd;
};
const ROOT_PATH = getRootPath();
const UPLOADS_PATH = process.env.STORAGE_PATH || path_1.default.join(ROOT_PATH, 'uploads');
// Ensure upload directories exist silently
['receipts', 'avatars'].forEach(dir => {
    const fullPath = path_1.default.join(UPLOADS_PATH, dir);
    try {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
    }
    catch (e) { }
});
// Middlewares
app.use((0, cors_1.default)({
    origin: ['https://natron.site', 'http://natron.site', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(UPLOADS_PATH));
// Routes
app.use('/api', routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Natron IA API is running' });
});
// Serve Frontend (React Build)
const frontendPath = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendPath)) {
    app.use(express_1.default.static(frontendPath));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(frontendPath, 'index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`🚀 Natron IA running on http://localhost:${PORT}`);
    // Background: ensure admin exists and has correct role (non-blocking)
    setTimeout(async () => {
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
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
            }
            else if (exists.role !== 'Admin') {
                // Fix: promote existing user to Admin
                await prisma.user.update({
                    where: { email: adminEmail },
                    data: { role: 'Admin', rank: 'Mestre da Academia', level: 100 }
                });
            }
            await prisma.$disconnect();
        }
        catch (e) { }
    }, 5000);
});
