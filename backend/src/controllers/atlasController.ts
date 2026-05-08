import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logActivity } from '../services/activityService';
import { addXp } from '../services/xpService';
import { cache } from '../lib/cache'; // 🛡️ Escudo de Estabilidade
import axios from 'axios';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_NAME = process.env.MODEL_NAME || 'llama3';

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

// Atlas Local - Assistente sem necessidade de API externa
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
            data: {
                role: 'user',
                content: message,
                userId
            }
        });

        const userMessage = message.toLowerCase();
        const actions = [];
        let assistantMessage = '';

        // Padrões de comandos (Comandos Rápidos mantidos para agilidade)

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
                await logActivity(userId, 'task_created', `Tarefa criada por Atlas: ${taskTitle}`);
                cache.invalidate(`dashboard:overview:${userId}`);
                assistantMessage = `✅ Perfeito! Criei a tarefa "${taskTitle}" para você. Ela já está na sua lista!`;
                break;
            }
        }

        // 2. Registrar Gasto
        if (!assistantMessage) {
            const expensePatterns = [
                /(?:registr(?:ar|e|o)|adicionar|inserir|lançar|novo)\s+(?:de\s+)?(?:um\s+)?gasto\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s+(?:reais?\s+)?(?:em|de|para|com|no|na)?\s*(.+)?/i,
                /gast(?:ei|ar|o)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s+(?:reais?\s+)?(?:em|com|de|no|na)?\s*(.+)?/i,
            ];

            for (const pattern of expensePatterns) {
                const match = message.match(pattern);
                if (match) {
                    const amount = parseFloat(match[1].replace(',', '.'));
                    const categoryInput = match[2]?.toLowerCase().trim() || 'outros';

                    const transaction = await prisma.transaction.create({
                        data: {
                            amount,
                            type: 'saida',
                            category: 'outros',
                            description: categoryInput,
                            userId,
                        },
                    });

                    await logActivity(userId, 'transaction_added', `Gasto registrado por Atlas: R$ ${amount}`);
                    cache.invalidate(`dashboard:overview:${userId}`);

                    assistantMessage = `💸 Registrado! Gasto de R$ ${amount.toFixed(2)} em ${categoryInput}.`;
                    break;
                }
            }
        }

        // 4. Consultar Progresso
        if (!assistantMessage && (userMessage.includes('progresso') || userMessage.includes('como estou'))) {
            const [tasks, transactions] = await Promise.all([
                prisma.task.findMany({ where: { userId } }),
                prisma.transaction.findMany({ where: { userId } }),
            ]);

            const saldo = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

            assistantMessage = `📊 Resumo para ${user?.name}:\n✅ Tarefas: ${tasks.filter(t => t.status === 'completed').length}/${tasks.length}\n💰 Saldo: R$ ${saldo.toFixed(2)}`;
        }

        // 5. Inteligência Artificial (O "Cérebro" da Friday com Memória)
        if (!assistantMessage) {
            try {
                // Coletar contexto detalhado
                const [habits, tasks, transactions, history] = await Promise.all([
                    prisma.habit.findMany({ where: { userId } }),
                    prisma.task.findMany({ where: { userId, status: 'pending' } }),
                    prisma.transaction.findMany({ where: { userId } }),
                    prisma.chatMessage.findMany({
                        where: { userId },
                        orderBy: { createdAt: 'desc' },
                        take: 10 // Puxar as últimas 10 mensagens para memória de curto prazo
                    })
                ]);

                const pendingTasks = tasks.map(t => t.title).join(', ');
                const balance = transactions.reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

                const systemPrompt = `Você é a Friday, a assistente inteligente do sistema Natron IA.
O usuário se chama ${user?.name}.
Personalidade: Centrada, calma, focada e empática.
Contexto:
- Tarefas Pendentes: ${pendingTasks || 'Nenhuma'}
- Saldo Atual: R$ ${balance.toFixed(2)}
- Hábitos: ${habits.length} monitorados.

Diretrizes:
1. Responda em português do Brasil de forma natural e concisa.
2. Lembre-se do que foi conversado anteriormente (o histórico será fornecido).
3. Seja uma mentora, não apenas um robô.`;

                // Formatar histórico para o formato do Ollama /api/chat
                const chatHistory = history.reverse().map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                const messagesForAI = [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory
                ];

                const aiResponse = await callOllama(messagesForAI);
                
                if (aiResponse) {
                    assistantMessage = aiResponse;
                } else {
                    assistantMessage = `Olá ${user?.name}. Aqui é a Friday. Tive um pequeno soluço no meu processamento, mas estou aqui. Pode repetir?`;
                }
            } catch (aiError) {
                console.error('Erro ao chamar cérebro IA:', aiError);
                assistantMessage = `Oi ${user?.name}. Tive um problema técnico, mas estou focada em resolver.`;
            }
        }

        // 2. Salvar resposta da assistente no banco de dados (Memória)
        if (assistantMessage) {
            await prisma.chatMessage.create({
                data: {
                    role: 'assistant',
                    content: assistantMessage,
                    userId
                }
            });
        }

        res.json({
            message: assistantMessage,
            actions,
        });
    } catch (error) {
        console.error('Atlas chat error:', error);
        res.status(500).json({ error: 'Erro ao conversar com Friday' });
    }
};
