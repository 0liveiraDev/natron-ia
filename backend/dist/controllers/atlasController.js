"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = void 0;
const client_1 = require("@prisma/client");
const activityService_1 = require("../services/activityService");
const xpService_1 = require("../services/xpService");
const prisma = new client_1.PrismaClient();
// Atlas Local - Assistente sem necessidade de API externa
const chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.userId;
        // Buscar contexto do usuário
        const user = await prisma.user.findUnique({
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
                const task = await prisma.task.create({
                    data: {
                        title: taskTitle,
                        userId,
                    },
                });
                await (0, activityService_1.logActivity)(userId, 'task_created', `Tarefa criada por Atlas: ${taskTitle}`);
                // Award XP for task creation via Atlas (optional, but good for consistency)
                // await addXp(userId, 'PRODUTIVIDADE', 2); 
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
                    const transaction = await prisma.transaction.create({
                        data: {
                            amount,
                            type: 'saida',
                            category,
                            description,
                            userId,
                        },
                    });
                    await (0, activityService_1.logActivity)(userId, 'transaction_added', `Gasto registrado por Atlas: R$ ${amount}`);
                    // No XP for expenses - only investment income awards XP
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
                    const transaction = await prisma.transaction.create({
                        data: {
                            amount,
                            type: 'entrada',
                            category,
                            description,
                            userId,
                        },
                    });
                    if (isInvestment) {
                        await (0, activityService_1.logActivity)(userId, 'transaction_added', `Investimento registrado por Atlas: R$ ${amount}`);
                        // Awward XP para investimento automaticamente
                        await (0, xpService_1.addXp)(userId, 'FINANCEIRA', 5);
                        actions.push({ type: 'income_added', data: transaction });
                        assistantMessage = `📈 Excelente! Investimento de R$ ${amount.toFixed(2)} registrado com sucesso. Você ganhou +5 XP Financeira!`;
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
                prisma.habit.findMany({ where: { userId }, include: { logs: true } }),
                prisma.task.findMany({ where: { userId } }),
                prisma.transaction.findMany({ where: { userId } }),
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
        // 5. Saudações e conversas gerais
        if (!assistantMessage) {
            if (userMessage.includes('olá') || userMessage.includes('oi') || userMessage.includes('hey')) {
                assistantMessage = `Olá, ${user?.name}! 👋 Como posso ajudar você hoje? Posso criar tarefas, registrar gastos ou mostrar seu progresso!`;
            }
            else if (userMessage.includes('obrigad')) {
                assistantMessage = `Por nada, ${user?.name}! Estou aqui sempre que precisar! 😊`;
            }
            else if (userMessage.includes('ajuda') || userMessage.includes('o que você faz')) {
                assistantMessage = `🤖 Eu sou o Atlas, seu assistente pessoal!\n\n` +
                    `Posso ajudar você com:\n` +
                    `✅ Criar tarefas: "Crie uma tarefa para estudar React"\n` +
                    `💸 Registrar gastos: "Registre gasto de 50 reais em alimentação"\n` +
                    `💰 Registrar entradas: "Registre entrada de 1000 reais"\n` +
                    `📊 Ver progresso: "Como está meu progresso?"\n\n` +
                    `Experimente me pedir algo!`;
            }
            else {
                assistantMessage = `Entendi! Posso ajudar você a:\n` +
                    `• Criar tarefas\n` +
                    `• Registrar gastos e entradas\n` +
                    `• Ver seu progresso\n\n` +
                    `O que você gostaria de fazer?`;
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
