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
exports.confirmReceipt = exports.uploadReceipt = exports.updateFinancialConfig = exports.getDashboard = exports.deleteTransaction = exports.updateTransaction = exports.getTransactions = exports.createTransaction = void 0;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const activityService_1 = require("../services/activityService");
const xpService_1 = require("../services/xpService");
const prisma = new client_1.PrismaClient();
const createTransaction = async (req, res) => {
    try {
        const { amount, type, category, description, date } = req.body;
        const userId = req.userId;
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
        await (0, activityService_1.logActivity)(userId, 'transaction_added', `${type === 'entrada' ? 'Entrada' : 'Saída'} de R$ ${amount} em ${category}`);
        // Award XP - Only for investment INCOME (entrada + investimento)
        try {
            const cat = category?.toLowerCase();
            if (type === 'entrada' && (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos')) {
                await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 10);
            }
        }
        catch (xpError) {
            console.error('Error awarding XP in createTransaction:', xpError);
        }
        res.status(201).json(transaction);
    }
    catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Erro ao criar transação' });
    }
};
exports.createTransaction = createTransaction;
// ... (keep getTransactions, updateTransaction, deleteTransaction, getDashboard, updateFinancialConfig, uploadReceipt as is)
const getTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
        res.json(transactions);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
};
exports.getTransactions = getTransactions;
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, type, category, description, date } = req.body;
        const userId = req.userId;
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
    }
    catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
};
exports.updateTransaction = updateTransaction;
const deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
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
            const { removeXp } = await Promise.resolve().then(() => __importStar(require('../services/xpService')));
            const cat = transaction.category?.toLowerCase();
            if (transaction.type === 'entrada' && (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos')) {
                await removeXp(userId, 'FINANCEIRO', 10);
            }
        }
        catch (xpError) {
            console.error('Error removing XP in deleteTransaction:', xpError);
        }
        res.json({ message: 'Transação deletada com sucesso' });
    }
    catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Erro ao deletar transação' });
    }
};
exports.deleteTransaction = deleteTransaction;
const getDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        const [transactions, config] = await Promise.all([
            prisma.transaction.findMany({ where: { userId } }),
            prisma.financialConfig.findUnique({ where: { userId } })
        ]);
        const initialReserve = config?.initialReserve || 0;
        const monthlyBudget = config?.monthlyBudget || 0;
        const rawCategoryBudgets = config?.categoryBudgets;
        const categoryBudgets = rawCategoryBudgets ? (typeof rawCategoryBudgets === 'string' ? JSON.parse(rawCategoryBudgets) : rawCategoryBudgets) : {};
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
            .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
        // Monthly data (last 6 months)
        const byMonth = {};
        transactions.forEach(t => {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[key])
                byMonth[key] = { entradas: 0, saidas: 0 };
            if (t.type === 'entrada')
                byMonth[key].entradas += t.amount;
            else
                byMonth[key].saidas += t.amount;
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
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
};
exports.getDashboard = getDashboard;
const updateFinancialConfig = async (req, res) => {
    try {
        const userId = req.userId;
        const { monthlyBudget, initialReserve, categoryBudgets } = req.body;
        const config = await prisma.financialConfig.upsert({
            where: { userId },
            update: {
                monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : undefined,
                initialReserve: initialReserve ? parseFloat(initialReserve) : undefined,
                categoryBudgets: categoryBudgets ? JSON.stringify(categoryBudgets) : undefined
            },
            create: {
                userId,
                monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : 0,
                initialReserve: initialReserve ? parseFloat(initialReserve) : 0,
                categoryBudgets: categoryBudgets ? JSON.stringify(categoryBudgets) : '{}'
            }
        });
        res.json(config);
    }
    catch (error) {
        console.error('Update config error:', error);
        res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
};
exports.updateFinancialConfig = updateFinancialConfig;
// Upload e processamento de nota fiscal
const uploadReceipt = async (req, res) => {
    try {
        const userId = req.userId;
        console.log('?? Upload receipt - User:', userId);
        if (!req.file) {
            console.log('? No file in request');
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }
        const filePath = req.file.path;
        console.log('?? File uploaded successfully:', {
            path: filePath,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });
        try {
            // Importar serviços dinamicamente
            console.log('?? Importing services...');
            const { processReceipt } = await Promise.resolve().then(() => __importStar(require('../services/ocrService')));
            const { parseReceiptText } = await Promise.resolve().then(() => __importStar(require('../services/receiptParser')));
            // Processar arquivo com OCR/PDF parser
            console.log('?? Processing PDF...');
            const ocrResult = await processReceipt(filePath);
            console.log('? PDF processed. Text length:', ocrResult.text.length);
            console.log('?? First 200 chars:', ocrResult.text.substring(0, 200));
            // Parsear informações da nota fiscal
            console.log('?? Parsing receipt data...');
            const parsedData = parseReceiptText(ocrResult.text);
            console.log('? Parsed data:', parsedData);
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
            console.log('? Sending response');
            res.json(response);
            // Deletar o arquivo PDF imediatamente após o processamento (Privacidade e Espaço)
            try {
                if (fs_1.default.existsSync(filePath)) {
                    fs_1.default.unlinkSync(filePath);
                    console.log(`??? Deleted temporary receipt: ${filePath}`);
                }
            }
            catch (fsError) {
                console.error('Error deleting receipt file:', fsError);
            }
        }
        catch (processingError) {
            console.error('? Error processing file:', processingError);
            console.error('Stack:', processingError.stack);
            // Cleanup on error
            try {
                if (fs_1.default.existsSync(filePath))
                    fs_1.default.unlinkSync(filePath);
            }
            catch (e) { }
            return res.status(500).json({
                error: 'Erro ao processar nota fiscal',
                details: processingError.message
            });
        }
    }
    catch (error) {
        console.error('? Upload receipt error:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Erro ao processar nota fiscal',
            details: error.message
        });
    }
};
exports.uploadReceipt = uploadReceipt;
// Confirmar e criar transação a partir de nota fiscal
const confirmReceipt = async (req, res) => {
    try {
        const userId = req.userId;
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
        await (0, activityService_1.logActivity)(userId, 'transaction_added', `Gasto de R$ ${amount} registrado via nota fiscal`);
        // Award XP - Only for investments
        try {
            const cat = category?.toLowerCase();
            if (transaction.type === 'entrada' && (cat === 'investimento' || cat === 'investimientos' || cat === 'investimentos')) {
                await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 10);
            }
        }
        catch (xpError) {
            console.error('Error awarding XP in confirmReceipt:', xpError);
        }
        res.status(201).json({
            success: true,
            transaction,
            message: 'Transação criada com sucesso!',
        });
    }
    catch (error) {
        console.error('Confirm receipt error:', error);
        res.status(500).json({ error: 'Erro ao confirmar transação' });
    }
};
exports.confirmReceipt = confirmReceipt;
