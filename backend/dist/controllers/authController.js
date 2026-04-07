"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.uploadAvatar = exports.getMe = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mailService_1 = require("../services/mailService");
const prisma = new client_1.PrismaClient();
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Verificar se usuário já existe
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        // Hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Criar usuário
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });
        // Gerar token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        // Enviar e-mail de boas-vindas
        try {
            await (0, mailService_1.sendWelcome)({ name: user.name, email: user.email });
        }
        catch (mailErr) {
            console.error('Erro ao enviar e-mail de boas vindas:', mailErr);
        }
        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
            },
            token,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Buscar usuário
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        if (!user.isActive) {
            return res.status(401).json({ error: 'Sua conta foi desativada. Contate o suporte.' });
        }
        // Verificar senha
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        // Gerar token
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
            },
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
                // Gamification fields
                currentXp: true,
                level: true,
                rank: true,
                xpPhysical: true,
                xpDiscipline: true,
                xpMental: true,
                xpIntellect: true,
                xpProductivity: true,
                xpFinancial: true,
            },
        });
        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};
exports.getMe = getMe;
// Upload avatar
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.userId;
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const user = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            currentXp: user.currentXp,
            rank: user.rank,
        });
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da foto' });
    }
};
exports.uploadAvatar = uploadAvatar;
// ==========================================
// RECUPERAÇÃO DE SENHA
// ==========================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            // Expira em 15 minutos
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
            // Limpa códigos anteriores se tiver
            await prisma.passwordReset.deleteMany({ where: { email } });
            await prisma.passwordReset.create({
                data: {
                    email,
                    code,
                    expiresAt
                }
            });
            try {
                await (0, mailService_1.sendPasswordResetCode)(email, code);
            }
            catch (e) {
                console.error("Error sending reset email:", e);
            }
        }
        // Retorna sucesso até mesmo se o e-mail não existir por segurança
        res.json({ message: 'Se este e-mail estiver cadastrado, você receberá o código em instantes.' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação.' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { email, code, password } = req.body;
        const reset = await prisma.passwordReset.findFirst({
            where: {
                email,
                code,
                used: false,
                expiresAt: { gt: new Date() }
            }
        });
        if (!reset) {
            return res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo.' });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: 'Usuário não encontrado' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        await prisma.passwordReset.update({
            where: { id: reset.id },
            data: { used: true }
        });
        res.json({ message: 'Senha redefinida com sucesso! Faça login.' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erro ao redefinir a senha' });
    }
};
exports.resetPassword = resetPassword;
