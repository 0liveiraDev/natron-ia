import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

const Header: React.FC = () => {
    const navigate = useNavigate();

    const currentDate = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="glass-card border-b border-dark-600 px-8 py-4 flex items-center justify-between"
        >
            <div>
                <h2 className="text-xl font-semibold capitalize">{currentDate}</h2>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/atlas')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium"
                >
                    <Bot size={16} className="text-[#ff9500]" />
                    Falar com a Friday
                </button>
            </div>
        </motion.header>
    );
};

export default Header;
