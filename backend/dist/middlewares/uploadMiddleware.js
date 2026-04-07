"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Resolve absolute path for uploads to be environment-agnostic
const getUploadsPath = () => {
    const cwd = process.cwd();
    const paths = [
        path_1.default.join(cwd, 'uploads'),
        path_1.default.join(cwd, 'backend', 'uploads')
    ];
    for (const p of paths) {
        if (fs_1.default.existsSync(p))
            return p;
    }
    return paths[0];
};
const UPLOADS_PATH = getUploadsPath();
// Configuração de armazenamento
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(UPLOADS_PATH, 'receipts/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// Filtro de arquivos - APENAS PDF
const fileFilter = (req, file, cb) => {
    console.log('📁 File upload attempt:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });
    if (file.mimetype === 'application/pdf') {
        console.log('✅ PDF aceito');
        return cb(null, true);
    }
    else {
        console.log('❌ Arquivo rejeitado - não é PDF');
        cb(new Error('Apenas arquivos PDF são permitidos!'));
    }
};
// Configuração do multer
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: fileFilter,
});
// Configuração para Avatar (Imagens)
const avatarStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(UPLOADS_PATH, 'avatars/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const avatarFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Apenas imagens (JPG, PNG, WEBP) são permitidas!'));
    }
};
exports.uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: avatarFilter
});
