import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const { name, avatarUrl } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                avatarUrl,
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true,
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
};

export const uploadAvatar = async (req: any, res: Response) => {
    try {
        const userId = req.userId;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        // Guardar caminho relativo para flexibilidade entre ambientes
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
    }
};
