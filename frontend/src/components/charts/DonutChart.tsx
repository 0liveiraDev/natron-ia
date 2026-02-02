import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DataItem {
    name: string;
    value: number;
    color: string;
    percentage: number;
}

interface DonutChartProps {
    data: DataItem[];
    centerText?: string;
    centerValue?: string;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, centerText, centerValue }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="relative w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a1a24',
                                border: '1px solid #24243a',
                                borderRadius: '8px'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {(centerText || centerValue) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {centerValue && <span className="text-sm font-bold text-white">{centerValue}</span>}
                        {centerText && <span className="text-xs text-gray-500">{centerText}</span>}
                    </div>
                )}
            </div>

            <div className="flex-1 ml-4 space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-400 capitalize">{item.name}</span>
                        </div>
                        <span className="font-bold">R$ {item.value.toFixed(2)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DonutChart;
