import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Target, 
  Activity, 
  TrendingUp, 
  Award, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Users,
  User,
  UserPlus,
  Flame,
  Minus,
  ChevronLeft,
  ChevronDown,
  Search,
  Medal,
  Plus
} from 'lucide-react';
import { GameRecord, PlayerStats, GameType } from '../types';
import { StatsChart } from './StatsChart';
import { cn } from '../lib/utils';

interface DashboardPageProps {
  records: GameRecord[];
  stats: PlayerStats;
  filter: GameType;
  setFilter: (filter: GameType) => void;
}

export function DashboardPage({ records, stats, filter, setFilter }: DashboardPageProps) {
  const [damaCount, setDamaCount] = useState<5 | 10 | 20>(10);
  const [winRateView, setWinRateView] = useState<'2p' | '3p' | '4p'>('2p');
  const [teamWinRateView, setTeamWinRateView] = useState<'3p' | '4p'>('4p');
  const [friendSearch, setFriendSearch] = useState('');
  const recentRecords = useMemo(() => records.slice(0, 5), [records]);

  // Mock Friend Data
  const friends = [
    { name: '김당구', dama3: 25, dama4: 300, lastResult: 'WIN', vs: '3:1', winRate: 75 },
    { name: '이초보', dama3: 15, dama4: 150, lastResult: 'LOSS', vs: '1:2', winRate: 33 },
    { name: '박프로', dama3: 35, dama4: 500, lastResult: 'WIN', vs: '5:4', winRate: 55 },
  ];

  const searchedFriend = useMemo(() => {
    if (!friendSearch) return null;
    return friends.find(f => f.name.includes(friendSearch));
  }, [friendSearch]);

  const trendIcon = {
    '상승세': <ArrowUpRight className="text-emerald-400" />,
    '하락세': <ArrowDownRight className="text-orange-400" />,
    '유지': <Minus className="text-zinc-400" />,
  };

  const trendColor = {
    '상승세': 'text-emerald-400',
    '하락세': 'text-orange-400',
    '유지': 'text-zinc-400',
  };

  // Player Count Stats (Average Rank for 3/4 players)
  const playerCountStats = useMemo(() => {
    const counts = [3, 4] as const;
    return counts.map(count => {
      const games = records.filter(r => r.playerCount === count);
      const totalRank = games.reduce((acc, r) => acc + (r.rank || 0), 0);
      const avgRank = games.length > 0 ? (totalRank / games.length).toFixed(1) : '0.0';
      return { count, games: games.length, avgRank };
    });
  }, [records]);

  return (
    <div className="space-y-10">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-emerald-50 tracking-tight">나의 대시보드</h1>
          <p className="text-emerald-100/60 mt-2 font-medium">당신의 당구 데이터를 정밀 분석합니다.</p>
        </div>
        <div className="flex bg-[#0d4d3b] p-1.5 rounded-2xl border border-[#1a5d4e]">
          {(['3-Cushion', '4-Ball'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                "px-8 py-2.5 rounded-xl text-sm font-bold transition-all",
                filter === t 
                  ? "bg-emerald-500 text-[#0a3d2e] shadow-lg" 
                  : "text-emerald-100/40 hover:text-emerald-100"
              )}
            >
              {t === '3-Cushion' ? '3구' : '4구'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Dama Card */}
        <div className="bg-[#0d4d3b] p-6 rounded-[2.5rem] border border-[#1a5d4e] relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-[#1a5d4e] rounded-2xl">
                <Target className="text-emerald-400" />
              </div>
              <div className="relative">
                <select 
                  value={damaCount}
                  onChange={(e) => setDamaCount(Number(e.target.value) as any)}
                  className="appearance-none bg-[#1a5d4e] text-[10px] font-bold text-emerald-400 px-3 py-1.5 rounded-lg border border-[#2d8a75] focus:ring-2 focus:ring-emerald-500/50 cursor-pointer pr-8"
                >
                  <option value={5}>최근 5경기</option>
                  <option value={10}>최근 10경기</option>
                  <option value={20}>최근 20경기</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
              </div>
            </div>
            <p className="text-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-1">다마</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-4xl font-black text-emerald-50">{stats.calculatedDama}</h4>
              <span className="text-emerald-100/30 text-sm font-bold">{filter === '3-Cushion' ? '점' : ''}</span>
            </div>
          </div>
          <Activity className="absolute -right-6 -bottom-6 text-emerald-500/5 w-32 h-32 rotate-12" />
        </div>

        {/* Personal Records Card */}
        <div className="bg-[#0d4d3b] p-6 rounded-[2.5rem] border border-[#1a5d4e] relative overflow-hidden group shadow-xl shadow-black/10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#1a5d4e] rounded-2xl">
              <User className="text-amber-400" />
            </div>
            <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
              {(['2p', '3p', '4p'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setWinRateView(v)}
                  className={cn(
                    "px-2 py-1 rounded text-[8px] font-bold transition-all",
                    winRateView === v ? "bg-emerald-500 text-[#0a3d2e]" : "text-emerald-100/40 hover:text-emerald-100"
                  )}
                >
                  {v.replace('p', '')}인
                </button>
              ))}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={winRateView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-1">
                {winRateView === '2p' ? '개인 승률' : '개인 평균 등수'}
              </p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-3xl font-black text-emerald-50 mb-1">
                  {winRateView === '2p' ? '68%' : 
                   winRateView === '3p' ? '1.5' : '2.1'}
                </h4>
                {winRateView !== '2p' && <span className="text-emerald-100/30 text-sm font-bold">위</span>}
              </div>
              <p className="text-[10px] text-emerald-100/30 font-medium">
                {winRateView === '2p' ? '12승 6패' : '최근 10경기 분석 결과'}
              </p>
            </motion.div>
          </AnimatePresence>
          <User className="absolute -right-4 -bottom-4 text-emerald-500/5 w-24 h-24 -rotate-12" />
        </div>

        <StatCard 
          title="최고 하이런" 
          value={`${stats.maxHighRun}점`} 
          subValue=""
          icon={<Award className="text-purple-400" />}
        />

        <div className="bg-[#0d4d3b] p-6 rounded-[2.5rem] border border-[#1a5d4e] hover:border-emerald-500/30 transition-all group shadow-xl shadow-black/10">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-[#1a5d4e] rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="text-blue-400" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-1">팀전 승률 (4인)</p>
              <h4 className="text-2xl font-black text-emerald-50 mb-1">58%</h4>
              <p className="text-[10px] text-emerald-100/30 font-medium">14승 10패</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chart & Friend Rankings */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0d4d3b] p-8 rounded-[2.5rem] border border-[#1a5d4e] shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-emerald-50 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                에버리지 추이
              </h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[#1a5d4e] rounded-full text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">최근 10경기</span>
              </div>
            </div>
            <div className="h-[300px]">
              <StatsChart records={records} />
            </div>
          </div>
        </div>

        {/* Right Column: Recent Games & Summary */}
        <div className="space-y-8">
          <div className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] shadow-2xl shadow-black/20 overflow-hidden">
            <div className="p-6 border-b border-[#1a5d4e] flex items-center justify-between">
              <h2 className="text-xl font-bold text-emerald-50 flex items-center gap-2">
                <History size={20} className="text-emerald-400" />
                최근 경기
              </h2>
              <Link 
                to="/records"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                전체보기
              </Link>
            </div>
            <div className="divide-y divide-[#1a5d4e]">
              {recentRecords.map((record) => (
                <div key={record.id} className="p-5 hover:bg-[#1a5d4e]/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${record.win ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                      <span className="text-xs font-bold text-emerald-500/50">{record.date}</span>
                    </div>
                    <span className={`text-xs font-bold ${record.win ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {record.win ? 'WIN' : 'LOSS'}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold text-emerald-50">{record.type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-emerald-100/40 font-medium">Avg. {record.average.toFixed(3)}</p>
                        <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-emerald-500/50">
                          {record.mode === 'Team' ? '팀전' : `${record.playerCount}인 개인전`}
                        </span>
                        {record.rank && (
                          <span className="text-[10px] bg-blue-500/20 px-1.5 py-0.5 rounded text-blue-400">
                            {record.rank}위
                          </span>
                        )}
                        {record.type === '4-Ball' && record.lastThreeCushions !== undefined && (
                          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-emerald-500/50">
                            3쿠 {record.lastThreeCushions}개
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-lg font-black text-emerald-50 leading-none">{record.myScore} : {record.opponentScore}</p>
                      {record.type === '4-Ball' && record.lastThreeCushions ? (
                        <p className="text-[9px] font-bold text-orange-400 mt-0.5">
                          3C {record.myCushionScore ?? 0}:{record.opponentCushionScore ?? 0}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {recentRecords.length === 0 && (
                <div className="py-20 text-center text-emerald-500/30">
                  <p className="text-sm font-medium">아직 기록된 경기가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon, trend }: { 
  title: string, 
  value: string, 
  subValue: string, 
  icon: React.ReactNode,
  trend?: 'up' | 'down'
}) {
  return (
    <div className="bg-[#0d4d3b] p-6 rounded-[2.5rem] border border-[#1a5d4e] hover:border-emerald-500/30 transition-all group shadow-xl shadow-black/10">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-[#1a5d4e] rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-bold",
            trend === 'up' ? "text-emerald-400" : "text-zinc-500"
          )}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </div>
        )}
      </div>
      <div>
        <p className="text-emerald-500/50 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
        <h4 className="text-2xl font-black text-emerald-50 mb-1">{value}</h4>
        <p className="text-[10px] text-emerald-100/30 font-medium">{subValue}</p>
      </div>
    </div>
  );
}
