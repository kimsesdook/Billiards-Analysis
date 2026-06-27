import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { GameRecord } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StatsChartProps {
  records: GameRecord[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ records }) => {
  const data = records
    .slice()
    .reverse()
    .map((record) => ({
      date: format(new Date(record.date), 'MM/dd', { locale: ko }),
      average: record.average,
      highRun: record.highRun,
    }));

  if (records.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
        데이터가 충분하지 않습니다.
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
      <h3 className="text-zinc-400 text-sm font-medium mb-6 uppercase tracking-wider">에버리지 추이</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dx={-10}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#18181b', 
              border: '1px solid #27272a',
              borderRadius: '12px',
              color: '#fff'
            }}
            itemStyle={{ color: '#10b981' }}
          />
          <Area 
            type="monotone" 
            dataKey="average" 
            stroke="#10b981" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorAvg)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
