"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreferences = exports.saveOnboarding = exports.uploadFile = exports.getHistory = exports.chat = void 0;
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
// --- Super Robust JSON extractor for ACTION blocks ---
// Matches any valid JSON object in the text that has a "type" field
function extractActions(text) {
    const results = [];
    let depth = 0;
    let startIdx = -1;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (depth === 0)
                startIdx = i;
            depth++;
        }
        else if (text[i] === '}') {
            depth--;
            if (depth === 0 && startIdx !== -1) {
                const jsonStr = text.substring(startIdx, i + 1);
                try {
                    const parsed = JSON.parse(jsonStr);
                    const typeValue = parsed.type || parsed.tipo || parsed.action || parsed.acao;
                    if (parsed && typeof parsed === 'object' && typeValue) {
                        const payload = parsed.payload || parsed.dados || parsed;
                        results.push({ type: typeValue, payload: payload });
                    }
                }
                catch (e) {
                    // Ignore invalid JSON blocks
                }
                startIdx = -1;
            }
        }
    }
    // Also look for JSON arrays if the LLM generated an array
    const arrayRegex = /\[\s*\{[\s\S]*\}\s*\]/g;
    let match;
    while ((match = arrayRegex.exec(text)) !== null) {
        try {
            const parsedArray = JSON.parse(match[0]);
            if (Array.isArray(parsedArray)) {
                for (const item of parsedArray) {
                    const typeValue = item.type || item.tipo || item.action || item.acao;
                    if (item && typeof item === 'object' && typeValue) {
                        // Avoid duplicates if the array items were already caught by the object parser
                        const payload = item.payload || item.dados || item;
                        const exists = results.some(r => JSON.stringify(r.payload) === JSON.stringify(payload));
                        if (!exists) {
                            results.push({ type: typeValue, payload: payload });
                        }
                    }
                }
            }
        }
        catch (e) {
            // Ignore
        }
    }
    return results;
}
// --- Aggressive cleanup: remove ALL action-related text from visible message ---
function cleanActionText(text) {
    let cleaned = text;
    // 1. Remove any JSON objects that have "type"
    let depth = 0;
    let startIdx = -1;
    let rangesToRemove = [];
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
            if (depth === 0)
                startIdx = i;
            depth++;
        }
        else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0 && startIdx !== -1) {
                const jsonStr = cleaned.substring(startIdx, i + 1);
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed && typeof parsed === 'object' && parsed.type) {
                        rangesToRemove.push({ start: startIdx, end: i + 1 });
                    }
                }
                catch (e) {
                    // Not valid JSON, ignore
                }
                startIdx = -1;
            }
        }
    }
    // Remove from end to start to avoid index shifting
    for (let i = rangesToRemove.length - 1; i >= 0; i--) {
        cleaned = cleaned.substring(0, rangesToRemove[i].start) + cleaned.substring(rangesToRemove[i].end);
    }
    // 2. Remove JSON arrays
    cleaned = cleaned.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '');
    // 3. Remove orphaned prefix labels (ACTION:, Ação:, etc)
    cleaned = cleaned.replace(/^\s*(?:ACTION|A[çc][ãa]o|AÇÃO)\s*:?\s*$/gmi, '');
    // 4. Remove excessive blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return cleaned || 'Feito! ✅';
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
                role: msg.role,
                content: msg.content
            }));
            const aiResponse = await callAI([
                { role: 'system', content: systemPrompt },
                ...chatHistory
            ]);
            if (aiResponse) {
                const parsedActions = extractActions(aiResponse);
                let debugErrors = '';
                for (const actionData of parsedActions) {
                    try {
                        console.log('Action:', actionData.type, JSON.stringify(actionData.payload));
                        const actionType = String(actionData.type).toLowerCase();
                        switch (actionType) {
                            case 'create_task':
                            case 'criar_tarefa': {
                                const title = actionData.payload.title || actionData.payload.titulo || 'Nova Tarefa';
                                const t = await prisma_1.prisma.task.create({
                                    data: { userId, title, status: 'pending' }
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
                            case 'create_transaction':
                            case 'criar_transacao':
                            case 'criar_gasto': {
                                const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                                let amount = parseFloat(String(rawAmount).replace(',', '.'));
                                if (isNaN(amount))
                                    amount = 0;
                                let type = String(actionData.payload.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                if (!['entrada', 'saida'].includes(type)) {
                                    type = type === 'receita' || type === 'ganho' ? 'entrada' : 'saida';
                                }
                                const desc = actionData.payload.description || actionData.payload.descricao || 'Gasto registrado pela Friday';
                                let cat = String(actionData.payload.category || actionData.payload.categoria || 'outros').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                const t = await prisma_1.prisma.transaction.create({
                                    data: {
                                        userId,
                                        amount,
                                        type,
                                        description: desc,
                                        category: cat
                                    }
                                });
                                actions.push({ type: type === 'saida' ? 'expense_added' : 'income_added', data: t });
                                await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 5);
                                break;
                            }
                            case 'update_transaction': {
                                const updateData = {};
                                const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                                if (rawAmount !== undefined) {
                                    const amount = parseFloat(String(rawAmount).replace(',', '.'));
                                    if (!isNaN(amount))
                                        updateData.amount = amount;
                                }
                                const desc = actionData.payload.description || actionData.payload.descricao;
                                if (desc)
                                    updateData.description = desc;
                                const cat = actionData.payload.category || actionData.payload.categoria;
                                if (cat) {
                                    updateData.category = String(cat).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                }
                                if (actionData.payload.type) {
                                    let type = String(actionData.payload.type).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                    if (type === 'receita' || type === 'ganho')
                                        type = 'entrada';
                                    if (type === 'despesa' || type === 'gasto')
                                        type = 'saida';
                                    if (['entrada', 'saida'].includes(type))
                                        updateData.type = type;
                                }
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
                                const title = actionData.payload.title || actionData.payload.titulo || 'Novo Hábito';
                                const h = await prisma_1.prisma.habit.create({
                                    data: {
                                        userId,
                                        title,
                                        attribute: actionData.payload.attribute || actionData.payload.atributo || 'PRODUTIVIDADE'
                                    }
                                });
                                actions.push({ type: 'habit_created', data: h });
                                await (0, xpService_1.addXp)(userId, 'DISCIPLINA', 5);
                                break;
                            }
                            case 'update_habit': {
                                const hUpdate = {};
                                const title = actionData.payload.title || actionData.payload.titulo;
                                if (title)
                                    hUpdate.title = title;
                                const attribute = actionData.payload.attribute || actionData.payload.atributo;
                                if (attribute)
                                    hUpdate.attribute = attribute;
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
                        debugErrors += `\n[Erro em ${actionData.type}: ${e?.message}]`;
                    }
                }
                // Clean all action text from visible message
                assistantMessage = cleanActionText(aiResponse);
                if (debugErrors)
                    assistantMessage += `\n\n⚠️ Erros internos:${debugErrors}`;
                if (assistantMessage === 'Feito! ✅' && parsedActions.length === 0) {
                    assistantMessage += `\n\n[DEBUG RAW AI]: ${aiResponse}`;
                }
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
// Upload File — PDF extraction + Image OCR + auto-register
// ============================================================
const uploadFile = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const userId = req.userId;
        let extractedText = '';
        const isPdf = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');
        // --- Extract text based on file type ---
        if (isPdf) {
            try {
                const data = await pdf(file.buffer);
                extractedText = data.text || '';
            }
            catch (pdfErr) {
                console.error('Erro ao extrair texto do PDF:', pdfErr?.message);
                return res.status(400).json({ error: 'Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido.' });
            }
        }
        else if (isImage) {
            try {
                const Tesseract = require('tesseract.js');
                const { data: { text } } = await Tesseract.recognize(file.buffer, 'por+eng', {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            console.log(`🔍 OCR progresso: ${(m.progress * 100).toFixed(0)}%`);
                        }
                    }
                });
                extractedText = text || '';
            }
            catch (ocrErr) {
                console.error('Erro no OCR da imagem:', ocrErr?.message);
                return res.status(400).json({ error: 'Não foi possível analisar a imagem. Tente novamente.' });
            }
        }
        else {
            return res.status(400).json({ error: 'Tipo de arquivo não suportado. Envie PDF ou imagem (JPG, PNG, WEBP).' });
        }
        if (!extractedText.trim()) {
            // Even with no text, inform the user
            const noTextMsg = isPdf
                ? 'O PDF não contém texto legível (pode ser um PDF de imagem). Tente tirar uma foto do documento.'
                : 'Não consegui extrair texto da imagem. Tente com uma foto mais nítida ou com melhor iluminação.';
            await prisma_1.prisma.chatMessage.create({
                data: { role: 'assistant', content: noTextMsg, userId }
            });
            return res.json({ message: noTextMsg, actions: [] });
        }
        const fileType = isPdf ? 'PDF' : 'Imagem';
        // Save file content as system context
        await prisma_1.prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `${fileType} "${file.originalname}":\n${extractedText.substring(0, 4000)}`,
                userId
            }
        });
        const [user, history] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { name: true, fridayNickname: true } }),
            prisma_1.prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 })
        ]);
        const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';
        // Ask the AI to extract and register data from the file
        const prompt = `Você é Friday. ${nick} enviou ${isPdf ? 'o PDF' : 'uma foto/imagem'} "${file.originalname}".
Conteúdo extraído via ${isPdf ? 'leitura do PDF' : 'OCR (reconhecimento de texto na imagem)'}:
---
${extractedText.substring(0, 3000)}
---

Analise o conteúdo acima e:
1. Extraia TODOS os valores, datas, nomes/estabelecimentos e categorias encontrados.
2. Resuma em 2-3 frases para ${nick}.
3. Se for uma nota fiscal, comprovante ou recibo, registre AUTOMATICAMENTE cada gasto usando ACTION.
Use: ACTION: {"type":"create_transaction","payload":{"amount":VALOR,"type":"saida","description":"DESCRICAO","category":"CATEGORIA"}}
Categorias válidas: alimentacao, lazer, assinaturas, moradia, saude, transporte, educacao, salario, investimento, outros

Se NÃO for um documento financeiro, apenas resuma o conteúdo de forma útil.`;
        const chatHistory = history.reverse().map(msg => ({ role: msg.role, content: msg.content }));
        const aiResponse = await callAI([
            { role: 'system', content: prompt },
            ...chatHistory
        ]);
        let finalMessage = aiResponse || `${nick}, recebi "${file.originalname}" mas tive um problema ao processar. Tenta de novo?`;
        // Process any actions from the AI response (auto-register from file)
        const fileActions = [];
        if (aiResponse) {
            const parsedActions = extractActions(aiResponse);
            for (const actionData of parsedActions) {
                try {
                    if (actionData.type === 'create_transaction') {
                        const rawAmount = actionData.payload.amount !== undefined ? actionData.payload.amount : actionData.payload.valor;
                        let amount = parseFloat(String(rawAmount).replace(',', '.'));
                        if (isNaN(amount))
                            amount = 0;
                        let type = String(actionData.payload.type || 'saida').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        if (!['entrada', 'saida'].includes(type)) {
                            type = type === 'receita' || type === 'ganho' ? 'entrada' : 'saida';
                        }
                        const desc = actionData.payload.description || actionData.payload.descricao || `Gasto via ${fileType}`;
                        let cat = String(actionData.payload.category || actionData.payload.categoria || 'outros').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        const t = await prisma_1.prisma.transaction.create({
                            data: {
                                userId,
                                amount,
                                type,
                                description: desc,
                                category: cat
                            }
                        });
                        fileActions.push({ type: type === 'saida' ? 'expense_added' : 'income_added', data: t });
                        await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 5);
                    }
                }
                catch (e) {
                    console.error(`Erro ao registrar gasto do ${fileType}:`, e?.message);
                }
            }
            // Clean all action text from visible message
            finalMessage = cleanActionText(aiResponse);
            if (finalMessage === 'Feito! ✅')
                finalMessage = `${fileType} processado com sucesso! ✅`;
            if (fileActions.length > 0) {
                finalMessage += `\n\n📋 ${fileActions.length} transação(ões) registrada(s) automaticamente.`;
            }
            cache_1.cache.invalidate(`dashboard:overview:${userId}`);
        }
        await prisma_1.prisma.chatMessage.create({
            data: { role: 'assistant', content: finalMessage, userId }
        });
        res.json({ message: finalMessage, actions: fileActions });
    }
    catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ error: 'Erro ao processar o arquivo' });
    }
};
exports.uploadFile = uploadFile;
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
