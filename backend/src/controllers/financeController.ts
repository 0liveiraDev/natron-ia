import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import fs from 'fs';
import path from 'path';
import { logActivity } from '../services/activityService';
import { addXp } from '../services/xpService';

const prisma = new PrismaClient();

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, type, category, description, date } = req.body;
        const userId = req.userId!;

        const transaction = await prisma.transaction.create({
            data: {
                amount: parseFloat(amount),
                type,
                category,
                description,
                date: date ? new Date(date) : new Date(),
                userId,
            },
        });

        await logActivity(
            userId,
            'transaction_added',
            `${type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${amount} em ${category}`
        );

        // Award XP - Only for investment INCOME (entrada + investimento)
        try {
            const cat = category?.toLowerCase();
            if (type === 'entrada' && (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos')) {
                await addXp(userId, 'FINANCEIRO', 10);
            }
        } catch (xpError) {
            console.error('Error awarding XP in createTransaction:', xpError);
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Erro ao criar transação' });
    }
};

// ... (keep getTransactions, updateTransaction, deleteTransaction, getDashboard, updateFinancialConfig, uploadReceipt as is)


export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });

        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { amount, type, category, description, date } = req.body;
        const userId = req.userId!;

        const transaction = await prisma.transaction.updateMany({
            where: { id, userId },
            data: {
                amount: amount ? parseFloat(amount) : undefined,
                type,
                category,
                description,
                date: date ? new Date(date) : undefined,
            },
        });

        res.json(transaction);
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        // Get transaction before deleting to check for XP removal
        const transaction = await prisma.transaction.findFirst({
            where: { id, userId }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        await prisma.transaction.delete({
            where: { id }
        });

        // Remove XP if it was an investment
        try {
            const { removeXp } = await import('../services/xpService');
            const cat = transaction.category?.toLowerCase();
            if (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos') {
                await removeXp(userId, 'FINANCEIRO', 10);
            }
        } catch (xpError) {
            console.error('Error removing XP in deleteTransaction:', xpError);
        }

        res.json({ message: 'Transação deletada com sucesso' });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Erro ao deletar transação' });
    }
};

export const getDashboard = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;

        const [transactions, config] = await Promise.all([
            prisma.transaction.findMany({ where: { userId } }),
            prisma.financialConfig.findUnique({ where: { userId } })
        ]);

        const initialReserve = config?.initialReserve || 0;
        const monthlyBudget = config?.monthlyBudget || 0;
        const categoryBudgets = (config as any)?.categoryBudgets || {};

        // Calculate totals
        const income = transactions
            .filter(t => t.type === 'entrada')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'saida')
            .reduce((sum, t) => sum + t.amount, 0);

        // Calculate balance (with initial reserve)
        const balance = initialReserve + income - expenses;

        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        // Group by category
        const byCategory = transactions
            .filter(t => t.type === 'saida')
            .reduce((acc: any, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {});

        // Monthly data (last 6 months)
        const byMonth: any = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!byMonth[key]) byMonth[key] = { entradas: 0, saidas: 0 };

            if (t.type === 'entrada') byMonth[key].entradas += t.amount;
            else byMonth[key].saidas += t.amount;
        });

        res.json({
            totais: {
                entradas: income,
                saidas: expenses,
                saldo: balance,
                percentualEconomizado: Math.round(savingsRate)
            },
            config: {
                monthlyBudget,
                initialReserve,
                categoryBudgets
            },
            porCategoria: byCategory,
            porMes: byMonth
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
};

export const updateFinancialConfig = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { monthlyBudget, initialReserve, categoryBudgets } = req.body;

        const config = await prisma.financialConfig.upsert({
            where: { userId },
            update: {
                monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
                initialReserve: initialReserve ? parseFloat(initialReserve) : undefined,
                categoryBudgets: categoryBudgets || undefined
            } as any,
            create: {
                userId,
                monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : 0,
                initialReserve: initialReserve ? parseFloat(initialReserve) : 0,
                categoryBudgets: categoryBudgets || {}
            } as any
        });

        res.json(config);
    } catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
};

// Upload e processamento de nota fiscal
export const uploadReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        console.log('📤 Upload receipt - User:', userId);

        if (!req.file) {
            console.log('❌ No file in request');
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const filePath = req.file.path;
        console.log('📁 File uploaded successfully:', {
            path: filePath,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        try {
            // Importar serviços dinamicamente
            console.log('🔧 Importing services...');
            const { processReceipt } = await import('../services/ocrService');
            const { parseReceiptText } = await import('../services/receiptParser');

            // Processar arquivo com OCR/PDF parser
            console.log('🔍 Processing PDF...');
            const ocrResult = await processReceipt(filePath);
            console.log('✅ PDF processed. Text length:', ocrResult.text.length);
            console.log('📝 First 200 chars:', ocrResult.text.substring(0, 200));

            // Parsear informações da nota fiscal
            console.log('🧠 Parsing receipt data...');
            const parsedData = parseReceiptText(ocrResult.text);
            console.log('✅ Parsed data:', parsedData);

            // Retornar dados extraídos
            const response = {
                success: true,
                filePath: filePath,
                ocrText: ocrResult.text,
                confidence: ocrResult.confidence,
                extracted: {
                    amount: parsedData.amount,
                    date: parsedData.date,
                    establishment: parsedData.establishment,
                    category: parsedData.category,
                    subcategory: parsedData.subcategory,
                    categoryType: parsedData.categoryType,
                    description: parsedData.description,
                },
                message: parsedData.amount
                    ? `Nota fiscal processada! Encontrei um gasto de R$ ${parsedData.amount.toFixed(2)}${parsedData.establishment ? ` em ${parsedData.establishment}` : ''}.`
                    : 'Nota fiscal processada, mas não consegui identificar o valor. Por favor, insira manualmente.',
            };

            console.log('✅ Sending response');
            res.json(response);

            // Deletar o arquivo PDF imediatamente após o processamento (Privacidade e Espaço)
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Deleted temporary receipt: ${filePath}`);
                }
            } catch (fsError) {
                console.error('Error deleting receipt file:', fsError);
            }

        } catch (processingError: any) {
            console.error('❌ Error processing file:', processingError);
            console.error('Stack:', processingError.stack);

            // Cleanup on error
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (e) { }

            return res.status(500).json({
                error: 'Erro ao processar nota fiscal',
                details: processingError.message
            });
        }

    } catch (error: any) {
        console.error('❌ Upload receipt error:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Erro ao processar nota fiscal',
            details: error.message
        });
    }
};

// Confirmar e criar transação a partir de nota fiscal
export const confirmReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { amount, date, category, description, filePath } = req.body;

        if (!amount) {
            return res.status(400).json({ error: 'Valor é obrigatório' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                amount: parseFloat(amount),
                type: 'saida',
                category: category || 'outros',
                description,
                date: date ? new Date(date) : new Date(),
                userId,
            },
        });

        await logActivity(
            userId,
            'transaction_added',
            `Gasto de R$ ${amount} registrado via nota fiscal`
        );

        // Award XP - Only for investments
        try {
            const cat = category?.toLowerCase();
            if (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos') {
                await addXp(userId, 'FINANCEIRO', 10);
            }
        } catch (xpError) {
            console.error('Error awarding XP in confirmReceipt:', xpError);
        }

        res.status(201).json({
            success: true,
            transaction,
            message: 'Transação criada com sucesso!',
        });
    } catch (error) {
        console.error('Confirm receipt error:', error);
        res.status(500).json({ error: 'Erro ao confirmar transação' });
    }
};
