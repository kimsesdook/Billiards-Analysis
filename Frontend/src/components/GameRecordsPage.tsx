import React, { useState, useMemo } from 'react';
import { History, Search, ChevronRight, Users, X, Activity, Zap, Target, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { GameRecord } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const COLORS = ['#10b981', '#1a5d4e', '#34d399', '#059669', '#6366f1'];

function calculatePattern(scores: number[]) {
  if (!scores || scores.length < 4) return { label: '데이터 부족', color: 'text-emerald-500/40', bg: 'bg-[#1a5d4e]/10', icon: '❓' };
  
  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const secondHalf = scores.slice(mid);
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  const threshold = 0.2;

  if (Math.abs(diff) < threshold) {
    return { label: '균일한 흐름', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: '🎯' };
  } else if (diff > threshold) {
    return { label: '후반 집중형', color: 'text-rose-400', bg: 'bg-rose-400/10', icon: '🔥' };
  } else {
    return { label: '초반 주도형', color: 'text-amber-400', bg: 'bg-amber-400/10', icon: '⚡' };
  }
}

interface GameRecordsPageProps {
  records: GameRecord[];
}

export function GameRecordsPage({ records }: GameRecordsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'Individual' | 'Team'>('all');
  const [playerFilter, setPlayerFilter] = useState<'all' | 2 | 3 | 4>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<'all' | '3-Cushion' | '4-Ball'>('all');
  const [selectedRecord, setSelectedRecord] = useState<GameRecord | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = searchQuery === '' || 
        (record.notes?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.opponentName?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesMode = modeFilter === 'all' || record.mode === modeFilter;
      const matchesPlayer = modeFilter === 'Team' ? true : (playerFilter === 'all' || record.playerCount === playerFilter);
      const matchesType = gameTypeFilter === 'all' || record.type === gameTypeFilter;
      
      return matchesSearch && matchesMode && matchesPlayer && matchesType;
    });
  }, [records, searchQuery, modeFilter, playerFilter, gameTypeFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-emerald-50 tracking-tight">경기 기록</h1>
            <p className="text-emerald-100/60 mt-2 font-medium">과거의 모든 경기 데이터를 한눈에 확인하세요.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Search Bar - Moved to Top and Wider */}
          <div className="relative group w-full">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="닉네임 검색"
              className="bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl pl-6 pr-12 py-4 text-sm text-emerald-50 focus:outline-none focus:border-emerald-500 transition-all w-full shadow-lg"
            />
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/30 group-focus-within:text-emerald-400 transition-colors" size={20} />
          </div>

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Game Mode Filter */}
            <div className="flex bg-[#0d4d3b] p-1.5 rounded-2xl border border-[#1a5d4e] shrink-0">
              {(['all', 'Individual', 'Team'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModeFilter(m);
                    if (m === 'Team') setPlayerFilter('all');
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    modeFilter === m 
                      ? "bg-emerald-500 text-[#0a3d2e] shadow-lg" 
                      : "text-emerald-100/40 hover:text-emerald-100"
                  )}
                >
                  {m === 'all' ? '전체' : m === 'Individual' ? '개인전' : '팀전'}
                </button>
              ))}
            </div>

            {/* Game Type Filter */}
            <div className="flex bg-[#0d4d3b] p-1.5 rounded-2xl border border-[#1a5d4e] shrink-0">
              {(['all', '3-Cushion', '4-Ball'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setGameTypeFilter(t)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    gameTypeFilter === t 
                      ? "bg-[#1a5d4e] text-emerald-400 border border-[#2d8a75] shadow-inner" 
                      : "text-emerald-100/40 hover:text-emerald-100"
                  )}
                >
                  {t === 'all' ? '전체' : t === '3-Cushion' ? '3구' : '4구'}
                </button>
              ))}
            </div>
          </div>

          {/* Player Count Filter - Dedicated Row Below */}
          {modeFilter !== 'Team' && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex bg-[#0d4d3b] p-1.5 rounded-2xl border border-[#1a5d4e] shrink-0"
            >
              {([ 'all', 2, 3, 4 ] as const).map((num) => (
                <button
                  key={num}
                  onClick={() => setPlayerFilter(num)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    playerFilter === num 
                      ? "bg-emerald-500 text-[#0a3d2e] shadow-lg" 
                      : "text-emerald-100/40 hover:text-emerald-100"
                  )}
                >
                  {num === 'all' ? '전체 인원' : `${num}인전`}
                </button>
              ))}
            </motion.div>
          )}
        </div>
        </div>
      </div>

      <div className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] overflow-hidden shadow-2xl shadow-black/20">
        <div className="p-8 border-b border-[#1a5d4e] flex items-center justify-between bg-[#1a5d4e]/10">
          <h2 className="text-xl font-bold text-emerald-50 flex items-center gap-2">
            <History size={20} className="text-emerald-400" />
            {playerFilter === 'all' ? '전체' : `${playerFilter}인전`} 경기 내역
          </h2>
          <span className="text-xs font-bold text-emerald-500/50 uppercase tracking-widest">
            Total {filteredRecords.length} Games
          </span>
        </div>

        <div className="divide-y divide-[#1a5d4e]">
          {filteredRecords.map((record) => (
            <div 
              key={record.id} 
              onClick={() => setSelectedRecord(record)}
              className="p-6 hover:bg-[#1a5d4e]/20 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg",
                    record.win 
                      ? "bg-emerald-500 text-[#0a3d2e] shadow-emerald-500/20" 
                      : "bg-[#1a5d4e] text-emerald-100/40"
                  )}>
                    {record.win ? 'W' : 'L'}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-emerald-500/50 uppercase tracking-wider">
                        {record.type === '3-Cushion' ? '3구' : '4구'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#1a5d4e]" />
                      <span className="text-xs font-medium text-emerald-100/40">
                        {format(new Date(record.date), 'yyyy년 MM월 dd일', { locale: ko })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-emerald-50 group-hover:text-emerald-400 transition-colors">
                      {record.opponentName ? `${record.opponentName}님과의 경기` : (
                        record.mode === 'Team' 
                          ? '팀전 (2:2)' 
                          : (record.playerCount === 2 ? '1:1 개인전' : `${record.playerCount}인 개인전`)
                      )}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="text-right flex flex-col items-end justify-center">
                    <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider mb-1">
                      {record.type === '4-Ball' ? 'Score (알다마)' : 'Score'}
                    </p>
                    <p className="text-xl font-black text-emerald-50 leading-none">
                      {record.myScore} <span className="text-emerald-500/30 mx-0.5">:</span> {record.opponentScore}
                    </p>
                    {record.type === '4-Ball' && record.lastThreeCushions ? (
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded mt-1">
                        3쿠션 {record.myCushionScore ?? 0} : {record.opponentCushionScore ?? 0}
                      </span>
                    ) : null}
                  </div>
                  
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider mb-1">Average</p>
                    <p className="text-lg font-bold text-emerald-100/60">
                      {record.average.toFixed(3)}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-[#1a5d4e]/30 text-emerald-100/20 group-hover:text-emerald-400 group-hover:bg-emerald-400/10 transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredRecords.length === 0 && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-[#1a5d4e]/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <History size={32} className="text-emerald-500/20" />
              </div>
              <h3 className="text-xl font-bold text-emerald-50 mb-2">기록된 경기가 없습니다</h3>
              <p className="text-emerald-100/30 font-medium">검색어나 필터를 변경해보세요.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a3d2e] w-full max-w-4xl h-[90vh] rounded-[3rem] border border-[#1a5d4e] shadow-2xl overflow-hidden flex flex-col relative z-50"
            >
              <div className="p-8 border-b border-[#1a5d4e] flex items-center justify-between bg-[#0d4d3b]/50">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black",
                    selectedRecord.win ? "bg-emerald-500 text-[#0a3d2e]" : "bg-[#1a5d4e] text-emerald-100/40"
                  )}>
                    {selectedRecord.win ? 'W' : 'L'}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-emerald-50">경기 상세 내용</h2>
                    <p className="text-xs font-bold text-emerald-500/50 uppercase tracking-widest mt-0.5">
                      {format(new Date(selectedRecord.date), 'yyyy.MM.dd')} • {selectedRecord.type === '3-Cushion' ? '3구' : '4구'} • AVG {selectedRecord.average.toFixed(3)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-3 bg-[#1a5d4e] hover:bg-emerald-900 text-emerald-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 득점 요약 및 패턴 (New) */}
                  <div className="bg-[#0d4d3b]/50 p-8 rounded-[2.5rem] border border-[#1a5d4e] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                      <PieChartIcon size={80} className="text-emerald-400" />
                    </div>
                    <div className="mb-6 relative z-10 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <Target className="text-emerald-400" size={18} />
                          <h3 className="font-bold text-emerald-50">득점 분포 및 패턴</h3>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest">Score Distribution & Pattern</p>
                      </div>
                      
                      {(() => {
                        const pattern = calculatePattern(selectedRecord.inningScores || []);
                        return (
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black border flex items-center gap-1.5", pattern.bg, pattern.color, "border-current/20")}>
                            <span>{pattern.icon}</span>
                            <span>{pattern.label}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex-1 min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              const dist: Record<number, number> = {};
                              (selectedRecord.inningScores || []).forEach((s: number) => {
                                dist[s] = (dist[s] || 0) + 1;
                              });
                              const total = (selectedRecord.inningScores || []).length;
                              return Object.keys(dist).map(k => ({
                                name: `${k}점`,
                                value: dist[Number(k)],
                                percent: (dist[Number(k)] / (total || 1) * 100).toFixed(1)
                              })).sort((a, b) => parseInt(a.name) - parseInt(b.name));
                            })()}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            labelLine={false}
                          >
                            {(() => {
                              const dist: Record<number, number> = {};
                              (selectedRecord.inningScores || []).forEach((s: number) => {
                                dist[s] = (dist[s] || 0) + 1;
                              });
                              return Object.keys(dist).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                              ));
                            })()}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#0d4d3b] border border-[#1a5d4e] p-2 rounded-xl shadow-xl text-[10px]">
                                    <p className="font-black text-emerald-50">{payload[0].name}</p>
                                    <p className="font-bold text-emerald-100/40">{payload[0].value}회 ({payload[0].payload.percent}%)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            layout="vertical" 
                            verticalAlign="middle" 
                            align="right"
                            formatter={(value, entry: any) => (
                              <span className="text-[10px] font-bold text-emerald-100/60 ml-1">
                                {value} ({entry.payload.percent}%)
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 경기 시기별(초반 vs 후반) 상세 비교 분석 */}
                    {(() => {
                      const scores = selectedRecord.inningScores || [];
                      if (!scores || scores.length < 4) {
                        return (
                          <div className="mt-4 pt-4 border-t border-[#1a5d4e]/40 text-center text-xs text-emerald-100/30">
                            경기 시기별 분석용 데이터가 부족합니다 (최소 4이닝 필요).
                          </div>
                        );
                      }
                      const mid = Math.floor(scores.length / 2);
                      const firstHalf = scores.slice(0, mid);
                      const secondHalf = scores.slice(mid);
                      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                      const diff = secondAvg - firstAvg;
                      const threshold = 0.2;
                      
                      let typeLabel = '';
                      let typeDesc = '';
                      let typeIcon = '';
                      let typeColor = '';
                      
                      if (Math.abs(diff) < threshold) {
                        typeLabel = '균일한 흐름';
                        typeDesc = '경기 초반부터 후반까지 흔들림 없이 정교하게 일정한 페이스를 유지하는 균형잡힌 대국 스타일입니다.';
                        typeIcon = '🎯';
                        typeColor = 'text-blue-400';
                      } else if (diff > threshold) {
                        typeLabel = '후반 집중형';
                        typeDesc = '초반 적응기를 거친 뒤 경기 후반으로 갈수록 놀라운 고도의 집중력을 발휘하는 후반 뒷심형 대국 스타일입니다.';
                        typeIcon = '🔥';
                        typeColor = 'text-rose-400';
                      } else {
                        typeLabel = '초반 주도형';
                        typeDesc = '대국 시작과 동시에 무서운 주도력과 탄탄한 제압력으로 스코어 우위를 확보해나가는 전반 강세형 대국 스타일입니다.';
                        typeIcon = '⚡';
                        typeColor = 'text-amber-400';
                      }

                      return (
                        <div className="mt-6 pt-6 border-t border-[#1a5d4e]/40 space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-emerald-100/60">시기별 득점 페이스</span>
                            <span className={cn("font-black flex items-center gap-1", typeColor)}>
                              <span>{typeIcon}</span> {typeLabel}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0a3d2e]/40 p-3 rounded-2xl border border-[#1a5d4e]/40 text-left">
                              <span className="text-[9px] font-bold text-emerald-400/60 block mb-1">초반 평균 (1~{mid}이닝)</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-emerald-100">{firstAvg.toFixed(2)}</span>
                                <span className="text-[10px] text-emerald-400/40 font-bold">점/이닝</span>
                              </div>
                            </div>
                            <div className="bg-[#0a3d2e]/40 p-3 rounded-2xl border border-[#1a5d4e]/40 text-left">
                              <span className="text-[9px] font-bold text-emerald-400/60 block mb-1">후반 평균 ({mid+1}~{scores.length}이닝)</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-emerald-100">{secondAvg.toFixed(2)}</span>
                                <span className="text-[10px] text-emerald-400/40 font-bold">점/이닝</span>
                              </div>
                            </div>
                          </div>

                          {/* 시각화 바 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] text-[#52a68e] font-bold px-0.5">
                              <span>초반 페이스 ({firstAvg.toFixed(2)})</span>
                              <span>후반 페이스 ({secondAvg.toFixed(2)})</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#1a5d4e]/40 rounded-full overflow-hidden flex">
                              <div 
                                style={{ width: `${(firstAvg / (firstAvg + secondAvg || 1)) * 100}%` }} 
                                className="h-full bg-amber-400 transition-all rounded-l-full" 
                              />
                              <div 
                                style={{ width: `${(secondAvg / (firstAvg + secondAvg || 1)) * 100}%` }} 
                                className="h-full bg-rose-400 transition-[#0d4d3b] rounded-r-full" 
                              />
                            </div>
                          </div>

                          <p className="text-[10px] text-emerald-100/70 font-semibold leading-normal text-left bg-[#082a20]/20 p-2.5 rounded-xl border border-[#1a5d4e]/20">
                            {typeDesc}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 득점 흐름 (기존 유지) */}
                  <div className="bg-[#0d4d3b]/50 p-8 rounded-[2.5rem] border border-[#1a5d4e]">
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="text-emerald-400" size={18} />
                      <h3 className="font-bold text-emerald-50">이닝별 득점 추이</h3>
                    </div>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(selectedRecord.inningScores || []).map((score, i) => ({ inning: i + 1, score }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1a5d4e" vertical={false} />
                          <XAxis dataKey="inning" stroke="#52a68e" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#52a68e" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: '#10b981', opacity: 0.1 }}
                            contentStyle={{ backgroundColor: '#0d4d3b', border: '1px solid #1a5d4e', borderRadius: '1rem', fontSize: '11px' }}
                          />
                          <Bar dataKey="score" fill="#34d399" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {selectedRecord.type === '4-Ball' ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Innings</p>
                      <p className="text-xl font-black text-emerald-50">{selectedRecord.innings}회</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">알다마</p>
                      <p className="text-xl font-black text-emerald-50">{selectedRecord.myScore} : {selectedRecord.opponentScore}</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center col-span-2 md:col-span-1">
                      <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">마무리 3쿠션</p>
                      <p className="text-xl font-black text-orange-300">
                        {selectedRecord.myCushionScore ?? 0} : {selectedRecord.opponentCushionScore ?? 0}
                        {selectedRecord.lastThreeCushions ? (
                          <span className="text-xs font-bold text-orange-500/60 ml-1">/{selectedRecord.lastThreeCushions}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">High Run</p>
                      <p className="text-xl font-black text-amber-400">{selectedRecord.highRun}</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Efficiency</p>
                      <p className="text-xl font-black text-emerald-50">
                        {((selectedRecord.inningScores?.filter(s => s > 0).length || 0) / (selectedRecord.inningScores?.length || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Innings</p>
                      <p className="text-xl font-black text-emerald-50">{selectedRecord.innings}회</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Score</p>
                      <p className="text-xl font-black text-emerald-50">{selectedRecord.myScore} : {selectedRecord.opponentScore}</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">High Run</p>
                      <p className="text-xl font-black text-amber-400">{selectedRecord.highRun}</p>
                    </div>
                    <div className="bg-[#1a5d4e]/20 p-6 rounded-3xl border border-[#1a5d4e] text-center">
                      <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mb-1">Efficiency</p>
                      <p className="text-xl font-black text-emerald-50">
                        {((selectedRecord.inningScores?.filter(s => s > 0).length || 0) / (selectedRecord.inningScores?.length || 1) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-[#0d4d3b]/50 p-8 rounded-[2.5rem] border border-[#1a5d4e]">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="text-emerald-400" size={18} />
                    <h3 className="font-bold text-emerald-50">이닝별 상세 점수</h3>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {(selectedRecord.inningScores || []).map((score, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all",
                          score > 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-black/20 border-white/5 opacity-40"
                        )}
                      >
                        <span className="text-[8px] font-bold text-emerald-500/40 mb-1">{i + 1}</span>
                        <span className={cn(
                          "text-sm font-black",
                          score >= 5 ? "text-amber-400" : score > 0 ? "text-emerald-50" : "text-emerald-500/20"
                        )}>{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
