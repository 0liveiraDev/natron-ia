import React from 'react';
import { motion } from 'framer-motion';

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pb-24 md:pb-10 w-full animate-pulse">
            {/* Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visual Geral Skeleton */}
                <div className="dashboard-card relative min-h-[400px] border border-white/5 bg-[#1a1a1a]/30">
                    <div className="absolute top-4 left-4 h-6 w-32 bg-white/10 rounded"></div>
                    <div className="absolute top-4 right-4 h-6 w-24 bg-white/10 rounded"></div>
                    
                    <div className="flex flex-col items-center justify-center h-full mt-8">
                        <div className="w-56 h-56 rounded-full bg-white/5"></div>
                        
                        {/* Bottom Stats Skeleton */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-12 mt-12 w-full px-2 sm:px-12">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                                    <div className="h-6 w-10 bg-white/10 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side - Charts Skeleton */}
                <div className="grid gap-6">
                    {/* Top Right */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="dashboard-card h-[160px] border border-white/5 bg-[#1a1a1a]/30 flex flex-col justify-between">
                            <div className="h-4 w-32 bg-white/10 rounded mb-4"></div>
                            <div className="flex-1 w-full bg-white/5 rounded"></div>
                        </div>
                        <div className="dashboard-card h-[160px] border border-white/5 bg-[#1a1a1a]/30 flex flex-col items-center justify-center">
                            <div className="absolute top-6 left-6 h-4 w-32 bg-white/10 rounded"></div>
                            <div className="w-16 h-16 rounded-full bg-white/5 mt-4"></div>
                            <div className="flex justify-between w-full px-4 mt-4">
                                <div className="h-4 w-10 bg-white/10 rounded"></div>
                                <div className="h-4 w-10 bg-white/10 rounded"></div>
                                <div className="h-4 w-10 bg-white/10 rounded"></div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right - List */}
                    <div className="dashboard-card min-h-[216px] border border-white/5 bg-[#1a1a1a]/30">
                        <div className="h-5 w-40 bg-white/10 rounded mb-6"></div>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-full h-8 bg-white/5 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row - Finance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="dashboard-card min-h-[250px] border border-white/5 bg-[#1a1a1a]/30">
                        <div className="flex justify-between items-center mb-4">
                            <div className="h-5 w-32 bg-white/10 rounded"></div>
                            <div className="h-4 w-4 bg-white/10 rounded-full"></div>
                        </div>
                        <div className="flex items-center justify-center mt-6">
                            <div className="w-32 h-32 rounded-full border-8 border-white/5 flex items-center justify-center">
                                <div className="h-4 w-16 bg-white/10 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PageSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 w-full animate-pulse max-w-6xl mx-auto p-4 md:p-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-12 w-12 rounded-xl bg-white/10"></div>
                <div>
                    <div className="h-8 w-48 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 w-64 bg-white/10 rounded"></div>
                </div>
            </div>
            <div className="glass-card min-h-[400px] border border-white/5 bg-[#1a1a1a]/30 rounded-2xl"></div>
        </div>
    );
};
