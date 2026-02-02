import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { Bot } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const Atlas: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Olá! Eu sou a Friday, sua assistente pessoal. Como posso ajudar você hoje? 🤖',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [pendingReceipt, setPendingReceipt] = useState<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { showToast, ToastContainer } = useToast();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const confirmReceipt = async (receiptData: any) => {
        try {
            setLoading(true);
            await api.post('/finance/confirm-receipt', {
                amount: receiptData.amount || 0,
                date: receiptData.date,
                category: receiptData.category || 'outros',
                description: receiptData.description || receiptData.establishment || 'Gasto',
            });

            showToast('✅ Gasto registrado com sucesso!', 'success');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: '✅ Gasto registrado com sucesso! Você pode ver na página de Financeiro.' },
            ]);
            setPendingReceipt(null);
        } catch (error) {
            showToast('Erro ao confirmar gasto', 'error');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Erro ao confirmar o gasto. Por favor, tente novamente.' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        setMessages((prev) => [...prev, { role: 'user', content: `📎 Enviando ${file.name}...` }]);

        try {
            const formData = new FormData();
            formData.append('receipt', file);

            const response = await api.post('/finance/upload-receipt', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const { extracted, message: ocrMessage } = response.data;

            let confirmationMessage = `✅ ${ocrMessage}\n\n`;

            // Se não detectou valor, pedir entrada manual
            if (!extracted.amount) {
                confirmationMessage = `⚠️ Nota fiscal processada, mas não consegui identificar o valor automaticamente.\n\n`;
                confirmationMessage += `Por favor, informe os dados manualmente:\n\n`;
                confirmationMessage += `Digite no formato:\n`;
                confirmationMessage += `valor: [valor em reais]\n`;
                confirmationMessage += `Exemplo: "valor: 19.13"\n\n`;

                if (extracted.establishment) {
                    confirmationMessage += `🏪 Estabelecimento detectado: ${extracted.establishment}\n`;
                }
                if (extracted.categoryType) {
                    const tipoLabel = extracted.categoryType === 'essencial' ? 'Gasto Essencial' : 'Gasto Variável';
                    confirmationMessage += `🏷️ Tipo: ${tipoLabel}\n`;
                }
                if (extracted.category) {
                    confirmationMessage += `📂 Categoria: ${extracted.category}\n`;
                }
                if (extracted.subcategory) {
                    confirmationMessage += `📌 Subcategoria: ${extracted.subcategory}\n`;
                }
            } else {
                // Valor detectado - mostrar todos os dados
                confirmationMessage += `💰 Valor: R$ ${extracted.amount.toFixed(2)}\n`;
                if (extracted.establishment) {
                    confirmationMessage += `🏪 Estabelecimento: ${extracted.establishment}\n`;
                }
                if (extracted.date) {
                    confirmationMessage += `📅 Data: ${new Date(extracted.date).toLocaleDateString('pt-BR')}\n`;
                }
                if (extracted.categoryType) {
                    const tipoLabel = extracted.categoryType === 'essencial' ? 'Gasto Essencial' : 'Gasto Variável';
                    confirmationMessage += `🏷️ Tipo: ${tipoLabel}\n`;
                }
                if (extracted.category) {
                    confirmationMessage += `📂 Categoria: ${extracted.category}\n`;
                }
                if (extracted.subcategory) {
                    confirmationMessage += `📌 Subcategoria: ${extracted.subcategory}\n`;
                }
                confirmationMessage += `\n✅ Digite "sim" ou "confirmar" para registrar este gasto.`;
            }

            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: confirmationMessage },
            ]);

            // Salvar dados para confirmação posterior
            setPendingReceipt(extracted);

        } catch (error) {
            console.error('Upload error:', error);
            showToast('Erro ao processar nota fiscal', 'error');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar a nota fiscal. Por favor, tente novamente.' },
            ]);
        } finally {
            setUploadingFile(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        const userMessageLower = userMessage.toLowerCase();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            // Verificar se usuário está informando valor manualmente para nota fiscal pendente
            if (pendingReceipt && !pendingReceipt.amount) {
                const valorMatch = userMessage.match(/valor[:\s]+(\d+[.,]?\d*)/i);
                if (valorMatch) {
                    const valor = parseFloat(valorMatch[1].replace(',', '.'));
                    pendingReceipt.amount = valor;

                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: `✅ Valor atualizado: R$ ${valor.toFixed(2)}\n\nAgora digite "sim" ou "confirmar" para registrar o gasto.`
                        },
                    ]);
                    setLoading(false);
                    return;
                }
            }

            // Verificar se há nota fiscal pendente e usuário está confirmando
            if (pendingReceipt && (
                userMessageLower === 'sim' ||
                userMessageLower === 'confirmar' ||
                userMessageLower === 'ok' ||
                userMessageLower === 'confirma' ||
                userMessageLower === 'yes'
            )) {
                // Verificar se tem valor antes de confirmar
                if (!pendingReceipt.amount) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: '⚠️ Por favor, informe o valor primeiro.\nDigite: valor: [valor em reais]\nExemplo: "valor: 19.13"'
                        },
                    ]);
                    setLoading(false);
                    return;
                }

                await confirmReceipt(pendingReceipt);
                setLoading(false);
                return;
            }

            // Verificar se usuário está cancelando
            if (pendingReceipt && (
                userMessageLower === 'não' ||
                userMessageLower === 'nao' ||
                userMessageLower === 'cancelar' ||
                userMessageLower === 'no'
            )) {
                setPendingReceipt(null);
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: '❌ Registro cancelado. Posso ajudar com algo mais?' },
                ]);
                setLoading(false);
                return;
            }

            const response = await api.post('/atlas/chat', {
                message: userMessage,
                history: messages,
            });

            const { message: assistantMessage, actions } = response.data;

            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: assistantMessage },
            ]);

            // Mostrar notificações de ações executadas
            if (actions && actions.length > 0) {
                actions.forEach((action: any) => {
                    if (action.type === 'task_created') {
                        showToast('✅ Tarefa criada com sucesso!', 'success');
                    } else if (action.type === 'expense_added') {
                        showToast('💸 Gasto registrado com sucesso!', 'success');
                    } else if (action.type === 'income_added') {
                        showToast('💰 Entrada registrada com sucesso!', 'success');
                    }
                });
            }
        } catch (error) {
            showToast('Erro ao conversar com Atlas', 'error');
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <ToastContainer />

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                    Friday <Bot size={32} className="text-[#ff9500] animate-pulse" />
                </h1>
                <p className="text-gray-400 mt-1">Seu assistente pessoal inteligente</p>
            </div>

            {/* Chat Container */}
            <div className="flex-1 glass-card p-6 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4">
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] p-4 rounded-2xl ${message.role === 'user'
                                    ? 'bg-gradient-to-r from-neon-green to-neon-blue text-dark-900'
                                    : 'glass-card'
                                    }`}
                            >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </motion.div>
                    ))}

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="glass-card p-4 rounded-2xl">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-neon-green rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-neon-green rounded-full animate-bounce delay-100" />
                                    <div className="w-2 h-2 bg-neon-green rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 input-field"
                        disabled={loading}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`btn-secondary px-4 cursor-pointer flex items-center justify-center ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Enviar nota fiscal em PDF"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                            />
                        </svg>
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        disabled={loading || uploadingFile}
                        onChange={handleFileUpload}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="btn-neon px-8"
                    >
                        Enviar
                    </button>
                </form>

                {/* Confirmation Buttons for Pending Receipt */}
                {pendingReceipt && (
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={() => confirmReceipt(pendingReceipt)}
                            disabled={loading}
                            className="flex-1 btn-neon py-3"
                        >
                            ✅ Confirmar Registro
                        </button>
                        <button
                            onClick={() => {
                                setPendingReceipt(null);
                                setMessages((prev) => [
                                    ...prev,
                                    { role: 'assistant', content: '❌ Registro cancelado. Posso ajudar com algo mais?' },
                                ]);
                            }}
                            disabled={loading}
                            className="flex-1 btn-secondary py-3"
                        >
                            ❌ Cancelar
                        </button>
                    </div>
                )}

                {/* Suggestions */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <button
                        onClick={() => setInput('Registre gasto de 50 reais em alimentação')}
                        className="text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all"
                        disabled={loading}
                    >
                        💸 Registrar gasto
                    </button>
                    <button
                        onClick={() => setInput('Crie uma tarefa para estudar React')}
                        className="text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all"
                        disabled={loading}
                    >
                        ✅ Criar tarefa
                    </button>
                    <button
                        onClick={() => setInput('Como está meu progresso hoje?')}
                        className="text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all"
                        disabled={loading}
                    >
                        📊 Ver progresso
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Atlas;
