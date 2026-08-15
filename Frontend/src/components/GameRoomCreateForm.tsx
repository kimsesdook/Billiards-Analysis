import type { FormEventHandler } from 'react';
import { Play, RefreshCw, Target, Trophy, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import type { GameMode, GameType } from '../types';

type PlayerCount = 2 | 3 | 4;
type LastThreeCushions = 0 | 1 | 2;

type GameRoomCreateFormProps = {
  roomName: string;
  gameMode: GameMode;
  playerCount: PlayerCount;
  gameType: GameType;
  lastThreeCushions: LastThreeCushions;
  isSubmitting: boolean;
  errorMessage: string | null;
  onRoomNameChange: (roomName: string) => void;
  onGameModeChange: (gameMode: GameMode) => void;
  onPlayerCountChange: (playerCount: PlayerCount) => void;
  onGameTypeChange: (gameType: GameType) => void;
  onLastThreeCushionsChange: (lastThreeCushions: LastThreeCushions) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

const playerCounts: PlayerCount[] = [2, 3, 4];
const lastThreeCushionOptions: LastThreeCushions[] = [0, 1, 2];

export function GameRoomCreateForm({
  roomName,
  gameMode,
  playerCount,
  gameType,
  lastThreeCushions,
  isSubmitting,
  errorMessage,
  onRoomNameChange,
  onGameModeChange,
  onPlayerCountChange,
  onGameTypeChange,
  onLastThreeCushionsChange,
  onSubmit,
}: GameRoomCreateFormProps) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <RefreshCw size={12} className="animate-spin" />
          실시간 경기방 개설
        </span>
        <h1 className="flex items-center justify-center gap-2 text-3xl font-black tracking-tight text-white">
          <Target className="text-emerald-400" size={28} />
          당구 게임방 생성
        </h1>
        <p className="mt-1 text-xs font-medium text-emerald-100/60">
          선수들의 핸디 정보를 입력하고 실시간 턴제 스코어보드를 시작하세요.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2.5rem] border border-[#1a5d4e] bg-[#0b3c2e] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-5">
          <Trophy size={140} className="rotate-12 text-emerald-400" />
        </div>

        <form onSubmit={onSubmit} className="relative z-10 space-y-6 text-left text-emerald-50">
          <div>
            <label htmlFor="game-room-name" className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-400/85">
              게임방 이름
            </label>
            <input
              id="game-room-name"
              type="text"
              required
              maxLength={50}
              value={roomName}
              onChange={(event) => onRoomNameChange(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#1d6352] bg-[#144b3c] px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400 disabled:opacity-60"
              placeholder="게임방 이름을 입력하세요"
            />
          </div>

          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#e9a65a]">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-orange-400" />
              경기 방식
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['Individual', 'Team'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={gameMode === mode}
                  onClick={() => onGameModeChange(mode)}
                  disabled={isSubmitting}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    gameMode === mode
                      ? 'border-emerald-400 bg-emerald-500 font-black text-[#0a3d2e] shadow-lg shadow-emerald-500/10'
                      : 'border-[#1d6352] bg-[#144b3c] text-emerald-100/60 hover:text-white',
                  )}
                >
                  <Users size={14} />
                  {mode === 'Individual' ? '개인전' : '2:2 복식 팀전'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-400/85">경기 인원</p>
            {gameMode === 'Team' ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/30 bg-[#144b3c]/50 p-3.5 text-center text-xs font-black text-emerald-300">
                <Users size={14} className="shrink-0 text-emerald-400" />
                복식 팀전은 4인 플레이로 진행합니다.
              </div>
            ) : (
              <div className="flex rounded-2xl border border-[#1d6352] bg-[#144b3c] p-1">
                {playerCounts.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={playerCount === count}
                    onClick={() => onPlayerCountChange(count)}
                    disabled={isSubmitting}
                    className={cn(
                      'flex-1 rounded-xl py-3 text-center text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      playerCount === count
                        ? 'bg-emerald-500 font-extrabold text-[#0a3d2e] shadow-md'
                        : 'text-emerald-100/50 hover:text-white',
                    )}
                  >
                    {count}인 플레이
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-400/85">경기 종목</p>
            <div className="grid grid-cols-2 gap-3">
              {(['3-Cushion', '4-Ball'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={gameType === type}
                  onClick={() => onGameTypeChange(type)}
                  disabled={isSubmitting}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                    gameType === type
                      ? 'border-emerald-400 bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/10'
                      : 'border-[#1d6352] bg-[#144b3c] text-emerald-100/60 hover:text-white',
                  )}
                >
                  <span className={cn('h-2.5 w-2.5 rounded-full', gameType === type ? 'bg-[#0a3d2e]' : 'bg-[#1d6352]')} />
                  {type === '3-Cushion' ? '3구' : '4구'}
                </button>
              ))}
            </div>
          </div>

          {gameType === '4-Ball' && (
            <div className="rounded-2xl border border-dashed border-[#e9a65a]/30 bg-[#144b3c]/35 p-4">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#e9a65a]">
                <Target size={14} className="text-orange-400" />
                마지막 쓰리쿠션 개수
              </p>
              <div className="grid grid-cols-3 gap-2">
                {lastThreeCushionOptions.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={lastThreeCushions === count}
                    onClick={() => onLastThreeCushionsChange(count)}
                    disabled={isSubmitting}
                    className={cn(
                      'rounded-xl border py-2.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60',
                      lastThreeCushions === count
                        ? 'border-[#e9a65a] bg-[#e9a65a]/20 font-black text-[#ffd6aa] shadow-lg'
                        : 'border-[#1d6352] bg-[#144b3c] text-emerald-100/40 hover:border-[#e9a65a]/30',
                    )}
                  >
                    {count === 0 ? '쿠션 없음' : `마지막 ${count}쿠션`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && <p className="text-xs font-semibold text-rose-200" role="alert">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-black text-[#0a3d2e] shadow-xl transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {isSubmitting ? '게임방 생성 중...' : '게임방 만들기'}
          </button>
        </form>
      </div>
    </div>
  );
}
