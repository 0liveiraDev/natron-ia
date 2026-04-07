"use strict";
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Resolve absolute path for uploads to be environment-agnostic
const getRootPath = () => {
    const cwd = process.cwd();
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'uploads')))
        return cwd;
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'backend', 'uploads')))
        return path_1.default.join(cwd, 'backend');
    return cwd;
};
const ROOT_PATH = getRootPath();
const UPLOADS_PATH = path_1.default.join(ROOT_PATH, 'uploads');
// Ensure upload directories exist
const uploadDirs = ['receipts', 'avatars'];
uploadDirs.forEach(dir => {
    const fullPath = path_1.default.join(UPLOADS_PATH, dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${fullPath}`);
    }
});
console.log(`📦 Serving static files from: ${UPLOADS_PATH}`);
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(UPLOADS_PATH));
// Routes
app.use('/api', routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Trilha IA API is running' });
});
// ────────────────────────────────
// SERVE FRONTEND (React Build) — Igual ao padrão UpCRIATIVE
// ────────────────────────────────
const frontendPath = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendPath)) {
    console.log(`🌐 Serving frontend from: ${frontendPath}`);
    app.use(express_1.default.static(frontendPath));
    // SPA Fallback — qualquer rota que não seja /api ou /uploads vai para o React
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(frontendPath, 'index.html'));
    });
}
else {
    console.log(`⚠️ Frontend build not found at: ${frontendPath}`);
}
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
