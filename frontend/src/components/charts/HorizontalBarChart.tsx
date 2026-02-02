import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DataItem {
    name: string;
    value: number;
    maxValue: number;
    color?: string;
}

interface HorizontalBarChartProps {
    data: DataItem[];
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data }) => {
    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-300 font-medium">{item.name}</span>
                        <div className="flex gap-2 text-gray-400">
                            <span>{item.value}x ano</span>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(item.value / item.maxValue) * 100}%`,
                                backgroundColor: item.color || '#ff3b30'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default HorizontalBarChart;
