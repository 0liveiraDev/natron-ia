import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { Bot, Sparkles, Send, Clock, Brain, Zap } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    responseTime?: number; // in seconds
}

interface FridayPreferences {
    nickname: string | null;
    purpose: string | null;
    isOnboarded: boolean;
}

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const Friday: React.FC = () => {
    const { refreshUser } = useUser();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [pendingReceipt, setPendingReceipt] = useState<any>(null);
    const [thinkingElapsed, setThinkingElapsed] = useState(0);
    const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const thinkingStartRef = useRef<number>(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { showToast, ToastContainer } = useToast();

    // Timer for thinking elapsed time
    const startThinking = useCallback(() => {
        thinkingStartRef.current = Date.now();
        setThinkingElapsed(0);
        thinkingTimerRef.current = setInterval(() => {
            setThinkingElapsed(Math.floor((Date.now() - thinkingStartRef.current) / 100) / 10);
        }, 100);
    }, []);

    const stopThinking = useCallback((): number => {
        if (thinkingTimerRef.current) {
            clearInterval(thinkingTimerRef.current);
            thinkingTimerRef.current = null;
        }
        const elapsed = Math.round((Date.now() - thinkingStartRef.current) / 100) / 10;
        setThinkingElapsed(0);
        return elapsed;
    }, []);

    useEffect(() => {
        return () => {
            if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
        };
    }, []);

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingLoading, setOnboardingLoading] = useState(true);
    const [nickname, setNickname] = useState('');
    const [purpose, setPurpose] = useState('');
    const [selectedPurpose, setSelectedPurpose] = useState('');

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Check onboarding status
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const response = await api.get('/friday/preferences');
                const prefs: FridayPreferences = response.data;
                if (!prefs.isOnboarded) {
                    setShowOnboarding(true);
                } else {
                    setMessages([{
                        role: 'assistant',
                        content: `E aí, ${prefs.nickname}! 🤖 Sou a Friday, sua assistente. Como posso ajudar?`,
                        timestamp: formatTime(new Date()),
                    }]);
                }
            } catch {
                setMessages([{
                    role: 'assistant',
                    content: 'Olá! Eu sou a Friday, sua assistente pessoal. Como posso ajudar você hoje? 🤖',
                    timestamp: formatTime(new Date()),
                }]);
            } finally {
                setOnboardingLoading(false);
            }
        };
        checkOnboarding();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/friday/history');
            if (response.data && response.data.length > 0) {
                setMessages(response.data);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    useEffect(() => {
        if (!showOnboarding && !onboardingLoading) {
            fetchHistory();
        }
    }, [showOnboarding, onboardingLoading]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Save onboarding
    const handleOnboarding = async () => {
        if (!nickname.trim()) {
            showToast('Digite como quer ser chamado', 'error');
            return;
        }
        setOnboardingLoading(true);
        try {
            const finalPurpose = selectedPurpose === 'outro' ? purpose : selectedPurpose;
            await api.post('/friday/onboarding', {
                nickname: nickname.trim(),
                purpose: finalPurpose || 'Produtividade geral'
            });
            setShowOnboarding(false);
            setMessages([{
                role: 'assistant',
                content: `Prazer em te conhecer, ${nickname.trim()}! 🤖✨ Sou a Friday, sua assistente pessoal no Natron. Posso criar tarefas, registrar gastos, acompanhar seus hábitos e muito mais. É só pedir!`,
                timestamp: formatTime(new Date()),
            }]);
            showToast('Friday configurada com sucesso!', 'success');
        } catch {
            showToast('Erro ao salvar configurações', 'error');
        } finally {
            setOnboardingLoading(false);
        }
    };

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
                { role: 'assistant', content: '✅ Gasto registrado com sucesso! Você pode ver na página de Financeiro.', timestamp: formatTime(new Date()) },
            ]);
            setPendingReceipt(null);
        } catch {
            showToast('Erro ao confirmar gasto', 'error');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Erro ao confirmar o gasto. Tente novamente.', timestamp: formatTime(new Date()) },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const fileIcon = isImage ? '📷' : '📄';

        setUploadingFile(true);
        setMessages((prev) => [...prev, { role: 'user', content: `${fileIcon} Enviando ${file.name}...`, timestamp: formatTime(new Date()) }]);
        startThinking();

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/friday/upload-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const elapsed = stopThinking();
            setMessages((prev) => [...prev, { role: 'assistant', content: response.data.message, timestamp: formatTime(new Date()), responseTime: elapsed }]);

            if (response.data.actions && response.data.actions.length > 0) {
                response.data.actions.forEach((action: any) => {
                    switch (action.type) {
                        case 'expense_added': showToast('💸 Gasto registrado!', 'success'); break;
                        case 'income_added': showToast('💰 Entrada registrada!', 'success'); break;
                    }
                });
                await refreshUser();
            }
        } catch {
            stopThinking();
            showToast('Erro ao processar arquivo', 'error');
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao analisar o arquivo. Tente novamente.', timestamp: formatTime(new Date()) }]);
        } finally {
            setUploadingFile(false);
            e.target.value = '';
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        const userMessageLower = userMessage.toLowerCase();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: formatTime(new Date()) }]);
        setLoading(true);
        startThinking();

        try {
            // Verificar valor para nota fiscal pendente
            if (pendingReceipt && !pendingReceipt.amount) {
                const valorMatch = userMessage.match(/valor[:\s]+(\d+[.,]?\d*)/i);
                if (valorMatch) {
                    const valorStr = valorMatch[1].replace(/\./g, '').replace(',', '.');
                    const valor = parseFloat(valorStr);
                    pendingReceipt.amount = valor;
                    const elapsed = stopThinking();
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: `✅ Valor atualizado: R$ ${valor.toFixed(2)}\n\nDigite "sim" para confirmar.`, timestamp: formatTime(new Date()), responseTime: elapsed },
                    ]);
                    setLoading(false);
                    return;
                }
            }

            // Confirmar nota fiscal pendente
            if (pendingReceipt && ['sim', 'confirmar', 'ok', 'confirma', 'yes'].includes(userMessageLower)) {
                if (!pendingReceipt.amount) {
                    stopThinking();
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: '⚠️ Informe o valor primeiro.\nExemplo: "valor: 19.13"', timestamp: formatTime(new Date()) },
                    ]);
                    setLoading(false);
                    return;
                }
                await confirmReceipt(pendingReceipt);
                setLoading(false);
                return;
            }

            // Cancelar nota fiscal pendente
            if (pendingReceipt && ['não', 'nao', 'cancelar', 'no'].includes(userMessageLower)) {
                setPendingReceipt(null);
                stopThinking();
                setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Cancelado. Posso ajudar com algo mais?', timestamp: formatTime(new Date()) }]);
                setLoading(false);
                return;
            }

            const response = await api.post('/friday/chat', {
                message: userMessage,
                history: messages,
            });

            const elapsed = stopThinking();
            const { message: assistantMessage, actions } = response.data;
            setMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage, timestamp: formatTime(new Date()), responseTime: elapsed }]);

            if (actions && actions.length > 0) {
                actions.forEach((action: any) => {
                    switch (action.type) {
                        case 'task_created': showToast('✅ Tarefa criada!', 'success'); break;
                        case 'task_completed': showToast('🎯 Tarefa concluída!', 'success'); break;
                        case 'task_deleted': showToast('🗑️ Tarefa removida', 'success'); break;
                        case 'expense_added': showToast('💸 Gasto registrado!', 'success'); break;
                        case 'income_added': showToast('💰 Entrada registrada!', 'success'); break;
                        case 'transaction_updated': showToast('✏️ Transação atualizada!', 'success'); break;
                        case 'transaction_deleted': showToast('🗑️ Transação removida', 'success'); break;
                        case 'all_transactions_deleted': showToast('🗑️ Todas as transações removidas', 'success'); break;
                        case 'habit_created': showToast('🎯 Hábito criado!', 'success'); break;
                        case 'habit_updated': showToast('✏️ Hábito atualizado!', 'success'); break;
                        case 'habit_deleted': showToast('🗑️ Hábito removido', 'success'); break;
                        case 'habit_completed': showToast('🔥 Hábito completado!', 'success'); break;
                    }
                });

                await refreshUser();
            }
        } catch {
            stopThinking();
            showToast('Erro ao conversar com Friday', 'error');
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Desculpe, erro de conexão. Tente novamente.', timestamp: formatTime(new Date()) }]);
        } finally {
            setLoading(false);
        }
    };

    const purposeOptions = [
        { value: 'Produtividade e tarefas', icon: '✅', label: 'Produtividade' },
        { value: 'Controle financeiro', icon: '💰', label: 'Finanças' },
        { value: 'Estudos e aprendizado', icon: '📚', label: 'Estudos' },
        { value: 'Tudo junto', icon: '🚀', label: 'Tudo' },
    ];

    // Onboarding Modal
    if (showOnboarding && !onboardingLoading) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <ToastContainer />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full max-w-lg"
                >
                    <div className="glass-card p-8 border border-white/10 rounded-2xl relative overflow-hidden">
                        {/* Glow background */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#ff9500]/20 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00ff88]/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative z-10">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="inline-block"
                                >
                                    <Bot size={48} className="text-[#ff9500] mx-auto mb-4" />
                                </motion.div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                                    Olá! Eu sou a <span className="text-[#ff9500]">Friday</span>
                                </h1>
                                <p className="text-gray-400 text-sm">
                                    Vamos personalizar sua experiência antes de começar
                                </p>
                            </div>

                            {/* Nickname */}
                            <div className="mb-6">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Como posso te chamar?
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder='Ex: "Chefe", "Bruno", "Mestre"...'
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#ff9500] focus:ring-1 focus:ring-[#ff9500] transition-all placeholder:text-gray-600"
                                    autoFocus
                                />
                            </div>

                            {/* Purpose */}
                            <div className="mb-8">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                    Para que quer me usar?
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {purposeOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setSelectedPurpose(opt.value)}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                                selectedPurpose === opt.value
                                                    ? 'border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]'
                                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                            }`}
                                        >
                                            <span className="text-lg mr-2">{opt.icon}</span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPurpose('outro')}
                                    className={`w-full mt-2 p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                        selectedPurpose === 'outro'
                                            ? 'border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]'
                                            : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    ✏️ Outro (escrever)
                                </button>
                                {selectedPurpose === 'outro' && (
                                    <motion.input
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        type="text"
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        placeholder="Descreva como quer usar..."
                                        className="w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#ff9500] transition-all placeholder:text-gray-600"
                                    />
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleOnboarding}
                                disabled={!nickname.trim()}
                                className="w-full bg-gradient-to-r from-[#ff9500] to-[#ff6b00] hover:from-[#ff8000] hover:to-[#ff5500] text-black font-bold py-3.5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(255,149,0,0.4)] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Sparkles size={18} />
                                Começar com a Friday
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Loading state
    if (onboardingLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                    <Bot size={32} className="text-[#ff9500]" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <ToastContainer />

            <div className="mb-3 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                    Friday <Bot size={28} className="text-[#ff9500] animate-pulse" />
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Seu assistente pessoal inteligente</p>
            </div>

            {/* Chat Container */}
            <div className="flex-1 glass-card p-3 sm:p-6 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                    {messages.map((message, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-[#ff9500]/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                                    <Bot size={14} className="text-[#ff9500]" />
                                </div>
                            )}
                            <div className="flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]">
                                <div
                                    className={`p-3 sm:p-4 rounded-2xl ${message.role === 'user'
                                        ? 'bg-gradient-to-r from-neon-green to-neon-blue text-dark-900 font-medium'
                                        : 'glass-card border border-white/5'
                                        }`}
                                >
                                    <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                </div>
                                {/* Timestamp + response time */}
                                <div className={`flex items-center gap-2 px-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {message.timestamp && (
                                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Clock size={9} className="opacity-60" />
                                            {message.timestamp}
                                        </span>
                                    )}
                                    {message.role === 'assistant' && message.responseTime !== undefined && (
                                        <span className="text-[10px] text-[#ff9500]/60 flex items-center gap-1">
                                            <Zap size={9} />
                                            {message.responseTime}s
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Thinking indicator */}
                    <AnimatePresence>
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex justify-start"
                            >
                                <div className="w-7 h-7 rounded-full bg-[#ff9500]/20 flex items-center justify-center mr-2 mt-1 shrink-0">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Brain size={14} className="text-[#ff9500]" />
                                    </motion.div>
                                </div>
                                <div className="glass-card p-4 rounded-2xl border border-[#ff9500]/10">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1.5">
                                            <motion.div
                                                className="w-2 h-2 bg-[#ff9500] rounded-full"
                                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                                            />
                                            <motion.div
                                                className="w-2 h-2 bg-[#ff9500] rounded-full"
                                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                                            />
                                            <motion.div
                                                className="w-2 h-2 bg-[#ff9500] rounded-full"
                                                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            Friday está pensando...
                                        </span>
                                        <span className="text-[10px] text-[#ff9500]/50 font-mono tabular-nums min-w-[40px] text-right">
                                            {thinkingElapsed.toFixed(1)}s
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="space-y-4 border-t border-white/5 pt-4">
                    {/* Suggestions */}
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        <button
                            onClick={() => setInput('Registre gasto de 50 reais em alimentação')}
                            className="text-[10px] sm:text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all whitespace-nowrap"
                            disabled={loading}
                        >
                            💸 Registrar gasto
                        </button>
                        <button
                            onClick={() => setInput('Como estão minhas finanças nos últimos 3 meses?')}
                            className="text-[10px] sm:text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all whitespace-nowrap"
                            disabled={loading}
                        >
                            📊 Balanço financeiro
                        </button>
                        <button
                            onClick={() => setInput('Crie uma tarefa para estudar React')}
                            className="text-[10px] sm:text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all whitespace-nowrap"
                            disabled={loading}
                        >
                            ✅ Criar tarefa
                        </button>
                        <button
                            onClick={() => setInput('Crie um hábito de meditar todo dia')}
                            className="text-[10px] sm:text-xs px-3 py-2 glass-card rounded-lg hover:bg-dark-700/60 transition-all whitespace-nowrap"
                            disabled={loading}
                        >
                            🎯 Criar hábito
                        </button>
                    </div>

                    <form onSubmit={handleSend} className="flex gap-2 sm:gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pergunte à Friday..."
                            className="flex-1 input-field py-2.5 sm:py-2 text-sm"
                            disabled={loading}
                        />
                        <div className="flex gap-2">
                            <label
                                htmlFor="file-upload"
                                className={`btn-secondary p-2.5 sm:px-4 cursor-pointer flex items-center justify-center ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Enviar PDF ou imagem"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={loading || uploadingFile}
                                onChange={handleFileUpload}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="btn-neon px-4 sm:px-8 group"
                            >
                                <span className="hidden sm:inline">Enviar</span>
                                <span className="sm:hidden">
                                    <Send size={18} />
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Confirmation Buttons for Pending Receipt */}
                    {pendingReceipt && (
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => confirmReceipt(pendingReceipt)}
                                disabled={loading}
                                className="flex-1 btn-neon py-2.5 text-xs font-bold"
                            >
                                ✅ Confirmar
                            </button>
                            <button
                                onClick={() => {
                                    setPendingReceipt(null);
                                    setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Registro cancelado.', timestamp: formatTime(new Date()) }]);
                                }}
                                disabled={loading}
                                className="flex-1 btn-secondary py-2.5 text-xs font-bold"
                            >
                                ❌ Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Friday;
