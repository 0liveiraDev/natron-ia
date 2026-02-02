import React, { createContext, useContext, useState, useEffect } from 'react';

interface UIContextType {
    isMobileMode: boolean;
    toggleMobileMode: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMobileMode, setIsMobileMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('mobileMode');
        return saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('mobileMode', String(isMobileMode));

        // When mobile mode is forced, we might want to add a class to body
        if (isMobileMode) {
            document.body.classList.add('force-mobile');
        } else {
            document.body.classList.remove('force-mobile');
        }
    }, [isMobileMode]);

    const toggleMobileMode = () => {
        setIsMobileMode(prev => !prev);
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
