"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = exports.saveOnboarding = exports.uploadPdf = exports.getHistory = exports.chat = void 0;
const prisma_1 = require("../lib/prisma");
const xpService_1 = require("../services/xpService");
const cache_1 = require("../lib/cache");
const axios_1 = __importDefault(require("axios"));
// --- Ollama Config (local, CPU optimized) ---
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.FRIDAY_MODEL || process.env.MODEL_NAME || 'llama3.2';
const NUM_CTX = parseInt(process.env.FRIDAY_NUM_CTX || '2048');
const NUM_PREDICT = parseInt(process.env.FRIDAY_NUM_PREDICT || '350');
const NUM_THREAD = parseInt(process.env.FRIDAY_NUM_THREAD || '0'); // 0 = auto
const callAI = async (messages) => {
    try {
        const options = {
            num_ctx: NUM_CTX,
            num_predict: NUM_PREDICT,
            temperature: 0.3,
            top_p: 0.9,
            repeat_penalty: 1.1,
        };
        if (NUM_THREAD > 0)
            options.num_thread = NUM_THREAD;
        const response = await axios_1.default.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages,
            stream: false,
            options,
        }, { timeout: 60000 });
        return response.data.message.content;
    }
    catch (error) {
        console.error('Ollama error:', error?.message || error);
        return null;
    }
};
// --- Robust JSON extractor for ACTION blocks ---
function extractActions(text) {
    const results = [];
    const regex = /ACTION:\s*(\{)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const startIdx = match.index + match[0].length - 1;
        let depth = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < text.length; i++) {
            if (text[i] === '{')
                depth++;
            else if (text[i] === '}')
                depth--;
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
        }
        catch (e) {
            console.error('Erro ao parsear ACTION JSON:', e);
        }
    }
    return results;
}
// --- Build financial summary for last N months (compact) ---
async function getFinancialSummary(userId, months = 3) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const transactions = await prisma_1.prisma.transaction.findMany({
        where: { userId, date: { gte: since } },
        select: { amount: true, type: true, category: true, date: true, description: true },
        orderBy: { date: 'desc' }
    });
    if (transactions.length === 0)
        return 'Sem transações nos últimos ' + months + ' meses.';
    // Group by month
    const monthlyData = {};
    for (const tx of transactions) {
        const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[key])
            monthlyData[key] = { income: 0, expenses: 0, byCategory: {} };
        if (tx.type === 'entrada') {
            monthlyData[key].income += tx.amount;
        }
        else {
            monthlyData[key].expenses += tx.amount;
            monthlyData[key].byCategory[tx.category] = (monthlyData[key].byCategory[tx.category] || 0) + tx.amount;
        }
    }
    // Build compact summary
    const lines = [];
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
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, fridayNickname: true, fridayPurpose: true },
        });
        await prisma_1.prisma.chatMessage.create({
            data: { role: 'user', content: message, userId }
        });
        let assistantMessage = '';
        const actions = [];
        try {
            const [habits, tasks, transactions, history, financialSummary] = await Promise.all([
                prisma_1.prisma.habit.findMany({ where: { userId }, select: { id: true, title: true, attribute: true } }),
                prisma_1.prisma.task.findMany({ where: { userId, status: 'pending' }, select: { id: true, title: true } }),
                prisma_1.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, description: true, amount: true, type: true, category: true } }),
                prisma_1.prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 8 }),
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

AÇÕES (use EXATAMENTE este formato, pode usar VÁRIAS de uma vez):
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

REGRAS: NUNCA simule dados. Use ACTION para mudar. Para editar categoria/valor, use update_transaction. Para análise financeira, use os dados acima.`;
            const chatHistory = history.reverse().map(msg => ({
                role: msg.role,
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
                                const t = await prisma_1.prisma.task.create({
                                    data: { userId, title: actionData.payload.title, status: 'pending' }
                                });
                                actions.push({ type: 'task_created', data: t });
                                await (0, xpService_1.addXp)(userId, 'PRODUTIVIDADE', 5);
                                break;
                            }
                            case 'complete_task': {
                                await prisma_1.prisma.task.update({ where: { id: actionData.payload.id }, data: { status: 'completed' } });
                                actions.push({ type: 'task_completed', id: actionData.payload.id });
                                await (0, xpService_1.addXp)(userId, 'PRODUTIVIDADE', 10);
                                break;
                            }
                            case 'delete_task': {
                                await prisma_1.prisma.task.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'task_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'create_transaction': {
                                const t = await prisma_1.prisma.transaction.create({
                                    data: {
                                        userId,
                                        amount: actionData.payload.amount,
                                        type: actionData.payload.type,
                                        description: actionData.payload.description,
                                        category: actionData.payload.category || 'outros'
                                    }
                                });
                                actions.push({ type: actionData.payload.type === 'saida' ? 'expense_added' : 'income_added', data: t });
                                await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 5);
                                break;
                            }
                            case 'update_transaction': {
                                const updateData = {};
                                if (actionData.payload.amount !== undefined)
                                    updateData.amount = actionData.payload.amount;
                                if (actionData.payload.description)
                                    updateData.description = actionData.payload.description;
                                if (actionData.payload.category)
                                    updateData.category = actionData.payload.category;
                                if (actionData.payload.type)
                                    updateData.type = actionData.payload.type;
                                const updated = await prisma_1.prisma.transaction.update({
                                    where: { id: actionData.payload.id },
                                    data: updateData
                                });
                                actions.push({ type: 'transaction_updated', data: updated });
                                break;
                            }
                            case 'delete_transaction': {
                                await prisma_1.prisma.transaction.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'transaction_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'delete_all_transactions': {
                                await prisma_1.prisma.transaction.deleteMany({ where: { userId } });
                                actions.push({ type: 'all_transactions_deleted' });
                                break;
                            }
                            case 'create_habit': {
                                const h = await prisma_1.prisma.habit.create({
                                    data: {
                                        userId,
                                        title: actionData.payload.title,
                                        attribute: actionData.payload.attribute || 'PRODUTIVIDADE'
                                    }
                                });
                                actions.push({ type: 'habit_created', data: h });
                                await (0, xpService_1.addXp)(userId, 'DISCIPLINA', 5);
                                break;
                            }
                            case 'update_habit': {
                                const hUpdate = {};
                                if (actionData.payload.title)
                                    hUpdate.title = actionData.payload.title;
                                if (actionData.payload.attribute)
                                    hUpdate.attribute = actionData.payload.attribute;
                                const hUpdated = await prisma_1.prisma.habit.update({
                                    where: { id: actionData.payload.id },
                                    data: hUpdate
                                });
                                actions.push({ type: 'habit_updated', data: hUpdated });
                                break;
                            }
                            case 'delete_habit': {
                                await prisma_1.prisma.habit.delete({ where: { id: actionData.payload.id } });
                                actions.push({ type: 'habit_deleted', id: actionData.payload.id });
                                break;
                            }
                            case 'complete_habit': {
                                await prisma_1.prisma.habitLog.create({ data: { habitId: actionData.payload.id, completed: true } });
                                actions.push({ type: 'habit_completed', id: actionData.payload.id });
                                await (0, xpService_1.addXp)(userId, 'DISCIPLINA', 5);
                                break;
                            }
                        }
                    }
                    catch (e) {
                        console.error('Erro ao processar ação:', actionData.type, e?.message);
                    }
                }
                // Clean ACTION tags from visible message
                assistantMessage = aiResponse.replace(/ACTION:\s*\{[\s\S]*?\}(?:\s*\})*?(?=\s*(?:ACTION:|$))/g, '').trim();
                assistantMessage = assistantMessage.replace(/ACTION:.*$/gm, '').trim();
                if (!assistantMessage)
                    assistantMessage = 'Feito! ✅';
                cache_1.cache.invalidate(`dashboard:overview:${userId}`);
            }
            else {
                assistantMessage = `${nick}, tive um problema de conexão. Tenta de novo?`;
            }
        }
        catch (aiError) {
            console.error('Erro Friday:', aiError?.message);
            assistantMessage = 'Erro interno. Tente novamente.';
        }
        if (assistantMessage) {
            await prisma_1.prisma.chatMessage.create({
                data: { role: 'assistant', content: assistantMessage, userId }
            });
        }
        res.json({ message: assistantMessage, actions });
    }
    catch (error) {
        console.error('Friday chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Friday' });
    }
};
exports.chat = chat;
// ============================================================
// History
// ============================================================
const getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const history = await prisma_1.prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(history.reverse().map(msg => ({ role: msg.role, content: msg.content })));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};
exports.getHistory = getHistory;
// ============================================================
// Upload PDF — Real extraction + auto-register
// ============================================================
const uploadPdf = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const data = await pdf(file.buffer);
        const text = data.text;
        const userId = req.userId;
        // Save PDF content as system context
        await prisma_1.prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `PDF "${file.originalname}":\n${text.substring(0, 4000)}`,
                userId
            }
        });
        const [user, history] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { name: true, fridayNickname: true } }),
            prisma_1.prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
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
        const pdfActions = [];
        if (aiResponse) {
            const parsedActions = extractActions(aiResponse);
            for (const actionData of parsedActions) {
                try {
                    if (actionData.type === 'create_transaction') {
                        const t = await prisma_1.prisma.transaction.create({
                            data: {
                                userId,
                                amount: actionData.payload.amount,
                                type: actionData.payload.type || 'saida',
                                description: actionData.payload.description,
                                category: actionData.payload.category || 'outros'
                            }
                        });
                        pdfActions.push({ type: 'expense_added', data: t });
                        await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 5);
                    }
                }
                catch (e) {
                    console.error('Erro ao registrar gasto do PDF:', e?.message);
                }
            }
            // Clean ACTION tags from visible message
            finalMessage = aiResponse.replace(/ACTION:\s*\{[\s\S]*?\}(?:\s*\})*?(?=\s*(?:ACTION:|$))/g, '').trim();
            finalMessage = finalMessage.replace(/ACTION:.*$/gm, '').trim();
            if (!finalMessage)
                finalMessage = 'PDF processado e gastos registrados! ✅';
            if (pdfActions.length > 0) {
                finalMessage += `\n\n📋 ${pdfActions.length} transação(ões) registrada(s) automaticamente.`;
            }
            cache_1.cache.invalidate(`dashboard:overview:${userId}`);
        }
        await prisma_1.prisma.chatMessage.create({
            data: { role: 'assistant', content: finalMessage, userId }
        });
        res.json({ message: finalMessage, actions: pdfActions });
    }
    catch (error) {
        console.error('PDF error:', error);
        res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
};
exports.uploadPdf = uploadPdf;
// ============================================================
// Onboarding
// ============================================================
const saveOnboarding = async (req, res) => {
    try {
        const userId = req.userId;
        const { nickname, purpose } = req.body;
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { fridayNickname: nickname || null, fridayPurpose: purpose || null }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Onboarding error:', error);
        res.status(500).json({ error: 'Erro ao salvar preferências' });
    }
};
exports.saveOnboarding = saveOnboarding;
// ============================================================
// Get Preferences
// ============================================================
const getPreferences = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { fridayNickname: true, fridayPurpose: true }
        });
        res.json({
            nickname: user?.fridayNickname || null,
            purpose: user?.fridayPurpose || null,
            isOnboarded: !!(user?.fridayNickname)
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar preferências' });
    }
};
exports.getPreferences = getPreferences;
