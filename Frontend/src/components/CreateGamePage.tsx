import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Plus, Minus, RotateCcw, Target, User, Sparkles, ChevronRight, 
  Settings, AlertCircle, ArrowLeft, ArrowRight, Trophy, Timer, Volume2, VolumeX, Eye, HelpCircle, RefreshCw, CheckCircle2, Award,
  Copy, Users, MessageSquare, Hourglass, Activity, Check, Info
} from 'lucide-react';
import { GameRecord, GameType, GameMode } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CreateGamePageProps {
  onAdd: (record: Omit<GameRecord, 'id' | 'average' | 'win'>) => void;
}

interface ActivePlayer {
  id: number;
  name: string;
  targetScore: number;
  currentScore: number;
  cushionScore?: number;
  highRun: number;
  inningScores: number[]; // points scored in each inning of their turn
  cueBallColor: string; // 'white' | 'yellow' | 'red' | 'blue'
  textColor: string;
  bgColor: string;
  borderColor: string;
  isCushionPhase?: boolean;
  isFinished?: boolean;
  isMe?: boolean;
}

export function CreateGamePage({ onAdd }: CreateGamePageProps) {
  const navigate = useNavigate();

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
  const [lobbyCode, setLobbyCode] = useState<string>('');
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([]);
  const [lobbyLogs, setLobbyLogs] = useState<any[]>([]);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // --- Billiard Friends to invite manually ---
  const [billiardFriends, setBilliardFriends] = useState([
    { id: 'f-1', name: '김당구', targetScore: 30, isOnline: true },
    { id: 'f-2', name: '박마세', targetScore: 25, isOnline: true },
    { id: 'f-3', name: '최시네루', targetScore: 20, isOnline: true },
    { id: 'f-4', name: '이끌어치기', targetScore: 18, isOnline: true },
    { id: 'f-5', name: '정오시', targetScore: 15, isOnline: true },
    { id: 'f-6', name: '홍밀어치기', targetScore: 12, isOnline: true },
  ]);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);

  // Custom Iframe-Safe Confirmation states
  const [showExitLobbyConfirm, setShowExitLobbyConfirm] = useState<boolean>(false);
  const [showCancelGameConfirm, setShowCancelGameConfirm] = useState<boolean>(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState<boolean>(false);
  const [resumeData, setResumeData] = useState<any>(null);

  const [type, setType] = useState<GameType>('3-Cushion');
  const [mode, setMode] = useState<GameMode>('Individual');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [lastThreeCushions, setLastThreeCushions] = useState<0 | 1 | 2>(0);
  const [notes, setNotes] = useState<string>('');

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
  const [stateHistory, setStateHistory] = useState<any[]>([]); // For Undoing

  // Game completion review overlay state
  const [showFinishedModal, setShowFinishedModal] = useState<boolean>(false);
  const [showOrderSelection, setShowOrderSelection] = useState<boolean>(false);
  const [winnerName, setWinnerName] = useState<string>('');

  // --- Timers Refs ---
  const gameTimerRef = useRef<any>(null);
  const clockTimerRef = useRef<any>(null);

  // Check if there is an active game in local storage that can be resumed
  useEffect(() => {
    const savedActiveGame = localStorage.getItem('billiards_active_room_state');
    if (savedActiveGame) {
      try {
        const parsed = JSON.parse(savedActiveGame);
        if (parsed && parsed.players && parsed.players.length > 0) {
          setResumeData(parsed);
          setShowResumeConfirm(true);
        }
      } catch (err) {
        localStorage.removeItem('billiards_active_room_state');
      }
    }
  }, []);

  // Check if an incoming game invitation was accepted, and auto-trigger a lobby with that matched opponent
  useEffect(() => {
    const acceptedStr = localStorage.getItem('game_invitation_accepted');
    if (acceptedStr) {
      try {
        const accepted = JSON.parse(acceptedStr);
        if (accepted && accepted.opponent) {
          // Clear it so it doesn't trigger again on subsequent re-mounts
          localStorage.removeItem('game_invitation_accepted');

          const userNickname = localStorage.getItem('billiards_nickname') || '사용자';
          
          // Setup players for lobby
          const p1Name = userNickname;
          const userDama3 = parseInt(localStorage.getItem('billiards_dama3') || '200', 10);
          
          const initialLobby = [
            {
              id: 1,
              name: p1Name,
              role: '방장',
              isJoined: true,
              isReady: true,
              cueBallColor: 'white',
              targetScore: Math.max(5, Math.floor(userDama3 / 10)), // e.g. 200 dama turns into 20 points
              isMe: true
            },
            {
              id: 2,
              name: accepted.opponent,
              role: '참가자',
              isJoined: true,
              isReady: true,
              cueBallColor: 'yellow',
              targetScore: Math.max(5, Math.floor((accepted.dama || 250) / 10)),
              isMe: false
            }
          ];

          setLobbyPlayers(initialLobby);
          setLobbyCode(Math.floor(1000 + Math.random() * 9000).toString());
          setLobbyLogs([
            { id: 1, text: '🎉 대국 방이 생성되었습니다.', time: '방금 전' },
            { id: 2, text: `👥 ${accepted.opponent}님이 대국 초대를 수락하고 입장했습니다.`, time: '방금 전' },
            { id: 3, text: '✅ 모든 대국 준비가 완료되었습니다. 경기를 시작해보세요!', time: '방금 전' }
          ]);
          setIsLobby(true);
        }
      } catch (e) {
        localStorage.removeItem('game_invitation_accepted');
      }
    }
  }, []);

  const handleConfirmResume = () => {
    if (!resumeData) return;
    setType(resumeData.type);
    setMode(resumeData.mode);
    setPlayerCount(resumeData.playerCount as any);
    setPlayers(resumeData.players);
    setCurrentInning(resumeData.currentInning);
    setActivePlayerIndex(resumeData.activePlayerIndex);
    setCurrentTurnPoints(resumeData.currentTurnPoints);
    setGameTime(resumeData.gameTime);
    setShotClockTime(resumeData.shotClockTime);
    setNotes(resumeData.notes || '');
    setMatchHistory(resumeData.matchHistory || []);
    setStateHistory(resumeData.stateHistory || []);
    setIsPlaying(true);
    setIsPaused(false);
    setShowResumeConfirm(false);
  };

  const handleCancelResume = () => {
    localStorage.removeItem('billiards_active_room_state');
    setShowResumeConfirm(false);
  };

  // Save current active game layout to local Storage whenever states alter (so crash/refresh is safe)
  useEffect(() => {
    if (isPlaying && players.length > 0) {
      const stateToSave = {
        type,
        mode,
        playerCount,
        players,
        currentInning,
        activePlayerIndex,
        currentTurnPoints,
        gameTime,
        shotClockTime,
        notes,
        matchHistory,
        stateHistory
      };
      localStorage.setItem('billiards_active_room_state', JSON.stringify(stateToSave));
    } else if (!isPlaying) {
      localStorage.removeItem('billiards_active_room_state');
    }
  }, [isPlaying, players, currentInning, activePlayerIndex, currentTurnPoints, gameTime, shotClockTime, matchHistory, stateHistory, type, mode, playerCount, notes]);

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

  // Create virtual game lobby with invitations
  const handleStartRealtimeGame = (e: React.FormEvent) => {
    e.preventDefault();
    cueClickSound();

    // Create unique random room ID prefix
    const randomCode = 'B-' + Math.floor(100 + Math.random() * 900) + '-' + Math.floor(1000 + Math.random() * 9000);
    setLobbyCode(randomCode);

    const isTeamMode = playerCount === 4 && mode === 'Team';
    const defaultTarget = type === '3-Cushion' ? 15 : 20;

    const initialLobby: any[] = [];
    
    // Player 1 (나) is the Host, joined and ready by default
    initialLobby.push({
      id: 1,
      name: isTeamMode ? p1Name || '플레이어 1' : p1Name || '플레이어 1',
      role: '방장',
      isJoined: true,
      isReady: true,
      cueBallColor: 'white',
      targetScore: defaultTarget,
      isMe: true
    });

    // Player 2 (상대)
    initialLobby.push({
      id: 2,
      name: isTeamMode ? '상대' : '상대 (플레이어 2)',
      role: '참가자',
      isJoined: false,
      isReady: false,
      cueBallColor: 'yellow',
      targetScore: defaultTarget,
      isMe: false
    });

    if (playerCount >= 3) {
      initialLobby.push({
        id: 3,
        name: isTeamMode ? '동료' : '플레이어 3',
        role: '참가자',
        isJoined: false,
        isReady: false,
        cueBallColor: 'red',
        targetScore: defaultTarget,
        isMe: false
      });
    }

    if (playerCount === 4) {
      initialLobby.push({
        id: 4,
        name: isTeamMode ? '상대 2' : '플레이어 4',
        role: '참가자',
        isJoined: false,
        isReady: false,
        cueBallColor: 'blue',
        targetScore: defaultTarget,
        isMe: false
      });
    }

    setLobbyPlayers(initialLobby);
    
    setLobbyLogs([]);
    setInvitedFriendIds([]);

    setIsLobby(true);
  };

  // Modify individual handicaps/targets right in the lobby
  const handleUpdateLobbyPlayerTarget = (id: number, delta: number) => {
    cueClickSound();
    setLobbyPlayers(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, targetScore: Math.max(1, p.targetScore + delta) };
      }
      return p;
    }));
  };

  // Switch lobby slots to flexibly change teams
  const handleMoveLobbyPlayer = (id: number, direction: 'left' | 'right' | 'up' | 'down') => {
    cueClickSound();
    let targetId = id;
    if (direction === 'right') {
      if (id === 1) targetId = 2;
      if (id === 3) targetId = 4;
    } else if (direction === 'left') {
      if (id === 2) targetId = 1;
      if (id === 4) targetId = 3;
    } else if (direction === 'down') {
      if (id === 1) targetId = 3;
      if (id === 2) targetId = 4;
    } else if (direction === 'up') {
      if (id === 3) targetId = 1;
      if (id === 4) targetId = 2;
    }

    if (targetId === id) return;

    setLobbyPlayers(prev => {
      const copy = prev.map(p => ({ ...p }));
      const p1Idx = copy.findIndex(p => p.id === id);
      const p2Idx = copy.findIndex(p => p.id === targetId);

      if (p1Idx !== -1 && p2Idx !== -1) {
        const temp = { ...copy[p1Idx] };

        // Copy everything except ID from p2 to p1
        copy[p1Idx].name = copy[p2Idx].name;
        copy[p1Idx].role = copy[p2Idx].role;
        copy[p1Idx].isJoined = copy[p2Idx].isJoined;
        copy[p1Idx].isReady = copy[p2Idx].isReady;
        copy[p1Idx].cueBallColor = copy[p2Idx].cueBallColor;
        copy[p1Idx].targetScore = copy[p2Idx].targetScore;
        copy[p1Idx].isMe = copy[p2Idx].isMe;

        // Copy from temp (originally p1) to p2
        copy[p2Idx].name = temp.name;
        copy[p2Idx].role = temp.role;
        copy[p2Idx].isJoined = temp.isJoined;
        copy[p2Idx].isReady = temp.isReady;
        copy[p2Idx].cueBallColor = temp.cueBallColor;
        copy[p2Idx].targetScore = temp.targetScore;
        copy[p2Idx].isMe = temp.isMe;
      }
      return copy;
    });
  };

  // Launch actual real-time game board transition
  const handleLaunchGameFromLobby = () => {
    if (!lobbyPlayers.every(p => p.isJoined)) {
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
    setShowOrderSelection(true);
  };

  // Invite a specific friend from the online list to fill an open lobby slot
  const handleInviteFriend = (friend: { id: string; name: string; targetScore: number }) => {
    // Find first slot where isJoined is false
    const openSlot = lobbyPlayers.find(p => !p.isJoined);
    if (!openSlot) {
      alert('대기방 빈자리가 없습니다! (지정한 경기 인원이 모두 입장했습니다)');
      return;
    }

    cueClickSound();
    setInvitedFriendIds(prev => [...prev, friend.id]);

    // Send invitation request log
    setLobbyLogs(prev => [
      ...prev,
      {
        id: 'invite-req-' + Date.now(),
        text: `✉️ '${friend.name}'님에게 게임방 초대장을 발송했습니다.`,
        type: 'announcement',
        time: '방금'
      }
    ]);
    playSound(400, 0.1, 'triangle');

    // 1. Simulate acceptance & connection after 1.2s
    setTimeout(() => {
      setLobbyPlayers(prev => prev.map(p => {
        if (p.id === openSlot.id) {
          return {
            ...p,
            name: friend.name,
            isJoined: true,
            targetScore: friend.targetScore
          };
        }
        return p;
      }));

      setLobbyLogs(prev => [
        ...prev,
        {
          id: 'invite-join-' + Date.now(),
          text: `👋 '${friend.name}'님이 대기방에 참여했습니다.`,
          type: 'chat',
          time: '방금'
        }
      ]);
      playSound(440, 0.15, 'sine');
    }, 1200);

    // 2. Simulate ready state after 2.4s
    setTimeout(() => {
      setLobbyPlayers(prev => prev.map(p => {
        if (p.id === openSlot.id) {
          return { ...p, isReady: true };
        }
        return p;
      }));

      setLobbyLogs(prev => [
        ...prev,
        {
          id: 'invite-ready-' + Date.now(),
          text: `✅ '${friend.name}'님이 경기 세팅을 완료하고 [준비 완료] 상태입니다.`,
          type: 'system',
          time: '방금'
        }
      ]);
      playSound(554, 0.12, 'sine');
    }, 2400);
  };

  // State recording function to allow Undo functionality
  const pushStateToHistory = (customPlayers = players, customInning = currentInning, customActiveIdx = activePlayerIndex, customTurnPts = currentTurnPoints) => {
    // Save snapshot of critical variables
    const snapshot = {
      players: JSON.parse(JSON.stringify(customPlayers)),
      currentInning: customInning,
      activePlayerIndex: customActiveIdx,
      currentTurnPoints: customTurnPts,
      shotClockTime: shotClockTime,
      matchHistory: [...matchHistory]
    };
    setStateHistory(prev => [...prev, snapshot]);
  };

  // Perform point alterations for the current turn
  const handleScoreChange = (amount: number) => {
    const targetPlayer = players[activePlayerIndex];
    const isCushion = type === '4-Ball' && lastThreeCushions > 0 && targetPlayer.isCushionPhase;

    if (isCushion) {
      const prevCushion = targetPlayer.cushionScore || 0;
      if (amount > 0 && prevCushion >= lastThreeCushions) {
        return; // Prevent exceeding the required cushion target
      }
      if (amount < 0 && prevCushion <= 0) {
        return; // Prevent going below 0
      }
    }

    cueClickSound();
    
    // Create state undo snapshot beforehand
    pushStateToHistory();

    if (isCushion) {
      const prevCushion = targetPlayer.cushionScore || 0;
      const newCushion = prevCushion + amount;

      setPlayers(prevPlayers => {
        const updated = [...prevPlayers];
        const playerCopy = { ...updated[activePlayerIndex] };
        
        playerCopy.cushionScore = newCushion;
        
        // Let's also record this turn's score progress in the current inning
        const prevInningScore = playerCopy.inningScores[currentInning - 1] || 0;
        const newInningScore = prevInningScore + amount;
        const updatedInningScores = [...playerCopy.inningScores];
        updatedInningScores[currentInning - 1] = newInningScore;
        playerCopy.inningScores = updatedInningScores;

        if (newInningScore > playerCopy.highRun) {
          playerCopy.highRun = newInningScore;
        }

        // Automatic drop out of cushion phase if regular score drops and cushionScore is negative (optional safety)
        if (newCushion < 0) {
          playerCopy.cushionScore = 0;
        }

        updated[activePlayerIndex] = playerCopy;
        return updated;
      });

      setCurrentTurnPoints(prev => prev + amount);

      // Play victory cue or success sound if target met
      if (newCushion >= lastThreeCushions && amount > 0) {
        levelSucceededSound();
      }
    } else {
      const newTurnPoints = currentTurnPoints + amount;
      setCurrentTurnPoints(newTurnPoints);
      
      setPlayers(prevPlayers => {
        const updated = [...prevPlayers];
        const playerCopy = { ...updated[activePlayerIndex] };
        
        const prevInningScore = playerCopy.inningScores[currentInning - 1] || 0;
        playerCopy.currentScore = playerCopy.currentScore - prevInningScore + newTurnPoints;
        
        const updatedInningScores = [...playerCopy.inningScores];
        updatedInningScores[currentInning - 1] = newTurnPoints;
        playerCopy.inningScores = updatedInningScores;

        if (newTurnPoints > playerCopy.highRun) {
          playerCopy.highRun = newTurnPoints;
        }

        // AUTO-TRANSITION TO CUSHION PHASE WHEN TARGET REGULAR SCORE ACHIEVED
        if (type === '4-Ball' && lastThreeCushions > 0) {
          if (playerCopy.currentScore >= playerCopy.targetScore) {
            playerCopy.isCushionPhase = true;
          } else {
            playerCopy.isCushionPhase = false;
          }
        }
        
        updated[activePlayerIndex] = playerCopy;
        return updated;
      });

      // Play success sound if target regular score met
      const tempScore = targetPlayer.currentScore - (targetPlayer.inningScores[currentInning - 1] || 0) + newTurnPoints;
      if (tempScore >= targetPlayer.targetScore && amount > 0) {
        levelSucceededSound();
      }
    }
  };

  // Set turn scores to 0 (direct pass / miss)
  const handleZeroInningScore = () => {
    pushStateToHistory();
    setCurrentTurnPoints(0);
    
    setPlayers(prevPlayers => {
      const updated = [...prevPlayers];
      const playerCopy = { ...updated[activePlayerIndex] };
      const updatedInningScores = [...playerCopy.inningScores];
      updatedInningScores[currentInning - 1] = 0;
      playerCopy.inningScores = updatedInningScores;
      updated[activePlayerIndex] = playerCopy;
      return updated;
    });

    handleEndInning();
  };

  // End Inning turn and swap players
  const handleEndInning = (overridePlayers?: ActivePlayer[] | any) => {
    turnSwitchSound();
    
    const currentPlayersList = Array.isArray(overridePlayers) ? overridePlayers : players;
    const activePlayer = currentPlayersList[activePlayerIndex];
    if (!activePlayer) return;

    const currentScore = activePlayer.currentScore;
    const currentCushionScore = activePlayer.cushionScore || 0;

    // Check if player reaches target score limit
    const isTargetMet = type === '4-Ball'
      ? (lastThreeCushions === 0 
          ? currentScore >= activePlayer.targetScore 
          : (activePlayer.isCushionPhase && currentCushionScore >= lastThreeCushions))
      : (currentScore >= activePlayer.targetScore);

    // Log this action to history stream
    const cushionSuffix = (type === '4-Ball' && lastThreeCushions > 0) ? ` (3쿠션: ${currentCushionScore}/${lastThreeCushions})` : '';
    const logItem = `[이닝 ${currentInning}] ${activePlayer.name}: +${currentTurnPoints}점 (누적: ${currentScore}점)${cushionSuffix}`;
    setMatchHistory(prev => [...prev, logItem]);

    // Create deep copied list of players
    let updatedPlayers = [...currentPlayersList];
    const wasAlreadyFinished = !!activePlayer.isFinished;

    if (isTargetMet && !wasAlreadyFinished) {
      updatedPlayers[activePlayerIndex] = {
        ...activePlayer,
        isFinished: true
      };
      setPlayers(updatedPlayers);
      levelSucceededSound();
    }

    // Advance to next turn index of unfinished player
    let nextPlayerIndex = activePlayerIndex;
    let nextInning = currentInning;
    let foundNext = false;

    // Search sequentially for the next player who hasn't finished
    for (let step = 1; step <= updatedPlayers.length; step++) {
      const idx = (activePlayerIndex + step) % updatedPlayers.length;
      
      if (idx === startingPlayerIdx) {
        nextInning = currentInning + 1;
      }
      
      if (!updatedPlayers[idx].isFinished) {
        nextPlayerIndex = idx;
        foundNext = true;
        break;
      }
    }

    // If no one is left unfinished
    if (!foundNext) {
      const highestScorePlayer = [...updatedPlayers].sort((a, b) => {
        const aMet = a.isFinished ? 1 : 0;
        const bMet = b.isFinished ? 1 : 0;
        if (aMet !== bMet) return bMet - aMet;
        if (type === '4-Ball' && lastThreeCushions > 0) {
          return (b.cushionScore || 0) - (a.cushionScore || 0);
        }
        return b.currentScore - a.currentScore;
      })[0];
      setWinnerName(highestScorePlayer ? highestScorePlayer.name : updatedPlayers[0]?.name || '경기가 종료되었습니다');
      setShowFinishedModal(true);
      levelSucceededSound();
      return;
    }

    // Reset turn indicators
    setCurrentTurnPoints(0);
    setActivePlayerIndex(nextPlayerIndex);
    setCurrentInning(nextInning);
    setShotClockTime(shotClockLimit);
  };

  // Undo system
  const handleUndoAction = () => {
    if (stateHistory.length === 0) return;
    
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
    // Current player scored what they have earned so far
    handleEndInning();
  };

  // Toggle cushion phase for a team in 4-Ball Team mode
  const handleTeamCushionTransition = (teamId: 'A' | 'B', forceState?: boolean) => {
    cueClickSound();
    
    // Save state history before editing so that users can Undo
    pushStateToHistory();

    setPlayers(prev => {
      const memberIds = teamId === 'A' ? [1, 3] : [2, 4];
      const isCurrentlyCushion = prev.some(p => memberIds.includes(p.id) && p.isCushionPhase);
      const newState = forceState !== undefined ? forceState : !isCurrentlyCushion;

      return prev.map(p => {
        if (memberIds.includes(p.id)) {
          return { 
            ...p, 
            isCushionPhase: newState
          };
        }
        return p;
      });
    });
  };

  // Finish active game and convert parameters to system persistent record list
  const handleFinalizeAndSaveRecord = () => {
    // Player 1 (user) statistics computed
    const p1 = players[0];
    const p2 = players[1];

    // Total innings is capped at currentInning
    const totalInningsCount = Math.max(1, currentInning);
    const avgScore = Number((p1.currentScore / totalInningsCount).toFixed(3));
    
    // True if P1 achieved higher target performance or reached target score
    const isP1Winner = p1.isFinished || (!p2.isFinished && (p1.currentScore / p1.targetScore >= p2.currentScore / p2.targetScore));

    // Build the record data
    const finishedMatchData = {
      date: new Date().toISOString(),
      type,
      mode,
      myScore: p1.currentScore,
      opponentScore: p2 ? p2.currentScore : 0,
      innings: totalInningsCount,
      highRun: p1.highRun,
      playerCount: playerCount as any,
      rank: playerCount > 2 ? players.findIndex(p => p.id === p1.id) + 1 : undefined, // simple rank proxy
      lastThreeCushions: type === '4-Ball' ? (lastThreeCushions as any) : undefined,
      notes: notes.trim() || `실시간 경기 진행 완료 (이닝: ${totalInningsCount}회)`,
      opponentName: p2 ? p2.name : '기타',
      inningScores: p1.inningScores,
      myCushionScore: type === '4-Ball' ? (p1.cushionScore || 0) : undefined,
      opponentCushionScore: (type === '4-Ball' && p2) ? (p2.cushionScore || 0) : undefined,
    };

    // Callback to persist
    onAdd(finishedMatchData);
    
    // Empty cache and navigate
    localStorage.removeItem('billiards_active_room_state');
    setIsPlaying(false);
    setShowFinishedModal(false);
    navigate('/records');
  };

  // Terminate without saving
  const handleForceCancelGame = () => {
    setShowCancelGameConfirm(true);
  };

  const handleConfirmCancelGame = () => {
    localStorage.removeItem('billiards_active_room_state');
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
        <div className="max-w-xl mx-auto">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <RefreshCw size={12} className="animate-spin" />
              실시간 경기방 개설
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Target className="text-emerald-400" size={28} />
              당구 게임방 생성
            </h1>
            <p className="text-emerald-100/60 mt-1 font-medium text-xs">
              선수들의 핸디/다마 정보를 입력하고, 실시간 턴제 디지털 스코어보드를 시작하세요.
            </p>
          </div>

          <div className="bg-[#0b3c2e] p-6 sm:p-8 rounded-[2.5rem] border border-[#1a5d4e] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Trophy size={140} className="text-emerald-400 rotate-12" />
            </div>

            <form onSubmit={handleStartRealtimeGame} className="space-y-6 text-left relative z-10 text-emerald-50">

              {/* 경기 방식 설정 (개인전 vs 팀전) */}
              <div>
                <label className="block text-xs font-bold text-[#e9a65a] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                  경기 방식 설정 (개인전 vs 팀전)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Individual', 'Team'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        if (m === 'Team') {
                          setPlayerCount(4); // Force 4 players for team match (2:2)
                        }
                      }}
                      className={cn(
                        "py-3 px-4 rounded-2xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer",
                        mode === m
                          ? "bg-emerald-500 border-emerald-400 text-[#0a3d2e] shadow-lg shadow-emerald-500/10 font-black"
                          : "bg-[#144b3c] border-[#1d6352] text-emerald-100/60 hover:text-white"
                      )}
                    >
                      <Users size={14} />
                      {m === 'Individual' ? '개인전 (Individual)' : '2 : 2 복식 팀전 (Team)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 경기 인원수 설정 */}
              <div>
                <label className="block text-xs font-bold text-emerald-400/85 uppercase tracking-widest mb-2">
                  경기 인원수 설정
                </label>
                {mode === 'Team' ? (
                  <div className="bg-[#144b3c]/50 border border-dashed border-emerald-500/30 text-emerald-300 text-xs font-black p-3.5 rounded-2xl text-center flex items-center justify-center gap-2 animate-fadeIn">
                    <Users size={14} className="text-emerald-400 shrink-0" />
                    <span>복식 팀전은 <span className="text-white font-extrabold underline decoration-2 decoration-emerald-400 underline-offset-4">4인 플레이 (2:2)</span>로 고정되어 시작합니다.</span>
                  </div>
                ) : (
                  <div className="flex bg-[#144b3c] p-1 rounded-2xl border border-[#1d6352] animate-fadeIn">
                    {[2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setPlayerCount(num as any);
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center",
                          playerCount === num 
                            ? "bg-emerald-500 text-[#0a3d2e] font-extrabold shadow-md" 
                            : "text-emerald-100/50 hover:text-white"
                        )}
                      >
                        {num}인 플레이 ({num}인 전)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 경기 종목 설정 (3구 4구) */}
              <div>
                <label className="block text-xs font-bold text-emerald-400/85 uppercase tracking-widest mb-2">
                  경기 종목 (3구 vs 4구)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['3-Cushion', '4-Ball'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={cn(
                        "py-3 px-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer",
                        type === t 
                          ? "bg-emerald-500 border-emerald-400 text-[#0a3d2e] shadow-lg shadow-emerald-500/10" 
                          : "bg-[#144b3c] border-[#1d6352] text-emerald-100/60 hover:text-white"
                      )}
                    >
                      <span className={cn(
                        "w-2.5 h-2.5 rounded-full animate-pulse",
                        type === t 
                          ? "bg-[#0a3d2e]" 
                          : "bg-[#1d6352]"
                      )} />
                      {t === '3-Cushion' ? '3구 당구 (3-Cushion)' : '4구 당구 (4-Ball)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teams Choice if 4 players (Moved to top of form) */}

              {/* 4구 전용: 마지막 쓰리쿠션 목표 개수 설정 */}
              {type === '4-Ball' && (
                <div className="bg-[#144b3c]/35 p-4 rounded-2xl border border-dashed border-[#e9a65a]/30">
                  <label className="block text-xs font-bold text-[#e9a65a] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Target size={14} className="text-orange-400" />
                    4구 전용: 마지막 쓰리쿠션(쿠션 수) 설정
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setLastThreeCushions(num as any)}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                          lastThreeCushions === num 
                            ? "bg-[#e9a65a]/20 border-[#e9a65a] text-[#ffd6aa] font-black shadow-lg" 
                            : "bg-[#144b3c] border-[#1d6352] text-emerald-100/40 hover:border-[#e9a65a]/30"
                        )}
                      >
                        {num === 0 ? '쿠션 없음' : `마지막 ${num}쿠션`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-emerald-300/65 mt-2 leading-relaxed">
                    구질에 따라 4구 기본 다마(점수)를 모두 친 이후, <strong className="text-orange-400">마지막에 성공해야 하는 쓰리쿠션의 개수</strong>를 결정합니다. (0, 1, 혹은 2개 설정)
                  </p>
                </div>
              )}

              {/* Start Match button */}
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 text-base mt-2 cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                실시간 경기 예약 및 게임방 입장
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1.5. INTERACTIVE MULTIPLAYER LOBBY ROOM */}
      {!isPlaying && isLobby && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowExitLobbyConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <ArrowLeft size={14} />
              대기방 나가기
            </button>
          </div>

          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Hourglass size={12} className="animate-spin" />
              매칭 및 게임 대기 상태
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Users className="text-emerald-400" size={28} />
              실시간 당구 게임 대기방
            </h1>
            <p className="text-emerald-100/60 mt-1 font-medium text-xs">
              대기방에 동료 및 상대 선수가 하나둘 접속하고 있습니다. 모든 선수가 접속 완료하면 경기를 시작할 수 있습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left/Middle Column: Participant list */}
            <div className="md:col-span-2 space-y-4">

              {/* Roster list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">
                    참가 예정 선수 구성 ({lobbyPlayers.filter(p => p.isJoined).length} / {playerCount}명 입장)
                  </span>
                  <span className="text-xs text-emerald-300/60 font-mono">
                    {type === '3-Cushion' ? '3구 당구 UMB' : '4구 당구'} • {mode === 'Individual' ? '개인전' : '팀전'}
                  </span>
                </div>
                {(() => {
                  const renderLobbyPlayer = (lp: any) => {
                    const isSelf = lp.isMe;
                    
                    // Style attributes based on cue ball colors
                    const ballColorsMap: Record<string, { bg: string; border: string; glow: string; text: string }> = {
                      white: { bg: 'bg-white', border: 'border-zinc-200', glow: 'shadow-[0_0_12px_rgba(255,255,255,0.2)]', text: 'text-zinc-800' },
                      yellow: { bg: 'bg-yellow-400', border: 'border-yellow-300', glow: 'shadow-[0_0_12px_rgba(251,191,36,0.3)]', text: 'text-yellow-950' },
                      red: { bg: 'bg-red-500', border: 'border-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.3)]', text: 'text-white' },
                      orange: { bg: 'bg-orange-500', border: 'border-orange-400', glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]', text: 'text-white' },
                      blue: { bg: 'bg-sky-500', border: 'border-sky-400', glow: 'shadow-[0_0_12px_rgba(14,165,233,0.3)]', text: 'text-white' },
                    };

                    const style = ballColorsMap[lp.cueBallColor] || ballColorsMap.white;

                    if (!lp.isJoined) {
                      return (
                        <div 
                          key={lp.id}
                          className="relative h-[120px] rounded-[2rem] border-2 border-dashed border-[#1d6352]/40 bg-[#07241c]/40 hover:bg-[#092e24]/60 transition-all duration-300 flex flex-col items-center justify-center p-4 text-center group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border border-dashed border-[#1d6352] bg-[#0c382c]/40 flex items-center justify-center text-emerald-400/40 group-hover:scale-105 group-hover:border-emerald-400 group-hover:text-emerald-400 transition-all duration-300">
                              <Plus size={14} className="animate-pulse" />
                            </div>
                            <span className="text-xs font-black text-emerald-400/50 uppercase tracking-widest block font-sans">
                              슬롯 {lp.id} 비어있음
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-300/35 mt-1">
                            우측 하단 [온라인 당구 친구 목록]에서 초대해 주세요.
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={lp.id}
                        className={cn(
                          "relative h-[120px] rounded-[2rem] border p-5 transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:scale-[1.01]",
                          lp.isReady
                            ? "bg-gradient-to-br from-[#0c4032] to-[#06241a] border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            : "bg-gradient-to-br from-[#0b3c2e] to-[#07241c] border-[#1d6352] shadow-md"
                        )}
                      >
                        {/* Interactive dynamic background glow effect for active deck */}
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-500" />
                        
                        {/* Upper row: Avatar & Status */}
                        <div className="flex items-start justify-between z-10 w-full">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm relative select-none",
                              style.bg,
                              style.border,
                              style.glow,
                              style.text
                            )}>
                              {lp.id}
                              {/* Pulse ring if ready */}
                              {lp.isReady && (
                                <span className="absolute -inset-1 rounded-full border border-emerald-400 animate-ping opacity-35" />
                              )}
                            </span>
                            
                            <div className="text-left w-full">
                              <div className="flex items-center gap-1.5 leading-none">
                                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-300/40 font-mono">
                                  {isSelf ? "MY SLOT" : `CUE PLAYER ${lp.id}`}
                                </span>
                                {isSelf && (
                                  <span className="text-[8px] font-black bg-emerald-400 text-zinc-950 px-1 py-0.2 rounded-md">나</span>
                                )}
                              </div>
                              <h4 className="font-sans font-black text-white text-sm sm:text-base tracking-tight leading-none mt-1">
                                {lp.name}
                              </h4>
                            </div>
                          </div>

                          {/* Level/Role status badge */}
                          <div className="text-right">
                            {lp.isReady ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
                                Setting
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle status tagline badge */}
                        <div className="text-left mt-2 pl-1 z-10 flex justify-between items-center w-full">
                          <span className={cn(
                            "inline-flex items-center gap-1 font-mono text-[9px] uppercase font-bold tracking-widest",
                            lp.isReady ? "text-emerald-400" : "text-amber-400/80"
                          )}>
                            {lp.isReady ? "● READY TO DUEL" : "○ PREPARING CUE"}
                          </span>
                          {mode === 'Team' && playerCount === 4 && (
                            <div className="flex items-center gap-1.5">
                              {/* Up/Down buttons */}
                              {(lp.id === 1 || lp.id === 2) ? (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLobbyPlayer(lp.id, 'down')}
                                  className="w-5 h-5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 text-[10px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                  title="아래 순서로 이동"
                                >
                                  ↓
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLobbyPlayer(lp.id, 'up')}
                                  className="w-5 h-5 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 text-[10px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center active:scale-95"
                                  title="위 순서로 이동"
                                >
                                  ↑
                                </button>
                              )}

                              {/* Left/Right buttons */}
                              {(lp.id === 1 || lp.id === 3) ? (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLobbyPlayer(lp.id, 'right')}
                                  className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/20 text-[9px] font-black tracking-wider transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
                                  title="2팀으로 이동"
                                >
                                  <span>2팀 이동</span>
                                  <ArrowRight size={10} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMoveLobbyPlayer(lp.id, 'left')}
                                  className="px-1.5 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 border border-emerald-500/20 text-[9px] font-black tracking-wider transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
                                  title="1팀으로 이동"
                                >
                                  <ArrowLeft size={10} />
                                  <span>1팀 이동</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  };

                  if (mode === 'Team' && playerCount === 4) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative mt-4">
                        {/* Mid VS Badge overlay */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 border-2 border-[#09352a] text-[#09352a] font-mono font-black text-xs flex items-center justify-center shadow-lg shadow-amber-500/10 uppercase italic tracking-wider">
                            VS
                          </div>
                        </div>

                        {/* Team A (Left column) */}
                        <div className="space-y-4 bg-[#0a2f26] p-5 rounded-[2.5rem] border border-emerald-500/20">
                          <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2 mb-1">
                            <span className="text-xs font-black text-emerald-400 tracking-wider flex items-center gap-1.5 font-sans">
                              <span className="w-2 rounded-full h-2 bg-emerald-400 shrink-0" />
                              1팀 (동료팀)
                            </span>
                          </div>
                          <div className="space-y-3">
                            {[1, 3].map(id => {
                              const lp = lobbyPlayers.find(p => p.id === id);
                              if (!lp) return null;
                              return renderLobbyPlayer(lp);
                            })}
                          </div>
                        </div>

                        {/* Team B (Right column) */}
                        <div className="space-y-4 bg-[#3d1a1a]/15 p-5 rounded-[2.5rem] border border-red-500/10">
                          <div className="flex items-center justify-between border-b border-red-500/10 pb-2 mb-1">
                            <span className="text-xs font-black text-red-400 tracking-wider flex items-center gap-1.5 font-sans">
                              <span className="w-2 rounded-full h-2 bg-red-400 shrink-0 animate-pulse" />
                              2팀 (상대팀)
                            </span>
                          </div>
                          <div className="space-y-3">
                            {[2, 4].map(id => {
                              const lp = lobbyPlayers.find(p => p.id === id);
                              if (!lp) return null;
                              return renderLobbyPlayer(lp);
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default Individual Grid (2 columns on landscape screens)
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {lobbyPlayers.map((lp) => renderLobbyPlayer(lp))}
                    </div>
                  );
                })()}
              </div>

              {/* Online friends list area */}
              <div className="bg-[#0b3c2e]/60 p-5 rounded-[2rem] border border-[#1d6352]/50 text-left">
                <div className="flex items-center justify-between mb-3 border-b border-[#1a5d4e]/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h3 className="text-xs uppercase font-extrabold text-[#ffd6aa] tracking-widest flex items-center gap-1.5 font-sans">
                      <Users size={14} className="text-emerald-400" />
                      초대 가능 온라인 당구 친구 ({billiardFriends.length}명)
                    </h3>
                  </div>
                  <span className="text-[10px] text-emerald-300/40 font-sans">클릭하여 게임 초대를 보냅니다</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {billiardFriends.map((friend) => {
                    const isInvited = invitedFriendIds.includes(friend.id);
                    const isJoined = lobbyPlayers.some(p => p.isJoined && p.name.startsWith(friend.name));
                    const isLobbyFull = lobbyPlayers.every(p => p.isJoined);

                    return (
                      <div 
                        key={friend.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs",
                          isJoined 
                            ? "bg-emerald-950/20 border-emerald-500/10 opacity-70"
                            : isInvited
                              ? "bg-[#144b3c]/20 border-amber-500/20"
                              : "bg-[#0a3327]/60 border-[#1a5d4e]/30 hover:border-[#22725e]"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Colored Cue ball as mini avatar */}
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center font-bold text-[9px] text-[#0a3d2e] shadow-sm",
                            friend.id === 'f-1' ? "bg-white border-zinc-200" :
                            friend.id === 'f-2' ? "bg-yellow-400 border-yellow-300" :
                            friend.id === 'f-3' ? "bg-red-500 border-red-400 text-white" : "bg-sky-500 border-sky-400 text-white"
                          )}>
                            🎱
                          </div>
                          <div className="text-left font-sans">
                            <p className="font-bold text-white flex items-center gap-1.5 leading-none mb-0.5">
                              {friend.name}
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold font-sans">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                              </span>
                              온라인
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isInvited || isJoined || isLobbyFull}
                          onClick={() => handleInviteFriend(friend)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer active:scale-95 flex items-center gap-1 font-sans",
                            isJoined
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 cursor-default"
                              : isInvited
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/10 animate-pulse cursor-default"
                                : isLobbyFull
                                  ? "bg-zinc-800 text-zinc-500 border border-zinc-700/40 cursor-not-allowed"
                                  : "bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] shadow-sm font-black"
                          )}
                        >
                          {isJoined ? (
                            <>
                              <Check size={10} />
                              수락 완료
                            </>
                          ) : isInvited ? (
                            <>
                              <Hourglass size={10} className="animate-spin" />
                              수락 대기중
                            </>
                          ) : isLobbyFull ? (
                            "대기방 초과"
                          ) : (
                            "초대"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Simulated Chat Console with Event logs */}
            <div className="bg-[#0b3c2e] p-5 rounded-[2.5rem] border border-[#1a5d4e] shadow-xl flex flex-col justify-between h-[450px]">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-xs uppercase font-extrabold text-[#ffd6aa] tracking-widest pb-2 border-b border-[#1a5d4e]/40 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-orange-400" />
                    대기방 알림 및 접속 현황
                  </h3>
                  
                  {/* Messages container */}
                  <div className="overflow-y-auto space-y-2 mt-3 text-left text-[11px] font-mono h-[320px] scrollbar-thin pr-1">
                    {lobbyLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={cn(
                          "p-2.5 rounded-xl text-left border leading-normal",
                          log.type === 'system' 
                            ? "bg-emerald-950/40 border-emerald-900/40 text-emerald-300" 
                            : log.type === 'announcement'
                              ? "bg-orange-500/5 border-orange-500/10 text-orange-300"
                              : "bg-[#144b3c]/35 border-[#1d6352]/30 text-emerald-50/95"
                        )}
                      >
                        <p>{log.text}</p>
                        <span className="text-[8px] text-emerald-300/35 mt-1 block tracking-tight text-right">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated lobby chat helper advice */}
                <p className="text-[9px] text-[#ffd6aa]/45 border-t border-[#1a5d4e]/30 pt-2 text-center">
                  💡 대기방의 모든 참가자가 입장하면 경기 시작 버튼에 빛이 들어옵니다.
                </p>
              </div>
            </div>

          </div>

          {/* Bottom actions Panel */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLaunchGameFromLobby}
              className={cn(
                "w-full sm:w-auto font-black px-12 py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer",
                lobbyPlayers.every(p => p.isJoined)
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#07241c] shadow-lg shadow-emerald-500/15 active:scale-95"
                  : "bg-transparent border border-[#1d6352] text-emerald-300 hover:bg-[#144b3c]/30 hover:text-white active:scale-95"
              )}
            >
              <Play size={16} fill="currentColor" />
              <span>경기 시작하기</span>
              {!lobbyPlayers.every(p => p.isJoined) && (
                <span className="text-xs font-bold opacity-75 font-sans">
                  ({lobbyPlayers.filter(p => p.isJoined).length}/{playerCount} 대기)
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME MATCH SCOREBOARD VIEW */}
      {isPlaying && players.length > 0 && (
        <div className="space-y-6">
          
          {/* Header Indicators panel */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#07241c] px-6 py-4 rounded-3xl border border-[#134739] shadow-lg">
            
            {/* Left side: Stats */}
            <div className="flex items-center gap-6">
              {/* Inning Indicator */}
              <div className="text-left">
                <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider mb-0.5">이닝 (INNING)</span>
                <p className="text-xl font-mono font-black text-white">{currentInning}회</p>
              </div>

              {/* Divider */}
              <div className="hidden sm:block h-8 w-px bg-[#134739]" />

              {/* Stopwatch ticker */}
              <div className="flex items-center gap-2">
                <Timer className="text-emerald-400 shrink-0" size={18} />
                <div className="text-left">
                  <span className="text-[10px] text-emerald-500/60 block font-bold uppercase mb-0.5">누적 경기 시간</span>
                  <p className="text-lg font-mono font-bold text-white">
                    {Math.floor(gameTime / 60).toString().padStart(2, '0')}:{(gameTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={cn(
                  "p-2.5 rounded-xl border transition-colors",
                  soundEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-800/80 border-zinc-700 text-zinc-500"
                )}
                title={soundEnabled ? '소리 끄기' : '소리 켜기'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <button
                onClick={() => setIsPaused(!isPaused)}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold border rounded-xl transition-colors",
                  isPaused 
                    ? "bg-amber-500 border-amber-400 text-zinc-950" 
                    : "bg-[#144b3c] border-[#227764] text-emerald-300 hover:text-white"
                )}
              >
                {isPaused ? '경기 재개' : '일시정지'}
              </button>

              <button
                onClick={() => {
                  const highestScorePlayer = [...players].sort((a, b) => b.currentScore - a.currentScore)[0];
                  setWinnerName(highestScorePlayer ? highestScorePlayer.name : players[0]?.name || '');
                  setShowFinishedModal(true);
                }}
                className="px-4 py-2.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:scale-105 transition-all"
              >
                <Trophy size={14} />
                <span>경기 종료</span>
              </button>
            </div>
          </div>

          {/* Active Shot-clock indicator bar */}
          {enableShotClock && (
            <div className="bg-zinc-950/40 p-1.5 rounded-full border border-emerald-950/50">
              <div className="flex justify-between items-center px-4 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-[#9edac3]">이닝 제한 제한시간 (SHOT CLOCK)</span>
                <span className={cn(
                  "font-mono font-black text-sm",
                  shotClockTime <= 10 ? "text-red-400 text-lg animate-ping" : "text-emerald-300"
                )}>
                  {shotClockTime}초
                </span>
              </div>
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(shotClockTime / shotClockLimit) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    shotClockTime <= 8 
                      ? "bg-red-500 shadow-[0_0_10px_#ef4444]" 
                      : shotClockTime <= 15 
                        ? "bg-amber-500" 
                        : "bg-emerald-500"
                  )} 
                />
              </div>
            </div>
          )}

          {/* Team Mode Score Summaries */}
          {mode === 'Team' && playerCount === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full mb-6 mt-1 animate-fadeIn">
              {/* Team A (1팀: Player 1 + Player 3) */}
              <div className="bg-[#0c4032] border border-emerald-500/30 p-4 rounded-3xl flex items-center justify-between shadow-lg shadow-emerald-500/5">
                <div className="flex items-center gap-3 font-sans w-full sm:w-auto">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-mono font-black text-emerald-400 text-xs shrink-0 font-sans">
                    1팀
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block font-mono">1팀 (동료팀) • 합산</span>
                    <span className="text-xs font-black text-emerald-100/95 block">
                      {players.find(p => p.id === 1)?.name || '1번'} + {players.find(p => p.id === 3)?.name || '3번'}
                    </span>
                  </div>
                </div>
                {type === '4-Ball' && lastThreeCushions > 0 ? (
                  <div className="flex items-center gap-4 shrink-0">
                    {/* 알다마 합산 */}
                    <div className="text-right border-r border-emerald-500/10 pr-3">
                      <span className="text-[9px] font-bold text-emerald-400/50 uppercase tracking-widest block leading-none mb-1 font-mono">알다마</span>
                      <span className="text-2xl font-mono font-black text-white">
                        {((players.find(p => p.id === 1)?.currentScore || 0) + (players.find(p => p.id === 3)?.currentScore || 0))}
                      </span>
                    </div>
                    {/* 3쿠션 합산 */}
                    <div className="text-right pr-2">
                      <span className="text-[9px] font-bold text-orange-400/80 uppercase tracking-widest block leading-none mb-1 font-mono">3쿠션</span>
                      <span className="text-2xl font-mono font-black text-orange-400">
                        {((players.find(p => p.id === 1)?.cushionScore || 0) + (players.find(p => p.id === 3)?.cushionScore || 0))}
                      </span>
                      <span className="text-orange-400/35 font-mono text-[10px] font-bold leading-none block mt-0.5">
                        목표 {lastThreeCushions}개
                      </span>
                    </div>
                    {/* 3쿠션 전환 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleTeamCushionTransition('A')}
                      className={cn(
                        "px-3 py-1.5 rounded-2xl font-black text-[10px] transition-all cursor-pointer border shadow-sm active:scale-95 leading-none shrink-0",
                        (players.find(p => p.id === 1)?.isCushionPhase && players.find(p => p.id === 3)?.isCushionPhase)
                          ? "bg-amber-400 text-zinc-950 border-amber-300 font-black"
                          : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/30 border-orange-500/20"
                      )}
                    >
                      3쿠션 전환
                    </button>
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold text-emerald-400/40 uppercase tracking-widest block leading-none mb-1 font-mono">합산 현황</span>
                    <span className="text-2xl font-mono font-black text-white">
                      {((players.find(p => p.id === 1)?.currentScore || 0) + (players.find(p => p.id === 3)?.currentScore || 0))}
                    </span>
                  </div>
                )}
              </div>

              {/* Team B (2팀: Player 2 + Player 4) */}
              <div className="bg-[#4a1c1c]/25 border border-red-500/20 p-4 rounded-3xl flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3 font-sans w-full sm:w-auto">
                  <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center font-mono font-black text-[#f87171] text-xs shrink-0 font-sans">
                    2팀
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-red-100 uppercase tracking-widest block font-mono">2팀 (상대팀) • 합산</span>
                    <span className="text-xs font-black text-red-100/95 block">
                      {players.find(p => p.id === 2)?.name || '2번'} + {players.find(p => p.id === 4)?.name || '4번'}
                    </span>
                  </div>
                </div>
                {type === '4-Ball' && lastThreeCushions > 0 ? (
                  <div className="flex items-center gap-4 shrink-0">
                    {/* 알다마 합산 */}
                    <div className="text-right border-r border-red-500/10 pr-3">
                      <span className="text-[9px] font-bold text-red-400/50 uppercase tracking-widest block leading-none mb-1 font-mono">알다마</span>
                      <span className="text-2xl font-mono font-black text-white">
                        {((players.find(p => p.id === 2)?.currentScore || 0) + (players.find(p => p.id === 4)?.currentScore || 0))}
                      </span>
                    </div>
                    {/* 3쿠션 합산 */}
                    <div className="text-right pr-2">
                      <span className="text-[9px] font-bold text-orange-400/80 uppercase tracking-widest block leading-none mb-1 font-mono">3쿠션</span>
                      <span className="text-2xl font-mono font-black text-orange-400">
                        {((players.find(p => p.id === 2)?.cushionScore || 0) + (players.find(p => p.id === 4)?.cushionScore || 0))}
                      </span>
                      <span className="text-orange-400/35 font-mono text-[10px] font-bold leading-none block mt-0.5">
                        목표 {lastThreeCushions}개
                      </span>
                    </div>
                    {/* 3쿠션 전환 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleTeamCushionTransition('B')}
                      className={cn(
                        "px-3 py-1.5 rounded-2xl font-black text-[10px] transition-all cursor-pointer border shadow-sm active:scale-95 leading-none shrink-0",
                        (players.find(p => p.id === 2)?.isCushionPhase && players.find(p => p.id === 4)?.isCushionPhase)
                          ? "bg-amber-400 text-zinc-950 border-amber-300 font-black"
                          : "bg-orange-500/15 text-orange-400 hover:bg-orange-500/30 border-orange-500/20"
                      )}
                    >
                      3쿠션 전환
                    </button>
                  </div>
                ) : (
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-bold text-red-400/40 uppercase tracking-widest block leading-none mb-1 font-mono">합산 현황</span>
                    <span className="text-2xl font-mono font-black text-white">
                      {((players.find(p => p.id === 2)?.currentScore || 0) + (players.find(p => p.id === 4)?.currentScore || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Massive Live Score boxes - Grid display responsive to player numbers in a clean 2x2 quadrant layout */}
          {(() => {
            const renderPlayerCard = (p: any, idx: number, isActive: boolean, progressRatio: number, quadrantLabel: string, quadrantMini: string) => {
              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative p-6 rounded-[2.5rem] border transition-all duration-300 select-none text-left overflow-hidden min-h-[220px] flex flex-col justify-between",
                    p.isFinished
                      ? "bg-gradient-to-br from-[#1c180a] to-[#071d17] border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      : isActive 
                        ? "bg-[#0f4d3d] border-emerald-400 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]" 
                        : "bg-[#0b3127] border-[#16503f] opacity-85 hover:opacity-100"
                  )}
                >
                  {/* Finished Gold Watermark Trophy */}
                  {p.isFinished && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500/10 pointer-events-none select-none z-0">
                      <Award size={130} className="stroke-[1] animate-pulse" />
                    </div>
                  )}

                  {/* Decorative cue ball layout top-right */}
                  <div className="absolute top-5 right-5 flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-400/40 tracking-wider">
                      {quadrantMini}
                    </span>
                    <span className={cn(
                      "w-5 h-5 rounded-full inline-block shadow-lg border",
                      p.cueBallColor === 'white' ? "bg-white border-zinc-200" : 
                      p.cueBallColor === 'yellow' ? "bg-yellow-400 border-yellow-300" : 
                      p.cueBallColor === 'red' ? "bg-red-500 border-red-400" : "bg-sky-500 border-sky-400"
                    )} />
                  </div>

                  <div>
                    {/* Grid Position Info Badge */}
                    <div className="mb-2">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block uppercase tracking-wider mb-2">
                        {quadrantLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
                          {p.name}
                          {p.isMe && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">나</span>}
                        </h3>
                        {isActive && !p.isFinished && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest block mt-1",
                        p.isFinished ? "text-amber-400" : "text-emerald-400/60"
                      )}>
                        {p.isFinished 
                          ? "🏆 경기 완료 (FINISHED)" 
                          : isActive 
                            ? "💡 공격 중 (ACTIVE)" 
                            : "대기 열"}
                      </span>
                    </div>

                    {/* Decorative Divider */}
                    <div className={cn(
                      "w-full h-px mt-4 mb-2 transition-all duration-300",
                      isActive ? "bg-emerald-400/20" : "bg-emerald-700/10"
                    )} />
                  </div>

                  {/* HUGE NUMERICAL SCORE DISPLAYS && Target info */}
                  <div className="mt-4 flex items-end justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-6xl md:text-7xl font-mono font-black tracking-tight leading-none",
                          p.isFinished 
                            ? "text-amber-400" 
                            : p.isCushionPhase
                              ? ((p.cushionScore || 0) >= lastThreeCushions ? "text-emerald-300 animate-pulse" : "text-orange-400")
                              : isActive 
                                ? "text-emerald-300"
                                : "text-white"
                        )}>
                          {p.currentScore}
                        </span>
                      </div>
                      {/* Minimalist 4-Ball Cushion Status Badge */}
                      {type === '4-Ball' && lastThreeCushions > 0 && p.isCushionPhase && !p.isFinished && (
                        <div className="text-[11px] font-bold text-orange-400 mt-2">
                          🔥 마무리 쓰리쿠션 ({p.cushionScore || 0} / {lastThreeCushions})
                        </div>
                      )}
                    </div>

                    {/* Highlight overlay if active or finished */}
                    <div className="flex items-center gap-1.5">
                      {p.isFinished ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-[10px] font-black rounded-lg uppercase tracking-wider shadow-lg">
                          🏆 COMPLETE
                        </span>
                      ) : isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-[#07241c] text-[10px] font-black rounded-lg uppercase tracking-wider shadow-lg animate-bounce">
                          💡 TURN
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            };

            const isTeam4Mode = mode === 'Team' && playerCount === 4;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
                {isTeam4Mode ? (
                  <>
                    {/* Left Column: Team 1 (Player 1 & Player 3) */}
                    <div className="space-y-6">
                      {[1, 3].map(id => {
                        const p = players.find(x => x.id === id);
                        if (!p) return null;
                        const idx = players.findIndex(x => x.id === id);
                        const isActive = idx === activePlayerIndex;
                        const progressRatio = Math.min(100, (p.currentScore / p.targetScore) * 100);
                        const quadrantLabel = id === 1 ? `왼쪽 위 (1팀 • ${idx + 1}P)` : `왼쪽 아래 (1팀 • ${idx + 1}P)`;
                        const quadrantMini = id === 1 ? "↖" : "↙";
                        return renderPlayerCard(p, idx, isActive, progressRatio, quadrantLabel, quadrantMini);
                      })}
                    </div>

                    {/* Right Column: Team 2 (Player 2 & Player 4) */}
                    <div className="space-y-6">
                      {[2, 4].map(id => {
                        const p = players.find(x => x.id === id);
                        if (!p) return null;
                        const idx = players.findIndex(x => x.id === id);
                        const isActive = idx === activePlayerIndex;
                        const progressRatio = Math.min(100, (p.currentScore / p.targetScore) * 100);
                        const quadrantLabel = id === 2 ? `오른쪽 위 (2팀 • ${idx + 1}P)` : `오른쪽 아래 (2팀 • ${idx + 1}P)`;
                        const quadrantMini = id === 2 ? "↗" : "↘";
                        return renderPlayerCard(p, idx, isActive, progressRatio, quadrantLabel, quadrantMini);
                      })}
                    </div>
                  </>
                ) : (
                  players.map((p, idx) => {
                    const isActive = idx === activePlayerIndex;
                    const progressRatio = Math.min(100, (p.currentScore / p.targetScore) * 100);
                    const quadrantLabel = idx === 0 ? "왼쪽 위 (1P)" : idx === 1 ? "오른쪽 위 (2P)" : idx === 2 ? "왼쪽 아래 (3P)" : "오른쪽 아래 (4P)";
                    const quadrantMini = idx === 0 ? "↖" : idx === 1 ? "↗" : idx === 2 ? "↙" : "↘";
                    return renderPlayerCard(p, idx, isActive, progressRatio, quadrantLabel, quadrantMini);
                  })
                )}
              </div>
            );
          })()}

          {/* ACTIVE TURN SCOREBOARD CONTROLLER PANEL */}
          <div className="bg-[#0b3c2e] p-6 sm:p-8 rounded-[3rem] border border-[#1a5d4e] shadow-2xl relative">
            
            {/* Current Active User highlight bar */}
            <div className="flex flex-wrap items-center justify-between border-b border-[#1a5d4e] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-4 h-4 rounded-full border shadow-sm",
                  players[activePlayerIndex].cueBallColor === 'white' ? "bg-white border-zinc-200" : 
                  players[activePlayerIndex].cueBallColor === 'yellow' ? "bg-yellow-400 border-yellow-300" : "bg-red-500 border-red-400"
                )} />
                <h3 className="text-lg font-black text-white">
                  {players[activePlayerIndex].name} <span className="font-normal text-sm text-[#00ffa2]">선수 공격 중</span>
                </h3>
              </div>
            </div>

            {/* Controller Layout */}
            <div className="flex flex-col gap-4">
              
              {/* 4구 전용 마무리 쓰리쿠션 전환 수동 제어기 (팀전인 경우에는 합산 상자에 배치되므로 여기선 노출하지 않음) */}
              {type === '4-Ball' && lastThreeCushions > 0 && !players[activePlayerIndex].isCushionPhase && !(mode === 'Team' && playerCount === 4) && (
                <div className="p-4 bg-[#144b3c]/50 rounded-2xl border border-dashed border-[#e9a65a]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left w-full sm:w-auto">
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block mb-1">
                      4구 진행 상태 제어
                    </span>
                    <p className="text-sm font-bold text-white leading-tight">
                      <span className="text-emerald-100">
                        ⚪ 일반 볼(알) 점수 획득 단계 진행 중
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayers(prev => {
                        const updated = [...prev];
                        const active = { ...updated[activePlayerIndex] };
                        active.isCushionPhase = true;
                        updated[activePlayerIndex] = active;
                        return updated;
                      });
                      cueClickSound();
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all border bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-extrabold shadow-md"
                  >
                    🔴 3쿠션 전환
                  </button>
                </div>
              )}

              {/* Status Header for 3-Cushion Phase */}
              {type === '4-Ball' && lastThreeCushions > 0 && players[activePlayerIndex].isCushionPhase && (
                <div className="p-4 bg-orange-950/40 rounded-2xl border border-orange-500/20 text-center">
                  <p className="text-sm font-black text-orange-400 animate-pulse flex items-center justify-center gap-2">
                    🔥 현재 마무리 쓰리쿠션 단계 진행 중! ({lastThreeCushions}쿠션을 득점해야 승리합니다.)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {players[activePlayerIndex].isCushionPhase ? (
                  <>
                    {/* 3-Cushion scoring point addition */}
                    <button
                      onClick={() => handleScoreChange(1)}
                      disabled={isPaused}
                      className="h-20 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all"
                    >
                      <Plus size={24} />
                      <span className="text-sm font-black block">🏆 3쿠션 득점</span>
                    </button>

                    {/* 3-Cushion point deduction */}
                    <button
                      onClick={() => handleScoreChange(-1)}
                      disabled={isPaused}
                      className="h-20 bg-[#2b1f13] hover:bg-orange-500/10 hover:text-orange-300 border border-orange-500/30 text-orange-400 font-bold rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transform hover:-translate-y-1 transition-all"
                    >
                      <Minus size={24} />
                      <span className="text-sm font-bold block">3쿠션 감점 (수정)</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* General Point addition */}
                    <button
                      onClick={() => handleScoreChange(1)}
                      disabled={isPaused}
                      className="h-20 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#092e23] font-black rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg cursor-pointer transform hover:-translate-y-1 transition-all"
                    >
                      <Plus size={24} />
                      <span className="text-sm font-bold block">1점 득점</span>
                    </button>

                    {/* General Deduct point (safe correction) */}
                    <button
                      onClick={() => handleScoreChange(-1)}
                      disabled={isPaused}
                      className="h-20 bg-[#1a3830] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 text-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-1 border border-[#2d8a75]/30 cursor-pointer transform hover:-translate-y-1 transition-all"
                    >
                      <Minus size={24} />
                      <span className="text-sm font-bold block">1점 감점 (수정)</span>
                    </button>
                  </>
                )}
 
                {/* Next Turn Trigger */}
                <button
                  onClick={handleEndInning}
                  disabled={isPaused}
                  className="h-20 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transform hover:-translate-y-1 transition-all"
                >
                  <ChevronRight size={24} />
                  <span className="text-sm font-bold block">이닝 완료 / 교대</span>
                </button>
 
              </div>

            </div>
          </div>
        </div>
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowFinishedModal(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  취소 후 이어서 기록하기
                </button>
                <button
                  onClick={handleFinalizeAndSaveRecord}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-[#07241c] font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
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
        onConfirm={() => {
          setIsLobby(false);
          setShowExitLobbyConfirm(false);
        }}
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
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#07241c] py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <Play size={16} fill="currentColor" />
                  <span>순서 결정 및 경기 시작하기</span>
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
