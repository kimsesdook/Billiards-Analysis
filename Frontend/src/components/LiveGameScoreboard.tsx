import React from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  Hourglass,
  Minus,
  Plus,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { GameMode, GameType } from '../types';
import { cn } from '../lib/utils';

export interface LiveScoreboardPlayer {
  id: number;
  memberId?: number;
  name: string;
  targetScore: number;
  currentScore: number;
  cushionScore?: number;
  highRun: number;
  inningScores: number[];
  cueBallColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  isCushionPhase?: boolean;
  isFinished?: boolean;
  isMe?: boolean;
}

interface LiveGameScoreboardProps {
  players: LiveScoreboardPlayer[];
  currentInning: number;
  activePlayerIndex: number;
  gameTime: number;
  isPaused: boolean;
  soundEnabled: boolean;
  hasGameRoom: boolean;
  liveStateError: string | null;
  isLiveStateReady: boolean;
  isGameRoomHost: boolean;
  canControl: boolean;
  enableShotClock: boolean;
  shotClockTime: number;
  shotClockLimit: number;
  gameType: GameType;
  gameMode: GameMode;
  playerCount: 2 | 3 | 4;
  lastThreeCushions: 0 | 1 | 2;
  onToggleSound: () => void;
  onTogglePause: () => void;
  onRequestFinish: () => void;
  onTeamCushionTransition: (teamId: 'A' | 'B') => void;
  onActivePlayerCushionTransition: () => void;
  onScoreChange: (amount: number) => void;
  onEndInning: () => void;
}

interface PlayerCardProps {
  player: LiveScoreboardPlayer;
  isActive: boolean;
  quadrantLabel: string;
  quadrantMini: string;
  gameType: GameType;
  lastThreeCushions: 0 | 1 | 2;
}

const cueBallClassName = (cueBallColor: string) => {
  switch (cueBallColor) {
    case 'white':
      return 'bg-white border-zinc-200';
    case 'yellow':
      return 'bg-yellow-400 border-yellow-300';
    case 'red':
      return 'bg-red-500 border-red-400';
    default:
      return 'bg-sky-500 border-sky-400';
  }
};

function PlayerScoreCard({
  player,
  isActive,
  quadrantLabel,
  quadrantMini,
  gameType,
  lastThreeCushions,
}: PlayerCardProps) {
  return (
    <div
      className={cn(
        'relative min-h-[220px] select-none overflow-hidden rounded-[2.5rem] border p-6 text-left transition-all duration-300 flex flex-col justify-between',
        player.isFinished
          ? 'bg-gradient-to-br from-[#1c180a] to-[#071d17] border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
          : isActive
            ? 'bg-[#0f4d3d] border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
            : 'bg-[#0b3127] border-[#16503f] opacity-85 hover:opacity-100',
      )}
    >
      {player.isFinished && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 select-none text-amber-500/10">
          <Award size={130} className="animate-pulse stroke-[1]" />
        </div>
      )}

      <div className="absolute right-5 top-5 flex items-center gap-2">
        <span className="text-[10px] font-black tracking-wider text-emerald-400/40">
          {quadrantMini}
        </span>
        <span className={cn('inline-block h-5 w-5 rounded-full border shadow-lg', cueBallClassName(player.cueBallColor))} />
      </div>

      <div>
        <span className="mb-2 inline-block rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
          {quadrantLabel}
        </span>
        <div className="flex items-center gap-1.5">
          <h3 className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-white">
            {player.name}
            {player.isMe && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                나
              </span>
            )}
          </h3>
          {isActive && !player.isFinished && (
            <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
          )}
        </div>
        <span className={cn(
          'mt-1 block text-[10px] font-bold uppercase tracking-widest',
          player.isFinished ? 'text-amber-400' : 'text-emerald-400/60',
        )}>
          {player.isFinished ? '경기 완료 (FINISHED)' : isActive ? '공격 중 (ACTIVE)' : '대기'}
        </span>
        <div className={cn(
          'mb-2 mt-4 h-px w-full transition-all duration-300',
          isActive ? 'bg-emerald-400/20' : 'bg-emerald-700/10',
        )} />
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'font-mono text-6xl font-black leading-none tracking-tight md:text-7xl',
              player.isFinished
                ? 'text-amber-400'
                : player.isCushionPhase
                  ? (player.cushionScore || 0) >= lastThreeCushions
                    ? 'animate-pulse text-emerald-300'
                    : 'text-orange-400'
                  : isActive
                    ? 'text-emerald-300'
                    : 'text-white',
            )}>
              {player.currentScore}
            </span>
            <span className="font-mono text-sm font-bold text-emerald-100/50">
              / {player.targetScore}
            </span>
          </div>
          {gameType === '4-Ball' && lastThreeCushions > 0 && player.isCushionPhase && !player.isFinished && (
            <div className="mt-2 text-[11px] font-bold text-orange-400">
              마무리 쓰리쿠션 ({player.cushionScore || 0} / {lastThreeCushions})
            </div>
          )}
        </div>

        {player.isFinished ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-950 shadow-lg">
            COMPLETE
          </span>
        ) : isActive ? (
          <span className="inline-flex animate-bounce items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#07241c] shadow-lg">
            TURN
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function LiveGameScoreboard({
  players,
  currentInning,
  activePlayerIndex,
  gameTime,
  isPaused,
  soundEnabled,
  hasGameRoom,
  liveStateError,
  isLiveStateReady,
  isGameRoomHost,
  canControl,
  enableShotClock,
  shotClockTime,
  shotClockLimit,
  gameType,
  gameMode,
  playerCount,
  lastThreeCushions,
  onToggleSound,
  onTogglePause,
  onRequestFinish,
  onTeamCushionTransition,
  onActivePlayerCushionTransition,
  onScoreChange,
  onEndInning,
}: LiveGameScoreboardProps) {
  const activePlayer = players[activePlayerIndex];
  const isTeamGame = gameMode === 'Team' && playerCount === 4;
  const formattedGameTime = `${Math.floor(gameTime / 60).toString().padStart(2, '0')}:${(gameTime % 60).toString().padStart(2, '0')}`;
  const shotClockProgress = shotClockLimit > 0 ? (shotClockTime / shotClockLimit) * 100 : 0;

  const findPlayer = (id: number) => players.find((player) => player.id === id);
  const teamScore = (ids: number[]) => ids.reduce((sum, id) => sum + (findPlayer(id)?.currentScore || 0), 0);
  const teamCushionScore = (ids: number[]) => ids.reduce((sum, id) => sum + (findPlayer(id)?.cushionScore || 0), 0);
  const isTeamCushionPhase = (ids: number[]) => ids.every((id) => findPlayer(id)?.isCushionPhase);

  const renderTeamSummary = (teamId: 'A' | 'B', ids: number[]) => {
    const isTeamA = teamId === 'A';

    return (
      <div className={cn(
        'flex items-center justify-between rounded-3xl border p-4 shadow-lg',
        isTeamA
          ? 'border-emerald-500/30 bg-[#0c4032] shadow-emerald-500/5'
          : 'border-red-500/20 bg-[#4a1c1c]/25',
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black',
            isTeamA
              ? 'border-emerald-500/25 bg-emerald-500/15 text-emerald-400'
              : 'border-red-500/25 bg-red-500/15 text-red-400',
          )}>
            {isTeamA ? '1팀' : '2팀'}
          </div>
          <div className="text-left">
            <span className={cn(
              'block text-[10px] font-bold uppercase tracking-widest',
              isTeamA ? 'text-emerald-400' : 'text-red-100',
            )}>
              {isTeamA ? '1팀 (동료팀)' : '2팀 (상대팀)'} · 합산
            </span>
            <span className={cn('block text-xs font-black', isTeamA ? 'text-emerald-100/95' : 'text-red-100/95')}>
              {findPlayer(ids[0])?.name || `${ids[0]}번`} + {findPlayer(ids[1])?.name || `${ids[1]}번`}
            </span>
          </div>
        </div>

        {gameType === '4-Ball' && lastThreeCushions > 0 ? (
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-white/40">알다마</span>
              <span className="font-mono text-2xl font-black text-white">{teamScore(ids)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-bold uppercase tracking-widest text-orange-400/80">3쿠션</span>
              <span className="font-mono text-2xl font-black text-orange-400">{teamCushionScore(ids)}</span>
              <span className="block text-[10px] font-bold text-orange-400/40">목표 {lastThreeCushions}개</span>
            </div>
            <button
              type="button"
              onClick={() => onTeamCushionTransition(teamId)}
              disabled={!canControl}
              className={cn(
                'shrink-0 rounded-2xl border px-3 py-1.5 text-[10px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-40',
                isTeamCushionPhase(ids)
                  ? 'border-amber-300 bg-amber-400 text-zinc-950'
                  : 'border-orange-500/20 bg-orange-500/15 text-orange-400 hover:bg-orange-500/30',
              )}
            >
              3쿠션 전환
            </button>
          </div>
        ) : (
          <div className="shrink-0 text-right">
            <span className="block text-[9px] font-bold uppercase tracking-widest text-white/40">합산 현황</span>
            <span className="font-mono text-2xl font-black text-white">{teamScore(ids)}</span>
          </div>
        )}
      </div>
    );
  };

  const playerCard = (player: LiveScoreboardPlayer) => {
    const index = players.findIndex((candidate) => candidate.id === player.id);
    const labels = ['왼쪽 위 (1P)', '오른쪽 위 (2P)', '왼쪽 아래 (3P)', '오른쪽 아래 (4P)'];
    const miniLabels = ['↖', '↗', '↙', '↘'];

    return (
      <React.Fragment key={player.id}>
        <PlayerScoreCard
          player={player}
          isActive={index === activePlayerIndex}
          quadrantLabel={labels[index] || `${index + 1}P`}
          quadrantMini={miniLabels[index] || ''}
          gameType={gameType}
          lastThreeCushions={lastThreeCushions}
        />
      </React.Fragment>
    );
  };

  if (!activePlayer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#134739] bg-[#07241c] px-6 py-4 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="text-left">
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-400">이닝 (INNING)</span>
            <p className="font-mono text-xl font-black text-white">{currentInning}회</p>
          </div>
          <div className="hidden h-8 w-px bg-[#134739] sm:block" />
          <div className="flex items-center gap-2">
            <Timer className="shrink-0 text-emerald-400" size={18} />
            <div className="text-left">
              <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-500/60">누적 경기 시간</span>
              <p className="font-mono text-lg font-bold text-white">{formattedGameTime}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className={cn(
              'rounded-xl border p-2.5 transition-colors',
              soundEnabled
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-500',
            )}
            title={soundEnabled ? '소리 끄기' : '소리 켜기'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            disabled={!canControl}
            className={cn(
              'rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              isPaused
                ? 'border-amber-400 bg-amber-500 text-zinc-950'
                : 'border-[#227764] bg-[#144b3c] text-emerald-300 hover:text-white',
            )}
          >
            {isPaused ? '경기 재개' : '일시정지'}
          </button>
          <button
            type="button"
            onClick={onRequestFinish}
            disabled={!canControl}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-md transition-all hover:scale-105 hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trophy size={14} />
            <span>경기 종료</span>
          </button>
        </div>
      </div>

      {hasGameRoom && (
        <div className={cn(
          'flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold',
          liveStateError
            ? 'border-red-500/25 bg-red-500/10 text-red-300'
            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
        )}>
          {liveStateError ? (
            <AlertCircle size={15} className="shrink-0" />
          ) : isLiveStateReady ? (
            <CheckCircle2 size={15} className="shrink-0" />
          ) : (
            <Hourglass size={15} className="shrink-0 animate-pulse" />
          )}
          <span>
            {liveStateError || (!isLiveStateReady
              ? '실시간 점수판을 동기화하고 있습니다.'
              : isGameRoomHost
                ? '실시간 점수판이 연결되었습니다.'
                : '방장의 점수판을 실시간으로 보고 있습니다.')}
          </span>
        </div>
      )}

      {enableShotClock && (
        <div className="rounded-full border border-emerald-950/50 bg-zinc-950/40 p-1.5">
          <div className="mb-1 flex items-center justify-between px-4">
            <span className="text-[10px] font-bold tracking-widest text-[#9edac3]">이닝 제한시간 (SHOT CLOCK)</span>
            <span className={cn(
              'font-mono text-sm font-black',
              shotClockTime <= 10 ? 'animate-ping text-lg text-red-400' : 'text-emerald-300',
            )}>
              {shotClockTime}초
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-900">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${shotClockProgress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              className={cn(
                'h-full rounded-full transition-all duration-300',
                shotClockTime <= 8
                  ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                  : shotClockTime <= 15
                    ? 'bg-amber-500'
                    : 'bg-emerald-500',
              )}
            />
          </div>
        </div>
      )}

      {isTeamGame && (
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {renderTeamSummary('A', [1, 3])}
          {renderTeamSummary('B', [2, 4])}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {isTeamGame ? (
          <>
            <div className="space-y-6">{players.filter((player) => [1, 3].includes(player.id)).map(playerCard)}</div>
            <div className="space-y-6">{players.filter((player) => [2, 4].includes(player.id)).map(playerCard)}</div>
          </>
        ) : players.map(playerCard)}
      </div>

      <div className="relative rounded-[3rem] border border-[#1a5d4e] bg-[#0b3c2e] p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between border-b border-[#1a5d4e] pb-4">
          <div className="flex items-center gap-3">
            <span className={cn('h-4 w-4 rounded-full border shadow-sm', cueBallClassName(activePlayer.cueBallColor))} />
            <h3 className="text-lg font-black text-white">
              {activePlayer.name} <span className="text-sm font-normal text-[#00ffa2]">선수 공격 중</span>
            </h3>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {gameType === '4-Ball' && lastThreeCushions > 0 && !activePlayer.isCushionPhase && !isTeamGame && (
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-[#e9a65a]/30 bg-[#144b3c]/50 p-4 sm:flex-row">
              <div className="w-full text-left sm:w-auto">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">4구 진행 상태 제어</span>
                <p className="text-sm font-bold leading-tight text-emerald-100">일반 볼 점수 획득 단계 진행 중</p>
              </div>
              <button
                type="button"
                onClick={onActivePlayerCushionTransition}
                disabled={!canControl}
                className="w-full rounded-xl border bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-black text-zinc-950 shadow-md transition-all hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                3쿠션 전환
              </button>
            </div>
          )}

          {gameType === '4-Ball' && lastThreeCushions > 0 && activePlayer.isCushionPhase && (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-950/40 p-4 text-center">
              <p className="flex animate-pulse items-center justify-center gap-2 text-sm font-black text-orange-400">
                현재 마무리 쓰리쿠션 단계 진행 중 ({lastThreeCushions}쿠션 득점 필요)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onScoreChange(1)}
              disabled={isPaused || !canControl}
              className={cn(
                'flex h-20 flex-col items-center justify-center gap-1 rounded-2xl font-black shadow-lg transition-all hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40',
                activePlayer.isCushionPhase
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 hover:from-amber-400 hover:to-orange-400'
                  : 'bg-emerald-500 text-[#092e23] hover:bg-emerald-400',
              )}
            >
              <Plus size={24} />
              <span className="text-sm">{activePlayer.isCushionPhase ? '3쿠션 득점' : '1점 득점'}</span>
            </button>
            <button
              type="button"
              onClick={() => onScoreChange(-1)}
              disabled={isPaused || !canControl}
              className={cn(
                'flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border font-bold transition-all hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40',
                activePlayer.isCushionPhase
                  ? 'border-orange-500/30 bg-[#2b1f13] text-orange-400 hover:bg-orange-500/10 hover:text-orange-300'
                  : 'border-[#2d8a75]/30 bg-[#1a3830] text-emerald-500 hover:bg-red-500/10 hover:text-red-300',
              )}
            >
              <Minus size={24} />
              <span className="text-sm">{activePlayer.isCushionPhase ? '3쿠션 감점 (수정)' : '1점 감점 (수정)'}</span>
            </button>
            <button
              type="button"
              onClick={onEndInning}
              disabled={isPaused || !canControl}
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600 text-white shadow-md transition-all hover:-translate-y-1 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={24} />
              <span className="text-sm font-bold">이닝 완료 / 교대</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
