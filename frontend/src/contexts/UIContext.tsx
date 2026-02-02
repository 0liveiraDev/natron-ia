import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
    isMobileMode: boolean;
    toggleMobileMode: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMobileMode, setIsMobileMode] = useState<boolean>(() => window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobileMode(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isMobileMode) {
            document.body.classList.add('force-mobile');
        } else {
            document.body.classList.remove('force-mobile');
        }
    }, [isMobileMode]);

    const toggleMobileMode = () => {
        // Manual toggle removed to respect automatic device detection
        console.log("Toggle disabled: the mode is now purely automatic.");
    };

    return (
        <UIContext.Provider value={{ isMobileMode, toggleMobileMode }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
