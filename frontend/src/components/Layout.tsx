import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

import { useUI } from '../contexts/UIContext';

const Layout: React.FC = () => {
    const { isMobileMode } = useUI();

    return (
        <div className={`flex h-screen overflow-hidden bg-background ${isMobileMode ? 'force-mobile' : ''}`}>
            {/* Sidebar only on Desktop, hide if mobile mode is forced */}
            <div className={`${isMobileMode ? 'hidden' : 'hidden md:block'}`}>
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-20 md:pb-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Navigation - show on mobile resolution OR if mobile mode is forced */}
                <div className={`${isMobileMode ? 'block' : 'md:hidden'}`}>
                    <MobileNav />
                </div>
            </div>
        </div>
    );
};

export default Layout;
