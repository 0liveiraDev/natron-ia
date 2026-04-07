import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendWelcome, sendPasswordResetCode } from '../services/mailService';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criar usuário
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Gerar token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: '7d',
        });

        // Enviar e-mail de boas-vindas
        try {
            await sendWelcome({ name: user.name, email: user.email });
        } catch (mailErr) {
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
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

export const login = async (req: Request, res: Response) => {
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
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
};

export const getMe = async (req: any, res: Response) => {
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
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};

// Upload avatar
export const uploadAvatar = async (req: any, res: Response) => {
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
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da foto' });
    }
};

// ==========================================
// RECUPERAÇÃO DE SENHA
// ==========================================

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            // Expira em 15 minutos
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            // Limpa códigos anteriores se tiver
            await (prisma as any).passwordReset.deleteMany({ where: { email } });

            await (prisma as any).passwordReset.create({
                data: {
                    email,
                    code,
                    expiresAt
                }
            });

            try {
                await sendPasswordResetCode(email, code);
            } catch (e) {
                console.error("Error sending reset email:", e);
            }
        }

        // Retorna sucesso até mesmo se o e-mail não existir por segurança
        res.json({ message: 'Se este e-mail estiver cadastrado, você receberá o código em instantes.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação.' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, code, password } = req.body;

        const reset = await (prisma as any).passwordReset.findFirst({
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

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        await (prisma as any).passwordReset.update({
            where: { id: reset.id },
            data: { used: true }
        });

        res.json({ message: 'Senha redefinida com sucesso! Faça login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Erro ao redefinir a senha' });
    }
};
