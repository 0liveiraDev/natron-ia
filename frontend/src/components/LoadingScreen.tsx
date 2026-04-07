import React from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
    message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Sincronizando com a Rede..." }) => {
    return (
        <div className="fixed inset-0 bg-[#0a0a0a] z-[9999] flex flex-col items-center justify-center p-6">
            {/* Background Mesh/Grid Effect */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            <div className="relative">
                {/* Outer Glow Ring */}
                <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -inset-8 bg-neon-green/10 rounded-full blur-3xl"
                />

                {/* Animated Logo/Icon Placeholder */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-20 h-20 rounded-full border-t-2 border-b-2 border-neon-green relative z-10"
                />
                
                {/* Inner Pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                        animate={{ scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-3 h-3 bg-neon-green rounded-full shadow-[0_0_15px_rgba(0,255,136,0.8)]"
                    />
                </div>
            </div>

            {/* Tech Text */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-10 text-center space-y-2"
            >
                <h2 className="text-neon-green text-sm font-bold tracking-[0.2em] uppercase">{message}</h2>
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-neon-green/50 to-transparent mx-auto"></div>
                <p className="text-[#8e8e93] text-[10px] uppercase tracking-widest animate-pulse">Iniciando Protocolos NATRON</p>
            </motion.div>
        </div>
    );
};

export default LoadingScreen;
