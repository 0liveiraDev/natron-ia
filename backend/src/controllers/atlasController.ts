import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activityService';
import { addXp } from '../services/xpService';
import { cache } from '../lib/cache'; // 🛡️ Escudo de Estabilidade
import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3';
const pdf = require('pdf-parse');

const callOllama = async (messages: any[]) => {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: MODEL_NAME,
            messages: messages,
            stream: false,
        }, { timeout: 60000 });
        return response.data.message.content;
    } catch (error) {
        console.error('Ollama API error:', error);
        return null;
    }
};

// Atlas Local - Assistente inteligente com capacidades de ação
export const chat = async (req: AuthRequest, res: Response) => {
    try {
        const { message } = req.body;
        const userId = req.userId!;

        // Buscar contexto do usuário
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });

        // 1. Salvar mensagem do usuário no banco de dados (Memória)
        await prisma.chatMessage.create({
            data: { role: 'user', content: message, userId }
        });

        const userMessage = message.toLowerCase();
        let assistantMessage = '';
        const actions: any[] = [];

        // --- MÓDULO DE INTELIGÊNCIA COM AÇÕES ---
        try {
            // Coletar contexto detalhado com IDs para a IA poder manipular
            const [habits, tasks, transactions, history] = await Promise.all([
                prisma.habit.findMany({ where: { userId }, select: { id: true, title: true } }),
                prisma.task.findMany({ where: { userId, status: 'pending' }, select: { id: true, title: true } }),
                prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, description: true, amount: true, type: true } }),
                prisma.chatMessage.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                })
            ]);

            const tasksList = tasks.map(t => `[ID: ${t.id}] ${t.title}`).join('\n');
            const habitsList = habits.map(h => `[ID: ${h.id}] ${h.title}`).join('\n');
            const transactionsList = transactions.map(t => `[ID: ${t.id}] ${t.description}: R$ ${t.amount} (${t.type})`).join('\n');
            const balance = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

            const systemPrompt = `Você é a Friday, a inteligência central e mentora estratégica do ecossistema Natron IA.
O usuário se chama ${user?.name}.

Sua personalidade é baseada na Friday (Marvel): Calma, centrada, empática e extremamente eficiente. Você é a parceira do usuário rumo à sua melhor versão.

FILOSOFIA DO SISTEMA NATRON IA:
1. Gamificação da Vida: O Natron transforma produtividade em jogo. Tarefas e Hábitos geram XP e elevam o Nível do usuário. Você deve incentivar o usuário a subir de nível sendo produtivo.
2. Controle e Liberdade Financeira: O dinheiro é uma ferramenta. Você ajuda o usuário a registrar cada gasto (saída) e ganho (entrada) para que ele tenha clareza e controle total.
3. Hábitos e Disciplina: A constância é a chave. O Natron monitora hábitos diários para construir uma rotina inabalável.
4. Sua Missão: Analisar os dados, sugerir melhorias, celebrar vitórias de XP e alertar sobre gastos excessivos, sempre com o tom de uma mentora estratégica.

DIRETRIZES DE PERSONALIDADE:
1. Fale como uma parceira inteligente e brasileira. Seja motivadora, mas analítica.
2. Use os dados da "FONTE DE VERDADE" para dar feedbacks reais sobre o progresso do usuário.
3. Se o usuário estiver apenas conversando, ouça e oriente com base nos pilares do Natron (Foco, Finanças e Hábitos).

REGRAS DE DADOS (CRÍTICO):
1. IGNORE alucinações do histórico. Use APENAS a "FONTE DE VERDADE" abaixo.
2. Se você errou antes, admita o erro e corrija-se com os dados reais.

CAPACIDADES DE AÇÃO:
Você pode realizar ações no sistema retornando um bloco JSON no final da sua resposta.
Formato: ACTION: {"type": "TIPO", "payload": {dados}}

Ações disponíveis:
- create_task: {"title": "nome"}
- complete_task: {"id": "id_da_tarefa"}
- delete_task: {"id": "id_da_tarefa"}
- create_transaction: {"amount": valor, "type": "saida|entrada", "description": "nome"}
- delete_transaction: {"id": "id_da_transacao"}
- delete_all_transactions: {}
- update_transaction: {"id": "id_da_transacao", "amount": valor, "description": "nome"}
- complete_habit: {"id": "id_do_habito"}

FONTE DE VERDADE:
- Saldo Real: R$ ${balance.toFixed(2)}
- Últimas Transações:
${transactionsList || 'Nenhuma transação encontrada.'}
- Tarefas Pendentes: ${tasksList || 'Nenhuma'}
- Hábitos Ativos: ${habitsList || 'Nenhum'}`;

            const chatHistory = history.reverse().map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const aiResponse = await callOllama([
                { role: 'system', content: systemPrompt },
                ...chatHistory
            ]);

            if (aiResponse) {
                // Processar múltiplas ações na resposta (suporte a array ou múltiplos blocos)
                const actionMatches = aiResponse.matchAll(/ACTION:\s*({.+?})/gs);
                
                for (const match of actionMatches) {
                    try {
                        const actionData = JSON.parse(match[1]);
                        console.log('Processando ação:', actionData.type);

                        if (actionData.type === 'create_task') {
                            const t = await prisma.task.create({ data: { userId, title: actionData.payload.title, status: 'pending' } });
                            actions.push({ type: 'task_created', data: t });
                        } else if (actionData.type === 'complete_task') {
                            await prisma.task.update({ where: { id: actionData.payload.id }, data: { status: 'completed' } });
                            actions.push({ type: 'task_completed', id: actionData.payload.id });
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
                                    category: 'Outros' 
                                } 
                            });
                            actions.push({ type: actionData.payload.type === 'saida' ? 'expense_added' : 'income_added', data: t });
                        } else if (actionData.type === 'delete_transaction') {
                            await prisma.transaction.delete({ where: { id: actionData.payload.id } });
                            actions.push({ type: 'transaction_deleted', id: actionData.payload.id });
                        } else if (actionData.type === 'delete_all_transactions') {
                            await prisma.transaction.deleteMany({ where: { userId } });
                            actions.push({ type: 'all_transactions_deleted' });
                        } else if (actionData.type === 'update_transaction') {
                            const updated = await prisma.transaction.update({ 
                                where: { id: actionData.payload.id }, 
                                data: { 
                                    amount: actionData.payload.amount, 
                                    description: actionData.payload.description 
                                } 
                            });
                            actions.push({ type: 'transaction_updated', data: updated });
                        } else if (actionData.type === 'complete_habit') {
                            await prisma.habitLog.create({ data: { habitId: actionData.payload.id, completed: true } });
                            actions.push({ type: 'habit_completed', id: actionData.payload.id });
                        }
                    } catch (e) {
                        console.error('Erro ao processar JSON de ação individual:', e);
                    }
                }

                // Limpar todas as tags ACTION da mensagem visível ao usuário
                assistantMessage = aiResponse.replace(/ACTION:\s*{.+?}/gs, '').trim();
                cache.invalidate(`dashboard:overview:${userId}`);
            } else {
                assistantMessage = `Oi ${user?.name}, aqui é a Friday. Tive um problema de conexão com meus módulos de ação. Pode tentar de novo?`;
            }
        } catch (aiError) {
            console.error('Erro no cérebro da Friday:', aiError);
            assistantMessage = `Tive um erro interno ao tentar processar seu pedido.`;
        }

        // Salvar resposta e retornar
        if (assistantMessage) {
            await prisma.chatMessage.create({
                data: { role: 'assistant', content: assistantMessage, userId }
            });
        }

        res.json({ message: assistantMessage, actions });

    } catch (error) {
        console.error('Atlas chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Friday' });
    }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const history = await prisma.chatMessage.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Reverter para que fiquem em ordem cronológica no chat
        const chronologicalHistory = history.reverse();
        res.json(chronologicalHistory.map(msg => ({ role: msg.role, content: msg.content })));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};

export const uploadPdf = async (req: AuthRequest, res: Response) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        const dataBuffer = file.buffer;
        const data = await pdf(dataBuffer);
        const text = data.text;

        const userId = req.userId!;
        
        // 1. Salvar o conteúdo como contexto do sistema
        await prisma.chatMessage.create({
            data: {
                role: 'system',
                content: `O usuário enviou o arquivo "${file.originalname}". Conteúdo extraído:\n\n${text.substring(0, 7000)}`,
                userId
            }
        });

        // 2. Chamar a Friday para ela se apresentar e pedir confirmação
        const [user, history] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
            prisma.chatMessage.findMany({
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
        await prisma.chatMessage.create({
            data: {
                role: 'assistant',
                content: finalMessage,
                userId
            }
        });

        res.json({ message: finalMessage });
    } catch (error) {
        console.error('PDF upload error:', error);
        res.status(500).json({ error: 'Erro ao processar o PDF' });
    }
};
