import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configuração de armazenamento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/receipts/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de arquivos - APENAS PDF
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    console.log('📁 File upload attempt:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });

    if (file.mimetype === 'application/pdf') {
        console.log('✅ PDF aceito');
        return cb(null, true);
    } else {
        console.log('❌ Arquivo rejeitado - não é PDF');
        cb(new Error('Apenas arquivos PDF são permitidos!'));
    }
};

// Configuração do multer
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: fileFilter,
});

// Configuração para Avatar (Imagens)
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const avatarFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Apenas imagens (JPG, PNG, WEBP) são permitidas!'));
    }
};

export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: avatarFilter
});
