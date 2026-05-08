"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = void 0;
const prisma_1 = require("../lib/prisma");
const activityService_1 = require("../services/activityService");
const xpService_1 = require("../services/xpService");
const cache_1 = require("../lib/cache"); // 🛡️ Escudo de Estabilidade
const axios_1 = __importDefault(require("axios"));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3';
const callOllama = async (prompt, systemPrompt) => {
    try {
        const response = await axios_1.default.post(`${OLLAMA_URL}/api/generate`, {
            model: MODEL_NAME,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
        }, { timeout: 30000 });
        return response.data.response;
    }
    catch (error) {
        console.error('Ollama API error:', error);
        return null;
    }
};
// Atlas Local - Assistente sem necessidade de API externa
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.userId;
        // Buscar contexto do usuário
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        });
        const userMessage = message.toLowerCase();
        const actions = [];
        let assistantMessage = '';
        // Padrões de comandos
        // 1. Criar Tarefa
        const taskPatterns = [
            /criar?\s+(?:uma\s+)?tarefa\s+(?:para\s+)?(.+)/i,
            /adicionar?\s+tarefa\s+(.+)/i,
            /nova\s+tarefa\s+(.+)/i,
            /tarefa:\s*(.+)/i,
        ];
        for (const pattern of taskPatterns) {
            const match = message.match(pattern);
            if (match) {
                const taskTitle = match[1].trim();
                const task = await prisma_1.prisma.task.create({
                    data: {
                        title: taskTitle,
                        userId,
                    },
                });
                await (0, activityService_1.logActivity)(userId, 'task_created', `Tarefa criada por Atlas: ${taskTitle}`);
                cache_1.cache.invalidate(`dashboard:overview:${userId}`);
                cache_1.cache.invalidate(`dashboard:weekly:${userId}`);
                cache_1.cache.invalidate(`dashboard:monthly:${userId}`);
                actions.push({ type: 'task_created', data: task });
                assistantMessage = `✅ Perfeito! Criei a tarefa "${taskTitle}" para você. Ela já está na sua lista de tarefas!`;
                break;
            }
        }
        // 2. Registrar Gasto
        if (!assistantMessage) {
            // Updated regex to handle "registro", "adicionar", "lançar" and more variations
            const expensePatterns = [
                /(?:registr(?:ar|e|o)|adicionar|inserir|lançar|novo)\s+(?:de\s+)?(?:um\s+)?gasto\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s+(?:reais?\s+)?(?:em|de|para|com|no|na)?\s*(.+)?/i,
                /gast(?:ei|ar|o)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s+(?:reais?\s+)?(?:em|com|de|no|na)?\s*(.+)?/i,
                /despesa\s+de\s+(\d+(?:[.,]\d+)?)\s+(?:em|de|com|no|na)?\s*(.+)?/i,
            ];
            for (const pattern of expensePatterns) {
                const match = message.match(pattern);
                if (match) {
                    const amount = parseFloat(match[1].replace(',', '.'));
                    const categoryInput = match[2]?.toLowerCase().trim() || 'outros';
                    // Mapear categoria expandido
                    const categoryMap = {
                        // Alimentação
                        'alimentacao': 'alimentacao',
                        'alimentação': 'alimentacao',
                        'comida': 'alimentacao',
                        'almoço': 'alimentacao',
                        'jantar': 'alimentacao',
                        'lanche': 'alimentacao',
                        'ifood': 'alimentacao',
                        'restaurante': 'alimentacao',
                        'delivery': 'alimentacao',
                        'mercado': 'alimentacao',
                        'supermercado': 'alimentacao',
                        'feira': 'alimentacao',
                        // ... (keep logic simple, relying on existing or fallback)
                    };
                    // Reusing the same map logic but abbreviated for replacement context
                    // Ideally we should keep the map, but it's large. 
                    // To avoid replacing the whole map, I will try to target specific lines if possible.
                    // But replace_file_content works best with blocks. 
                    // I will include the map logic here since I'm replacing the whole block.
                    const fullCategoryMap = {
                        // Alimentação
                        'alimentacao': 'alimentacao',
                        'alimentação': 'alimentacao',
                        'comida': 'alimentacao',
                        'almoço': 'alimentacao',
                        'jantar': 'alimentacao',
                        'lanche': 'alimentacao',
                        'ifood': 'alimentacao',
                        'restaurante': 'alimentacao',
                        'delivery': 'alimentacao',
                        'mercado': 'alimentacao',
                        'supermercado': 'alimentacao',
                        'feira': 'alimentacao',
                        // Assinaturas
                        'assinaturas': 'assinaturas',
                        'assinatura': 'assinaturas',
                        'netflix': 'assinaturas',
                        'spotify': 'assinaturas',
                        'amazon': 'assinaturas',
                        'prime': 'assinaturas',
                        'youtube': 'assinaturas',
                        'disney': 'assinaturas',
                        'hbo': 'assinaturas',
                        'academia': 'assinaturas',
                        // Lazer
                        'lazer': 'lazer',
                        'diversao': 'lazer',
                        'diversão': 'lazer',
                        'cinema': 'lazer',
                        'teatro': 'lazer',
                        'show': 'lazer',
                        'viagem': 'lazer',
                        'passeio': 'lazer',
                        // Transporte
                        'uber': 'transporte',
                        'taxi': 'transporte',
                        '99': 'transporte',
                        'transporte': 'transporte',
                        'combustivel': 'transporte',
                        'combustível': 'transporte',
                        'gasolina': 'transporte',
                        'onibus': 'transporte',
                        'ônibus': 'transporte',
                        'metro': 'transporte',
                        'metrô': 'transporte',
                        // Outros
                        'outros': 'outros',
                        'outro': 'outros',
                        'diversos': 'outros',
                    };
                    const category = fullCategoryMap[categoryInput] || (categoryInput in fullCategoryMap ? categoryInput : 'outros');
                    const description = categoryInput !== 'outros' ? categoryInput : undefined;
                    const transaction = await prisma_1.prisma.transaction.create({
                        data: {
                            amount,
                            type: 'saida',
                            category,
                            description,
                            userId,
                        },
                    });
                    await (0, activityService_1.logActivity)(userId, 'transaction_added', `Gasto registrado por Atlas: R$ ${amount}`);
                    cache_1.cache.invalidate(`dashboard:overview:${userId}`);
                    cache_1.cache.invalidate(`dashboard:weekly:${userId}`);
                    cache_1.cache.invalidate(`dashboard:finance-category:${userId}`);
                    cache_1.cache.invalidate(`dashboard:evolution:${userId}`);
                    actions.push({ type: 'expense_added', data: transaction });
                    assistantMessage = `💸 Registrado! Gasto de R$ ${amount.toFixed(2)} em ${categoryInput}. Fique de olho nas suas finanças!`;
                    break;
                }
            }
        }
        // 3. Registrar Entrada / Investimento
        if (!assistantMessage) {
            // Expandido para captar mais jargões cotidianos, entradas compostas e "investimentos"
            const incomePatterns = [
                /(?:registr(?:ar|e)|adicionar|inserir|lançar)\s+(?:um[a]?\s+)?(?:entrada|receita|pix)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:em|de|com)?\s*(.+)?/i,
                /recebi\s+(?:um[a]?\s+)?(?:entrada\s+|pix\s+|transferência\s+|transferencia\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:de|em|com)?\s*(.+)?/i,
                /ganhe?i\s+(?:um[a]?\s+)?(?:entrada\s+|pix\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:de|em|com)?\s*(.+)?/i,
                /renda\s+(?:extra\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:de|em|com)?\s*(.+)?/i,
                /invest(?:i|imento)\s+(?:um[a]?\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:em|no|na)?\s*(.+)?/i,
                /apliquei\s+(?:um[a]?\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais?\s+)?(?:em|no|na)?\s*(.+)?/i,
            ];
            for (const pattern of incomePatterns) {
                const match = message.match(pattern);
                if (match) {
                    const amount = parseFloat(match[1].replace(',', '.'));
                    let categoryContext = match[2]?.toLowerCase().trim();
                    const isInvestment = message.includes('investi') || message.includes('apliquei') || categoryContext?.includes('tesouro');
                    const category = isInvestment ? 'investimentos' : 'outros';
                    const description = (categoryContext && categoryContext !== 'reais') ? categoryContext : undefined;
                    const transaction = await prisma_1.prisma.transaction.create({
                        data: {
                            amount,
                            type: 'entrada',
                            category,
                            description,
                            userId,
                        },
                    });
                    cache_1.cache.invalidate(`dashboard:overview:${userId}`);
                    cache_1.cache.invalidate(`dashboard:weekly:${userId}`);
                    cache_1.cache.invalidate(`dashboard:finance-category:${userId}`);
                    cache_1.cache.invalidate(`dashboard:evolution:${userId}`);
                    if (isInvestment) {
                        await (0, activityService_1.logActivity)(userId, 'transaction_added', `Investimento registrado por Atlas: R$ ${amount}`);
                        await (0, xpService_1.addXp)(userId, 'FINANCEIRO', 5);
                        actions.push({ type: 'income_added', data: transaction });
                        assistantMessage = `📈 Excelente! Investimento de R$ ${amount.toFixed(2)} registrado com sucesso. Você ganhou +5 XP Financeiro!`;
                    }
                    else {
                        await (0, activityService_1.logActivity)(userId, 'transaction_added', `Entrada registrada por Atlas: R$ ${amount}`);
                        actions.push({ type: 'income_added', data: transaction });
                        assistantMessage = `💰 Ótimo! Entrada de R$ ${amount.toFixed(2)} registrada. Continue assim!`;
                    }
                    break;
                }
            }
        }
        // 4. Consultar Progresso
        if (!assistantMessage && (userMessage.includes('progresso') || userMessage.includes('como estou') || userMessage.includes('estatística'))) {
            const today = new Date();
            const month = today.getMonth() + 1;
            const year = today.getFullYear();
            const [habits, tasks, transactions] = await Promise.all([
                prisma_1.prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
                prisma_1.prisma.task.findMany({ where: { userId } }),
                prisma_1.prisma.transaction.findMany({ where: { userId } }),
            ]);
            const completedTasks = tasks.filter(t => t.status === 'completed').length;
            const totalTasks = tasks.length;
            const entradas = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
            const saidas = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
            const saldo = entradas - saidas;
            assistantMessage = `📊 Aqui está seu resumo, ${user?.name}:\n\n` +
                `✅ Tarefas: ${completedTasks}/${totalTasks} concluídas\n` +
                `🎯 Hábitos: ${habits.length} cadastrados\n` +
                `💰 Saldo: R$ ${saldo.toFixed(2)}\n\n` +
                `Continue assim! Você está indo muito bem! 🚀`;
        }
        // 5. Inteligência Artificial (O "Cérebro" do Natron)
        if (!assistantMessage) {
            try {
                // Coletar contexto detalhado para a IA
                const [habits, tasks, transactions] = await Promise.all([
                    prisma_1.prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
                    prisma_1.prisma.task.findMany({ where: { userId } }),
                    prisma_1.prisma.transaction.findMany({ where: { userId } }),
                ]);
                const pendingTasks = tasks.filter(t => t.status === 'pending').map(t => t.title).join(', ');
                const totalIncome = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
                const totalExpense = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
                const balance = totalIncome - totalExpense;
                const systemPrompt = `Você é a Friday, a assistente inteligente e cérebro do sistema Natron IA.
O usuário se chama ${user?.name}. Seu objetivo é ser uma mentora de produtividade e finanças.

Personalidade:
- Você é uma pessoa centrada, calma e focada.
- Você demonstra empatia, entendendo os desafios do usuário, mas sempre incentivando o progresso.
- Suas respostas são equilibradas, sensatas e acolhedoras.

Contexto atual do usuário:
- Nome: ${user?.name}
- Tarefas Pendentes: ${pendingTasks || 'Nenhuma tarefa pendente'}
- Saldo Atual: R$ ${balance.toFixed(2)} (Entradas: R$ ${totalIncome.toFixed(2)}, Saídas: R$ ${totalExpense.toFixed(2)})
- Hábitos: ${habits.length} hábitos sendo monitorados.

Diretrizes:
1. Use uma linguagem natural brasileira, centrada e empática.
2. Se o usuário quiser criar uma tarefa ou registro e o sistema de comandos rápidos falhou, você deve orientá-lo com calma.
3. Use o contexto acima para dar conselhos sensatos. Se ele estiver gastando muito, ofereça um conselho empático mas realista sobre economia.
4. Responda de forma concisa mas útil.`;
                const aiResponse = await callOllama(message, systemPrompt);
                if (aiResponse) {
                    assistantMessage = aiResponse;
                }
                else {
                    // Fallback caso a IA falhe
                    assistantMessage = `Olá ${user?.name}! Aqui é a Friday. Estou com uma pequena instabilidade momentânea no meu sistema, mas continuo aqui com você. Posso ajudar com comandos básicos como "Criar tarefa" ou "Registrar gasto" por enquanto?`;
                }
            }
            catch (aiError) {
                console.error('Erro ao chamar cérebro IA:', aiError);
                assistantMessage = `Oi, ${user?.name}. Aqui é a Friday. Tive um probleminha técnico, mas estou focada em resolver. Pode repetir o que você disse?`;
            }
        }
        res.json({
            message: assistantMessage,
            actions,
        });
    }
    catch (error) {
        console.error('Atlas chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Atlas' });
    }
};
exports.chat = chat;
