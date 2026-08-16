import {
  Activity,
  ArrowLeft,
  Check,
  Copy,
  Hourglass,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Fragment } from 'react';
import type { GameRoom } from '../api/gameRooms';
import { cn } from '../lib/utils';
import type { GameMode, GameType } from '../types';

export type LobbyPlayer = {
  id: number;
  memberId?: number;
  name: string;
  role: string;
  isJoined: boolean;
  isReady: boolean;
  cueBallColor: string;
  targetScore: number;
  isMe: boolean;
};

export type LobbyFriend = {
  id: number;
  name: string;
  threeBallHandicap: number;
  fourBallHandicap: number;
};

export type LobbyLog = {
  id: string | number;
  text: string;
  time: string;
  type?: 'system' | 'announcement';
};

type GameRoomLobbyProps = {
  roomName: string;
  lobbyCode: string;
  copySuccess: boolean;
  errorMessage: string | null;
  players: LobbyPlayer[];
  playerCount: 2 | 3 | 4;
  gameType: GameType;
  gameMode: GameMode;
  logs: LobbyLog[];
  friends: LobbyFriend[];
  friendsLoading: boolean;
  friendsError: string | null;
  invitedFriendIds: number[];
  invitationSendingMemberId: number | null;
  hasPersistedRoom: boolean;
  isHost: boolean;
  roomStatus: GameRoom['status'] | null;
  roomAction: 'ready' | 'start' | null;
  onExit: () => void;
  onCopyCode: () => void | Promise<void>;
  onRetryFriends: () => void | Promise<void>;
  onInviteFriend: (friend: LobbyFriend) => void | Promise<void>;
  onToggleReady: () => void | Promise<void>;
  onStartRoom: () => void | Promise<void>;
  onStartLocalGame: () => void;
};

const ballColorStyles: Record<string, string> = {
  white: 'border-zinc-200 bg-white text-zinc-800',
  yellow: 'border-yellow-300 bg-yellow-400 text-yellow-950',
  red: 'border-red-400 bg-red-500 text-white',
  blue: 'border-sky-400 bg-sky-500 text-white',
};

export function GameRoomLobby({
  roomName,
  lobbyCode,
  copySuccess,
  errorMessage,
  players,
  playerCount,
  gameType,
  gameMode,
  logs,
  friends,
  friendsLoading,
  friendsError,
  invitedFriendIds,
  invitationSendingMemberId,
  hasPersistedRoom,
  isHost,
  roomStatus,
  roomAction,
  onExit,
  onCopyCode,
  onRetryFriends,
  onInviteFriend,
  onToggleReady,
  onStartRoom,
  onStartLocalGame,
}: GameRoomLobbyProps) {
  const joinedCount = players.filter((player) => player.isJoined).length;
  const readyCount = players.filter((player) => player.isReady).length;
  const isFull = players.length === playerCount && players.every((player) => player.isJoined);
  const isEveryoneReady = isFull && players.every((player) => player.isReady);
  const currentPlayer = players.find((player) => player.isMe);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20"
      >
        <ArrowLeft size={14} />
        대기방 나가기
      </button>

      <header className="text-center">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-400">
          <Hourglass size={12} className="animate-spin" />
          경기 대기 중
        </span>
        <h1 className="flex items-center justify-center gap-2 text-3xl font-black tracking-tight text-white">
          <Users className="text-emerald-400" size={28} />
          실시간 당구 게임 대기방
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="border border-emerald-400/20 bg-[#0b3c2e] px-3 py-2 font-bold text-emerald-100">{roomName}</span>
          <button
            type="button"
            onClick={() => void onCopyCode()}
            className="inline-flex items-center gap-1.5 border border-amber-400/25 bg-amber-400/10 px-3 py-2 font-mono font-black text-amber-200 transition-colors hover:bg-amber-400/15"
            title="입장 코드 복사"
          >
            {copySuccess ? <Check size={13} /> : <Copy size={13} />}
            {copySuccess ? '복사됨' : lobbyCode}
          </button>
        </div>
        {errorMessage && <p className="mt-3 text-xs font-semibold text-rose-200" role="alert">{errorMessage}</p>}
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <section className="space-y-3" aria-labelledby="lobby-participants-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="lobby-participants-title" className="text-xs font-bold uppercase tracking-widest text-emerald-400/80">
                참가 선수 ({joinedCount}/{playerCount})
              </h2>
              <span className="font-mono text-xs text-emerald-300/60">
                {gameType === '3-Cushion' ? '3구' : '4구'} · {gameMode === 'Individual' ? '개인전' : '팀전'}
              </span>
            </div>
            <LobbyPlayerGrid players={players} gameMode={gameMode} playerCount={playerCount} />
          </section>

          <FriendInvitationPanel
            friends={friends}
            players={players}
            invitedFriendIds={invitedFriendIds}
            invitationSendingMemberId={invitationSendingMemberId}
            isLoading={friendsLoading}
            errorMessage={friendsError}
            onRetry={onRetryFriends}
            onInvite={onInviteFriend}
          />
        </div>

        <LobbyLogPanel logs={logs} hasPersistedRoom={hasPersistedRoom} />
      </div>

      <LobbyActions
        hasPersistedRoom={hasPersistedRoom}
        isHost={isHost}
        currentPlayer={currentPlayer}
        isFull={isFull}
        isEveryoneReady={isEveryoneReady}
        joinedCount={joinedCount}
        readyCount={readyCount}
        playerCount={playerCount}
        roomStatus={roomStatus}
        roomAction={roomAction}
        onToggleReady={onToggleReady}
        onStartRoom={onStartRoom}
        onStartLocalGame={onStartLocalGame}
      />
    </div>
  );
}

function LobbyPlayerGrid({ players, gameMode, playerCount }: { players: LobbyPlayer[]; gameMode: GameMode; playerCount: number }) {
  if (gameMode === 'Team' && playerCount === 4) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TeamColumn title="1팀" playerIds={[1, 3]} players={players} tone="emerald" />
        <TeamColumn title="2팀" playerIds={[2, 4]} players={players} tone="red" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {players.map((player) => (
        <Fragment key={player.id}>
          <LobbyPlayerCard player={player} />
        </Fragment>
      ))}
    </div>
  );
}

function TeamColumn({ title, playerIds, players, tone }: { title: string; playerIds: number[]; players: LobbyPlayer[]; tone: 'emerald' | 'red' }) {
  return (
    <div className={cn('space-y-3 rounded-3xl border p-4', tone === 'emerald' ? 'border-emerald-500/20 bg-[#0a2f26]' : 'border-red-500/10 bg-[#3d1a1a]/15')}>
      <h3 className={cn('text-xs font-black tracking-wider', tone === 'emerald' ? 'text-emerald-400' : 'text-red-400')}>{title}</h3>
      {playerIds.map((id) => {
        const player = players.find((candidate) => candidate.id === id);
        return player ? (
          <Fragment key={player.id}>
            <LobbyPlayerCard player={player} />
          </Fragment>
        ) : null;
      })}
    </div>
  );
}

function LobbyPlayerCard({ player }: { player: LobbyPlayer }) {
  if (!player.isJoined) {
    return (
      <div className="flex h-[112px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#1d6352]/40 bg-[#07241c]/40 p-4 text-center">
        <Plus size={18} className="mb-2 text-emerald-400/40" />
        <span className="text-xs font-black text-emerald-400/50">슬롯 {player.id} 대기 중</span>
      </div>
    );
  }

  return (
    <div className={cn('flex h-[112px] flex-col justify-between rounded-3xl border p-4', player.isReady ? 'border-emerald-400/60 bg-[#0c4032]' : 'border-[#1d6352] bg-[#0b3c2e]')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black', ballColorStyles[player.cueBallColor] || ballColorStyles.white)}>{player.id}</span>
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-black text-white">{player.name}</p>
            <p className="text-[10px] font-bold text-emerald-300/50">{player.role}{player.isMe ? ' · 나' : ''}</p>
          </div>
        </div>
        <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', player.isReady ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400')}>
          {player.isReady ? 'READY' : 'WAITING'}
        </span>
      </div>
      <p className="text-left text-[10px] font-bold text-emerald-100/50">목표 점수 {player.targetScore}점</p>
    </div>
  );
}

function FriendInvitationPanel({
  friends,
  players,
  invitedFriendIds,
  invitationSendingMemberId,
  isLoading,
  errorMessage,
  onRetry,
  onInvite,
}: {
  friends: LobbyFriend[];
  players: LobbyPlayer[];
  invitedFriendIds: number[];
  invitationSendingMemberId: number | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void | Promise<void>;
  onInvite: (friend: LobbyFriend) => void | Promise<void>;
}) {
  const openSlotCount = players.filter((player) => !player.isJoined).length;
  const invitationLimitReached = invitedFriendIds.length >= openSlotCount;

  return (
    <section className="rounded-3xl border border-[#1d6352]/50 bg-[#0b3c2e]/60 p-5 text-left" aria-labelledby="lobby-friends-title">
      <h2 id="lobby-friends-title" className="mb-3 flex items-center gap-1.5 border-b border-[#1a5d4e]/40 pb-2 text-xs font-extrabold uppercase tracking-widest text-[#ffd6aa]">
        <Users size={14} className="text-emerald-400" />
        친구 초대 ({friends.length}명)
      </h2>
      {isLoading ? (
        <div className="flex min-h-24 items-center justify-center gap-2 text-xs font-semibold text-emerald-200/70"><Activity size={15} className="animate-pulse" />불러오는 중</div>
      ) : errorMessage ? (
        <div className="flex min-h-24 flex-col items-center justify-center gap-3 text-center">
          <p className="text-xs font-semibold text-rose-200">{errorMessage}</p>
          <button type="button" onClick={() => void onRetry()} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300"><RefreshCw size={13} />다시 불러오기</button>
        </div>
      ) : friends.length === 0 ? (
        <p className="py-8 text-center text-xs font-semibold text-emerald-200/60">초대할 친구가 없습니다.</p>
      ) : (
        <div className="grid max-h-[160px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {friends.map((friend) => {
            const invited = invitedFriendIds.includes(friend.id);
            const sending = invitationSendingMemberId === friend.id;
            const disabled = invited || sending || invitationLimitReached;
            return (
              <div key={friend.id} className="flex items-center justify-between rounded-xl border border-[#1a5d4e]/30 bg-[#0a3327]/60 p-2.5 text-xs">
                <span className="truncate font-bold text-white">{friend.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onInvite(friend)}
                  aria-label={`${friend.name}에게 경기 초대`}
                  className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-[#0a3d2e] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {sending ? '전송 중' : invited ? '응답 대기' : invitationLimitReached ? '대기 중' : '초대'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LobbyLogPanel({ logs, hasPersistedRoom }: { logs: LobbyLog[]; hasPersistedRoom: boolean }) {
  return (
    <aside className="flex h-[450px] flex-col justify-between rounded-3xl border border-[#1a5d4e] bg-[#0b3c2e] p-5 shadow-xl">
      <div className="min-h-0">
        <h2 className="flex items-center gap-1.5 border-b border-[#1a5d4e]/40 pb-2 text-xs font-extrabold uppercase tracking-widest text-[#ffd6aa]"><MessageSquare size={14} className="text-orange-400" />접속 현황</h2>
        <div className="mt-3 h-[320px] space-y-2 overflow-y-auto pr-1 text-left font-mono text-[11px]">
          {logs.map((log) => (
            <div key={log.id} className={cn('rounded-xl border p-2.5', log.type === 'system' ? 'border-emerald-900/40 bg-emerald-950/40 text-emerald-300' : log.type === 'announcement' ? 'border-orange-500/10 bg-orange-500/5 text-orange-300' : 'border-[#1d6352]/30 bg-[#144b3c]/35 text-emerald-50/95')}>
              <p>{log.text}</p>
              <span className="mt-1 block text-right text-[8px] text-emerald-300/35">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-[#1a5d4e]/30 pt-2 text-center text-[9px] text-[#ffd6aa]/45">
        {hasPersistedRoom ? '모든 참가자가 준비하면 방장이 경기를 시작할 수 있습니다.' : '모든 참가자의 입장을 기다리고 있습니다.'}
      </p>
    </aside>
  );
}

function LobbyActions({
  hasPersistedRoom,
  isHost,
  currentPlayer,
  isFull,
  isEveryoneReady,
  joinedCount,
  readyCount,
  playerCount,
  roomStatus,
  roomAction,
  onToggleReady,
  onStartRoom,
  onStartLocalGame,
}: {
  hasPersistedRoom: boolean;
  isHost: boolean;
  currentPlayer?: LobbyPlayer;
  isFull: boolean;
  isEveryoneReady: boolean;
  joinedCount: number;
  readyCount: number;
  playerCount: number;
  roomStatus: GameRoom['status'] | null;
  roomAction: 'ready' | 'start' | null;
  onToggleReady: () => void | Promise<void>;
  onStartRoom: () => void | Promise<void>;
  onStartLocalGame: () => void;
}) {
  if (!hasPersistedRoom) {
    return (
      <div className="flex justify-center pt-2">
        <button type="button" onClick={onStartLocalGame} disabled={!isFull} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-12 py-4 text-sm font-black text-[#07241c] disabled:cursor-not-allowed disabled:opacity-50">
          <Play size={16} fill="currentColor" />경기 시작하기 {!isFull && `(${joinedCount}/${playerCount})`}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
      {!isHost && currentPlayer && (
        <button
          type="button"
          onClick={() => void onToggleReady()}
          disabled={Boolean(roomAction) || roomStatus !== 'WAITING'}
          className={cn('inline-flex w-full items-center justify-center gap-2 rounded-xl border px-8 py-4 text-sm font-black sm:w-auto', currentPlayer.isReady ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-emerald-400 bg-emerald-500 text-[#07241c]', 'disabled:cursor-not-allowed disabled:opacity-60')}
        >
          {roomAction === 'ready' ? <RefreshCw size={16} className="animate-spin" /> : currentPlayer.isReady ? <RotateCcw size={16} /> : <Check size={16} />}
          {roomAction === 'ready' ? '변경 중...' : currentPlayer.isReady ? '준비 해제' : '준비 완료'}
        </button>
      )}
      {isHost ? (
        <button
          type="button"
          onClick={() => void onStartRoom()}
          disabled={!isEveryoneReady || Boolean(roomAction) || roomStatus !== 'WAITING'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-12 py-4 text-sm font-black text-[#07241c] disabled:cursor-not-allowed disabled:border disabled:border-[#1d6352] disabled:bg-transparent disabled:text-emerald-300/60 sm:w-auto"
        >
          {roomAction === 'start' ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
          {roomAction === 'start' ? '시작 요청 중...' : '경기 시작하기'}
          {!isFull ? `(${joinedCount}/${playerCount} 입장)` : !isEveryoneReady ? `(${readyCount}/${playerCount} 준비)` : ''}
        </button>
      ) : (
        <span className="text-xs font-bold text-emerald-200/65">{currentPlayer?.isReady ? '방장이 경기를 시작하기를 기다리고 있습니다.' : '준비를 완료해 주세요.'}</span>
      )}
    </div>
  );
}
