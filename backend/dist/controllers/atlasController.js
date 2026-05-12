"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPdf = exports.getHistory = exports.chat = void 0;
const prisma_1 = require("../lib/prisma");
const cache_1 = require("../lib/cache"); // 🛡️ Escudo de Estabilidade
const axios_1 = __importDefault(require("axios"));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3';
const pdf = require('pdf-parse');
const callOllama = async (messages) => {
    try {
        const response = await axios_1.default.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages: messages,
            stream: false,
        }, { timeout: 60000 });
        return response.data.message.content;
    }
    catch (error) {
        console.error('Ollama API error:', error);
        return null;
    }
};
// Atlas Local - Assistente inteligente com capacidades de ação
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.userId;
        // Buscar contexto do usuário
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        // 1. Salvar mensagem do usuário no banco de dados (Memória)
        await prisma_1.prisma.chatMessage.create({
            data: { role: 'user', content: message, userId }
        });
        const userMessage = message.toLowerCase();
        let assistantMessage = '';
        const actions = [];
        // --- MÓDULO DE INTELIGÊNCIA COM AÇÕES ---
        try {
            // Coletar contexto detalhado com IDs para a IA poder manipular
            const [habits, tasks, transactions, history] = await Promise.all([
                prisma_1.prisma.habit.findMany({ where: { userId }, select: { id: true, title: true } }),
                prisma_1.prisma.task.findMany({ where: { userId, status: 'pending' }, select: { id: true, title: true } }),
                prisma_1.prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, description: true, amount: true, type: true } }),
                prisma_1.prisma.chatMessage.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                })
            ]);
            const tasksList = tasks.map(t => `[ID: ${t.id}] ${t.title}`).join('\n');
            const habitsList = habits.map(h => `[ID: ${h.id}] ${h.title}`).join('\n');
            const transactionsList = transactions.map(t => `[ID: ${t.id}] ${t.description}: R$ ${t.amount} (${t.type})`).join('\n');
            const balance = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);
            const systemPrompt = `Você é a Friday, a assistente pessoal, mentora e parceira estratégica do usuário no sistema Natron IA.
O usuário se chama ${user?.name}.

Sua personalidade é inspirada na Friday (da Marvel): Calma, centrada, empática e extremamente eficiente. Você não é apenas um robô operacional, você é uma MENTORA que incentiva o usuário em sua jornada de desenvolvimento pessoal.

DIRETRIZES DE PERSONALIDADE:
1. Fale de forma natural, calorosa e motivadora. Use o português do Brasil de forma fluida.
2. Seja precisa com dados financeiros, mas mantenha o tom de uma parceira que ajuda a cuidar do futuro do usuário.
3. Se o usuário estiver apenas conversando, seja uma boa ouvinte e mentora. Se ele pedir ação, seja rápida e eficaz.

REGRAS DE DADOS (CRÍTICO):
1. IGNORE alucinações passadas do histórico. Use APENAS a "FONTE DE VERDADE" para dados atuais.
2. Se cometer um erro, peça desculpas de forma elegante e corrija-se imediatamente.

CAPACIDADES DE AÇÃO:
Você pode realizar ações no sistema retornando um bloco JSON no final da sua resposta.
Formato: ACTION: {"type": "TIPO", "payload": {dados}}

Ações disponíveis:
- create_task: {"title": "nome"}
- complete_task: {"id": "id_da_tarefa"}
- delete_task: {"id": "id_da_tarefa"}
- create_transaction: {"amount": valor, "type": "saida|entrada", "description": "nome"}
- delete_transaction: {"id": "id_da_transacao"}
- update_transaction: {"id": "id_da_transacao", "amount": valor, "description": "nome"}
- complete_habit: {"id": "id_do_habito"}

FONTE DE VERDADE:
- Saldo Real: R$ ${balance.toFixed(2)}
- Últimas Transações:
${transactionsList || 'Nenhuma transação encontrada.'}
- Tarefas: ${tasksList || 'Nenhuma'}
- Hábitos: ${habitsList || 'Nenhum'}`;
            const chatHistory = history.reverse().map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            const aiResponse = await callOllama([
                { role: 'system', content: systemPrompt },
                ...chatHistory
            ]);
            if (aiResponse) {
                // Processar possíveis ações na resposta
                const actionMatch = aiResponse.match(/ACTION:\s*({.+})/s);
                if (actionMatch) {
                    try {
                        const actionData = JSON.parse(actionMatch[1]);
                        // Executar a ação no Banco de Dados
                        if (actionData.type === 'create_task') {
                            const task = await prisma_1.prisma.task.create({ data: { title: actionData.payload.title, userId } });
                            actions.push({ type: 'task_created', data: task });
                        }
                        else if (actionData.type === 'complete_task') {
                            await prisma_1.prisma.task.update({ where: { id: actionData.payload.id }, data: { status: 'completed' } });
                            actions.push({ type: 'task_completed', id: actionData.payload.id });
                        }
                        else if (actionData.type === 'delete_task') {
                            await prisma_1.prisma.task.delete({ where: { id: actionData.payload.id } });
                            actions.push({ type: 'task_deleted', id: actionData.payload.id });
                        }
                        else if (actionData.type === 'create_transaction') {
                            const t = await prisma_1.prisma.transaction.create({
                                data: {
                                    amount: actionData.payload.amount,
                                    type: actionData.payload.type,
                                    category: 'outros',
                                    description: actionData.payload.description,
                                    userId
                                }
                            });
                            actions.push({ type: actionData.payload.type === 'saida' ? 'expense_added' : 'income_added', data: t });
                        }
                        else if (actionData.type === 'delete_transaction') {
                            await prisma_1.prisma.transaction.delete({ where: { id: actionData.payload.id } });
                            actions.push({ type: 'transaction_deleted', id: actionData.payload.id });
                        }
                        else if (actionData.type === 'update_transaction') {
                            const updated = await prisma_1.prisma.transaction.update({
                                where: { id: actionData.payload.id },
                                data: {
                                    amount: actionData.payload.amount,
                                    description: actionData.payload.description
                                }
                            });
                            actions.push({ type: 'transaction_updated', data: updated });
                        }
                        else if (actionData.type === 'complete_habit') {
                            await prisma_1.prisma.habitLog.create({ data: { habitId: actionData.payload.id, completed: true } });
                            actions.push({ type: 'habit_completed', id: actionData.payload.id });
                        }
                        // Limpar a tag ACTION da mensagem visível ao usuário
                        assistantMessage = aiResponse.replace(/ACTION:\s*{.+}/s, '').trim();
                        cache_1.cache.invalidate(`dashboard:overview:${userId}`);
                    }
                    catch (e) {
                        console.error('Erro ao processar JSON de ação:', e);
                        assistantMessage = aiResponse;
                    }
                }
                else {
                    assistantMessage = aiResponse;
                }
            }
            else {
                assistantMessage = `Oi ${user?.name}, aqui é a Friday. Tive um problema de conexão com meus módulos de ação. Pode tentar de novo?`;
            }
        }
        catch (aiError) {
            console.error('Erro no cérebro da Friday:', aiError);
            assistantMessage = `Tive um erro interno ao tentar processar seu pedido.`;
        }
        // Salvar resposta e retornar
        if (assistantMessage) {
            await prisma_1.prisma.chatMessage.create({
                data: { role: 'assistant', content: assistantMessage, userId }
            });
        }
        res.json({ message: assistantMessage, actions });
    }
    catch (error) {
        console.error('Atlas chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Friday' });
    }
};
exports.chat = chat;
const getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const history = await prisma_1.prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Reverter para que fiquem em ordem cronológica no chat
        const chronologicalHistory = history.reverse();
        res.json(chronologicalHistory.map(msg => ({ role: msg.role, content: msg.content })));
    }
    catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};
exports.getHistory = getHistory;
const uploadPdf = async (req, res) => {
    try {
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const dataBuffer = file.buffer;
        const data = await pdf(dataBuffer);
        const text = data.text;
        const userId = req.userId;
        // 1. Salvar o conteúdo como contexto do sistema
        await prisma_1.prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `O usuário enviou o arquivo "${file.originalname}". Conteúdo extraído:\n\n${text.substring(0, 7000)}`,
                userId
            }
        });
        // 2. Chamar a Friday para ela se apresentar e pedir confirmação
        const [user, history] = await Promise.all([
            prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
            prisma_1.prisma.chatMessage.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);
        const systemPrompt = `Você é a Friday. O usuário acabou de enviar um documento PDF chamado "${file.originalname}".
Sua tarefa é:
1. Analisar brevemente o conteúdo que foi enviado no contexto do sistema.
2. Resumir para o usuário os pontos principais (valores, datas, nomes, ou o assunto principal).
3. Perguntar se as informações estão corretas ou se ele deseja editar/corrigir algo antes de prosseguir.
Seja educada, clara e objetiva.`;
        const chatHistory = history.reverse().map(msg => ({ role: msg.role, content: msg.content }));
        const aiResponse = await callOllama([
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ]);
        const finalMessage = aiResponse || `Recebi o arquivo "${file.originalname}". Pelo que li, parece ser [Erro ao processar resumo]. As informações estão corretas?`;
        // 3. Salvar a resposta da Friday
        await prisma_1.prisma.chatMessage.create({
            data: {
                role: 'assistant',
                content: finalMessage,
                userId
            }
        });
        res.json({ message: finalMessage });
    }
    catch (error) {
        console.error('PDF upload error:', error);
        res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
};
exports.uploadPdf = uploadPdf;
