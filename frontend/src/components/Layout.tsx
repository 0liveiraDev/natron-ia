import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

const Layout: React.FC = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar only on Desktop */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-20 md:pb-8">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Navigation */}
                <MobileNav />
            </div>
        </div>
    );
};

export default Layout;
