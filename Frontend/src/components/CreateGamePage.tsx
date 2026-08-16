import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Play, AlertCircle, RefreshCw, CheckCircle2, Award, Hourglass, Activity
} from 'lucide-react';
import { GameRecord, GameRecordDraft, GameType, GameMode } from '../types';
import { getFriends } from '../api/friends';
import { createGameInvitation } from '../api/gameInvitations';
import { getStoredAuthSession } from '../api/authStorage';
import {
  cancelGameRoom,
  createGameRoom,
  finishGameRoom,
  getGameRoom,
  getGameRoomLiveState,
  startGameRoom,
  updateGameRoomLiveState,
  updateGameRoomReady,
  type GameRoom,
  type GameRoomLiveState,
  type GameRoomLiveStateUpdatePayload,
} from '../api/gameRooms';
import { connectGameRoomSocket } from '../api/realtimeGameRooms';
import { issueGameRoomWebSocketTicket } from '../api/websocketTickets';
import { ApiClientError, getApiErrorMessage } from '../api/client';
import { cn } from '../lib/utils';
import { buildGameRoomFinishPayload } from '../lib/gameRoomCompletion';
import {
  clearActiveGameState,
  loadActiveGameState,
  saveActiveGameState,
  type PersistedActiveGameState,
} from '../lib/activeGameStorage';
import {
  activatePlayerCushionPhase,
  advanceScoreboardTurn,
  applyScoreChange,
  buildTurnHistoryEntry,
  createScoreboardSnapshot,
  selectScoreboardWinner,
  toggleTeamCushionPhase,
  type ScoreboardPlayer,
  type ScoreboardSnapshot,
} from '../lib/scoringEngine';
import { motion, AnimatePresence } from 'motion/react';
import { GameRoomCreateForm } from './GameRoomCreateForm';
import {
  GameRoomLobby,
  type LobbyFriend,
  type LobbyLog,
  type LobbyPlayer,
} from './GameRoomLobby';
import { LiveGameScoreboard } from './LiveGameScoreboard';

interface CreateGamePageProps {
  onAdd: (record: GameRecordDraft) => Promise<GameRecord | void> | GameRecord | void;
}

type ActivePlayer = ScoreboardPlayer;

type GameInvitationNavigationState = {
  acceptedInvitation?: {
    opponentName: string;
    opponentTargetScore: number;
    gameType: GameType;
    gameRoomId: number | null;
  };
};

type GameRoomLiveStateDraft = Omit<GameRoomLiveStateUpdatePayload, 'stateVersion'>;

const toLiveStateDraft = (liveState: GameRoomLiveState): GameRoomLiveStateDraft => ({
  currentInning: liveState.currentInning,
  activeMemberId: liveState.activeMemberId,
  scores: liveState.scores.map((score) => ({
    memberId: score.memberId,
    currentScore: score.currentScore,
    cushionScore: score.cushionScore,
    highRun: score.highRun,
  })),
});

const getLiveStateSignature = (draft: GameRoomLiveStateDraft) => JSON.stringify({
  currentInning: draft.currentInning,
  activeMemberId: draft.activeMemberId,
  scores: [...draft.scores].sort((left, right) => left.memberId - right.memberId),
});

const CUE_BALL_COLORS = ['white', 'yellow', 'red', 'blue'];

const createLobbyPlayers = (gameRoom: GameRoom, currentMemberId?: number): LobbyPlayer[] =>
  Array.from({ length: gameRoom.playerCapacity }, (_, index) => {
    const participant = gameRoom.participants[index];

    if (!participant) {
      return {
        id: index + 1,
        name: `대기 선수 ${index + 1}`,
        role: '참가자',
        isJoined: false,
        isReady: false,
        cueBallColor: CUE_BALL_COLORS[index],
        targetScore: gameRoom.gameType === '3-Cushion' ? 15 : 20,
        isMe: false,
      };
    }

    return {
      id: index + 1,
      memberId: participant.memberId,
      name: participant.nickname,
      role: participant.role === 'HOST' ? '방장' : '참가자',
      isJoined: true,
      isReady: participant.ready,
      cueBallColor: CUE_BALL_COLORS[index],
      targetScore: participant.targetScore,
      isMe: participant.memberId === currentMemberId,
    };
  });

export function CreateGamePage({ onAdd }: CreateGamePageProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Sound Effects Helper using Web Audio API ---
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context might be blocked or unsupported
    }
  };

  const cueClickSound = () => playSound(640, 0.08, 'triangle');
  const turnSwitchSound = () => playSound(380, 0.15, 'sine');
  const levelSucceededSound = () => playSound(523.25, 0.4, 'sine'); // C5 tone for victory
  const warningSound = () => playSound(280, 0.25, 'sawtooth');

  // --- Form Setup States ---
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('billiards_game_active_state_changed', {
        detail: { isPlaying }
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('billiards_game_active_state_changed', {
          detail: { isPlaying: false }
        })
      );
    };
  }, [isPlaying]);
  const [isLobby, setIsLobby] = useState<boolean>(false);
  const [gameRoomId, setGameRoomId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState(() =>
    `${localStorage.getItem('billiards_nickname') || '사용자'}의 게임방`
  );
  const [isGameRoomHost, setIsGameRoomHost] = useState(false);
  const [gameRoomStatus, setGameRoomStatus] = useState<GameRoom['status'] | null>(null);
  const [gameRoomAction, setGameRoomAction] = useState<'ready' | 'start' | null>(null);
  const [isGameRoomCreating, setIsGameRoomCreating] = useState(false);
  const [gameRoomError, setGameRoomError] = useState<string | null>(null);
  const [isLiveStateReady, setIsLiveStateReady] = useState(false);
  const [liveStateError, setLiveStateError] = useState<string | null>(null);
  const [lobbyCode, setLobbyCode] = useState<string>('');
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [lobbyLogs, setLobbyLogs] = useState<LobbyLog[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const [billiardFriends, setBilliardFriends] = useState<LobbyFriend[]>([]);
  const [isBilliardFriendsLoading, setIsBilliardFriendsLoading] = useState(false);
  const [billiardFriendsError, setBilliardFriendsError] = useState<string | null>(null);
  const [invitedFriendIds, setInvitedFriendIds] = useState<number[]>([]);
  const [invitationSendingMemberId, setInvitationSendingMemberId] = useState<number | null>(null);

  // Custom Iframe-Safe Confirmation states
  const [showExitLobbyConfirm, setShowExitLobbyConfirm] = useState<boolean>(false);
  const [showCancelGameConfirm, setShowCancelGameConfirm] = useState<boolean>(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState<boolean>(false);
  const [resumeData, setResumeData] = useState<PersistedActiveGameState | null>(null);

  const [type, setType] = useState<GameType>('3-Cushion');
  const [mode, setMode] = useState<GameMode>('Individual');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [lastThreeCushions, setLastThreeCushions] = useState<0 | 1 | 2>(0);
  const [notes, setNotes] = useState<string>('');

  const loadBilliardFriends = useCallback(async () => {
    setIsBilliardFriendsLoading(true);
    setBilliardFriendsError(null);

    try {
      const friends = await getFriends();
      setBilliardFriends(friends.map(({ friend }) => ({
        id: friend.id,
        name: friend.nickname,
        threeBallHandicap: friend.threeBallHandicap,
        fourBallHandicap: friend.fourBallHandicap,
      })));
    } catch (error) {
      setBilliardFriends([]);
      setBilliardFriendsError(getApiErrorMessage(error));
    } finally {
      setIsBilliardFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilliardFriends();
  }, [loadBilliardFriends]);

  // Individual player information setup in room creation
  const [p1Name, setP1Name] = useState<string>(() => {
    return localStorage.getItem('billiards_nickname') || '플레이어 1';
  });
  const [p2Name, setP2Name] = useState<string>('상대 선수');
  const [p3Name, setP3Name] = useState<string>('대기선수 3');
  const [p4Name, setP4Name] = useState<string>('대기선수 4');

  const [p1Target, setP1Target] = useState<number>(20);
  const [p2Target, setP2Target] = useState<number>(20);
  const [p3Target, setP3Target] = useState<number>(20);
  const [p4Target, setP4Target] = useState<number>(20);

  const [startingPlayerIdx, setStartingPlayerIdx] = useState<number>(0);
  const [shotClockLimit, setShotClockLimit] = useState<number>(40); // seconds
  const [enableShotClock, setEnableShotClock] = useState<boolean>(false);

  // --- Live Board Engine States ---
  const [players, setPlayers] = useState<ActivePlayer[]>([]);
  const [currentInning, setCurrentInning] = useState<number>(1);
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [currentTurnPoints, setCurrentTurnPoints] = useState<number>(0); // Points scored in current turn so far
  const [gameTime, setGameTime] = useState<number>(0); // Match elapsed duration in seconds
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [shotClockTime, setShotClockTime] = useState<number>(40);
  const [matchHistory, setMatchHistory] = useState<string[]>([]); // Logger text
  const [stateHistory, setStateHistory] = useState<ScoreboardSnapshot[]>([]); // For Undoing

  // Game completion review overlay state
  const [showFinishedModal, setShowFinishedModal] = useState<boolean>(false);
  const [gameCompletionError, setGameCompletionError] = useState<string | null>(null);
  const [showOrderSelection, setShowOrderSelection] = useState<boolean>(false);
  const [winnerName, setWinnerName] = useState<string>('');

  // --- Timers Refs ---
  const gameTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
  const liveStateRoomIdRef = useRef<number | null>(null);
  const liveStateVersionRef = useRef<number | null>(null);
  const lastSynchronizedLiveStateRef = useRef<string | null>(null);
  const pendingLiveStateRef = useRef<GameRoomLiveStateDraft | null>(null);
  const submittedLiveStateSignaturesRef = useRef<Set<string>>(new Set());
  const liveStateSaveInFlightRef = useRef(false);
  const liveStateSavePromiseRef = useRef<Promise<void> | null>(null);
  const completedGameRoomHandledRef = useRef(false);
  const hasPendingResumeRef = useRef(false);
  const applyLiveGameStateRef = useRef<(liveState: GameRoomLiveState) => void>(() => undefined);
  const acknowledgeLiveGameStateRef = useRef<(liveState: GameRoomLiveState) => void>(() => undefined);
  const isGameRoomHostRef = useRef(isGameRoomHost);
  const isPlayingRef = useRef(isPlaying);

  const exitCompletedGameRoom = useCallback(() => {
    if (completedGameRoomHandledRef.current) {
      return;
    }

    completedGameRoomHandledRef.current = true;
    clearActiveGameState(localStorage);
    setGameRoomStatus('FINISHED');
    setIsPlaying(false);
    setIsLobby(false);
    setShowFinishedModal(false);
    setGameCompletionError(null);
    navigate('/records');
  }, [navigate]);

  const applyGameRoomToLobby = useCallback((gameRoom: GameRoom) => {
    const currentMemberId = getStoredAuthSession()?.member.id;
    const synchronizedPlayers = createLobbyPlayers(gameRoom, currentMemberId);

    setGameRoomId(gameRoom.roomId);
    setRoomName(gameRoom.name);
    setLobbyCode(gameRoom.joinCode);
    setType(gameRoom.gameType);
    setMode(gameRoom.gameMode);
    setPlayerCount(gameRoom.playerCapacity as 2 | 3 | 4);
    setGameRoomStatus(gameRoom.status);
    setLobbyPlayers((currentPlayers) => {
      const currentParticipantIds = currentPlayers
        .filter((player) => player.isJoined)
        .map((player) => player.memberId);
      const synchronizedParticipantIds = synchronizedPlayers
        .filter((player) => player.isJoined)
        .map((player) => player.memberId);
      const participantListUnchanged = currentParticipantIds.length === synchronizedParticipantIds.length
        && currentParticipantIds.every((memberId) => synchronizedParticipantIds.includes(memberId));

      if (!participantListUnchanged) {
        return synchronizedPlayers;
      }

      return currentPlayers.map((currentPlayer) => {
        if (!currentPlayer.isJoined) {
          return currentPlayer;
        }

        const synchronizedPlayer = synchronizedPlayers.find(
          (player) => player.memberId === currentPlayer.memberId
        );
        return synchronizedPlayer
          ? {
              ...currentPlayer,
              name: synchronizedPlayer.name,
              role: synchronizedPlayer.role,
              isReady: synchronizedPlayer.isReady,
              isMe: synchronizedPlayer.isMe,
            }
          : currentPlayer;
      });
    });
    setIsGameRoomHost(gameRoom.hostMemberId === currentMemberId);
  }, []);

  const acknowledgeLiveGameState = useCallback((liveState: GameRoomLiveState) => {
    if (liveState.roomId !== liveStateRoomIdRef.current) {
      return;
    }
    if (
      liveStateVersionRef.current !== null
      && liveState.stateVersion < liveStateVersionRef.current
    ) {
      return;
    }

    liveStateVersionRef.current = liveState.stateVersion;
    lastSynchronizedLiveStateRef.current = getLiveStateSignature(toLiveStateDraft(liveState));
    setIsLiveStateReady(true);
  }, []);

  const applyLiveGameState = useCallback((liveState: GameRoomLiveState) => {
    if (liveState.roomId !== liveStateRoomIdRef.current) {
      return;
    }
    if (
      liveStateVersionRef.current !== null
      && liveState.stateVersion < liveStateVersionRef.current
    ) {
      return;
    }

    acknowledgeLiveGameState(liveState);
    pendingLiveStateRef.current = null;

    const scoresByMemberId = new Map(
      liveState.scores.map((score) => [score.memberId, score]),
    );
    const synchronizedPlayers = players.map((player) => {
      const score = player.memberId ? scoresByMemberId.get(player.memberId) : undefined;
      if (!score) {
        return player;
      }

      const isCushionPhase = type === '4-Ball'
        && lastThreeCushions > 0
        && score.currentScore >= score.targetScore;
      const isFinished = type === '4-Ball' && lastThreeCushions > 0
        ? isCushionPhase && score.cushionScore >= lastThreeCushions
        : score.currentScore >= score.targetScore;

      return {
        ...player,
        targetScore: score.targetScore,
        currentScore: score.currentScore,
        cushionScore: score.cushionScore,
        highRun: score.highRun,
        isCushionPhase,
        isFinished,
      };
    });
    const synchronizedActiveIndex = synchronizedPlayers.findIndex(
      (player) => player.memberId === liveState.activeMemberId,
    );

    setPlayers(synchronizedPlayers);
    setCurrentInning(liveState.currentInning);
    if (synchronizedActiveIndex >= 0) {
      setActivePlayerIndex(synchronizedActiveIndex);
    }
    setCurrentTurnPoints(0);
    setStateHistory([]);
    setLiveStateError(null);
  }, [acknowledgeLiveGameState, lastThreeCushions, players, type]);

  applyLiveGameStateRef.current = applyLiveGameState;
  acknowledgeLiveGameStateRef.current = acknowledgeLiveGameState;
  isGameRoomHostRef.current = isGameRoomHost;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    liveStateRoomIdRef.current = gameRoomId;
    liveStateVersionRef.current = null;
    lastSynchronizedLiveStateRef.current = null;
    pendingLiveStateRef.current = null;
    submittedLiveStateSignaturesRef.current.clear();
    liveStateSaveInFlightRef.current = false;
    liveStateSavePromiseRef.current = null;
    completedGameRoomHandledRef.current = false;
    setIsLiveStateReady(!gameRoomId);
    setLiveStateError(null);
    setGameCompletionError(null);
  }, [gameRoomId]);

  const processPendingLiveState = useCallback((): Promise<void> => {
    const roomId = gameRoomId;
    if (!roomId) {
      return Promise.resolve();
    }
    if (liveStateSavePromiseRef.current) {
      return liveStateSavePromiseRef.current;
    }

    liveStateSaveInFlightRef.current = true;
    const savePromise = (async () => {
      while (pendingLiveStateRef.current && liveStateRoomIdRef.current === roomId) {
        const pendingState = pendingLiveStateRef.current;
        const stateVersion = liveStateVersionRef.current;
        if (stateVersion === null) {
          break;
        }

        pendingLiveStateRef.current = null;
        const pendingStateSignature = getLiveStateSignature(pendingState);
        if (submittedLiveStateSignaturesRef.current.size >= 20) {
          submittedLiveStateSignaturesRef.current.clear();
        }
        submittedLiveStateSignaturesRef.current.add(pendingStateSignature);
        try {
          const updatedState = await updateGameRoomLiveState(roomId, {
            ...pendingState,
            stateVersion,
          });
          if (liveStateRoomIdRef.current !== roomId) {
            return;
          }

          acknowledgeLiveGameState(updatedState);
          window.setTimeout(() => {
            submittedLiveStateSignaturesRef.current.delete(pendingStateSignature);
          }, 5000);
          setLiveStateError(null);
        } catch (error) {
          submittedLiveStateSignaturesRef.current.delete(pendingStateSignature);
          if (error instanceof ApiClientError && error.code === 'ROOM_008') {
            try {
              const latestState = await getGameRoomLiveState(roomId);
              applyLiveGameStateRef.current(latestState);
              setLiveStateError('다른 화면의 변경이 먼저 저장되어 최신 점수판을 다시 불러왔습니다.');
            } catch (refreshError) {
              setLiveStateError(getApiErrorMessage(refreshError));
            }
          } else {
            setLiveStateError(getApiErrorMessage(error));
          }
          break;
        }
      }
    })().finally(() => {
      liveStateSaveInFlightRef.current = false;
      if (liveStateSavePromiseRef.current === savePromise) {
        liveStateSavePromiseRef.current = null;
      }
    });
    liveStateSavePromiseRef.current = savePromise;
    return savePromise;
  }, [acknowledgeLiveGameState, gameRoomId]);

  useEffect(() => {
    if (
      !gameRoomId
      || !isPlaying
      || !isGameRoomHost
      || !isLiveStateReady
      || showOrderSelection
      || players.length === 0
    ) {
      return;
    }

    const activeMemberId = players[activePlayerIndex]?.memberId;
    const hasEveryMemberId = players.every((player) => player.memberId !== undefined);
    if (!activeMemberId || !hasEveryMemberId) {
      return;
    }

    const draft: GameRoomLiveStateDraft = {
      currentInning,
      activeMemberId,
      scores: players.map((player) => ({
        memberId: player.memberId as number,
        currentScore: player.currentScore,
        cushionScore: player.cushionScore || 0,
        highRun: player.highRun,
      })),
    };

    if (getLiveStateSignature(draft) === lastSynchronizedLiveStateRef.current) {
      return;
    }

    pendingLiveStateRef.current = draft;
    void processPendingLiveState();
  }, [
    activePlayerIndex,
    currentInning,
    gameRoomId,
    isGameRoomHost,
    isLiveStateReady,
    isPlaying,
    players,
    processPendingLiveState,
    showOrderSelection,
  ]);

  // Check if there is an active game in local storage that can be resumed
  useEffect(() => {
    const savedActiveGame = loadActiveGameState(localStorage);
    if (savedActiveGame) {
      hasPendingResumeRef.current = true;
      setResumeData(savedActiveGame);
      setShowResumeConfirm(true);
    }
  }, []);

  useEffect(() => {
    const acceptedInvitation = (location.state as GameInvitationNavigationState | null)?.acceptedInvitation;
    if (!acceptedInvitation) {
      return;
    }

    if (acceptedInvitation.gameRoomId) {
      let cancelled = false;

      const loadAcceptedGameRoom = async () => {
        try {
          const gameRoom = await getGameRoom(acceptedInvitation.gameRoomId as number);
          if (cancelled) return;

          applyGameRoomToLobby(gameRoom);
          setLobbyLogs([
            { id: 1, text: `${gameRoom.hostNickname}님의 게임방에 참가했습니다.`, time: '방금 전' },
            { id: 2, text: `${acceptedInvitation.opponentName}님의 경기 초대를 수락했습니다.`, time: '방금 전' },
          ]);
          setGameRoomError(null);
          setIsLobby(true);
          navigate(location.pathname, { replace: true, state: null });
        } catch (error) {
          if (!cancelled) {
            setGameRoomError(getApiErrorMessage(error));
          }
        }
      };

      void loadAcceptedGameRoom();
      return () => {
        cancelled = true;
      };
    }

    const userNickname = localStorage.getItem('billiards_nickname') || '사용자';
    const userHandicap = acceptedInvitation.gameType === '3-Cushion'
      ? parseInt(localStorage.getItem('billiards_dama3') || '200', 10)
      : parseInt(localStorage.getItem('billiards_dama4') || '250', 10);
    const userTargetScore = Math.max(5, Math.floor(userHandicap / 10));

    setType(acceptedInvitation.gameType);
    setMode('Individual');
    setPlayerCount(2);
    setP1Name(userNickname);
    setP1Target(userTargetScore);
    setP2Name(acceptedInvitation.opponentName);
    setP2Target(acceptedInvitation.opponentTargetScore);
    setLobbyPlayers([
      {
        id: 1,
        name: userNickname,
        role: '방장',
        isJoined: true,
        isReady: true,
        cueBallColor: 'white',
        targetScore: userTargetScore,
        isMe: true,
      },
      {
        id: 2,
        name: acceptedInvitation.opponentName,
        role: '참가자',
        isJoined: true,
        isReady: true,
        cueBallColor: 'yellow',
        targetScore: acceptedInvitation.opponentTargetScore,
        isMe: false,
      },
    ]);
    setLobbyCode(`B-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setLobbyLogs([
      { id: 1, text: '대국 방이 생성되었습니다.', time: '방금 전' },
      { id: 2, text: `${acceptedInvitation.opponentName}님이 경기 초대를 수락했습니다.`, time: '방금 전' },
      { id: 3, text: '대국 준비가 완료되었습니다. 경기를 시작해보세요!', time: '방금 전' },
    ]);
    setIsLobby(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [applyGameRoomToLobby, location.pathname, location.state, navigate]);

  useEffect(() => {
    if ((!isLobby && !isPlaying) || !gameRoomId) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByClient = false;
    let receivedEventVersion = 0;

    const synchronizeGameRoom = async () => {
      const eventVersionAtRequest = receivedEventVersion;

      try {
        const gameRoom = await getGameRoom(gameRoomId);
        if (!closedByClient && eventVersionAtRequest === receivedEventVersion) {
          applyGameRoomToLobby(gameRoom);
          if (gameRoom.status === 'FINISHED') {
            exitCompletedGameRoom();
          } else if (gameRoom.status === 'CANCELED') {
            setGameRoomError('방장이 게임방을 종료했습니다.');
          }
        }
      } catch (error) {
        if (!closedByClient) {
          setGameRoomError(getApiErrorMessage(error));
        }
      }
    };

    const synchronizeLiveGameState = async () => {
      try {
        const liveState = await getGameRoomLiveState(gameRoomId);
        if (!closedByClient) {
          applyLiveGameStateRef.current(liveState);
        }
      } catch (error) {
        if (!closedByClient) {
          setLiveStateError(getApiErrorMessage(error));
        }
      }
    };

    const connect = async () => {
      try {
        const { ticket } = await issueGameRoomWebSocketTicket(gameRoomId);
        if (closedByClient) {
          return;
        }

        socket = connectGameRoomSocket({
          ticket,
          roomId: gameRoomId,
          onConnected: () => {
            void synchronizeGameRoom();
            if (isPlayingRef.current) {
              void synchronizeLiveGameState();
            }
          },
          onGameRoomEvent: (eventType, gameRoom) => {
            if (closedByClient) {
              return;
            }

            receivedEventVersion += 1;
            applyGameRoomToLobby(gameRoom);

            if (eventType === 'ROOM_CANCELED') {
              setGameRoomError('방장이 게임방을 종료했습니다.');
            }
            if (eventType === 'GAME_FINISHED') {
              exitCompletedGameRoom();
            }
          },
          onLiveStateEvent: (liveState) => {
            if (closedByClient) {
              return;
            }

            const liveStateSignature = getLiveStateSignature(toLiveStateDraft(liveState));
            const isSubmittedByThisScreen = submittedLiveStateSignaturesRef.current.delete(
              liveStateSignature,
            );

            if (isGameRoomHostRef.current && isSubmittedByThisScreen) {
              acknowledgeLiveGameStateRef.current(liveState);
            } else {
              applyLiveGameStateRef.current(liveState);
            }
          },
          onClose: () => {
            if (closedByClient) {
              return;
            }

            void synchronizeGameRoom();
            if (isPlayingRef.current) {
              void synchronizeLiveGameState();
            }
            reconnectTimer = window.setTimeout(() => void connect(), 3000);
          },
        });
      } catch (error) {
        if (closedByClient) {
          return;
        }
        setGameRoomError(getApiErrorMessage(error));
        reconnectTimer = window.setTimeout(() => void connect(), 3000);
      }
    };

    void connect();

    return () => {
      closedByClient = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [applyGameRoomToLobby, exitCompletedGameRoom, gameRoomId, isLobby, isPlaying]);

  const handleConfirmResume = () => {
    if (!resumeData) return;
    setGameRoomId(resumeData.gameRoomId ?? null);
    setGameRoomStatus(resumeData.gameRoomStatus ?? null);
    setIsGameRoomHost(Boolean(resumeData.isGameRoomHost));
    setType(resumeData.type);
    setMode(resumeData.mode);
    setPlayerCount(resumeData.playerCount);
    setLastThreeCushions(resumeData.lastThreeCushions);
    setPlayers(resumeData.players);
    setCurrentInning(resumeData.currentInning);
    setActivePlayerIndex(resumeData.activePlayerIndex);
    setStartingPlayerIdx(resumeData.startingPlayerIndex);
    setCurrentTurnPoints(resumeData.currentTurnPoints);
    setGameTime(resumeData.gameTime);
    setEnableShotClock(resumeData.enableShotClock);
    setShotClockLimit(resumeData.shotClockLimit);
    setShotClockTime(resumeData.shotClockTime);
    setNotes(resumeData.notes);
    setMatchHistory(resumeData.matchHistory);
    setStateHistory(resumeData.stateHistory);
    setIsPlaying(true);
    setIsPaused(false);
    hasPendingResumeRef.current = false;
    setShowResumeConfirm(false);
    setResumeData(null);
  };

  const handleCancelResume = () => {
    hasPendingResumeRef.current = false;
    clearActiveGameState(localStorage);
    setShowResumeConfirm(false);
    setResumeData(null);
  };

  // Save current active game layout to local Storage whenever states alter (so crash/refresh is safe)
  useEffect(() => {
    if (isPlaying && players.length > 0) {
      saveActiveGameState(localStorage, {
        type,
        mode,
        playerCount,
        lastThreeCushions,
        players,
        currentInning,
        activePlayerIndex,
        startingPlayerIndex: startingPlayerIdx,
        currentTurnPoints,
        gameTime,
        enableShotClock,
        shotClockLimit,
        shotClockTime,
        notes,
        matchHistory,
        stateHistory,
        gameRoomId,
        gameRoomStatus,
        isGameRoomHost,
      });
    } else if (!isPlaying && !hasPendingResumeRef.current) {
      clearActiveGameState(localStorage);
    }
  }, [
    activePlayerIndex,
    currentInning,
    currentTurnPoints,
    enableShotClock,
    gameRoomId,
    gameRoomStatus,
    gameTime,
    isGameRoomHost,
    isPlaying,
    lastThreeCushions,
    matchHistory,
    mode,
    notes,
    playerCount,
    players,
    shotClockTime,
    shotClockLimit,
    startingPlayerIdx,
    stateHistory,
    type,
  ]);

  // Game Timer and Shot Clock effects
  useEffect(() => {
    if (isPlaying && !isPaused && !showFinishedModal && !showOrderSelection) {
      gameTimerRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } else {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [isPlaying, isPaused, showFinishedModal, showOrderSelection]);

  // Shot Clock effect
  useEffect(() => {
    if (isPlaying && !isPaused && !showFinishedModal && !showOrderSelection && enableShotClock) {
      clockTimerRef.current = setInterval(() => {
        setShotClockTime(prev => {
          if (prev <= 1) {
            // Out of time: triggers warning and forces turn switch
            warningSound();
            handleForceTurnSwitch();
            return shotClockLimit;
          }
          if (prev === 6 || prev === 3) {
            // Warning sound near end
            warningSound();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    }

    return () => {
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, [isPlaying, isPaused, showFinishedModal, showOrderSelection, activePlayerIndex, enableShotClock, shotClockLimit]);

  // Create a persisted game room before opening the lobby.
  const handleStartRealtimeGame = async (e: React.FormEvent) => {
    e.preventDefault();
    cueClickSound();
    setIsGameRoomCreating(true);
    setGameRoomError(null);

    const handicap = type === '3-Cushion'
      ? parseInt(localStorage.getItem('billiards_dama3') || '200', 10)
      : parseInt(localStorage.getItem('billiards_dama4') || '250', 10);
    const hostTargetScore = Math.max(5, Math.floor(handicap / 10));

    try {
      const gameRoom = await createGameRoom({
        name: roomName.trim(),
        gameType: type,
        gameMode: mode,
        playerCapacity: playerCount,
        hostTargetScore,
      });

      applyGameRoomToLobby(gameRoom);
      setP1Target(hostTargetScore);
      setLobbyLogs([
        { id: `room-${gameRoom.roomId}`, text: `${gameRoom.name} 게임방이 생성되었습니다.`, time: '방금 전' },
      ]);
      setInvitedFriendIds([]);
      setIsLobby(true);
    } catch (error) {
      setGameRoomError(getApiErrorMessage(error));
    } finally {
      setIsGameRoomCreating(false);
    }
  };

  const handleCopyLobbyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 1500);
    } catch {
      setGameRoomError('입장 코드를 복사하지 못했습니다.');
    }
  };

  const handleExitLobby = async () => {
    if (gameRoomId && isGameRoomHost) {
      try {
        await cancelGameRoom(gameRoomId);
      } catch (error) {
        setGameRoomError(getApiErrorMessage(error));
        setShowExitLobbyConfirm(false);
        return;
      }
    }

    setGameRoomId(null);
    setGameRoomStatus(null);
    setGameRoomAction(null);
    setLobbyCode('');
    setLobbyPlayers([]);
    setLobbyLogs([]);
    setInvitedFriendIds([]);
    setIsGameRoomHost(false);
    setIsLobby(false);
    setShowExitLobbyConfirm(false);
  };

  const isLobbyFull = lobbyPlayers.length === playerCount && lobbyPlayers.every((player) => player.isJoined);
  const areAllLobbyPlayersReady = isLobbyFull && lobbyPlayers.every((player) => player.isReady);
  const currentLobbyPlayer = lobbyPlayers.find((player) => player.isMe);
  const canControlLiveScoreboard = !gameRoomId || (isGameRoomHost && isLiveStateReady);

  // Launch actual real-time game board transition
  const handleLaunchGameFromLobby = () => {
    if (!isLobbyFull || (gameRoomId && gameRoomStatus !== 'IN_PROGRESS')) {
      warningSound();
      return;
    }
    levelSucceededSound();
    
    const activePlayersList: ActivePlayer[] = [];
    lobbyPlayers.forEach(lp => {
      let textColor = 'text-zinc-800';
      let bgColor = 'bg-white';
      let borderColor = 'border-zinc-200';

      if (lp.cueBallColor === 'yellow') {
        textColor = 'text-yellow-800 border-yellow-200';
        bgColor = 'bg-yellow-400';
        borderColor = 'border-yellow-300';
      } else if (lp.cueBallColor === 'red') {
        textColor = 'text-red-100';
        bgColor = 'bg-red-500';
        borderColor = 'border-red-400';
      } else if (lp.cueBallColor === 'blue') {
        textColor = 'text-sky-100';
        bgColor = 'bg-sky-500';
        borderColor = 'border-sky-400';
      }

      activePlayersList.push({
        id: lp.id,
        memberId: lp.memberId,
        name: lp.name,
        targetScore: lp.targetScore,
        currentScore: 0,
        cushionScore: 0,
        highRun: 0,
        inningScores: [],
        cueBallColor: lp.cueBallColor,
        textColor,
        bgColor,
        borderColor,
        isCushionPhase: false,
        isFinished: false,
        isMe: lp.isMe
      });
    });

    setPlayers(activePlayersList);
    setCurrentInning(1);
    setActivePlayerIndex(0); // Start with player 1
    setCurrentTurnPoints(0);
    setGameTime(0);
    setShotClockTime(shotClockLimit);
    setMatchHistory([`🎳 실시간 경기가 매칭 성사되어 시작되었습니다. (${type === '3-Cushion' ? '3구' : '4구'} 경기)`]);
    setStateHistory([]);
    setIsLobby(false);
    setIsPlaying(true);
    setIsPaused(false);
    setShowOrderSelection(!gameRoomId || isGameRoomHost);
  };

  const handleToggleReady = async () => {
    if (!gameRoomId || !currentLobbyPlayer || gameRoomAction || gameRoomStatus !== 'WAITING') {
      return;
    }

    const nextReady = !currentLobbyPlayer.isReady;
    setGameRoomAction('ready');
    setGameRoomError(null);

    try {
      const gameRoom = await updateGameRoomReady(gameRoomId, nextReady);
      applyGameRoomToLobby(gameRoom);
      setLobbyLogs((current) => [
        ...current,
        {
          id: `ready-${Date.now()}`,
          text: `${currentLobbyPlayer.name}님이 ${nextReady ? '준비를 완료했습니다.' : '준비를 해제했습니다.'}`,
          type: 'system',
          time: '방금 전',
        },
      ]);
    } catch (error) {
      setGameRoomError(getApiErrorMessage(error));
    } finally {
      setGameRoomAction(null);
    }
  };

  const handleStartGameRoom = async () => {
    if (
      !gameRoomId
      || !isGameRoomHost
      || !areAllLobbyPlayersReady
      || gameRoomAction
      || gameRoomStatus !== 'WAITING'
    ) {
      warningSound();
      return;
    }

    setGameRoomAction('start');
    setGameRoomError(null);

    try {
      const gameRoom = await startGameRoom(gameRoomId);
      applyGameRoomToLobby(gameRoom);
    } catch (error) {
      setGameRoomError(getApiErrorMessage(error));
    } finally {
      setGameRoomAction(null);
    }
  };

  useEffect(() => {
    if (isLobby && gameRoomId && gameRoomStatus === 'IN_PROGRESS' && isLobbyFull) {
      handleLaunchGameFromLobby();
    }
  }, [gameRoomId, gameRoomStatus, isLobby, isLobbyFull]);

  const handleInviteFriend = async (friend: LobbyFriend) => {
    if (!gameRoomId) {
      setBilliardFriendsError('게임방 정보를 찾을 수 없습니다. 게임방을 다시 생성해 주세요.');
      return;
    }

    const openSlotCount = lobbyPlayers.filter((player) => !player.isJoined).length;
    if (invitedFriendIds.length >= openSlotCount) {
      alert('초대를 보낸 친구의 응답을 기다리고 있습니다.');
      return;
    }

    cueClickSound();
    setInvitationSendingMemberId(friend.id);
    setBilliardFriendsError(null);

    try {
      await createGameInvitation(friend.id, type, gameRoomId);
      setInvitedFriendIds((current) => [...current, friend.id]);
      setLobbyLogs((current) => [
        ...current,
        {
          id: `invite-req-${Date.now()}`,
          text: `${friend.name}님에게 경기 초대를 보냈습니다. 수락을 기다리고 있습니다.`,
          type: 'announcement',
          time: '방금',
        },
      ]);
      playSound(400, 0.1, 'triangle');
    } catch (error) {
      setBilliardFriendsError(getApiErrorMessage(error));
    } finally {
      setInvitationSendingMemberId(null);
    }
  };

  // State recording function to allow Undo functionality
  const pushStateToHistory = (
    customPlayers = players,
    customInning = currentInning,
    customActiveIdx = activePlayerIndex,
    customTurnPts = currentTurnPoints,
  ) => {
    const snapshot = createScoreboardSnapshot({
      players: customPlayers,
      currentInning: customInning,
      activePlayerIndex: customActiveIdx,
      currentTurnPoints: customTurnPts,
      shotClockTime,
      matchHistory,
    });
    setStateHistory((currentHistory) => [...currentHistory, snapshot]);
  };

  const handleScoreChange = (amount: number) => {
    if (!canControlLiveScoreboard) {
      return;
    }

    const result = applyScoreChange({
      players,
      activePlayerIndex,
      currentInning,
      currentTurnPoints,
      amount,
      gameType: type,
      lastThreeCushions,
    });
    if (!result) {
      return;
    }

    cueClickSound();
    pushStateToHistory();
    setPlayers(result.players);
    setCurrentTurnPoints(result.currentTurnPoints);

    if (result.reachedTarget && amount > 0) {
      levelSucceededSound();
    }
  };

  const handleEndInning = () => {
    if (!canControlLiveScoreboard) {
      return;
    }

    const activePlayer = players[activePlayerIndex];
    if (!activePlayer) {
      return;
    }

    const result = advanceScoreboardTurn({
      players,
      activePlayerIndex,
      currentInning,
      startingPlayerIndex: startingPlayerIdx,
      gameType: type,
      lastThreeCushions,
    });
    if (!result) {
      return;
    }

    turnSwitchSound();
    setMatchHistory((currentHistory) => [
      ...currentHistory,
      buildTurnHistoryEntry(
        activePlayer,
        currentInning,
        currentTurnPoints,
        type,
        lastThreeCushions,
      ),
    ]);

    if (result.newlyFinished) {
      setPlayers(result.players);
      levelSucceededSound();
    }

    if (result.allPlayersFinished) {
      setWinnerName(result.winner?.name || '경기가 종료되었습니다');
      setShowFinishedModal(true);
      levelSucceededSound();
      return;
    }

    setCurrentTurnPoints(0);
    setActivePlayerIndex(result.activePlayerIndex);
    setCurrentInning(result.currentInning);
    setShotClockTime(shotClockLimit);
  };
  // Undo system
  const handleUndoAction = () => {
    if (!canControlLiveScoreboard || stateHistory.length === 0) return;
    
    cueClickSound();
    const lastState = stateHistory[stateHistory.length - 1];
    
    setPlayers(lastState.players);
    setCurrentInning(lastState.currentInning);
    setActivePlayerIndex(lastState.activePlayerIndex);
    setCurrentTurnPoints(lastState.currentTurnPoints);
    setShotClockTime(lastState.shotClockTime);
    setMatchHistory(lastState.matchHistory);
    
    // Pop the spent state
    setStateHistory(prev => prev.slice(0, -1));
  };

  // Clock Timeout Fallback Switch
  const handleForceTurnSwitch = () => {
    if (!canControlLiveScoreboard) {
      return;
    }

    // Current player scored what they have earned so far
    handleEndInning();
  };

  // Toggle cushion phase for a team in 4-Ball Team mode
  const handleTeamCushionTransition = (teamId: 'A' | 'B', forceState?: boolean) => {
    if (!canControlLiveScoreboard) {
      return;
    }

    cueClickSound();
    
    // Save state history before editing so that users can Undo
    pushStateToHistory();

    setPlayers((currentPlayers) => toggleTeamCushionPhase(currentPlayers, teamId, forceState));
  };

  const handleActivePlayerCushionTransition = () => {
    if (!canControlLiveScoreboard) {
      return;
    }

    cueClickSound();
    setPlayers((currentPlayers) => activatePlayerCushionPhase(currentPlayers, activePlayerIndex));
  };

  const handleRequestGameFinish = () => {
    if (!canControlLiveScoreboard) {
      return;
    }

    const highestScorePlayer = selectScoreboardWinner(players, type, lastThreeCushions);
    setWinnerName(highestScorePlayer?.name || players[0]?.name || '');
    setShowFinishedModal(true);
  };

  // Finish active game and convert parameters to system persistent record list
  const handleFinalizeAndSaveRecord = async () => {
    if (isSavingRecord) return;

    setGameCompletionError(null);
    if (gameRoomId) {
      if (!isGameRoomHost) {
        setGameCompletionError('방장만 온라인 경기를 종료할 수 있습니다.');
        return;
      }

      try {
        setIsSavingRecord(true);
        setLiveStateError(null);

        const activeMemberId = players[activePlayerIndex]?.memberId;
        const hasEveryMemberId = players.every((player) => player.memberId !== undefined);
        if (!activeMemberId || !hasEveryMemberId || liveStateVersionRef.current === null) {
          throw new Error('참가자와 점수판 정보를 다시 불러온 후 종료해 주세요.');
        }

        const finalLiveState: GameRoomLiveStateDraft = {
          currentInning,
          activeMemberId,
          scores: players.map((player) => ({
            memberId: player.memberId as number,
            currentScore: player.currentScore,
            cushionScore: player.cushionScore || 0,
            highRun: player.highRun,
          })),
        };
        const finalStateSignature = getLiveStateSignature(finalLiveState);
        pendingLiveStateRef.current = finalLiveState;
        await processPendingLiveState();

        if (lastSynchronizedLiveStateRef.current !== finalStateSignature) {
          throw new Error('최신 점수를 서버에 저장하지 못했습니다. 점수판을 확인해 주세요.');
        }

        const stateVersion = liveStateVersionRef.current;
        if (stateVersion === null) {
          throw new Error('최신 점수판 버전을 확인할 수 없습니다.');
        }

        const completion = await finishGameRoom(gameRoomId, buildGameRoomFinishPayload({
          stateVersion,
          currentInning,
          gameType: type,
          gameMode: mode,
          lastThreeCushions,
          players,
        }));
        liveStateVersionRef.current = completion.stateVersion;
        exitCompletedGameRoom();
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'ROOM_008') {
          try {
            const latestState = await getGameRoomLiveState(gameRoomId);
            applyLiveGameStateRef.current(latestState);
            setGameCompletionError('다른 화면에서 점수가 변경되었습니다. 최신 점수를 확인한 후 다시 종료해 주세요.');
          } catch (refreshError) {
            setGameCompletionError(getApiErrorMessage(refreshError));
          }
        } else {
          setGameCompletionError(getApiErrorMessage(error));
        }
      } finally {
        setIsSavingRecord(false);
      }
      return;
    }

    // Player 1 (user) statistics computed
    const p1 = players[0];
    const p2 = players[1];

    // Total innings is capped at currentInning
    const totalInningsCount = Math.max(1, currentInning);
    const avgScore = Number((p1.currentScore / totalInningsCount).toFixed(3));
    
    // True if P1 achieved higher target performance or reached target score
    const isP1Winner = p1.isFinished || (!p2.isFinished && (p1.currentScore / p1.targetScore >= p2.currentScore / p2.targetScore));

    // Build the record data
    const finishedMatchData: GameRecordDraft = {
      date: new Date().toISOString(),
      type,
      mode,
      myScore: p1.currentScore,
      opponentScore: p2 ? p2.currentScore : 0,
      innings: totalInningsCount,
      highRun: p1.highRun,
      playerCount,
      rank: playerCount > 2 ? players.findIndex(p => p.id === p1.id) + 1 : undefined, // simple rank proxy
      lastThreeCushions: type === '4-Ball' ? lastThreeCushions : undefined,
      notes: notes.trim() || `실시간 경기 진행 완료 (이닝: ${totalInningsCount}회)`,
      opponentName: p2 ? p2.name : '기타',
      inningScores: p1.inningScores,
      myCushionScore: type === '4-Ball' ? (p1.cushionScore || 0) : undefined,
      opponentCushionScore: (type === '4-Ball' && p2) ? (p2.cushionScore || 0) : undefined,
    };

    try {
      setIsSavingRecord(true);
      await onAdd(finishedMatchData);

      // Empty cache and navigate
      clearActiveGameState(localStorage);
      setIsPlaying(false);
      setShowFinishedModal(false);
      navigate('/records');
    } catch {
      // The parent API handler owns the user-facing error message.
    } finally {
      setIsSavingRecord(false);
    }
  };

  // Terminate without saving
  const handleForceCancelGame = () => {
    setShowCancelGameConfirm(true);
  };

  const handleConfirmCancelGame = () => {
    clearActiveGameState(localStorage);
    setIsPlaying(false);
    setStateHistory([]);
    setShowCancelGameConfirm(false);
  };

  // Quick preset targets
  const quickTargetsPreset = [10, 15, 20, 25, 30, 40];

  return (
    <div id="game-page-containment" className="max-w-6xl mx-auto px-2 py-4">
      
      {/* 1. ROOM CREATION VIEW */}
      {!isPlaying && !isLobby && (
        <GameRoomCreateForm
          roomName={roomName}
          gameMode={mode}
          playerCount={playerCount}
          gameType={type}
          lastThreeCushions={lastThreeCushions}
          isSubmitting={isGameRoomCreating}
          errorMessage={gameRoomError}
          onRoomNameChange={setRoomName}
          onGameModeChange={(nextMode) => {
            setMode(nextMode);
            if (nextMode === 'Team') {
              setPlayerCount(4);
            }
          }}
          onPlayerCountChange={setPlayerCount}
          onGameTypeChange={setType}
          onLastThreeCushionsChange={setLastThreeCushions}
          onSubmit={handleStartRealtimeGame}
        />
      )}

      {/* 1.5. INTERACTIVE MULTIPLAYER LOBBY ROOM */}
      {!isPlaying && isLobby && (
        <GameRoomLobby
          roomName={roomName}
          lobbyCode={lobbyCode}
          copySuccess={copySuccess}
          errorMessage={gameRoomError}
          players={lobbyPlayers}
          playerCount={playerCount}
          gameType={type}
          gameMode={mode}
          logs={lobbyLogs}
          friends={billiardFriends}
          friendsLoading={isBilliardFriendsLoading}
          friendsError={billiardFriendsError}
          invitedFriendIds={invitedFriendIds}
          invitationSendingMemberId={invitationSendingMemberId}
          hasPersistedRoom={Boolean(gameRoomId)}
          isHost={isGameRoomHost}
          roomStatus={gameRoomStatus}
          roomAction={gameRoomAction}
          onExit={() => setShowExitLobbyConfirm(true)}
          onCopyCode={handleCopyLobbyCode}
          onRetryFriends={loadBilliardFriends}
          onInviteFriend={handleInviteFriend}
          onToggleReady={handleToggleReady}
          onStartRoom={handleStartGameRoom}
          onStartLocalGame={handleLaunchGameFromLobby}
        />
      )}

      {/* 2. REAL-TIME MATCH SCOREBOARD VIEW */}
      {isPlaying && players.length > 0 && (
        <LiveGameScoreboard
          players={players}
          currentInning={currentInning}
          activePlayerIndex={activePlayerIndex}
          gameTime={gameTime}
          isPaused={isPaused}
          soundEnabled={soundEnabled}
          hasGameRoom={gameRoomId !== null}
          liveStateError={liveStateError}
          isLiveStateReady={isLiveStateReady}
          isGameRoomHost={isGameRoomHost}
          canControl={canControlLiveScoreboard}
          enableShotClock={enableShotClock}
          shotClockTime={shotClockTime}
          shotClockLimit={shotClockLimit}
          gameType={type}
          gameMode={mode}
          playerCount={playerCount}
          lastThreeCushions={lastThreeCushions}
          onToggleSound={() => setSoundEnabled((enabled) => !enabled)}
          onTogglePause={() => setIsPaused((paused) => !paused)}
          onRequestFinish={handleRequestGameFinish}
          onTeamCushionTransition={handleTeamCushionTransition}
          onActivePlayerCushionTransition={handleActivePlayerCushionTransition}
          onScoreChange={handleScoreChange}
          onEndInning={() => handleEndInning()}
        />
      )}
      {/* 3. GAME ROOM SUCCESSFUL FINISH MODAL */}
      <AnimatePresence>
        {showFinishedModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0b3c2e] border border-[#237a66] p-8 rounded-[3rem] w-full max-w-lg text-center shadow-2xl relative overflow-hidden text-emerald-50"
            >
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl" />

              <div className="w-16 h-16 bg-yellow-400/15 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce border border-yellow-400/20">
                <Award size={36} />
              </div>

              <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                경기 진행 종료!
              </h2>
              <p className="text-emerald-400 text-sm font-bold mt-2">
                모든 이닝 일정이 완료되었습니다. 
              </p>

              <div className="bg-zinc-950/40 border border-emerald-950 p-5 rounded-2xl my-6 text-left space-y-3">
                <h4 className="text-xs uppercase font-bold text-emerald-500/60 pb-1.5 border-b border-emerald-950">
                  최종 결과 일람 (SUMMARY)
                </h4>
                
                <div className="space-y-2">
                  {players.map((p, pIdx) => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 font-bold text-emerald-100">
                        <span className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          p.cueBallColor === 'white' ? 'bg-white' : p.cueBallColor === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
                        )} />
                        {p.name}
                      </span>
                      <span className="font-mono font-black text-white">
                        {p.currentScore}점{type === '4-Ball' && lastThreeCushions > 0 ? ` (+3C: ${p.cushionScore || 0}/${lastThreeCushions})` : ''}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2.5 bg-emerald-900/20 border border-emerald-500/20 rounded-xl mt-3">
                  <span className="text-[10px] text-emerald-400 font-bold block">진행 이닝 수</span>
                  <p className="text-sm font-bold text-white font-mono">{currentInning} 이닝 완료</p>
                </div>
              </div>

              {gameCompletionError && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-left text-xs font-bold text-red-200">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{gameCompletionError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setGameCompletionError(null);
                    setShowFinishedModal(false);
                  }}
                  disabled={isSavingRecord}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  취소 후 이어서 기록하기
                </button>
                <button
                  onClick={handleFinalizeAndSaveRecord}
                  disabled={isSavingRecord || Boolean(gameRoomId && !isGameRoomHost)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-[#07241c] font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSavingRecord ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  최종 결과 전송 및 기록 저장
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CUSTOM CONFIRMATION MODALS (IFRAME SAFE) */}
      <ConfirmModal
        isOpen={showExitLobbyConfirm}
        title="대기방 퇴장 확인"
        message="대기방을 완전히 해체하고 퇴장하시겠습니까?"
        confirmText="완전히 나가기"
        cancelText="계속 대기하기"
        isDanger={true}
        onConfirm={() => void handleExitLobby()}
        onCancel={() => setShowExitLobbyConfirm(false)}
      />

      <ConfirmModal
        isOpen={showCancelGameConfirm}
        title="경기 중도 포기 확인"
        message="진행 중인 실시간 경기를 정말 취소하시겠습니까? 데이터는 전혀 저장되지 않습니다."
        confirmText="경기 종료하기"
        cancelText="계속 경기하기"
        isDanger={true}
        onConfirm={handleConfirmCancelGame}
        onCancel={() => setShowCancelGameConfirm(false)}
      />

      <ConfirmModal
        isOpen={showResumeConfirm}
        title="이전 경기 복구 알림"
        message="이전에 진행 중이던 실시간 당구 경기 데이터가 존재합니다. 해당 경기를 복구하여 계속 진행하시겠습니까?"
        confirmText="예, 이어하겠습니다"
        cancelText="아니오, 새 경기 시작하겠습니다"
        isDanger={false}
        onConfirm={handleConfirmResume}
        onCancel={handleCancelResume}
      />

      {/* --- PLAY ORDER SELECTION OVERLAY WITH BACKDROP BLUR --- */}
      <AnimatePresence>
        {showOrderSelection && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            {/* 1. Backdrop blur covering background areas */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-3xl"
            />

            {/* 2. Interactive order card container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-b from-[#09352a] to-[#041a15] border border-emerald-500/30 rounded-[3rem] p-8 max-w-xl w-full relative z-10 shadow-[0_0_50px_rgba(16,185,129,0.3)] text-center text-emerald-50"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-gradient-to-b from-emerald-500/10 to-transparent blur-xl rounded-full" />
              
              {/* Animated Header Badge */}
              <div className="w-14 h-14 bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Activity size={28} className="text-[#07241c] animate-pulse" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">수구 칠 순서 정하기 (경기방)</h2>
              <p className="text-emerald-400 hover:text-emerald-300 text-xs font-bold mt-2 leading-relaxed px-2 transition-all">
                경기를 시작하기 전, 각 선수가 어떤 순서로 공격할지 지정해 주세요.<br />
                원하는 순서 숫자 버튼(1, 2, 3...)을 클릭하여 손쉽게 순서를 바꾸거나, [무작위 순서 섞기] 버튼으로 자동 정렬하세요.
              </p>

              {/* Real-time Order sequence lists */}
              <div className="my-6 space-y-3">
                {players.map((p, idx) => {
                  const ballColorMap: Record<string, string> = {
                    white: "bg-white border-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.4)]",
                    yellow: "bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
                    red: "bg-red-500 border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]",
                    blue: "bg-sky-500 border-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.4)]"
                  };
                  const cueStyle = ballColorMap[p.cueBallColor] || "bg-white border-zinc-200";

                  return (
                    <div 
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all duration-300",
                        idx === 0 
                          ? "bg-gradient-to-r from-[#0c4436] to-[#072c22] border-emerald-400/50 shadow-md shadow-emerald-500/5 scale-[1.01]" 
                          : "bg-[#07241c]/70 border-[#144b3c] opacity-90"
                      )}
                    >
                      {/* Left: Sequential slot badge & Player profile summary */}
                      <div className="flex items-center gap-3 text-left">
                        <span className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg font-mono font-black text-xs leading-none",
                          idx === 0 
                            ? "bg-emerald-400 text-zinc-950 shadow-sm" 
                            : "bg-zinc-950/50 border border-emerald-500/20 text-emerald-400"
                        )}>
                          {idx + 1}
                        </span>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("w-3 h-3 rounded-full inline-block border", cueStyle)} />
                            <span className="font-sans font-black text-white text-sm sm:text-base leading-none">
                              {p.name}
                            </span>
                          </div>
                          
                          <span className={cn(
                            "text-[9px] font-bold block mt-1 tracking-wider uppercase",
                            idx === 0 ? "text-emerald-300/90" : "text-emerald-300/40"
                          )}>
                            {idx === 0 ? "🔥 선공 (초구 공격 주도)" : `${idx + 1}번째 이닝 공격`}
                          </span>
                        </div>
                      </div>

                      {/* Right: Reorder controller buttons - Number Selector */}
                      <div className="flex bg-zinc-950/70 border border-emerald-950/50 rounded-2xl p-1.5 items-center gap-1 animate-fadeIn">
                        {players.map((_, pIdx) => {
                          const isCurrentPosition = idx === pIdx;
                          return (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                if (isCurrentPosition) return;
                                
                                const isTeamModeGame = mode === 'Team' && playerCount === 4;
                                if (isTeamModeGame) {
                                  setPlayers(prev => {
                                    const copy = [...prev];
                                    const temp = copy[idx];
                                    copy[idx] = copy[pIdx];
                                    copy[pIdx] = temp;

                                    // Dynamic rotation check:
                                    const getPlayerTeam = (pId: number) => (pId === 1 || pId === 3) ? 'A' : 'B';
                                    const t0 = getPlayerTeam(copy[0].id);
                                    const t1 = getPlayerTeam(copy[1].id);
                                    const t2 = getPlayerTeam(copy[2].id);
                                    const t3 = getPlayerTeam(copy[3].id);

                                    const isValid = (t0 !== t1) && (t1 !== t2) && (t2 !== t3);
                                    if (!isValid) {
                                      // Force beautiful alternating pattern locking the user's selected swap target
                                      const lockedTeam = getPlayerTeam(temp.id);
                                      const pattern = Array(4);
                                      pattern[pIdx] = lockedTeam;
                                      pattern[(pIdx + 1) % 4] = lockedTeam === 'A' ? 'B' : 'A';
                                      pattern[(pIdx + 2) % 4] = lockedTeam;
                                      pattern[(pIdx + 3) % 4] = lockedTeam === 'A' ? 'B' : 'A';

                                      const remainingPlayers = prev.filter(p => p.id !== temp.id);
                                      const finalPlayers = Array(4);
                                      finalPlayers[pIdx] = temp;

                                      for (let i = 0; i < 4; i++) {
                                        if (i === pIdx) continue;
                                        const requiredTeam = pattern[i];
                                        const foundIdx = remainingPlayers.findIndex(p => getPlayerTeam(p.id) === requiredTeam);
                                        if (foundIdx !== -1) {
                                          finalPlayers[i] = remainingPlayers[foundIdx];
                                          remainingPlayers.splice(foundIdx, 1);
                                        }
                                      }
                                      return finalPlayers;
                                    }
                                    return copy;
                                  });
                                } else {
                                  // Individual setup
                                  setPlayers(prev => {
                                    const copy = [...prev];
                                    const temp = copy[idx];
                                    copy[idx] = copy[pIdx];
                                    copy[pIdx] = temp;
                                    return copy;
                                  });
                                }
                                cueClickSound();
                              }}
                              className={cn(
                                "w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center transition-all cursor-pointer",
                                isCurrentPosition 
                                  ? "bg-emerald-400 text-zinc-950 font-extrabold shadow-md shadow-emerald-400/20" 
                                  : "text-emerald-400/70 hover:text-white hover:bg-emerald-500/20 bg-transparent hover:border-emerald-500/10 border border-transparent"
                              )}
                            >
                              {pIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sound effect and shuffle random commands */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const isTeamModeGame = mode === 'Team' && playerCount === 4;
                    if (isTeamModeGame) {
                      setPlayers(prev => {
                        const teamA = prev.filter(p => p.id === 1 || p.id === 3);
                        const teamB = prev.filter(p => p.id === 2 || p.id === 4);
                        
                        // Shuffle sub-elements
                        const shufA = [...teamA].sort(() => Math.random() - 0.5);
                        const shufB = [...teamB].sort(() => Math.random() - 0.5);

                        const startsWithA = Math.random() > 0.5;
                        if (startsWithA) {
                          return [shufA[0], shufB[0], shufA[1], shufB[1]];
                        } else {
                          return [shufB[0], shufA[0], shufB[1], shufA[1]];
                        }
                      });
                    } else {
                      setPlayers(prev => {
                        const copy = [...prev];
                        for (let i = copy.length - 1; i > 0; i--) {
                          const j = Math.floor(Math.random() * (i + 1));
                          [copy[i], copy[j]] = [copy[j], copy[i]];
                        }
                        return copy;
                      });
                    }
                    levelSucceededSound();
                  }}
                  className="w-full bg-[#12503f]/50 hover:bg-[#186651]/70 border border-[#1d6352] text-amber-300 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
                >
                  <RefreshCw size={13} className="animate-spin-slow text-amber-400" />
                  <span>무작위 순서 섞기 (셔플)</span>
                </button>
              </div>

              {/* Start game confirm */}
              <div className="pt-5 border-t border-[#144b3c]/60 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    levelSucceededSound();
                    setShowOrderSelection(false);
                    setMatchHistory(prev => [
                      ...prev,
                      `🎲 타순 배치가 확정되어 본 경기가 활성화되었습니다: ${players.map((pl, i) => `[${i + 1}P] ${pl.name}`).join(' ➔ ')}`
                    ]);
                  }}
                  disabled={Boolean(gameRoomId) && !isLiveStateReady}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 disabled:cursor-wait text-[#07241c] py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  {gameRoomId && !isLiveStateReady ? (
                    <Hourglass size={16} className="animate-pulse" />
                  ) : (
                    <Play size={16} fill="currentColor" />
                  )}
                  <span>{gameRoomId && !isLiveStateReady ? '점수판 동기화 중...' : '순서 결정 및 경기 시작하기'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = '확인', 
  cancelText = '취소',
  isDanger = false 
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="bg-[#0b3c2e] border border-[#1a5d4e] rounded-3xl p-6 max-w-sm w-full relative z-[101] shadow-2xl text-left">
        <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
          {isDanger ? '⚠️' : '🔔'} {title}
        </h3>
        <p className="text-emerald-100/70 text-sm mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-[#144b3c] hover:bg-[#1c6451] border border-[#1d6352] text-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
              isDanger 
                ? "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/10"
                : "bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] shadow-lg shadow-emerald-500/10"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
