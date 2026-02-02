import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve absolute path for uploads to be environment-agnostic
const getRootPath = () => {
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'uploads'))) return cwd;
    if (fs.existsSync(path.join(cwd, 'backend', 'uploads'))) return path.join(cwd, 'backend');
    return cwd;
};

const ROOT_PATH = getRootPath();
const UPLOADS_PATH = path.join(ROOT_PATH, 'uploads');

// Ensure upload directories exist
const uploadDirs = ['receipts', 'avatars'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(UPLOADS_PATH, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${fullPath}`);
    }
});

console.log(`📦 Serving static files from: ${UPLOADS_PATH}`);

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_PATH));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Trilha IA API is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
