import React, { useMemo, useState, useEffect } from 'react';
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
  LineChart,
  Line,
  Legend,
  ComposedChart
} from 'recharts';
import { 
  Activity, 
  Target, 
  TrendingUp, 
  Zap,
  BarChart3,
  RotateCcw,
  History,
  X,
  Trophy,
  PieChart as PieChartIcon,
  Search,
  Sparkles
} from 'lucide-react';
import { GameRecord, GameType } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const getNicknameForOpponent = (name: string): string => {
  if (!name) return '';
  try {
    const cached = localStorage.getItem('billiards_friends');
    if (cached) {
      const friends = JSON.parse(cached);
      const found = friends.find((f: any) => f.name === name);
      if (found && found.nickname) return found.nickname;
    }
  } catch (_) {}

  const staticNicknames: Record<string, string> = {
    '김동우': '신림동3구왕',
    '이재욱': '죽빵킬러',
    '최성민': '예각의마술사',
    '박한솔': '무회전샷',
    '정유안': '황오시',
    '임채원': '빈쿠션달인',
    '황준혁': '밀어치기달인',
    '송지호': '오시대장',
    '조현우': '더블레일',
    '강태윤': '끌어치기고수',
    '윤시우': '원쿠션제왕',
    '김당구': '당구의신',
    '이초보': '하점자클럽',
    '박프로': '예술구전설',
  };

  return staticNicknames[name] || '';
};

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({ 
  label, 
  selected, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-xl text-xs font-bold transition-all border relative",
        selected 
          ? "bg-emerald-500 border-emerald-400 text-[#0a3d2e] shadow-lg shadow-emerald-500/20 scale-[1.02]" 
          : "bg-[#1a5d4e]/30 border-[#1a5d4e] text-emerald-100/40 hover:text-emerald-100 hover:border-emerald-500/30"
      )}
    >
      {label}
    </button>
  );
};

interface AnalysisPageProps {
  records: GameRecord[];
}

interface FilterState {
  type: GameType;
  mode: 'all' | 'Individual' | 'Team';
  limit: number | 'all';
  players: 'all' | 2 | 3 | 4;
  cushions: 'all' | 0 | 1 | 2;
}

const COLORS = ['#10b981', '#1a5d4e', '#34d399', '#059669', '#6366f1'];

export function AnalysisPage({ records }: AnalysisPageProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'records'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpponentName, setSelectedOpponentName] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    type: '3-Cushion',
    mode: 'all',
    limit: 10,
    players: 'all',
    cushions: 'all'
  });

  useEffect(() => {
    setSelectedOpponentName(null);
  }, [activeTab]);

  const getStatsForType = (type: GameType, filters: FilterState) => {
    let result = [...records].reverse().filter(r => r.type === type);

    if (filters.mode !== 'all') {
      result = result.filter(r => r.mode === filters.mode);
    }

    if (filters.players !== 'all' && filters.mode !== 'Team') {
      result = result.filter(r => r.playerCount === filters.players);
    }

    if (type === '4-Ball' && filters.cushions !== 'all') {
      result = result.filter(r => r.lastThreeCushions === filters.cushions);
    }

    if (filters.limit !== 'all') {
      result = result.slice(0, filters.limit);
    }

    const filteredRecords = result.reverse();
    if (filteredRecords.length === 0) return null;

    const totalGames = filteredRecords.length;
    const wins = filteredRecords.filter(r => r.win).length;
    const winRate = ((wins / totalGames) * 100).toFixed(1);
    
    const bestAvg = Math.max(...filteredRecords.map(r => r.average)).toFixed(3);
    const totalAvg = (filteredRecords.reduce((acc, r) => acc + r.average, 0) / totalGames).toFixed(3);
    const bestHighRun = Math.max(...filteredRecords.map(r => r.highRun));

    const damaByCount = [2, 3, 4].map(count => {
      const pRecords = filteredRecords.filter(r => r.playerCount === count);
      const avg = pRecords.length > 0 
        ? (pRecords.reduce((acc, r) => acc + r.average, 0) / pRecords.length).toFixed(3)
        : '0.000';
      return { count: `${count}인`, average: parseFloat(avg) };
    });

    const multiPlayerRecords = filteredRecords.filter(r => r.playerCount > 2);
    const rankDist = [1, 2, 3, 4].map(r => ({
      rank: `${r}위`,
      count: multiPlayerRecords.filter(rec => rec.rank === r).length
    })).filter(d => d.count > 0);

    const trendData = filteredRecords.map((r, i) => ({
      id: r.id,
      index: i + 1,
      average: r.average,
      score: r.myScore,
      opponentScore: r.opponentScore,
      highRun: r.highRun,
      date: new Date(r.date).toLocaleDateString(),
      win: r.win,
      inningScores: r.inningScores || []
    }));

    const cushionStats = type === '4-Ball' ? [0, 1, 2].map(c => {
      const cRecords = filteredRecords.filter(r => r.lastThreeCushions === c);
      const total = cRecords.length;
      const wins = cRecords.filter(r => r.win).length;
      const winRecords = cRecords.filter(r => r.win);
      
      let totalFinishInnings = 0;
      let finishCount = 0;

      if (c > 0) {
        winRecords.forEach(r => {
          if (!r.inningScores) return;
          const baseScore = r.myScore - r.lastThreeCushions;
          let currentSum = 0;
          let baseReachedInningIdx = -1;

          for (let i = 0; i < r.inningScores.length; i++) {
            currentSum += r.inningScores[i];
            if (currentSum >= baseScore) {
              baseReachedInningIdx = i;
              break;
            }
          }

          if (baseReachedInningIdx !== -1) {
            const attempts = r.inningScores.length - baseReachedInningIdx;
            totalFinishInnings += attempts;
            finishCount++;
          }
        });
      }

      const avg = total > 0 
        ? (cRecords.reduce((acc, r) => acc + r.average, 0) / total).toFixed(3)
        : '0.000';
      return { 
        cushion: c, 
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0', 
        average: parseFloat(avg), 
        avgFinish: finishCount > 0 ? (totalFinishInnings / finishCount).toFixed(1) : '-',
        total 
      };
    }) : [];

    return {
      type,
      totalGames,
      wins,
      winRate,
      bestAvg,
      totalAvg,
      bestHighRun,
      damaByCount,
      rankDist,
      trendData,
      cushionStats,
      records: filteredRecords.slice().reverse(),
      winLossData: [
        { name: '승리', value: wins, color: '#10b981' },
        { name: '패배', value: totalGames - wins, color: '#f43f5e' }
      ]
    };
  };

  const resetFilters = () => {
    setFilters({
      type: '3-Cushion',
      mode: 'all',
      limit: 'all',
      players: 'all',
      cushions: 'all'
    });
  };

  const stats3 = useMemo(() => 
    filters.type === '3-Cushion' ? getStatsForType('3-Cushion', filters) : null, 
    [records, filters]
  );
  
  const stats4 = useMemo(() => 
    filters.type === '4-Ball' ? getStatsForType('4-Ball', filters) : null, 
    [records, filters]
  );

  const opponentStats = useMemo(() => {
    const stats: Record<string, {
      name: string;
      totalGames: number;
      wins: number;
      myTotalScore: number;
      opTotalScore: number;
      innings: number;
      bestAvg: number;
      highRun: number;
    }> = {};

    records.forEach(r => {
      const name = r.opponentName || '익명';
      if (!stats[name]) {
        stats[name] = { name, totalGames: 0, wins: 0, myTotalScore: 0, opTotalScore: 0, innings: 0, bestAvg: 0, highRun: 0 };
      }
      stats[name].totalGames += 1;
      if (r.win) stats[name].wins += 1;
      stats[name].myTotalScore += r.myScore;
      stats[name].opTotalScore += r.opponentScore;
      stats[name].innings += r.innings;
      stats[name].bestAvg = Math.max(stats[name].bestAvg, r.average);
      stats[name].highRun = Math.max(stats[name].highRun, r.highRun);
    });

    return Object.values(stats).map(s => ({
      ...s,
      winRate: parseFloat(((s.wins / s.totalGames) * 100).toFixed(1)),
      avg: s.innings > 0 ? parseFloat((s.myTotalScore / s.innings).toFixed(3)) : 0
    })).sort((a, b) => b.totalGames - a.totalGames);
  }, [records]);

  const filteredOpponentStats = useMemo(() => {
    if (!searchQuery.trim()) return opponentStats;
    const query = searchQuery.trim().toLowerCase();
    return opponentStats.filter(s => s.name.toLowerCase().includes(query));
  }, [opponentStats, searchQuery]);

  const selectedOpponentData = useMemo(() => {
    if (!selectedOpponentName) return null;
    
    const statsObj = opponentStats.find(s => s.name === selectedOpponentName);
    if (!statsObj) return null;

    const oppGames = records.filter(r => (r.opponentName || '익명') === selectedOpponentName);

    const games3c = oppGames.filter(g => g.type === '3-Cushion');
    const games4b = oppGames.filter(g => g.type === '4-Ball');

    const wins3c = games3c.filter(g => g.win).length;
    const wins4b = games4b.filter(g => g.win).length;

    const myAvgScore = oppGames.length > 0 
      ? oppGames.reduce((sum, g) => sum + g.myScore, 0) / oppGames.length 
      : 0;
    const opAvgScore = oppGames.length > 0 
      ? oppGames.reduce((sum, g) => sum + g.opponentScore, 0) / oppGames.length 
      : 0;

    const avgInnings = oppGames.length > 0 
      ? oppGames.reduce((sum, g) => sum + g.innings, 0) / oppGames.length 
      : 0;

    const myAvgAverage = oppGames.length > 0 
      ? oppGames.reduce((sum, g) => sum + g.average, 0) / oppGames.length 
      : 0;
    const opAvgAverage = statsObj.innings > 0 ? statsObj.opTotalScore / statsObj.innings : 0;

    return {
      stats: statsObj,
      games: oppGames,
      games3c,
      games4b,
      wins3c,
      wins4b,
      myAvgScore,
      opAvgScore,
      avgInnings,
      myAvgAverage,
      opAvgAverage
    };
  }, [selectedOpponentName, opponentStats, records]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-emerald-50 tracking-tight">상세 분석</h1>
          <p className="text-emerald-100/60 font-medium">기록된 데이터를 바탕으로 실력을 정밀 분석합니다.</p>
        </div>
        
        <div className="flex bg-[#0d4d3b] p-1.5 rounded-2xl border border-[#1a5d4e]">
          <button
            onClick={() => setActiveTab('individual')}
            className={cn(
              "px-8 py-2.5 rounded-xl text-xs font-extrabold transition-all",
              activeTab === 'individual' 
                ? "bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/20" 
                : "text-emerald-500/40 hover:text-emerald-400 font-bold"
            )}
          >
            데이터 모드
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={cn(
              "px-8 py-2.5 rounded-xl text-xs font-extrabold transition-all",
              activeTab === 'records' 
                ? "bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/20" 
                : "text-emerald-500/40 hover:text-emerald-400 font-bold"
            )}
          >
            상대 분석
          </button>
        </div>
      </div>

      {activeTab === 'individual' ? (
        <>
          <div className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] p-10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Activity size={180} className="text-emerald-400" />
            </div>
            
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-12 relative z-10">
              <div className="space-y-6">
                <label className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.25em]">종목 선택</label>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {['3-Cushion', '4-Ball'].map(id => (
                      <OptionButton
                        key={id}
                        label={id === '3-Cushion' ? '3구' : '4구'}
                        selected={filters.type === id}
                        onClick={() => setFilters(prev => ({ ...prev, type: id as any }))}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'Individual', 'Team'].map(id => (
                      <OptionButton
                        key={id}
                        label={id === 'all' ? '전체' : id === 'Individual' ? '개인' : '팀전'}
                        selected={filters.mode === id}
                        onClick={() => setFilters(prev => ({ 
                          ...prev, 
                          mode: id as any,
                          players: id === 'Team' ? 'all' : prev.players
                        }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.25em]">인원 & 기간</label>
                <div className="space-y-4">
                  {filters.mode !== 'Team' && (
                    <div className="flex flex-wrap gap-2">
                      {['all', 2, 3, 4].map(id => (
                        <OptionButton
                          key={id}
                          label={id === 'all' ? '전체 인원' : `${id}인`}
                          selected={filters.players === id}
                          onClick={() => setFilters(prev => ({ ...prev, players: id as any }))}
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {[10, 20, 50, 'all'].map(id => (
                      <OptionButton
                        key={id.toString()}
                        label={id === 'all' ? '전체 기간' : `최근 ${id}회`}
                        selected={filters.limit === id}
                        onClick={() => setFilters(prev => ({ ...prev, limit: id as any }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {filters.type === '4-Ball' && (
                <div className="space-y-6 lg:col-span-2">
                  <label className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.25em]">세부 필터</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 0, 1, 2].map(id => (
                      <OptionButton
                        key={id}
                        label={id === 'all' ? '전체 쿠션' : `${id}개 마감`}
                        selected={filters.cushions === id}
                        onClick={() => setFilters(prev => ({ ...prev, cushions: id as any }))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={JSON.stringify(filters)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {(filters.type === '3-Cushion' && stats3) || (filters.type === '4-Ball' && stats4) ? (
                <AnalysisSection 
                  stats={filters.type === '3-Cushion' ? stats3 : stats4} 
                  playerCount={filters.players}
                  mode={filters.mode}
                  cushions={filters.cushions}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-40 bg-[#0d4d3b] rounded-[3rem] border border-dashed border-[#1a5d4e]">
                  <Activity size={60} className="text-emerald-500/10 mb-8" />
                  <h3 className="text-2xl font-black text-emerald-50 mb-2">데이터가 없습니다</h3>
                  <p className="text-emerald-100/30 text-sm font-medium">선택한 조건의 경기 기록이 없습니다.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
          id="opponent-analysis-wrapper"
        >
          {/* Full wide Opponent List Table */}
          <div className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] overflow-hidden shadow-2xl transition-all duration-300" id="opponent-list-card">
            <div className="p-8 border-b border-[#1a5d4e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-emerald-50 items-center gap-3 flex">
                  <TrendingUp className="text-emerald-400" size={24} />
                  상대 전적 통계
                </h2>
                <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest mt-1">이름을 클릭하여 상세 능력치 및 경기 히스토리를 확인하세요.</p>
              </div>
              
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-100/40">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="상대 이름 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0a3d2e]/40 border border-[#1a5d4e] rounded-xl pl-9 pr-8 py-2 text-xs text-emerald-100 placeholder-emerald-100/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-100/40 hover:text-emerald-100/80 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="opponent-score-table">
                <thead>
                  <tr className="bg-black/20">
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest leading-none">상대</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest text-center leading-none">승 / 패</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest text-center leading-none">승률</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest text-center leading-none">평균 에버</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-500/50 uppercase tracking-widest text-center leading-none">역대 하이런</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a5d4e]">
                  {filteredOpponentStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Search size={40} className="text-emerald-500/20 mb-4 animate-pulse" />
                          <p className="text-emerald-100/60 font-bold text-sm">해당 이름의 상대를 찾을 수 없습니다.</p>
                          <p className="text-emerald-100/30 text-xs mt-1">다른 검색어로 검색해 보거나 이름을 확인해 주세요.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOpponentStats.map((stat) => (
                      <tr 
                        key={stat.name} 
                        onClick={() => setSelectedOpponentName(stat.name)}
                        className={cn(
                          "cursor-pointer hover:bg-white/5 active:bg-white/10 transition-all duration-200",
                          selectedOpponentName === stat.name ? "bg-[#1a5d4e]/50" : ""
                        )}
                        id={`opponent-row-${stat.name}`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-full bg-[#1a5d4e] flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20 text-xs shadow-inner">
                              {stat.name[0]}
                            </div>
                            <span className="font-extrabold text-emerald-50 text-sm">
                              {stat.name}
                              {(() => {
                                const nick = getNicknameForOpponent(stat.name);
                                return nick ? <span className="text-xs text-emerald-400 font-bold ml-1.5">({nick})</span> : null;
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-emerald-400 font-black text-sm">{stat.wins}승</span>
                          <span className="text-emerald-100/15 mx-2 font-mono">/</span>
                          <span className="text-rose-400 font-black text-sm">{stat.totalGames - stat.wins}패</span>
                        </td>
                        <td className="px-8 py-5 text-center font-black text-emerald-50 text-sm">
                          {stat.winRate}%
                        </td>
                        <td className="px-8 py-5 text-center font-bold text-emerald-100/60 text-sm">{stat.avg.toFixed(3)}</td>
                        <td className="px-8 py-5 text-center font-bold text-emerald-100/60 text-sm">{stat.highRun}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Elegant Status Window Modal Overlay */}
          <AnimatePresence>
            {selectedOpponentName && selectedOpponentData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" id="opponent-status-modal-overlay">
                {/* Backdrop Layer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedOpponentName(null)}
                  className="absolute inset-0 bg-black/75 backdrop-blur-md"
                />

                {/* Character Sheet / Game Status Card Window */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", duration: 0.4 }}
                  className="relative w-full max-w-2xl bg-[#0d4d3b] border-2 border-emerald-500/40 rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col overflow-hidden max-h-[85vh] z-10"
                  id="opponent-detail-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Decorative Subtle Corner Accents for retro status window vibe */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-[1.8rem] pointer-events-none" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-400/30 rounded-tr-[1.8rem] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-400/30 rounded-bl-[1.8rem] pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-400/30 rounded-br-[1.8rem] pointer-events-none" />

                  {/* Watermark Logo */}
                  <div className="absolute -top-6 -right-6 opacity-[0.03] pointer-events-none">
                    <Trophy size={200} className="text-emerald-400" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1a5d4e]/70 relative index-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-emerald-950 font-black text-xl border-2 border-emerald-300 shadow-lg shadow-emerald-900/40">
                        {selectedOpponentName[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">OPPONENT PROFILE</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-emerald-50 mt-0.5">
                          {selectedOpponentName}
                          {(() => {
                            const nick = getNicknameForOpponent(selectedOpponentName);
                            return nick ? <span className="text-xs text-emerald-400 font-bold ml-1.5">({nick})</span> : null;
                          })()}
                          {' '}능력치상태창
                        </h3>
                      </div>
                    </div>
                    <button
                      id="close-opponent-detail"
                      onClick={() => setSelectedOpponentName(null)}
                      className="flex items-center gap-1 bg-[#1a5d4e]/40 border border-[#1a5d4e] hover:border-emerald-400/40 hover:bg-emerald-500/10 p-2 rounded-full text-emerald-100/70 hover:text-emerald-50 transition-all cursor-pointer shadow-lg"
                      title="닫기"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar text-left">
                    
                    {/* Status Stats Highlights (Core Metrics) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase mb-1">총 전적</span>
                        <span className="text-lg font-black text-emerald-50 leading-tight">
                          {selectedOpponentData.stats.totalGames}전 <span className="text-emerald-400">{selectedOpponentData.stats.wins}승</span>
                        </span>
                      </div>
                      <div className="bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase mb-1">나의 승률</span>
                        <span className="text-lg font-black text-amber-400 leading-tight">{selectedOpponentData.stats.winRate}%</span>
                      </div>
                      <div className="bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase mb-1">최고 에버</span>
                        <span className="text-lg font-black text-emerald-300 leading-tight">{selectedOpponentData.stats.bestAvg.toFixed(3)}</span>
                      </div>
                      <div className="bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 p-4 rounded-2xl flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-emerald-400/60 uppercase mb-1">최고 하이런</span>
                        <span className="text-lg font-black text-indigo-300 leading-tight">{selectedOpponentData.stats.highRun}</span>
                      </div>
                    </div>

                    {/* Game Mode break-downs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 3구 전적 */}
                      <div className="bg-black/15 border border-[#1a5d4e]/30 p-4 rounded-2xl">
                        <h4 className="text-xs font-black text-emerald-300 mb-3 flex items-center justify-between">
                          <span>3구 (3-Cushion)</span>
                          <span className="text-[10px] font-bold text-emerald-100/30">{selectedOpponentData.games3c.length}경기</span>
                        </h4>
                        {selectedOpponentData.games3c.length > 0 ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-emerald-100/40">승률</span>
                              <span className="font-extrabold text-[#10b981]">
                                {selectedOpponentData.games3c.length > 0 ? ((selectedOpponentData.wins3c / selectedOpponentData.games3c.length) * 100).toFixed(1) : '0.0'}% ({selectedOpponentData.wins3c}승 {selectedOpponentData.games3c.length - selectedOpponentData.wins3c}패)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-100/40 font-medium">최고 에버</span>
                              <span className="font-mono text-emerald-50 font-bold">
                                {Math.max(...selectedOpponentData.games3c.map(g => g.average)).toFixed(3)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-[11px] text-emerald-100/30 font-medium">3구 기록 없음</div>
                        )}
                      </div>

                      {/* 4구 전적 */}
                      <div className="bg-black/15 border border-[#1a5d4e]/30 p-4 rounded-2xl">
                        <h4 className="text-xs font-black text-emerald-300 mb-3 flex items-center justify-between">
                          <span>4구 (4-Ball)</span>
                          <span className="text-[10px] font-bold text-emerald-100/30">{selectedOpponentData.games4b.length}경기</span>
                        </h4>
                        {selectedOpponentData.games4b.length > 0 ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-emerald-100/40">승률</span>
                              <span className="font-extrabold text-[#10b981]">
                                {selectedOpponentData.games4b.length > 0 ? ((selectedOpponentData.wins4b / selectedOpponentData.games4b.length) * 100).toFixed(1) : '0.0'}% ({selectedOpponentData.wins4b}승 {selectedOpponentData.games4b.length - selectedOpponentData.wins4b}패)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-emerald-100/40 font-medium">최고 에버</span>
                              <span className="font-mono text-emerald-50 font-bold">
                                {Math.max(...selectedOpponentData.games4b.map(g => g.average)).toFixed(3)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-[11px] text-emerald-100/30 font-medium">4구 기록 없음</div>
                        )}
                      </div>
                    </div>

                    {/* Me vs Opponent Match Comparison Bar */}
                    <div className="bg-black/25 border border-[#1a5d4e]/40 rounded-2xl p-5">
                      <h4 className="text-xs font-black text-emerald-200 mb-4 tracking-wider uppercase">나 VS 상대 전력 비교</h4>
                      <div className="space-y-4">
                        {/* Scores comparison */}
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1.5">
                            <span className="text-emerald-400">나: {selectedOpponentData.myAvgScore.toFixed(1)}점</span>
                            <span className="text-emerald-100/40">평균 득점</span>
                            <span className="text-rose-400">상대: {selectedOpponentData.opAvgScore.toFixed(1)}점</span>
                          </div>
                          <div className="h-2 bg-[#0a3d2e] rounded-full overflow-hidden flex shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
                              style={{ width: `${(selectedOpponentData.myAvgScore / (selectedOpponentData.myAvgScore + selectedOpponentData.opAvgScore || 1)) * 100}%` }}
                            />
                            <div 
                              className="bg-gradient-to-r from-rose-400 to-rose-600 h-full transition-all duration-500" 
                              style={{ width: `${(selectedOpponentData.opAvgScore / (selectedOpponentData.myAvgScore + selectedOpponentData.opAvgScore || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Averages comparison */}
                        <div>
                          <div className="flex justify-between text-[11px] font-bold mb-1.5">
                            <span className="text-emerald-400 font-mono">나: {selectedOpponentData.myAvgAverage.toFixed(3)}</span>
                            <span className="text-emerald-100/40">평균 에버리지</span>
                            <span className="text-rose-400 font-mono">상대: {selectedOpponentData.opAvgAverage.toFixed(3)}</span>
                          </div>
                          <div className="h-2 bg-[#0a3d2e] rounded-full overflow-hidden flex shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" 
                              style={{ width: `${(selectedOpponentData.myAvgAverage / (selectedOpponentData.myAvgAverage + selectedOpponentData.opAvgAverage || 1)) * 100}%` }}
                            />
                            <div 
                              className="bg-gradient-to-r from-rose-400 to-rose-600 h-full transition-all duration-500" 
                              style={{ width: `${(selectedOpponentData.opAvgAverage / (selectedOpponentData.myAvgAverage + selectedOpponentData.opAvgAverage || 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-[10px] text-center font-bold text-emerald-500/40 pt-1 uppercase tracking-wider">
                          * 1게임당 평균 {selectedOpponentData.avgInnings.toFixed(1)}이닝 플레이함
                        </div>
                      </div>
                    </div>

                    {/* Match History List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-emerald-200 flex items-center gap-2 mb-2">
                        <History size={14} className="text-emerald-400" />
                        <span>전체 경기 히스토리</span>
                      </h4>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {selectedOpponentData.games.map((game, i) => (
                          <div 
                            key={game.id || i}
                            className="bg-black/15 hover:bg-black/25 border border-[#1a5d4e]/30 rounded-xl p-3 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black leading-none",
                                  game.type === '3-Cushion' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/10" : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/10"
                                )}>
                                  {game.type === '3-Cushion' ? '3구' : '4구'}
                                </span>
                                <span className="font-bold text-emerald-100">{new Date(game.date).toLocaleDateString()}</span>
                              </div>
                              <div className="text-[10px] text-emerald-100/40">
                                {game.innings}이닝 · 에버 {game.average.toFixed(3)} · 하이런 {game.highRun}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-bold text-emerald-50">{game.myScore} : {game.opponentScore}</div>
                                <div className="text-[9px] font-bold text-emerald-100/40">나 : 상대</div>
                              </div>
                              <span className={cn(
                                "w-12 text-center py-1 rounded font-extrabold text-[10px]",
                                game.win ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                              )}>
                                {game.win ? '승리' : '패배'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function AnalysisSection({ stats, playerCount, mode, cushions }: { 
  stats: any, 
  playerCount: 'all' | 2 | 3 | 4,
  mode: 'all' | 'Individual' | 'Team',
  cushions: 'all' | 0 | 1 | 2
}) {
  if (!stats) return null;

  const showRankDist = (playerCount === 'all' || playerCount > 2) && mode !== 'Team';

  const statsOverview = useMemo(() => {
    if (!stats || !stats.trendData || stats.trendData.length === 0) return null;
    const averages = stats.trendData.map((r: any) => r.average);
    const highRuns = stats.trendData.map((r: any) => r.highRun);
    
    const peak = averages.length > 0 ? Math.max(...averages) : 0;
    const bottom = averages.length > 0 ? Math.min(...averages) : 0;
    const peakHighRun = highRuns.length > 0 ? Math.max(...highRuns) : 0;
    
    let totalInnings = 0;
    let totalPoints = 0;
    if (stats.records) {
      stats.records.forEach((r: any) => {
        totalInnings += r.innings || 0;
        totalPoints += r.myScore || 0;
      });
    }
    const overallAverage = totalInnings > 0 ? totalPoints / totalInnings : 0;
    const volatility = peak - bottom;

    // Class/Rank Rating based on overallAverage for this type
    let rating = '입문자 (Beginner)';
    let colorClass = 'text-zinc-400 bg-zinc-900/40 border-zinc-500/20';
    let damaMin = 50;
    let damaMax = 80;

    if (stats.type === '3-Cushion') {
      if (overallAverage >= 1.0) {
        rating = '마스터 (Diamond)';
        colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
        damaMin = 400; damaMax = 1000;
      } else if (overallAverage >= 0.75) {
        rating = '고급 (Platinum)';
        colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        damaMin = 250; damaMax = 350;
      } else if (overallAverage >= 0.55) {
        rating = '중상급 (Gold)';
        colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        damaMin = 200; damaMax = 230;
      } else if (overallAverage >= 0.35) {
        rating = '중급 (Silver)';
        colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        damaMin = 120; damaMax = 180;
      } else {
        rating = '초급 (Bronze)';
        colorClass = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        damaMin = 50; damaMax = 100;
      }
    } else { // 4-Ball
      if (overallAverage >= 12.0) {
        rating = '마스터 (Diamond)';
        colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
        damaMin = 500; damaMax = 1000;
      } else if (overallAverage >= 8.0) {
        rating = '고급 (Platinum)';
        colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
        damaMin = 350; damaMax = 400;
      } else if (overallAverage >= 5.0) {
        rating = '중상급 (Gold)';
        colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
        damaMin = 200; damaMax = 300;
      } else if (overallAverage >= 2.5) {
        rating = '중급 (Silver)';
        colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
        damaMin = 100; damaMax = 150;
      } else {
        rating = '초급 (Bronze)';
        colorClass = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
        damaMin = 30; damaMax = 80;
      }
    }

    return {
      peak,
      bottom,
      peakHighRun,
      volatility,
      overallAverage,
      rating,
      colorClass,
      damaMin,
      damaMax
    };
  }, [stats]);

  return (
    <div className="space-y-12">
      {/* Billiards Stock Report / Custom Dynamic Analytics Insight Card */}
      {statsOverview && (
        <div className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
            <Sparkles size={160} className="text-emerald-400" />
          </div>

          <div className="flex items-center gap-2 mb-6">
            <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="text-lg font-black text-emerald-50">에버리지 동향 종합 분석 리포트</h3>
              <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-wider">Personal Volatility Insights</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            
            {/* Insight 1: Volatility Rating */}
            <div className="bg-black/15 border border-[#1a5d4e]/40 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest block mb-1">에버리지 일관성 (변동폭)</span>
                <h4 className="text-lg font-black text-emerald-50 font-mono">
                  {statsOverview.volatility.toFixed(3)}
                </h4>
                <p className="text-[11px] text-[#8e949f] mt-2 font-medium leading-relaxed">
                  최고({statsOverview.peak.toFixed(3)})와 최저({statsOverview.bottom.toFixed(3)})의 간격입니다. {statsOverview.volatility < 0.2 ? '변동폭이 좁아 샷 감각이 아주 일관됩니다!' : '기복을 줄이고 일관된 샷 감각을 유지하는 파워 팁이 필요합니다.'}
                </p>
              </div>
              <div className="pt-4 border-t border-[#1a5d4e]/30 mt-4 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>일평균 기복 분석</span>
                <span>{statsOverview.volatility < 0.2 ? '우수 (Stable)' : '기복 있음 (Volatile)'}</span>
              </div>
            </div>

            {/* Insight 2: Ability Rank */}
            <div className="bg-black/15 border border-[#1a5d4e]/40 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest block mb-1">나의 현 실력 랭크</span>
                <span className={cn(
                  "inline-block px-2.5 py-1 rounded-full text-[10px] font-black mb-3 border",
                  statsOverview.colorClass
                )}>
                  {statsOverview.rating}
                </span>
                <p className="text-[11px] text-emerald-100/50 mt-1 font-medium leading-relaxed">
                  최근 기록 기준 {stats.type === '3-Cushion' ? '3쿠션' : '4구'} 평균 에버는 <span className="font-mono text-emerald-300 font-bold">{statsOverview.overallAverage.toFixed(3)}</span> 입니다. 이는 권장 당구 수치(다마) 환산 시 약 <span className="text-amber-400 font-extrabold">{statsOverview.damaMin}~{statsOverview.damaMax}점</span>대 배치 레벨에 해당합니다.
                </p>
              </div>
              <div className="pt-4 border-t border-[#1a5d4e]/30 mt-4 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>누적 다마 기준</span>
                <span>{statsOverview.damaMin} 점</span>
              </div>
            </div>

            {/* Insight 3: Quick Performance Report */}
            <div className="bg-black/15 border border-[#1a5d4e]/40 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest block mb-1">종합 샷 파워 (하이런 시그널)</span>
                <h4 className="text-lg font-black text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Zap size={16} />
                  {statsOverview.peakHighRun}점
                </h4>
                <p className="text-[11px] text-emerald-100/50 mt-2 font-medium leading-relaxed">
                  기간 중 한 번에 기록한 최다 연속 득점(하이런) 점수입니다. 샷이 폭발적으로 연결되어 다득점을 만들어내거나 위기 상황을 역전할 수 있는 잠재 역량이 매우 뛰어납니다.
                </p>
              </div>
              <div className="pt-4 border-t border-[#1a5d4e]/30 mt-4 flex items-center justify-between text-[11px] font-bold text-emerald-400">
                <span>역대 최다 연타</span>
                <span>상위 레벨 도달</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 상세 효율 성적 & 상대 순위 분포 (상부 배치) */}
      <div className="flex flex-wrap gap-6">
        <div className="flex-none w-full md:w-[300px] bg-[#0d4d3b] rounded-[2rem] border border-[#1a5d4e] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
            <Zap size={60} className="text-emerald-400" />
          </div>
          <h4 className="font-bold text-emerald-500/30 uppercase text-[9px] tracking-widest mb-4 border-b border-[#1a5d4e] pb-3">상세 효율 성적</h4>
          <div className="space-y-3 relative z-10">
            {stats.damaByCount
              .filter((row: any) => {
                if (mode === 'Team') return row.count === '4인';
                return playerCount === 'all' || row.count === `${playerCount}인`;
              })
              .map((row: any) => (
                <div key={row.count} className="flex items-center justify-between py-1.5 border-b border-[#1a5d4e]/30 last:border-0 hover:bg-emerald-500/5 px-1 rounded-lg transition-colors">
                  <span className="text-[11px] font-bold text-emerald-100/40">{row.count} 평균</span>
                  <span className="text-emerald-50 font-black font-mono text-xs">{row.average.toFixed(3)} AVG</span>
                </div>
              ))}
          </div>
        </div>

        {showRankDist && stats.rankDist.length > 0 && (
          <div className="flex-none w-full md:w-[300px] bg-[#0d4d3b] rounded-[2rem] border border-[#1a5d4e] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Trophy size={60} className="text-emerald-400" />
            </div>
            <h4 className="font-bold text-emerald-500/30 uppercase text-[9px] tracking-widest mb-4 border-b border-[#1a5d4e] pb-3">상대 순위 분포</h4>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.rankDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="rank"
                    labelLine={false}
                  >
                    {stats.rankDist.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d4d3b', border: '1px solid #1a5d4e', borderRadius: '1rem', fontSize: '10px' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value) => <span className="text-[9px] font-bold text-emerald-100/60 ml-0">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 relative z-10 mt-3 pt-3 border-t border-[#1a5d4e]/30">
              {stats.rankDist.map((row: any) => (
                <div key={row.rank} className="flex items-center justify-between py-1 border-b border-[#1a5d4e]/30 last:border-0 hover:bg-emerald-500/5 px-1 rounded-lg transition-colors">
                  <span className="text-[10px] font-bold text-emerald-100/40">{row.rank} 달성</span>
                  <span className="text-emerald-50 font-black font-mono text-[10px]">{row.count}회</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.type === '4-Ball' && stats.cushionStats.length > 0 && (
          <div className="flex-1 min-w-[400px] bg-[#0d4d3b] rounded-[2rem] border border-[#1a5d4e] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <Target size={60} className="text-emerald-400" />
            </div>
            <h4 className="font-bold text-emerald-500/30 uppercase text-[9px] tracking-widest mb-4 border-b border-[#1a5d4e] pb-3">쿠션별 마무리 분석</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.cushionStats.filter((row: any) => cushions === 'all' || row.cushion === cushions)}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a5d4e" vertical={false} />
                    <XAxis 
                      dataKey="cushion" 
                      stroke="#52a68e" 
                      fontSize={9} 
                      tickFormatter={(val) => `${val}개`}
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis stroke="#52a68e" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#10b981', opacity: 0.1 }}
                      contentStyle={{ backgroundColor: '#0d4d3b', border: '1px solid #1a5d4e', borderRadius: '1rem', fontSize: '10px' }}
                    />
                    <Bar dataKey="winRate" name="승률(%)" fill="#facc15" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="average" name="평균" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 relative z-10">
                {stats.cushionStats
                  .filter((row: any) => cushions === 'all' || row.cushion === cushions)
                  .map((row: any) => (
                    <div key={row.cushion} className="flex flex-col gap-1 py-1 border-b border-[#1a5d4e]/30 last:border-0 hover:bg-emerald-500/5 px-1 rounded-lg transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-100/40">{row.cushion}개 마무리</span>
                        <span className="text-emerald-50 font-black font-mono text-[10px]">{row.total}경기</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px]">
                        <span className="text-emerald-400 font-bold">승률 {row.winRate}%</span>
                        <div className="flex items-center gap-2">
                          {row.cushion > 0 && (
                            <span className="text-amber-400 font-bold">마감 {row.avgFinish}이닝</span>
                          )}
                          <span className="text-emerald-100/60 font-mono">{row.average.toFixed(3)} AVG</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#0d4d3b] p-10 rounded-[3rem] border border-[#1a5d4e] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <TrendingUp size={120} className="text-emerald-400" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div>
              <h3 className="text-xl font-bold text-emerald-50 flex items-center gap-3">
                <TrendingUp className="text-emerald-400" size={20} />
                에버리지 & 하이런 추이
              </h3>
            </div>
          </div>
        </div>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a5d4e" vertical={false} />
              <XAxis dataKey="date" stroke="#52a68e" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#10b981" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#facc15" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0d4d3b', border: '1px solid #1a5d4e', borderRadius: '1rem', fontSize: '11px' }}
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                height={36}
                formatter={(value) => <span className="text-[10px] font-bold text-emerald-100/60 ml-1">{value}</span>}
              />
              <Bar yAxisId="right" dataKey="highRun" name="하이런" fill="#facc15" radius={[4, 4, 0, 0]} barSize={20} />
              <Line yAxisId="left" type="monotone" dataKey="average" name="에버리지" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#0d4d3b] p-10 rounded-[3rem] border border-[#1a5d4e] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Target size={100} className="text-emerald-400" />
        </div>
        
        <div className="mb-8 relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="text-emerald-400" size={20} />
            <h3 className="text-xl font-bold text-emerald-50">이닝별 득점 분포</h3>
          </div>
          <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest">Global Inning Score Distribution</p>
        </div>

        <div className="h-[250px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={(() => {
                const dist: Record<number, number> = {};
                stats.trendData.forEach((m: any) => {
                  (m.inningScores || []).forEach((s: number) => {
                    dist[s] = (dist[s] || 0) + 1;
                  });
                });
                return Object.keys(dist).map(k => ({
                  score: `${k}점`,
                  count: dist[Number(k)],
                  rawScore: Number(k)
                })).sort((a, b) => a.rawScore - b.rawScore);
              })()}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1a5d4e" vertical={false} />
              <XAxis dataKey="score" stroke="#52a68e" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#52a68e" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: '#10b981', opacity: 0.1 }}
                contentStyle={{ backgroundColor: '#0d4d3b', border: '1px solid #1a5d4e', borderRadius: '1rem', fontSize: '11px' }}
                formatter={(value) => [`${value}회`, '회수']}
              />
              <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 경기 시기별 누적 페이스 분석 (초반 vs 후반) */}
        {(() => {
          let totalFirstHalfPoints = 0;
          let totalFirstHalfInnings = 0;
          let totalSecondHalfPoints = 0;
          let totalSecondHalfInnings = 0;
          let validGamesCount = 0;

          stats.trendData.forEach((m: any) => {
            const scores = m.inningScores || [];
            if (scores.length >= 2) {
              const mid = Math.floor(scores.length / 2);
              const firstHalf = scores.slice(0, mid);
              const secondHalf = scores.slice(mid);
              
              totalFirstHalfPoints += firstHalf.reduce((a, b) => a + b, 0);
              totalFirstHalfInnings += firstHalf.length;
              
              totalSecondHalfPoints += secondHalf.reduce((a, b) => a + b, 0);
              totalSecondHalfInnings += secondHalf.length;
              validGamesCount++;
            }
          });

          if (validGamesCount === 0 || totalFirstHalfInnings === 0 || totalSecondHalfInnings === 0) {
            return null;
          }

          const overallFirstAvg = totalFirstHalfPoints / totalFirstHalfInnings;
          const overallSecondAvg = totalSecondHalfPoints / totalSecondHalfInnings;
          const diff = overallSecondAvg - overallFirstAvg;
          const threshold = 0.15; // Lower threshold since it's an aggregate of many games

          let typeLabel = '';
          let typeDesc = '';
          let typeIcon = '';
          let typeColor = '';
          let typeBg = '';
          
          if (Math.abs(diff) < threshold) {
            typeLabel = '균일한 흐름형 (Consistent)';
            typeDesc = '모든 경기에서 초반과 후반의 기량 차이가 거의 없이 시종일관 안정적이고 일정한 스트로크 페이스를 보여주는 균형잡힌 대국 스타일입니다.';
            typeIcon = '🎯';
            typeColor = 'text-blue-400';
            typeBg = 'bg-blue-500/10 border-blue-500/20';
          } else if (diff > threshold) {
            typeLabel = '후반 집중형 / 뒷심형 (Late Focused)';
            typeDesc = '대국이 진행될수록 테이블의 특성과 상대의 단점을 완전히 간파하며 이닝 후반으로 갈수록 득점 집중력이 폭발하는 추격에 강한 스타일입니다.';
            typeIcon = '🔥';
            typeColor = 'text-rose-400';
            typeBg = 'bg-rose-500/10 border-rose-500/20';
          } else {
            typeLabel = '초반 주도형 / 기선제압형 (Early Dominant)';
            typeDesc = '대국 개시와 동시에 뛰어난 집중력으로 초반 대량 득점을 통해 기선을 제압하고 흔들림 없이 게임 리드를 이끌어나가는 탄탄한 스타일입니다.';
            typeIcon = '⚡';
            typeColor = 'text-amber-400';
            typeBg = 'bg-amber-500/10 border-amber-500/20';
          }

          return (
            <div className="mt-8 pt-8 border-t border-[#1a5d4e] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a3d2e]/30 px-5 py-4 rounded-2xl border border-[#1a5d4e]/40">
                <div className="text-left">
                  <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-wider block mb-1">통합 경기 성향 분석</span>
                  <h4 className="text-sm font-black text-emerald-105 flex items-center gap-1.5">
                    종합 플레이어 성향: <span className={cn(typeColor, "font-extrabold")}>{typeIcon} {typeLabel}</span>
                  </h4>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-[9px] font-extrabold border self-start sm:self-center", typeBg, typeColor)}>
                  {typeLabel.split(' ')[0]}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0a3d2e]/40 p-4 rounded-2xl border border-[#1a5d4e]/40 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-400/60 uppercase">초반 경기력</span>
                    <span className="text-[9px] font-semibold text-emerald-500/30 font-mono">1st Half Avg</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-50">{overallFirstAvg.toFixed(3)}</span>
                    <span className="text-[10px] text-emerald-400/40 font-bold">평균 득점/이닝</span>
                  </div>
                  <div className="mt-2 text-[9px] text-emerald-100/40 font-medium">
                    매 대국의 전반 이닝 평균 득점률입니다.
                  </div>
                </div>

                <div className="bg-[#0a3d2e]/40 p-4 rounded-2xl border border-[#1a5d4e]/40 text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-400/60 uppercase">후반 경기력</span>
                    <span className="text-[9px] font-semibold text-emerald-500/30 font-mono">2nd Half Avg</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-50">{overallSecondAvg.toFixed(3)}</span>
                    <span className="text-[10px] text-emerald-400/40 font-bold">평균 득점/이닝</span>
                  </div>
                  <div className="mt-2 text-[9px] text-emerald-100/40 font-medium">
                    매 대국의 후반 이닝 평균 득점률입니다.
                  </div>
                </div>
              </div>

              {/* 비교 게이지 바 */}
              <div className="bg-[#0a3d2e]/20 p-4 rounded-2xl border border-[#1a5d4e]/20 space-y-2">
                <div className="flex justify-between text-[10px] text-emerald-400/80 font-bold px-1">
                  <span>초반 집중률 ({((overallFirstAvg / (overallFirstAvg + overallSecondAvg || 1)) * 100).toFixed(1)}%)</span>
                  <span>후반 집중률 ({((overallSecondAvg / (overallFirstAvg + overallSecondAvg || 1)) * 100).toFixed(1)}%)</span>
                </div>
                <div className="h-2 w-full bg-[#1a5d4e]/40 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${(overallFirstAvg / (overallFirstAvg + overallSecondAvg || 1)) * 100}%` }} 
                    className="h-full bg-amber-400 transition-all rounded-l-full" 
                  />
                  <div 
                    style={{ width: `${(overallSecondAvg / (overallFirstAvg + overallSecondAvg || 1)) * 100}%` }} 
                    className="h-full bg-rose-400 transition-all rounded-r-full" 
                  />
                </div>
              </div>

              <p className="text-xs text-emerald-100/70 leading-relaxed text-left bg-[#082a20]/20 p-4 rounded-2xl border border-[#1a5d4e]/20">
                {typeDesc}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}



