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
const NUM_PREDICT = parseInt(process.env.FRIDAY_NUM_PREDICT || '350');
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
        }, { timeout: 60000 });
        return response.data.message.content;
    } catch (error: any) {
        console.error('Ollama error:', error?.message || error);
        return null;
    }
};

// --- Robust JSON extractor for ACTION blocks ---
// Matches: ACTION:, Ação:, ação:, AÇÃO:, Acão:, Açao:, etc.
function extractActions(text: string): { type: string; payload: any }[] {
    const results: { type: string; payload: any }[] = [];
    // Match any action-like prefix followed by a JSON object
    const regex = /(?:ACTION|A[çc][ãa]o|AÇÃO)\s*:\s*(\{)/gi;
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

// --- Aggressive cleanup: remove ALL action-related text from visible message ---
function cleanActionText(text: string): string {
    // 1. Remove ACTION:/Ação: followed by JSON (multiline)
    let cleaned = text.replace(/(?:ACTION|A[çc][ãa]o|AÇÃO)\s*:\s*\{[\s\S]*?(?:\}\s*\}|\})/gi, '');
    // 2. Remove any remaining lines that contain {"type": pattern (leaked JSON)
    cleaned = cleaned.replace(/^.*[{"']type["']\s*:\s*["']\w+["'].*$/gm, '');
    // 3. Remove lines that are just "Ação:" or "ACTION:" with nothing after
    cleaned = cleaned.replace(/^\s*(?:ACTION|A[çc][ãa]o|AÇÃO)\s*:?\s*$/gmi, '');
    // 4. Remove excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned || 'Feito! ✅';
}

// --- Build financial summary for last N months (compact) ---
async function getFinancialSummary(userId: string, months: number = 3): Promise<string> {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const transactions = await prisma.transaction.findMany({
        where: { userId, date: { gte: since } },
        select: { amount: true, type: true, category: true, date: true, description: true },
        orderBy: { date: 'desc' }
    });

    if (transactions.length === 0) return 'Sem transações nos últimos ' + months + ' meses.';

    // Group by month
    const monthlyData: Record<string, { income: number; expenses: number; byCategory: Record<string, number> }> = {};

    for (const tx of transactions) {
        const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key]) monthlyData[key] = { income: 0, expenses: 0, byCategory: {} };

        if (tx.type === 'entrada') {
            monthlyData[key].income += tx.amount;
        } else {
            monthlyData[key].expenses += tx.amount;
            monthlyData[key].byCategory[tx.category] = (monthlyData[key].byCategory[tx.category] || 0) + tx.amount;
        }
    }

    // Build compact summary
    const lines: string[] = [];
    for (const [month, data] of Object.entries(monthlyData).sort()) {
        const cats = Object.entries(data.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([cat, val]) => `${cat}:R$${val.toFixed(0)}`)
            .join(',');
        lines.push(`${month}: +R$${data.income.toFixed(0)} -R$${data.expenses.toFixed(0)} [${cats}]`);
    }

    const totalIncome = transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'saida').reduce((s, t) => s + t.amount, 0);

    return `Resumo ${months}m: Total +R$${totalIncome.toFixed(0)} -R$${totalExpenses.toFixed(0)} | ${lines.join(' | ')}`;
}

const pdf = require('pdf-parse');

// ============================================================
// Friday Chat — Full system autonomy
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
            const [habits, tasks, transactions, history, financialSummary] = await Promise.all([
                prisma.habit.findMany({ where: { userId }, select: { id: true, title: true, attribute: true } }),
                prisma.task.findMany({ where: { userId, status: 'pending' }, select: { id: true, title: true } }),
                prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, description: true, amount: true, type: true, category: true } }),
                prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
                getFinancialSummary(userId, 3)
            ]);

            const tasksList = tasks.slice(0, 8).map(t => `${t.id}:${t.title}`).join('; ');
            const habitsList = habits.slice(0, 8).map(h => `${h.id}:${h.title}(${h.attribute})`).join('; ');
            const txList = transactions.map(t => `${t.id}:${t.description}:R$${t.amount}(${t.type},${t.category})`).join('; ');
            const balance = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

            const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';
            const purpose = user?.fridayPurpose ? ` Foco: ${user.fridayPurpose}.` : '';

            const systemPrompt = `Você é Friday, IA do Natron. Usuário: ${nick}.${purpose}
Responda em PT-BR, seja direta. Máximo 3-4 frases. Dê insights sobre gastos quando perguntado.

IMPORTANTE: Escreva sua resposta PRIMEIRO, depois coloque as ações NO FINAL.
Use a palavra ACTION (em inglês, nunca "Ação") seguida de JSON:
ACTION: {"type":"create_task","payload":{"title":"..."}}
ACTION: {"type":"complete_task","payload":{"id":"ID"}}
ACTION: {"type":"delete_task","payload":{"id":"ID"}}
ACTION: {"type":"create_transaction","payload":{"amount":0,"type":"saida|entrada","description":"...","category":"alimentacao|lazer|assinaturas|moradia|saude|transporte|educacao|salario|investimento|outros"}}
ACTION: {"type":"update_transaction","payload":{"id":"ID","amount":0,"description":"...","category":"..."}}
ACTION: {"type":"delete_transaction","payload":{"id":"ID"}}
ACTION: {"type":"delete_all_transactions","payload":{}}
ACTION: {"type":"create_habit","payload":{"title":"...","attribute":"FISICO|DISCIPLINA|MENTAL|INTELECTO|PRODUTIVIDADE|FINANCEIRO|NENHUM"}}
ACTION: {"type":"update_habit","payload":{"id":"ID","title":"..."}}
ACTION: {"type":"delete_habit","payload":{"id":"ID"}}
ACTION: {"type":"complete_habit","payload":{"id":"ID"}}

DADOS ATUAIS:
Saldo: R$${balance.toFixed(2)}
Transações recentes: ${txList || 'nenhuma'}
Tarefas pendentes: ${tasksList || 'nenhuma'}
Hábitos: ${habitsList || 'nenhum'}
${financialSummary}

REGRAS: NUNCA simule dados. Use ACTION (inglês) para mudar. NUNCA mostre o JSON ao usuário.`;

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
                        console.log('Action:', actionData.type, JSON.stringify(actionData.payload));

                        switch (actionData.type) {
                            case 'create_task': {
                                const title = actionData.payload.title || actionData.payload.titulo || 'Nova Tarefa';
                                const t = await prisma.task.create({
                                    data: { userId, title, status: 'pending' }
                                });
                                actions.push({ type: 'task_created', data: t });
                                await addXp(userId, 'PRODUTIVIDADE', 5);
                                break;
                            }
                            case 'complete_task': {
                                await prisma.task.update({ where: { id: actionData.payload.id }, data: { status: 'completed' } });
                                actions.push({ type: 'task_completed', id: actionData.payload.id });
                                await addXp(userId, 'PRODUTIVIDADE', 10);
                                break;
                            }
                            case 'delete_task': {
                                await prisma.task.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'task_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'create_transaction': {
                                const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                                let amount = parseFloat(String(rawAmount).replace(',', '.'));
                                if (isNaN(amount)) amount = 0;

                                let type = String(actionData.payload.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                if (!['entrada', 'saida'].includes(type)) {
                                    type = type === 'receita' || type === 'ganho' ? 'entrada' : 'saida';
                                }

                                const desc = actionData.payload.description || actionData.payload.descricao || 'Gasto registrado pela Friday';
                                let cat = String(actionData.payload.category || actionData.payload.categoria || 'outros').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                
                                const t = await prisma.transaction.create({
                                    data: {
                                        userId,
                                        amount,
                                        type,
                                        description: desc,
                                        category: cat
                                    }
                                });
                                actions.push({ type: type === 'saida' ? 'expense_added' : 'income_added', data: t });
                                await addXp(userId, 'FINANCEIRO', 5);
                                break;
                            }
                            case 'update_transaction': {
                                const updateData: any = {};
                                const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                                if (rawAmount !== undefined) {
                                    const amount = parseFloat(String(rawAmount).replace(',', '.'));
                                    if (!isNaN(amount)) updateData.amount = amount;
                                }
                                
                                const desc = actionData.payload.description || actionData.payload.descricao;
                                if (desc) updateData.description = desc;
                                
                                const cat = actionData.payload.category || actionData.payload.categoria;
                                if (cat) {
                                    updateData.category = String(cat).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                }
                                
                                if (actionData.payload.type) {
                                    let type = String(actionData.payload.type).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    if (type === 'receita' || type === 'ganho') type = 'entrada';
                                    if (type === 'despesa' || type === 'gasto') type = 'saida';
                                    if (['entrada', 'saida'].includes(type)) updateData.type = type;
                                }
                                
                                const updated = await prisma.transaction.update({
                                    where: { id: actionData.payload.id },
                                    data: updateData
                                });
                                actions.push({ type: 'transaction_updated', data: updated });
                                break;
                            }
                            case 'delete_transaction': {
                                await prisma.transaction.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'transaction_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'delete_all_transactions': {
                                await prisma.transaction.deleteMany({ where: { userId } });
                                actions.push({ type: 'all_transactions_deleted' });
                                break;
                            }
                            case 'create_habit': {
                                const title = actionData.payload.title || actionData.payload.titulo || 'Novo Hábito';
                                const h = await prisma.habit.create({
                                    data: {
                                        userId,
                                        title,
                                        attribute: actionData.payload.attribute || actionData.payload.atributo || 'PRODUTIVIDADE'
                                    }
                                });
                                actions.push({ type: 'habit_created', data: h });
                                await addXp(userId, 'DISCIPLINA', 5);
                                break;
                            }
                            case 'update_habit': {
                                const hUpdate: any = {};
                                const title = actionData.payload.title || actionData.payload.titulo;
                                if (title) hUpdate.title = title;
                                
                                const attribute = actionData.payload.attribute || actionData.payload.atributo;
                                if (attribute) hUpdate.attribute = attribute;
                                
                                const hUpdated = await prisma.habit.update({
                                    where: { id: actionData.payload.id },
                                    data: hUpdate
                                });
                                actions.push({ type: 'habit_updated', data: hUpdated });
                                break;
                            }
                            case 'delete_habit': {
                                await prisma.habit.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'habit_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'complete_habit': {
                                await prisma.habitLog.create({ data: { habitId: actionData.payload.id, completed: true } });
                                actions.push({ type: 'habit_completed', id: actionData.payload.id });
                                await addXp(userId, 'DISCIPLINA', 5);
                                break;
                            }
                        }
                    } catch (e: any) {
                        console.error('Erro ao processar ação:', actionData.type, e?.message);
                    }
                }

                // Clean all action text from visible message
                assistantMessage = cleanActionText(aiResponse);
                cache.invalidate(`dashboard:overview:${userId}`);
            } else {
                assistantMessage = `${nick}, tive um problema de conexão. Tenta de novo?`;
            }
        } catch (aiError: any) {
            console.error('Erro Friday:', aiError?.message);
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
// Upload PDF — Real extraction + auto-register
// ============================================================
export const uploadPdf = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        const data = await pdf(file.buffer);
        const text = data.text;
        const userId = req.userId!;

        // Save PDF content as system context
        await prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `PDF "${file.originalname}":\n${text.substring(0, 4000)}`,
                userId
            }
        });

        const [user, history] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { name: true, fridayNickname: true } }),
            prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
        ]);

        const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';

        // Ask the AI to extract and register data from PDF
        const prompt = `Você é Friday. ${nick} enviou o PDF "${file.originalname}".
Analise o conteúdo acima e:
1. Extraia TODOS os valores, datas, nomes/estabelecimentos e categorias.
2. Resuma em 2-3 frases para ${nick}.
3. Se for uma nota fiscal ou comprovante, registre AUTOMATICAMENTE cada gasto usando ACTION.
Use: ACTION: {"type":"create_transaction","payload":{"amount":VALOR,"type":"saida","description":"DESCRICAO","category":"CATEGORIA"}}
Categorias válidas: alimentacao, lazer, assinaturas, moradia, saude, transporte, educacao, salario, investimento, outros`;

        const chatHistory = history.reverse().map(msg => ({ role: msg.role, content: msg.content }));

        const aiResponse = await callAI([
            { role: 'system', content: prompt },
            ...chatHistory
        ]);

        let finalMessage = aiResponse || `${nick}, recebi "${file.originalname}" mas tive um problema ao processar. Tenta de novo?`;

        // Process any actions from the AI response (auto-register from PDF)
        const pdfActions: any[] = [];
        if (aiResponse) {
            const parsedActions = extractActions(aiResponse);
            for (const actionData of parsedActions) {
                try {
                    if (actionData.type === 'create_transaction') {
                        const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                        let amount = parseFloat(String(rawAmount).replace(',', '.'));
                        if (isNaN(amount)) amount = 0;

                        let type = String(actionData.payload.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        if (!['entrada', 'saida'].includes(type)) {
                            type = type === 'receita' || type === 'ganho' ? 'entrada' : 'saida';
                        }

                        const desc = actionData.payload.description || actionData.payload.descricao || 'Gasto registrado via PDF';
                        let cat = String(actionData.payload.category || actionData.payload.categoria || 'outros').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                        const t = await prisma.transaction.create({
                            data: {
                                userId,
                                amount,
                                type,
                                description: desc,
                                category: cat
                            }
                        });
                        pdfActions.push({ type: type === 'saida' ? 'expense_added' : 'income_added', data: t });
                        await addXp(userId, 'FINANCEIRO', 5);
                    }
                } catch (e: any) {
                    console.error('Erro ao registrar gasto do PDF:', e?.message);
                }
            }

            // Clean all action text from visible message
            finalMessage = cleanActionText(aiResponse);
            if (finalMessage === 'Feito! ✅') finalMessage = 'PDF processado e gastos registrados! ✅';
            if (pdfActions.length > 0) {
                finalMessage += `\n\n📋 ${pdfActions.length} transação(ões) registrada(s) automaticamente.`;
            }
            cache.invalidate(`dashboard:overview:${userId}`);
        }

        await prisma.chatMessage.create({
            data: { role: 'assistant', content: finalMessage, userId }
        });

        res.json({ message: finalMessage, actions: pdfActions });
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
