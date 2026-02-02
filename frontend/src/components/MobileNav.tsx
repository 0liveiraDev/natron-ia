import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, CheckSquare, Target, Wallet } from 'lucide-react';

const MobileNav: React.FC = () => {
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Início' },
        { path: '/atlas', icon: <Bot size={24} />, label: 'Friday' },
        { path: '/tasks', icon: <CheckSquare size={24} />, label: 'Tarefas' },
        { path: '/habits', icon: <Target size={24} />, label: 'Hábitos' },
        { path: '/finance', icon: <Wallet size={24} />, label: 'Finanças' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-20 glass-card border-t border-white/10 px-6 flex items-center justify-between z-50 md:hidden">
            {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500'}`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-white/10' : ''}`}>
                            {item.icon}
                        </div>
                    </Link>
                );
            })}
        </nav>
    );
};

export default MobileNav;
