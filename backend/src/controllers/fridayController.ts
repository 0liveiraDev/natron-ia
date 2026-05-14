import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { addXp } from '../services/xpService';
import { cache } from '../lib/cache';
import axios from 'axios';

// --- Ollama Config (local, CPU optimized) ---
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.FRIDAY_MODEL || process.env.MODEL_NAME || 'llama3.2';
const NUM_CTX = parseInt(process.env.FRIDAY_NUM_CTX || '2048');
const NUM_PREDICT = parseInt(process.env.FRIDAY_NUM_PREDICT || '256');
const NUM_THREAD = parseInt(process.env.FRIDAY_NUM_THREAD || '0'); // 0 = auto

const callAI = async (messages: any[]): Promise<string | null> => {
    try {
        const options: any = {
            num_ctx: NUM_CTX,
            num_predict: NUM_PREDICT,
            temperature: 0.3,
            top_p: 0.9,
            repeat_penalty: 1.1,
        };
        if (NUM_THREAD > 0) options.num_thread = NUM_THREAD;

        const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages,
            stream: false,
            options,
        }, { timeout: 45000 });
        return response.data.message.content;
    } catch (error: any) {
        console.error('Ollama error:', error?.message || error);
        return null;
    }
};

// --- Robust JSON extractor for ACTION blocks ---
function extractActions(text: string): { type: string; payload: any }[] {
    const results: { type: string; payload: any }[] = [];
    const regex = /ACTION:\s*(\{)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const startIdx = match.index + match[0].length - 1;
        let depth = 0;
        let endIdx = startIdx;

        for (let i = startIdx; i < text.length; i++) {
            if (text[i] === '{') depth++;
            else if (text[i] === '}') depth--;
            if (depth === 0) {
                endIdx = i + 1;
                break;
            }
        }

        try {
            const jsonStr = text.substring(startIdx, endIdx);
            const parsed = JSON.parse(jsonStr);
            const { type, payload, ...rest } = parsed;
            results.push({ type, payload: payload || rest });
        } catch (e) {
            console.error('Erro ao parsear ACTION JSON:', e);
        }
    }

    return results;
}

const pdf = require('pdf-parse');

// ============================================================
// Friday Chat
// ============================================================
export const chat = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        const userId = req.userId!;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, fridayNickname: true, fridayPurpose: true },
        });

        await prisma.chatMessage.create({
            data: { role: 'user', content: message, userId }
        });

        let assistantMessage = '';
        const actions: any[] = [];

        try {
            const [habits, tasks, transactions, history] = await Promise.all([
                prisma.habit.findMany({ where: { userId }, select: { id: true, title: true } }),
                prisma.task.findMany({ where: { userId, status: 'pending' }, select: { id: true, title: true } }),
                prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, description: true, amount: true, type: true, category: true } }),
                prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 6 })
            ]);

            const tasksList = tasks.slice(0, 5).map(t => `${t.id}:${t.title}`).join('; ');
            const habitsList = habits.slice(0, 5).map(h => `${h.id}:${h.title}`).join('; ');
            const txList = transactions.map(t => `${t.id}:${t.description}:R$${t.amount}(${t.type})`).join('; ');
            const balance = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

            const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';
            const purpose = user?.fridayPurpose ? ` Foco: ${user.fridayPurpose}.` : '';

            // Ultra-compact system prompt for CPU speed
            const systemPrompt = `Você é Friday, IA do Natron. Usuário: ${nick}.${purpose}
Responda em PT-BR, máximo 2-3 frases curtas.
Para ações use EXATAMENTE: ACTION: {"type":"TIPO","payload":{...}}
Tipos: create_task(title), complete_task(id), delete_task(id), create_transaction(amount,type[saida|entrada],description,category[alimentacao|lazer|assinaturas|moradia|saude|transporte|educacao|salario|investimento|outros]), delete_transaction(id), delete_all_transactions(), complete_habit(id)
Dados: Saldo R$${balance.toFixed(2)} | Tarefas: ${tasksList || 'nenhuma'} | Hábitos: ${habitsList || 'nenhum'} | Últimas tx: ${txList || 'nenhuma'}
NUNCA simule dados. Use ACTION para mudar algo.`;

            const chatHistory = history.reverse().map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content
            }));

            const aiResponse = await callAI([
                { role: 'system', content: systemPrompt },
                ...chatHistory
            ]);

            if (aiResponse) {
                const parsedActions = extractActions(aiResponse);

                for (const actionData of parsedActions) {
                    try {
                        console.log('Action:', actionData.type, actionData.payload);

                        if (actionData.type === 'create_task') {
                            const t = await prisma.task.create({
                                data: { userId, title: actionData.payload.title, status: 'pending' }
                            });
                            actions.push({ type: 'task_created', data: t });
                            await addXp(userId, 'PRODUTIVIDADE', 5);
                        } else if (actionData.type === 'complete_task') {
                            await prisma.task.update({ where: { id: actionData.payload.id }, data: { status: 'completed' } });
                            actions.push({ type: 'task_completed', id: actionData.payload.id });
                            await addXp(userId, 'PRODUTIVIDADE', 10);
                        } else if (actionData.type === 'delete_task') {
                            await prisma.task.delete({ where: { id: actionData.payload.id } });
                            actions.push({ type: 'task_deleted', id: actionData.payload.id });
                        } else if (actionData.type === 'create_transaction') {
                            const t = await prisma.transaction.create({
                                data: {
                                    userId,
                                    amount: actionData.payload.amount,
                                    type: actionData.payload.type,
                                    description: actionData.payload.description,
                                    category: actionData.payload.category || 'outros'
                                }
                            });
                            actions.push({ type: actionData.payload.type === 'saida' ? 'expense_added' : 'income_added', data: t });
                            await addXp(userId, 'FINANCEIRO', 5);
                        } else if (actionData.type === 'delete_transaction') {
                            await prisma.transaction.delete({ where: { id: actionData.payload.id } });
                            actions.push({ type: 'transaction_deleted', id: actionData.payload.id });
                        } else if (actionData.type === 'delete_all_transactions') {
                            await prisma.transaction.deleteMany({ where: { userId } });
                            actions.push({ type: 'all_transactions_deleted' });
                        } else if (actionData.type === 'update_transaction') {
                            const updated = await prisma.transaction.update({
                                where: { id: actionData.payload.id },
                                data: { amount: actionData.payload.amount, description: actionData.payload.description }
                            });
                            actions.push({ type: 'transaction_updated', data: updated });
                        } else if (actionData.type === 'complete_habit') {
                            await prisma.habitLog.create({ data: { habitId: actionData.payload.id, completed: true } });
                            actions.push({ type: 'habit_completed', id: actionData.payload.id });
                            await addXp(userId, 'DISCIPLINA', 5);
                        }
                    } catch (e) {
                        console.error('Erro ao processar ação:', e);
                    }
                }

                // Clean ACTION tags from visible message
                assistantMessage = aiResponse.replace(/ACTION:\s*\{[\s\S]*?\}(?:\s*\})*?(?=\s*(?:ACTION:|$))/g, '').trim();
                assistantMessage = assistantMessage.replace(/ACTION:.*$/gm, '').trim();
                if (!assistantMessage) assistantMessage = 'Feito! ✅';
                cache.invalidate(`dashboard:overview:${userId}`);
            } else {
                assistantMessage = `${nick}, tive um problema de conexão com meus módulos. Tenta de novo?`;
            }
        } catch (aiError) {
            console.error('Erro Friday:', aiError);
            assistantMessage = 'Erro interno. Tente novamente.';
        }

        if (assistantMessage) {
            await prisma.chatMessage.create({
                data: { role: 'assistant', content: assistantMessage, userId }
            });
        }

        res.json({ message: assistantMessage, actions });

    } catch (error) {
        console.error('Friday chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Friday' });
    }
};

// ============================================================
// History
// ============================================================
export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const history = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(history.reverse().map(msg => ({ role: msg.role, content: msg.content })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};

// ============================================================
// Upload PDF
// ============================================================
export const uploadPdf = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        const data = await pdf(file.buffer);
        const text = data.text;
        const userId = req.userId!;

        await prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `Arquivo "${file.originalname}": ${text.substring(0, 3000)}`,
                userId
            }
        });

        const [user, history] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { name: true, fridayNickname: true } }),
            prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 4 })
        ]);

        const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';
        const prompt = `Você é Friday. ${nick} enviou "${file.originalname}". Resuma valores, datas e nomes em 2 frases e pergunte se está correto.`;

        const aiResponse = await callAI([
            { role: 'system', content: prompt },
            ...history.reverse().map(msg => ({ role: msg.role, content: msg.content }))
        ]);

        const finalMessage = aiResponse || `${nick}, recebi "${file.originalname}" mas tive um problema ao processar. Tenta de novo?`;

        await prisma.chatMessage.create({
            data: { role: 'assistant', content: finalMessage, userId }
        });

        res.json({ message: finalMessage });
    } catch (error) {
        console.error('PDF error:', error);
        res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
};

// ============================================================
// Onboarding
// ============================================================
export const saveOnboarding = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const { nickname, purpose } = req.body;
        await prisma.user.update({
            where: { id: userId },
            data: { fridayNickname: nickname || null, fridayPurpose: purpose || null }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Erro ao salvar preferências' });
    }
};

// ============================================================
// Get Preferences
// ============================================================
export const getPreferences = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { fridayNickname: true, fridayPurpose: true }
        });
        res.json({
            nickname: user?.fridayNickname || null,
            purpose: user?.fridayPurpose || null,
            isOnboarded: !!(user?.fridayNickname)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar preferências' });
    }
};
