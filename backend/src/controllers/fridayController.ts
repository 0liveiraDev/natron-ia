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

const callAI = async (messages: any[], overrides?: { timeout?: number; num_predict?: number; num_ctx?: number }): Promise<string | null> => {
    try {
        const options: any = {
            num_ctx: overrides?.num_ctx || NUM_CTX,
            num_predict: overrides?.num_predict || NUM_PREDICT,
            temperature: 0.3,
            top_p: 0.9,
            repeat_penalty: 1.1,
        };
        if (NUM_THREAD > 0) options.num_thread = NUM_THREAD;

        const timeout = overrides?.timeout || 60000;
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages,
            stream: false,
            options,
        }, { timeout });
        return response.data.message.content;
    } catch (error: any) {
        console.error('Ollama error:', error?.message || error);
        return null;
    }
};

// --- Super Robust JSON extractor for ACTION blocks ---
// Matches any valid JSON object in the text that has a "type" field
function extractActions(text: string): { type: string; payload: any }[] {
    const results: { type: string; payload: any }[] = [];
    let depth = 0;
    let startIdx = -1;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (depth === 0) startIdx = i;
            depth++;
        } else if (text[i] === '}') {
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
                } catch (e) {
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
        } catch (e) {
            // Ignore
        }
    }

    return results;
}

// --- Aggressive cleanup: remove ALL action-related text from visible message ---
function cleanActionText(text: string): string {
    let cleaned = text;

    // 1. Remove any JSON objects that have "type"
    let depth = 0;
    let startIdx = -1;
    let rangesToRemove: {start: number, end: number}[] = [];

    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] === '{') {
            if (depth === 0) startIdx = i;
            depth++;
        } else if (cleaned[i] === '}') {
            depth--;
            if (depth === 0 && startIdx !== -1) {
                const jsonStr = cleaned.substring(startIdx, i + 1);
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed && typeof parsed === 'object' && parsed.type) {
                        rangesToRemove.push({start: startIdx, end: i + 1});
                    }
                } catch (e) {
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
                content: msg.content.length > 1000 ? msg.content.substring(0, 1000) + '... [texto truncado para performance]' : msg.content
            }));

            const messages = [
                { role: 'system', content: systemPrompt },
                ...chatHistory
            ];

            const aiResponse = await callAI(messages);

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
                            case 'create_transaction':
                            case 'criar_transacao':
                            case 'criar_gasto': {
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
                        debugErrors += `\n[Erro em ${actionData.type}: ${e?.message}]`;
                    }
                }

                // Clean all action text from visible message
                assistantMessage = cleanActionText(aiResponse);
                if (debugErrors) assistantMessage += `\n\n⚠️ Erros internos:${debugErrors}`;
                if (assistantMessage === 'Feito! ✅' && parsedActions.length === 0) {
                     assistantMessage += `\n\n[DEBUG RAW AI]: ${aiResponse}`;
                }
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
// Upload File — Regex extraction (instant) + AI summary (optional)
// ============================================================
export const uploadFile = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        const userId = req.userId!;
        let extractedText = '';
        const isPdf = file.mimetype === 'application/pdf';
        const isImage = file.mimetype.startsWith('image/');

        // --- Extract text based on file type ---
        if (isPdf) {
            try {
                const data = await pdf(file.buffer);
                extractedText = data.text || '';
            } catch (pdfErr: any) {
                console.error('Erro ao extrair texto do PDF:', pdfErr?.message);
                return res.status(400).json({ error: 'Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido.' });
            }
        } else if (isImage) {
            try {
                const Tesseract = require('tesseract.js');
                const { data: { text } } = await Tesseract.recognize(file.buffer, 'por+eng', {
                    logger: (m: any) => {
                        if (m.status === 'recognizing text') {
                            console.log(`🔍 OCR progresso: ${(m.progress * 100).toFixed(0)}%`);
                        }
                    }
                });
                extractedText = text || '';
            } catch (ocrErr: any) {
                console.error('Erro no OCR da imagem:', ocrErr?.message);
                return res.status(400).json({ error: 'Não foi possível analisar a imagem. Tente novamente.' });
            }
        } else {
            return res.status(400).json({ error: 'Tipo de arquivo não suportado. Envie PDF ou imagem (JPG, PNG, WEBP).' });
        }

        if (!extractedText.trim()) {
            const noTextMsg = isPdf
                ? 'O PDF não contém texto legível (pode ser um PDF de imagem). Tente tirar uma foto do documento.'
                : 'Não consegui extrair texto da imagem. Tente com uma foto mais nítida ou com melhor iluminação.';
            
            await prisma.chatMessage.create({
                data: { role: 'assistant', content: noTextMsg, userId }
            });
            return res.json({ message: noTextMsg, actions: [] });
        }

        const fileType = isPdf ? 'PDF' : 'Imagem';

        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, fridayNickname: true } });
        const nick = user?.fridayNickname || user?.name?.split(' ')[0] || 'Usuário';

        // Save file content as system context in DB (compact)
        await prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `${fileType} "${file.originalname}":\n${extractedText.substring(0, 2000)}`,
                userId
            }
        });

        // ========== STEP 1: Instant regex extraction (receiptParser) ==========
        const { parseReceiptText } = require('../services/receiptParser');
        const parsed = parseReceiptText(extractedText);
        
        const fileActions: any[] = [];
        
        // Auto-register transaction if we found an amount
        if (parsed.amount && parsed.amount > 0) {
            try {
                // Detect if it's income or expense from text
                const textLower = extractedText.toLowerCase();
                const isIncome = textLower.includes('recebeu') || textLower.includes('recebido') || 
                                 textLower.includes('creditado') || textLower.includes('entrada') ||
                                 textLower.includes('salario') || textLower.includes('salário');
                const txType = isIncome ? 'entrada' : 'saida';
                
                const description = parsed.description || parsed.establishment || `Gasto via ${fileType}`;
                const category = parsed.category || 'outros';
                
                const t = await prisma.transaction.create({
                    data: {
                        userId,
                        amount: parsed.amount,
                        type: txType,
                        description,
                        category,
                        date: parsed.date || new Date()
                    }
                });
                fileActions.push({ type: txType === 'saida' ? 'expense_added' : 'income_added', data: t });
                await addXp(userId, 'FINANCEIRO', 5);
            } catch (e: any) {
                console.error(`Erro ao registrar gasto do ${fileType}:`, e?.message);
            }
        }

        cache.invalidate(`dashboard:overview:${userId}`);

        // ========== STEP 2: Build summary message ==========
        let finalMessage = '';

        // Build a regex-based summary (instant, always works)
        const parts: string[] = [];
        if (parsed.establishment) parts.push(`**Estabelecimento:** ${parsed.establishment}`);
        if (parsed.amount) parts.push(`**Valor:** R$ ${parsed.amount.toFixed(2)}`);
        if (parsed.date) parts.push(`**Data:** ${parsed.date.toLocaleDateString('pt-BR')}`);
        if (parsed.category) parts.push(`**Categoria:** ${parsed.category}`);
        
        if (parts.length > 0) {
            finalMessage = `${nick}!\n\n**Extração de valores, datas, nomes/estabelecimentos e categorias:**\n\n${parts.join('\n')}`;
        } else {
            finalMessage = `${nick}, analisei o ${fileType.toLowerCase()} "${file.originalname}" mas não encontrei valores monetários claros no texto.`;
        }

        // Try AI summary in background (fast, short, optional)
        try {
            const aiSummary = await callAI([
                { role: 'system', content: `Você é Friday, assistente do Natron. Resuma em 1 frase curta o conteúdo do documento. Fale com ${nick}. PT-BR.` },
                { role: 'user', content: `Resuma este texto de um ${fileType.toLowerCase()} em 1 frase:\n${extractedText.substring(0, 800)}` }
            ], { timeout: 30000, num_predict: 100, num_ctx: 1024 });
            
            if (aiSummary && !aiSummary.toLowerCase().includes('não posso') && !aiSummary.toLowerCase().includes('desculpe')) {
                finalMessage += `\n\n**Resumo:**\n${aiSummary}`;
            }
        } catch (e) {
            // AI summary is optional, ignore errors
            console.log('AI summary skipped (timeout or error)');
        }

        if (fileActions.length > 0) {
            finalMessage += `\n\n**Registre automaticamente:**\n☑ ${fileActions.length} transação(ões) registrada(s) automaticamente.`;
        }

        await prisma.chatMessage.create({
            data: { role: 'assistant', content: finalMessage, userId }
        });

        res.json({ message: finalMessage, actions: fileActions });
    } catch (error) {
        console.error('File processing error:', error);
        res.status(500).json({ error: 'Erro ao processar o arquivo' });
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
