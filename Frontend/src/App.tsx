/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
  useNavigate
} from 'react-router-dom';
import { 
  Trophy, 
  TrendingUp, 
  History, 
  Plus, 
  Target, 
  Activity,
  ChevronRight,
  TrendingDown,
  Award,
  Search,
  Users,
  Info,
  Megaphone,
  BarChart3,
  Monitor,
  Github,
  MessageSquare,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Bell,
  UserPlus,
  Settings,
  Shield,
} from 'lucide-react';
import { GameRecord, GameRecordDraft, GameRecordPage, GameRecordSearchParams, GameStatistics, PlayerStats, GameType } from './types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import {
  createGameRecord,
  deleteGameRecord,
  getGameRecords,
  getGameStatistics,
	searchGameRecords,
  updateGameRecord,
} from './api/gameRecords';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  searchFriends,
  sendFriendRequest,
  type FriendRequest,
  type FriendSearchResult,
  type FriendSearchStatus,
} from './api/friends';
import {
  acceptGameInvitation,
  declineGameInvitation,
  getGameInvitations,
  type GameInvitation,
} from './api/gameInvitations';
import { getMyProfile, type MemberProfile } from './api/memberProfile';
import { logout, restoreSession } from './api/auth';
import { ApiClientError, addUnauthorizedListener, getApiErrorMessage, refreshAuthSession } from './api/client';
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from './api/notifications';
import { connectNotificationSocket } from './api/realtimeNotifications';
import { issueNotificationWebSocketTicket } from './api/websocketTickets';
import {
  AuthSession,
  AuthSessionPayload,
  clearAuthSession,
  getAuthSessionRemainingMs,
  getStoredAuthSession,
  hasRefreshSessionHint,
  saveAuthSession,
  subscribeAuthSession,
  updateStoredAuthMember,
} from './api/authStorage';
import { calculateAutomaticHandicaps } from './lib/handicap';
import { AccountSettingsModal } from './components/AccountSettingsModal';

const StatsChart = lazy(() => import('./components/StatsChart').then(({ StatsChart }) => ({ default: StatsChart })));
const GuidePage = lazy(() => import('./components/GuidePage').then(({ GuidePage }) => ({ default: GuidePage })));
const LoginPage = lazy(() => import('./components/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })));
const ContactPage = lazy(() => import('./components/ContactPage').then(({ ContactPage }) => ({ default: ContactPage })));
const AdminContactInquiriesPage = lazy(() => import('./components/AdminContactInquiriesPage').then(({ AdminContactInquiriesPage }) => ({ default: AdminContactInquiriesPage })));
const AdminNoticesPage = lazy(() => import('./components/AdminNoticesPage').then(({ AdminNoticesPage }) => ({ default: AdminNoticesPage })));
const NoticePage = lazy(() => import('./components/NoticePage').then(({ NoticePage }) => ({ default: NoticePage })));
const SignupPage = lazy(() => import('./components/SignupPage').then(({ SignupPage }) => ({ default: SignupPage })));
const DashboardPage = lazy(() => import('./components/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const CreateGamePage = lazy(() => import('./components/CreateGamePage').then(({ CreateGamePage }) => ({ default: CreateGamePage })));
const GameRecordsPage = lazy(() => import('./components/GameRecordsPage').then(({ GameRecordsPage }) => ({ default: GameRecordsPage })));
const AnalysisPage = lazy(() => import('./components/AnalysisPage').then(({ AnalysisPage }) => ({ default: AnalysisPage })));
const FriendsPage = lazy(() => import('./components/FriendsPage').then(({ FriendsPage }) => ({ default: FriendsPage })));

type AppNotificationType = 'match' | 'friend' | 'report' | 'system';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  isNew: boolean;
  type: AppNotificationType;
};

const notificationTypeMap: Record<NotificationItem['type'], AppNotificationType> = {
  FRIEND: 'friend',
  MATCH: 'match',
  REPORT: 'report',
  SYSTEM: 'system',
};

const friendRelationshipLabel: Record<FriendSearchStatus, string> = {
  NONE: '친구 아님',
  FRIEND: '친구',
  PENDING_INCOMING: '받은 요청',
  PENDING_OUTGOING: '요청 대기 중',
};

const formatNotificationTime = (createdAt: string) => {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) {
    return '';
  }

  const diffMs = Date.now() - created.getTime();
  if (diffMs < 60_000) {
    return '방금 전';
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return format(created, 'M월 d일', { locale: ko });
};

const toAppNotification = (notification: NotificationItem): AppNotification => ({
  id: String(notification.id),
  title: notification.title,
  message: notification.message,
  time: formatNotificationTime(notification.createdAt),
  isNew: !notification.read,
  type: notificationTypeMap[notification.type],
});

const toServerNotificationId = (notificationId: string) => {
  const parsedId = Number(notificationId);
  return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
};

const createEmptyGameStatistics = (type: GameType): GameStatistics => ({
  type,
  totalGames: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  overallAverage: 0,
  bestAverage: 0,
  maxHighRun: 0,
  totalInnings: 0,
  totalPoints: 0,
  calculatedDama: 0,
  trend: 'STABLE',
  changeRate: 0,
  recentAverageTrends: [],
});

const createEmptyGameRecordPage = (): GameRecordPage => ({
	content: [],
	page: 0,
	size: 10,
	totalElements: 0,
	totalPages: 0,
	hasNext: false,
});

function BilliardsLogo() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* White Ball */}
      <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full border border-zinc-200 shadow-sm z-10" />
      {/* Yellow Ball */}
      <div className="absolute bottom-1 left-3 w-5 h-5 bg-yellow-400 rounded-full shadow-sm z-20" />
      {/* Red Ball */}
      <div className="absolute top-3 right-1 w-5 h-5 bg-red-500 rounded-full shadow-sm z-30" />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const [incomingInvitation, setIncomingInvitation] = useState<GameInvitation | null>(null);
  const [gameInvitationAction, setGameInvitationAction] = useState<'accept' | 'decline' | null>(null);
  const [gameInvitationError, setGameInvitationError] = useState<string | null>(null);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
	const [recordSearchPage, setRecordSearchPage] = useState<GameRecordPage>(createEmptyGameRecordPage);
	const [isRecordSearchLoading, setIsRecordSearchLoading] = useState(false);
	const [recordSearchError, setRecordSearchError] = useState<string | null>(null);
	const recordSearchRequestIdRef = useRef(0);
  const [filter, setFilter] = useState<GameType>('3-Cushion');
  const [recentGameCount, setRecentGameCount] = useState<5 | 10 | 20>(10);
  const [gameStatistics, setGameStatistics] = useState<GameStatistics>(() =>
    createEmptyGameStatistics('3-Cushion')
  );
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(authSession));
  const [isAuthRestoring, setIsAuthRestoring] = useState(() => hasRefreshSessionHint());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState(() => authSession?.member.nickname || localStorage.getItem('billiards_name') || '사용자');
  const [userNickname, setUserNickname] = useState(() => authSession?.member.nickname || localStorage.getItem('billiards_nickname') || '사용자');
  
  const [userCushionCount, setUserCushionCount] = useState<number>(() => {
    const saved = localStorage.getItem('billiards_cushion_count');
    return saved ? parseInt(saved, 10) : 1; // 기본 1개 마무리
  });

  const [userDama3, setUserDama3] = useState<number>(() => {
    const saved = localStorage.getItem('billiards_dama3');
    return saved ? parseInt(saved, 10) : 200;
  });
  const [userDama4, setUserDama4] = useState<number>(() => {
    const saved = localStorage.getItem('billiards_dama4');
    return saved ? parseInt(saved, 10) : 250;
  });

  const applyMemberProfile = useCallback((profile: MemberProfile) => {
    setUserName(profile.name);
    setUserNickname(profile.nickname);
    setUserCushionCount(profile.targetCushionCount);
    setUserDama3(profile.threeBallHandicap);
    setUserDama4(profile.fourBallHandicap);
    localStorage.setItem('billiards_name', profile.name);
    localStorage.setItem('billiards_nickname', profile.nickname);
    localStorage.setItem('billiards_cushion_count', profile.targetCushionCount.toString());
    localStorage.setItem('billiards_dama3', profile.threeBallHandicap.toString());
    localStorage.setItem('billiards_dama4', profile.fourBallHandicap.toString());

    const updatedSession = updateStoredAuthMember({ nickname: profile.nickname });
    if (updatedSession) {
      setAuthSession(updatedSession);
    }
  }, []);

  // Dynamic automatic calculation sync
  useEffect(() => {
    const { threeBallHandicap, fourBallHandicap } = calculateAutomaticHandicaps(records, userCushionCount);
    setUserDama3(threeBallHandicap);
    setUserDama4(fourBallHandicap);
    localStorage.setItem('billiards_dama3', threeBallHandicap.toString());
    localStorage.setItem('billiards_dama4', fourBallHandicap.toString());
  }, [records, userCushionCount]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addSystemNotification = useCallback((title: string, message: string) => {
    setNotifications((current) => [{
      id: `notif-${Date.now()}`,
      title,
      message,
      time: '방금 전',
      isNew: true,
      type: 'system',
    }, ...current]);
  }, []);

  const [headerFriendsCount, setHeaderFriendsCount] = useState(0);
  const [headerRequests, setHeaderRequests] = useState<FriendRequest[]>([]);
  const [isHeaderFriendsLoading, setIsHeaderFriendsLoading] = useState(false);
  const [headerFriendsError, setHeaderFriendsError] = useState<string | null>(null);
  const [headerFriendActionKey, setHeaderFriendActionKey] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null);
  const [isHeaderSearchLoading, setIsHeaderSearchLoading] = useState(false);
  const [headerSearchError, setHeaderSearchError] = useState<string | null>(null);
  const headerFriendStateRequestIdRef = useRef(0);
  const headerFriendSearchRequestIdRef = useRef(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleGameActiveChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsGameActive(!!customEvent.detail?.isPlaying);
    };

    window.addEventListener('billiards_game_active_state_changed', handleGameActiveChange);
    return () => {
      window.removeEventListener('billiards_game_active_state_changed', handleGameActiveChange);
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== '/create-game') {
      setIsGameActive(false);
    }
  }, [location.pathname]);

  // Mock visitor counts
  const [visitors] = useState({ today: 124, total: 15420, active: 42 });

  const fillMissingInningScores = <T extends { innings: number; highRun: number; inningScores?: number[] }>(record: T): T => {
    if (record.inningScores && record.inningScores.length > 0) {
      return record;
    }

    return {
      ...record,
      inningScores: Array.from({ length: record.innings }, () => {
        if (record.innings === 0) return 0;
        return Math.floor(Math.random() * (record.highRun + 1));
      }),
    };
  };

  const handleAuthenticated = useCallback((session: AuthSessionPayload) => {
    const savedSession = saveAuthSession(session);
    setAuthSession(savedSession);
    setIsLoggedIn(true);
    setUserName(savedSession.member.nickname);
    setUserNickname(savedSession.member.nickname);
    setRecordsError(null);
    setStatisticsError(null);
  }, []);

  useEffect(() => subscribeAuthSession((session) => {
    setAuthSession(session);
    setIsLoggedIn(Boolean(session));
    if (session) {
      setUserName(session.member.nickname);
      setUserNickname(session.member.nickname);
    }
  }), []);

  useEffect(() => {
    if (!hasRefreshSessionHint()) {
      setIsAuthRestoring(false);
      return undefined;
    }

    let active = true;

    const restore = async () => {
      try {
        await restoreSession();
      } catch {
        // A temporary backend failure should not erase the HttpOnly refresh cookie.
      } finally {
        if (active) {
          setIsAuthRestoring(false);
        }
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      alert(getApiErrorMessage(error));
      return;
    }

    clearAuthSession();
    setAuthSession(null);
    setIsLoggedIn(false);
    setRecords([]);
    setIsUserMenuOpen(false);
    setUserName('사용자');
    setUserNickname('사용자');
    setRecordsError(null);
    navigate('/login');
  }, [navigate]);

  const handleAuthExpired = useCallback(() => {
    clearAuthSession();
    setAuthSession(null);
    setIsLoggedIn(false);
    setRecords([]);
    setUserName('사용자');
    setUserNickname('사용자');
    setRecordsError('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    navigate('/login');
  }, [navigate]);

  const loadIncomingGameInvitations = useCallback(async () => {
    if (!isLoggedIn) {
      setIncomingInvitation(null);
      setGameInvitationError(null);
      return;
    }

    try {
      const invitations = await getGameInvitations();
      setIncomingInvitation(invitations.incoming[0] ?? null);
      setGameInvitationError(null);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setGameInvitationError(getApiErrorMessage(error));
    }
  }, [handleAuthExpired, isLoggedIn]);

  useEffect(() => {
    void loadIncomingGameInvitations();
  }, [loadIncomingGameInvitations]);

  const handleDeclineInvitation = async () => {
    if (!incomingInvitation || gameInvitationAction) {
      return;
    }

    setGameInvitationAction('decline');
    setGameInvitationError(null);

    try {
      await declineGameInvitation(incomingInvitation.invitationId);
      await loadIncomingGameInvitations();
      window.dispatchEvent(new CustomEvent('billiards_notifications_updated'));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setGameInvitationError(getApiErrorMessage(error));
    } finally {
      setGameInvitationAction(null);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!incomingInvitation || gameInvitationAction) {
      return;
    }

    setGameInvitationAction('accept');
    setGameInvitationError(null);

    try {
      const acceptedInvitation = await acceptGameInvitation(incomingInvitation.invitationId);
      const opponentHandicap = acceptedInvitation.gameType === '3-Cushion'
        ? acceptedInvitation.member.threeBallHandicap
        : acceptedInvitation.member.fourBallHandicap;

      setIncomingInvitation(null);
      setIsNotificationsOpen(false);
      window.dispatchEvent(new CustomEvent('billiards_notifications_updated'));
      navigate('/create-game', {
        state: {
          acceptedInvitation: {
            opponentName: acceptedInvitation.member.nickname,
            opponentTargetScore: Math.max(5, Math.floor(opponentHandicap / 10)),
            gameType: acceptedInvitation.gameType,
            gameRoomId: acceptedInvitation.gameRoomId,
          },
        },
      });
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setGameInvitationError(getApiErrorMessage(error));
    } finally {
      setGameInvitationAction(null);
    }
  };

  const loadHeaderFriendState = useCallback(async () => {
    const requestId = ++headerFriendStateRequestIdRef.current;

    if (!isLoggedIn) {
      setHeaderFriendsCount(0);
      setHeaderRequests([]);
      setHeaderFriendsError(null);
      setIsHeaderFriendsLoading(false);
      return;
    }

    setIsHeaderFriendsLoading(true);
    setHeaderFriendsError(null);

    try {
      const [friends, requests] = await Promise.all([getFriends(), getFriendRequests()]);

      if (headerFriendStateRequestIdRef.current !== requestId) {
        return;
      }

      setHeaderFriendsCount(friends.length);
      setHeaderRequests(requests.incoming);
    } catch (error) {
      if (headerFriendStateRequestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setHeaderFriendsError(getApiErrorMessage(error));
    } finally {
      if (headerFriendStateRequestIdRef.current === requestId) {
        setIsHeaderFriendsLoading(false);
      }
    }
  }, [handleAuthExpired, isLoggedIn]);

  useEffect(() => {
    void loadHeaderFriendState();
  }, [loadHeaderFriendState]);

  useEffect(() => {
    const refreshHeaderFriendState = () => {
      void loadHeaderFriendState();
    };

    window.addEventListener('billiards_friends_updated', refreshHeaderFriendState);
    window.addEventListener('billiards_requests_updated', refreshHeaderFriendState);

    return () => {
      window.removeEventListener('billiards_friends_updated', refreshHeaderFriendState);
      window.removeEventListener('billiards_requests_updated', refreshHeaderFriendState);
    };
  }, [loadHeaderFriendState]);

  const handleHeaderAccept = async (requestId: number) => {
    setHeaderFriendActionKey(`accept-${requestId}`);
    setHeaderFriendsError(null);

    try {
      await acceptFriendRequest(requestId);
      await loadHeaderFriendState();
      window.dispatchEvent(new CustomEvent('billiards_notifications_updated'));
    } catch (error) {
      setHeaderFriendsError(getApiErrorMessage(error));
    } finally {
      setHeaderFriendActionKey(null);
    }
  };

  const handleHeaderDecline = async (requestId: number) => {
    setHeaderFriendActionKey(`decline-${requestId}`);
    setHeaderFriendsError(null);

    try {
      await declineFriendRequest(requestId);
      await loadHeaderFriendState();
    } catch (error) {
      setHeaderFriendsError(getApiErrorMessage(error));
    } finally {
      setHeaderFriendActionKey(null);
    }
  };

  const performSearch = useCallback(async (query: string) => {
    const keyword = query.trim();
    const requestId = ++headerFriendSearchRequestIdRef.current;

    if (!keyword) {
      setSearchResult(null);
      setHeaderSearchError(null);
      setIsHeaderSearchLoading(false);
      return;
    }

    setIsHeaderSearchLoading(true);
    setHeaderSearchError(null);

    try {
      const results = await searchFriends(keyword);

      if (headerFriendSearchRequestIdRef.current !== requestId) {
        return;
      }

      setSearchResult(results[0] ?? null);
    } catch (error) {
      if (headerFriendSearchRequestIdRef.current !== requestId) {
        return;
      }

      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setSearchResult(null);
      setHeaderSearchError(getApiErrorMessage(error));
    } finally {
      if (headerFriendSearchRequestIdRef.current === requestId) {
        setIsHeaderSearchLoading(false);
      }
    }
  }, [handleAuthExpired]);

  useEffect(() => {
    if (!isLoggedIn) {
      setSearchResult(null);
      setHeaderSearchError(null);
      setIsHeaderSearchLoading(false);
      return;
    }

    const keyword = searchQuery.trim();
    if (!keyword) {
      void performSearch('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void performSearch(keyword);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [isLoggedIn, performSearch, searchQuery]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void performSearch(searchQuery);
  };

  const handleHeaderSendRequest = async (recipient: FriendSearchResult) => {
    if (recipient.relationshipStatus !== 'NONE') {
      return;
    }

    setHeaderFriendActionKey(`send-${recipient.memberId}`);
    setHeaderSearchError(null);

    try {
      await sendFriendRequest(recipient.memberId);
      setSearchResult((current) => current
        ? { ...current, relationshipStatus: 'PENDING_OUTGOING' }
        : current);
      await loadHeaderFriendState();
    } catch (error) {
      setHeaderSearchError(getApiErrorMessage(error));
    } finally {
      setHeaderFriendActionKey(null);
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      return;
    }

    try {
      const fetchedNotifications = await getNotifications();
      setNotifications(fetchedNotifications.map(toAppNotification));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [handleAuthExpired, isLoggedIn]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleNotificationsUpdated = () => {
      void loadNotifications();
    };

    window.addEventListener('billiards_notifications_updated', handleNotificationsUpdated);
    return () => {
      window.removeEventListener('billiards_notifications_updated', handleNotificationsUpdated);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByClient = false;

    const connect = async () => {
      try {
        const { ticket } = await issueNotificationWebSocketTicket();
        if (closedByClient) {
          return;
        }

        socket = connectNotificationSocket({
          ticket,
          onNotification: (notification) => {
            const nextNotification = toAppNotification(notification);
            setNotifications((prev) => [
              nextNotification,
              ...prev.filter((item) => item.id !== nextNotification.id),
            ]);

            if (notification.type === 'FRIEND') {
              void loadHeaderFriendState();
            }

            if (notification.type === 'MATCH') {
              void loadIncomingGameInvitations();
            }
          },
          onClose: (event) => {
            if (closedByClient) {
              return;
            }

            if (event.code === 1008) {
              handleAuthExpired();
              return;
            }

            reconnectTimer = window.setTimeout(() => void connect(), 3000);
          },
        });
      } catch (error) {
        if (closedByClient) {
          return;
        }
        if (error instanceof ApiClientError && error.status === 401) {
          handleAuthExpired();
          return;
        }
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
  }, [
    handleAuthExpired,
    isLoggedIn,
    loadHeaderFriendState,
    loadIncomingGameInvitations,
  ]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isNew: false })));

    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [handleAuthExpired]);

  const handleMarkNotificationRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, isNew: false } : notification
      )
    );

    const serverNotificationId = toServerNotificationId(notificationId);
    if (!serverNotificationId) {
      return;
    }

    try {
      await markNotificationAsRead(serverNotificationId);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [handleAuthExpired]);

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));

    const serverNotificationId = toServerNotificationId(notificationId);
    if (!serverNotificationId) {
      return;
    }

    try {
      await deleteNotification(serverNotificationId);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [handleAuthExpired]);

  const handleDeleteAllNotifications = useCallback(async () => {
    setNotifications([]);

    try {
      await deleteAllNotifications();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [handleAuthExpired]);

  const loadRecords = useCallback(async () => {
    if (!isLoggedIn) {
      setRecords([]);
      setRecordsError(null);
      setIsRecordsLoading(false);
      return;
    }

    setIsRecordsLoading(true);
    setRecordsError(null);

    try {
      const fetchedRecords = await getGameRecords();
      setRecords(fetchedRecords.map(fillMissingInningScores));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setRecords([]);
      setRecordsError(getApiErrorMessage(error));
    } finally {
      setIsRecordsLoading(false);
    }
  }, [handleAuthExpired, isLoggedIn]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

	const loadRecordSearchPage = useCallback(async (params: GameRecordSearchParams) => {
		const requestId = ++recordSearchRequestIdRef.current;

		if (!isLoggedIn) {
			setRecordSearchPage(createEmptyGameRecordPage());
			setRecordSearchError(null);
			setIsRecordSearchLoading(false);
			return;
		}

		setIsRecordSearchLoading(true);
		setRecordSearchError(null);

		try {
			const result = await searchGameRecords(params);
			if (requestId === recordSearchRequestIdRef.current) {
				setRecordSearchPage({
					...result,
					content: result.content.map(fillMissingInningScores),
				});
			}
		} catch (error) {
			if (error instanceof ApiClientError && error.status === 401) {
				handleAuthExpired();
				return;
			}

			if (requestId === recordSearchRequestIdRef.current) {
				setRecordSearchError(getApiErrorMessage(error));
			}
		} finally {
			if (requestId === recordSearchRequestIdRef.current) {
				setIsRecordSearchLoading(false);
			}
		}
	}, [handleAuthExpired, isLoggedIn]);

  const loadStatistics = useCallback(async () => {
    if (!isLoggedIn) {
      setGameStatistics(createEmptyGameStatistics(filter));
      setStatisticsError(null);
      setIsStatisticsLoading(false);
      return;
    }

    setIsStatisticsLoading(true);
    setStatisticsError(null);

    try {
      const fetchedStatistics = await getGameStatistics(filter, recentGameCount);
      setGameStatistics(fetchedStatistics);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        return;
      }

      setGameStatistics(createEmptyGameStatistics(filter));
      setStatisticsError(getApiErrorMessage(error));
    } finally {
      setIsStatisticsLoading(false);
    }
  }, [filter, handleAuthExpired, isLoggedIn, recentGameCount]);

  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);

  const loadMemberProfile = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      const profile = await getMyProfile();
      applyMemberProfile(profile);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
      }
    }
  }, [applyMemberProfile, handleAuthExpired, isLoggedIn]);

  useEffect(() => {
    void loadMemberProfile();
  }, [loadMemberProfile]);

  useEffect(() => addUnauthorizedListener(handleAuthExpired), [handleAuthExpired]);

  useEffect(() => {
    if (!authSession || isAuthRestoring) return undefined;

    const timeoutId = window.setTimeout(() => {
      void refreshAuthSession().catch((error) => {
        if (error instanceof ApiClientError && error.status === 401) {
          handleAuthExpired();
        }
      });
    }, getAuthSessionRemainingMs(authSession));
    return () => window.clearTimeout(timeoutId);
  }, [authSession, handleAuthExpired, isAuthRestoring]);

  const addRecord = async (newRecord: GameRecordDraft) => {
    const payload = fillMissingInningScores(newRecord);

    try {
      const savedRecord = await createGameRecord(payload);
      setRecords(prevRecords => [fillMissingInningScores(savedRecord), ...prevRecords]);
      setRecordsError(null);
      void loadStatistics();
      return savedRecord;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        throw error;
      }

      const message = getApiErrorMessage(error);
      setRecordsError(message);
      alert(`경기 기록 저장에 실패했습니다.\n${message}`);
      throw error;
    }
  };

  const removeRecord = async (recordId: string) => {
    try {
      await deleteGameRecord(recordId);
      setRecords(prevRecords => prevRecords.filter(record => record.id !== recordId));
      setRecordsError(null);
      void loadStatistics();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        throw error;
      }

      const message = getApiErrorMessage(error);
      setRecordsError(message);
      alert(`경기 기록 삭제에 실패했습니다.\n${message}`);
      throw error;
    }
  };

  const updateRecord = async (recordId: string, updatedRecord: GameRecordDraft) => {
    const payload = fillMissingInningScores(updatedRecord);

    try {
      const savedRecord = await updateGameRecord(recordId, payload);
      setRecords(prevRecords => prevRecords.map(record => (
        record.id === recordId ? fillMissingInningScores(savedRecord) : record
      )));
      setRecordsError(null);
      void loadStatistics();
      return savedRecord;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        handleAuthExpired();
        throw error;
      }

      const message = getApiErrorMessage(error);
      setRecordsError(message);
      throw new Error(message);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.type === filter);
  }, [records, filter]);

  const stats = useMemo<PlayerStats>(() => {
    const relevantRecords = filteredRecords;
    if (relevantRecords.length === 0) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        overallAverage: 0,
        bestAverage: 0,
        maxHighRun: 0,
        totalInnings: 0,
        totalPoints: 0,
        calculatedDama: 0,
        trend: '유지',
        changeRate: 0,
      };
    }

    const wins = relevantRecords.filter(r => r.win).length;
    const totalInnings = relevantRecords.reduce((acc, r) => acc + r.innings, 0);
    const totalPoints = relevantRecords.reduce((acc, r) => acc + r.myScore, 0);
    const overallAverage = totalPoints / totalInnings;

    // Calculate Dama based on recent games (5, 10, 20)
    const calculateDamaForCount = (count: number) => {
      const recent = relevantRecords.slice(0, count);
      if (recent.length === 0) return 0;
      const points = recent.reduce((acc, r) => acc + r.myScore, 0);
      const innings = recent.reduce((acc, r) => acc + r.innings, 0);
      const avg = points / innings;
      
      if (filter === '3-Cushion') {
        return Math.round(avg * 100); // Example 3-Cushion Dama
      } else {
        return Math.round(avg * 50); // Example 4-Ball Dama
      }
    };

    const dama5 = calculateDamaForCount(5);
    const dama10 = calculateDamaForCount(10);
    const dama20 = calculateDamaForCount(20);
    
    // Trend calculation
    const prev5 = relevantRecords.slice(5, 10);
    const current5 = relevantRecords.slice(0, 5);
    let trend: '상승세' | '하락세' | '유지' = '유지';
    let changeRate = 0;

    if (prev5.length > 0 && current5.length > 0) {
      const prevAvg = prev5.reduce((acc, r) => acc + r.average, 0) / prev5.length;
      const currAvg = current5.reduce((acc, r) => acc + r.average, 0) / current5.length;
      changeRate = ((currAvg - prevAvg) / prevAvg) * 100;
      if (changeRate > 5) trend = '상승세';
      else if (changeRate < -5) trend = '하락세';
    }

    return {
      totalGames: relevantRecords.length,
      wins,
      losses: relevantRecords.length - wins,
      winRate: Math.round((wins / relevantRecords.length) * 100),
      overallAverage,
      bestAverage: Math.max(...relevantRecords.map(r => r.average)),
      maxHighRun: Math.max(...relevantRecords.map(r => r.highRun)),
      totalInnings,
      totalPoints,
      calculatedDama: dama10, // Default to 10 games
      trend,
      changeRate: Number(changeRate.toFixed(1)),
    };
  }, [filteredRecords, filter]);

  if (isAuthRestoring) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" role="status" aria-label="Restoring session">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-emerald-600" />
      </div>
    );
  }

  const requireAuth = (element: React.ReactElement) => (
    isLoggedIn ? element : <Navigate to="/login" replace />
  );

  const requireAdmin = (element: React.ReactElement) => (
    isLoggedIn && authSession?.member.role === 'ADMIN'
      ? element
      : <Navigate to="/dashboard" replace />
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Bar: Visitor Stats */}
      {!isLoggedIn && (
        <div className="bg-zinc-900 text-white py-2 px-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
            <div className="flex gap-6">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {visitors.active} Active Players
              </span>
            </div>
            <div className="flex gap-6">
              <span>Today: {visitors.today}</span>
              <span>Total: {visitors.total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {!isGameActive && (
        <header className={cn(
          "border-b sticky top-0 z-40 transition-colors duration-300",
          isLoggedIn 
            ? "bg-[#0a3d2e]/90 border-[#1a5d4e] backdrop-blur-md text-white" 
            : "border-zinc-200 bg-white/80 backdrop-blur-md text-zinc-900"
        )}>
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            {/* Left: Sidebar Toggle & Logo */}
            <div className="flex items-center gap-4 shrink-0">
              {isLoggedIn && (
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-xl text-emerald-100 transition-colors"
                  title="메뉴 토글"
                >
                  {isSidebarOpen ? <ChevronRight size={24} className="rotate-180" /> : <Menu size={24} />}
                </button>
              )}
              <Link to={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
                <BilliardsLogo />
                <h1 className={cn(
                  "text-xl font-bold tracking-tight group-hover:text-emerald-400 transition-colors hidden sm:block",
                  isLoggedIn ? "text-emerald-50" : "text-zinc-900"
                )}>Billiards Analytics</h1>
              </Link>
            </div>
            
            {/* Center: Friend Search (Logged In) or Navigation Links (Logged Out) */}
            <div className="flex-1 max-w-xs">
              {isLoggedIn ? (
                <div className="relative">
                  <form onSubmit={handleSearch} className="relative group">
                    <input 
                      type="text"
                      placeholder="이름(닉네임) 검색"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-full bg-[#1a5d4e] text-emerald-50 placeholder:text-emerald-100/30 pl-4 pr-10 py-2 rounded-xl border border-[#2d8a75] focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-bold"
                    />
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/30 group-focus-within:text-emerald-400 transition-colors" />
                  </form>

                  <AnimatePresence>
                    {searchQuery.trim() && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResult(null);
                          }}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl shadow-2xl z-50 p-4"
                        >
                          {isHeaderSearchLoading ? (
                            <div className="flex min-h-24 items-center justify-center gap-2 text-sm font-bold text-emerald-100/60">
                              <Activity size={16} className="animate-spin" />
                              회원을 검색하는 중입니다.
                            </div>
                          ) : headerSearchError ? (
                            <p className="text-sm font-bold text-rose-100">{headerSearchError}</p>
                          ) : searchResult ? (
                            <>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                                    <User size={20} className="text-emerald-400" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <span className="block truncate font-bold text-emerald-50">
                                      {searchResult.name}
                                      <span className="ml-1.5 text-xs font-bold text-emerald-400">({searchResult.nickname})</span>
                                    </span>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100/40">
                                      {friendRelationshipLabel[searchResult.relationshipStatus]}
                                    </p>
                                  </div>
                                </div>
                                {searchResult.relationshipStatus === 'NONE' ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleHeaderSendRequest(searchResult)}
                                    disabled={headerFriendActionKey === `send-${searchResult.memberId}`}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-[#0a3d2e] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <UserPlus size={14} />
                                    {headerFriendActionKey === `send-${searchResult.memberId}` ? '요청 중...' : '친구 요청'}
                                  </button>
                                ) : (
                                  <span className="shrink-0 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                                    {friendRelationshipLabel[searchResult.relationshipStatus]}
                                  </span>
                                )}
                              </div>

                              <div className="mt-4 grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-[#1a5d4e]/50 p-2 text-center">
                                  <p className="text-[8px] font-bold uppercase text-emerald-500/50">3구 수지</p>
                                  <p className="text-sm font-black text-emerald-50">{searchResult.threeBallHandicap}</p>
                                </div>
                                <div className="rounded-xl bg-[#1a5d4e]/50 p-2 text-center">
                                  <p className="text-[8px] font-bold uppercase text-emerald-500/50">4구 수지</p>
                                  <p className="text-sm font-black text-emerald-50">{searchResult.fourBallHandicap}</p>
                                </div>
                                <div className="rounded-xl bg-[#1a5d4e]/50 p-2 text-center">
                                  <p className="text-[8px] font-bold uppercase text-emerald-500/50">목표 쿠션</p>
                                  <p className="text-sm font-black text-emerald-50">{searchResult.targetCushionCount}</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="py-4 text-center text-sm font-bold text-emerald-100/45">검색 결과가 없습니다.</p>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <nav className="hidden md:flex items-center justify-center gap-12">
                  <Link to="/" className="text-sm font-semibold text-zinc-500 hover:text-emerald-600 transition-colors flex items-center gap-2 whitespace-nowrap">
                    <Info size={18} />
                    서비스 소개
                  </Link>
                  <Link to="/guide" className="text-sm font-semibold text-zinc-500 hover:text-emerald-600 transition-colors flex items-center gap-2 whitespace-nowrap">
                    <Trophy size={18} />
                    이용 안내
                  </Link>
                </nav>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3 shrink-0">
              {!isLoggedIn ? (
                <>
                  <Link to="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-2">
                    로그인
                  </Link>
                  <Link to="/signup" className="text-sm font-bold text-zinc-900 bg-white border border-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
                    회원가입
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => {
                        const willOpen = !isFriendsOpen;
                        setIsFriendsOpen(willOpen);
                        setIsNotificationsOpen(false);
                        setIsUserMenuOpen(false);
                        if (willOpen) {
                          void loadHeaderFriendState();
                        }
                      }}
                      className={cn(
                        "p-2.5 rounded-xl transition-all relative",
                        isFriendsOpen ? "bg-emerald-500 text-[#0a3d2e]" : "hover:bg-[#1a5d4e] text-emerald-100"
                      )}
                      title="친구 관리"
                    >
                      <Users size={20} />
                      {headerRequests.length > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0a3d2e] animate-pulse" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isFriendsOpen && (
                        <>
                          <div className="fixed inset-0" onClick={() => setIsFriendsOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-64 bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-[#1a5d4e]">
                              <h3 className="text-sm font-bold text-emerald-50">친구 관리</h3>
                            </div>
                            <div className="p-4 space-y-4">
                              <div className="flex justify-between items-center text-left">
                                <span className="text-xs text-emerald-100/50">내 친구</span>
                                <span className="text-xs font-bold text-emerald-50">
                                  {isHeaderFriendsLoading ? '불러오는 중...' : `${headerFriendsCount}명`}
                                </span>
                              </div>
                              {headerFriendsError && (
                                <div className="border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-100">
                                  <p>{headerFriendsError}</p>
                                  <button
                                    type="button"
                                    onClick={() => void loadHeaderFriendState()}
                                    className="mt-2 text-emerald-200 hover:text-white"
                                  >
                                    다시 시도
                                  </button>
                                </div>
                              )}
                              <div className="space-y-2 text-left">
                                <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider">대기 중인 요청</p>
                                <div className="space-y-2">
                                  {isHeaderFriendsLoading ? (
                                    <div className="flex justify-center py-3 text-emerald-100/45">
                                      <Activity size={16} className="animate-spin" />
                                    </div>
                                  ) : headerRequests.length === 0 ? (
                                    <p className="text-[10px] text-emerald-100/30 text-center py-2 font-bold">도착한 요청이 없습니다.</p>
                                  ) : (
                                    headerRequests.map((req) => (
                                      <div key={req.requestId} className="flex items-center justify-between gap-2 bg-[#1a5d4e]/30 p-2 rounded-xl border border-[#1a5d4e]">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                                            {req.member.nickname.substring(0, 1)}
                                          </div>
                                          <span className="truncate text-xs font-medium text-emerald-50">{req.member.nickname}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          <button 
                                            type="button"
                                            onClick={() => void handleHeaderAccept(req.requestId)}
                                            disabled={headerFriendActionKey !== null}
                                            className="rounded px-2 py-1 text-[10px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {headerFriendActionKey === `accept-${req.requestId}` ? '처리 중' : '승인'}
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => void handleHeaderDecline(req.requestId)}
                                            disabled={headerFriendActionKey !== null}
                                            className="rounded px-2 py-1 text-[10px] font-bold text-orange-400 transition-colors hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {headerFriendActionKey === `decline-${req.requestId}` ? '처리 중' : '거절'}
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                            <Link 
                              to="/friends" 
                              onClick={() => setIsFriendsOpen(false)}
                              className="block w-full p-3 text-center text-[10px] font-bold text-emerald-400 hover:bg-[#1a5d4e] transition-colors border-t border-[#1a5d4e]"
                            >
                              친구 관리 전체보기
                            </Link>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Notification Popover */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(!isNotificationsOpen);
                        setIsFriendsOpen(false);
                        setIsUserMenuOpen(false);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl transition-all relative",
                        isNotificationsOpen ? "bg-emerald-500 text-[#0a3d2e]" : "hover:bg-[#1a5d4e] text-emerald-100"
                      )}
                      title="알림 센터"
                    >
                      <Bell size={20} />
                      {notifications.some(n => n.isNew) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0a3d2e] animate-pulse" />
                      )}
                    </button>

                    <AnimatePresence>
                      {isNotificationsOpen && (
                        <>
                          <div className="fixed inset-0" onClick={() => setIsNotificationsOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full right-0 mt-2 w-80 bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-4 border-b border-[#1a5d4e] flex items-center justify-between">
                              <h3 className="text-sm font-bold text-emerald-50 flex items-center gap-1.5">
                                <Bell size={16} className="text-emerald-400" />
                                알림 센터
                              </h3>
                              {notifications.some(n => n.isNew) && (
                                <button
                                  onClick={() => {
                                    void handleMarkAllNotificationsRead();
                                  }}
                                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded bg-[#1a5d4e]/50 hover:bg-[#1a5d4e] transition-colors"
                                >
                                  모두 읽음
                                </button>
                              )}
                            </div>
                            <div className="divide-y divide-[#1a5d4e]/40 max-h-80 overflow-y-auto">
                              {notifications.length === 0 ? (
                                <div className="p-8 text-center text-emerald-100/30 text-xs font-bold">
                                  알림이 없습니다.
                                </div>
                              ) : (
                                notifications.map((notif) => (
                                  <div 
                                    key={notif.id} 
                                    onClick={() => {
                                      void handleMarkNotificationRead(notif.id);
                                    }}
                                    className={cn(
                                      "p-4 cursor-pointer text-left transition-colors",
                                      notif.isNew ? "bg-[#1a5d4e]/25 border-l-2 border-emerald-400" : "hover:bg-[#1a5d4e]/10 border-l-2 border-transparent"
                                    )}
                                  >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {notif.type === 'match' && <Trophy size={12} className="text-amber-400 shrink-0" />}
                                        {notif.type === 'friend' && <Users size={12} className="text-emerald-400 shrink-0" />}
                                        {notif.type === 'report' && <Activity size={12} className="text-teal-400 shrink-0" />}
                                        {notif.type === 'system' && <Target size={12} className="text-rose-400 shrink-0" />}
                                        <h4 className="text-xs font-black text-emerald-50 truncate">{notif.title}</h4>
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-[9px] text-emerald-100/40 font-bold">{notif.time}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDeleteNotification(notif.id);
                                          }}
                                          className="p-1 hover:bg-orange-500/20 text-emerald-100/30 hover:text-orange-400 rounded transition-all"
                                          title="알림 삭제"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-emerald-100/70 leading-relaxed font-semibold">
                                      {notif.message}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                            {notifications.length > 0 && (
                              <div className="flex border-t border-[#1a5d4e]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteAllNotifications();
                                  }}
                                  className="w-full text-center py-3 text-[10px] font-black text-orange-400 hover:bg-orange-500/10 transition-colors uppercase tracking-wider"
                                >
                                  전체 삭제
                                </button>
                              </div>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* User / My Page Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsFriendsOpen(false);
                        setIsNotificationsOpen(false);
                      }}
                      className="flex items-center gap-2 text-sm font-bold bg-[#1a5d4e] text-emerald-50 px-4 py-2.5 rounded-xl hover:bg-[#237a66] transition-all shadow-lg shadow-black/20 border border-[#2d8a75]"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center">
                        <User size={14} className="text-[#0a3d2e]" />
                      </div>
                      <span className="hidden sm:inline">
                        {userName}({userNickname})
                      </span>
                      <ChevronDown size={16} className={`transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isUserMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsUserMenuOpen(false)} 
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-72 bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl shadow-2xl z-20 overflow-hidden"
                          >
                            {/* Profile Header */}
                            <div className="p-4 bg-[#145745] border-b border-[#1a5d4e] text-left space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-black text-[#0a3d2e] text-lg shadow-lg">
                                  {userName.substring(0, 1)}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-black text-emerald-50 text-sm leading-tight">
                                      {userName}({userNickname})
                                    </h4>
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase leading-none">Me</span>
                                  </div>
                                  <p className="max-w-44 truncate text-[10px] font-medium text-emerald-100/55">
                                    {authSession?.member.email}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Mini Metrics Dashboard */}
                            <div className="p-4 bg-[#0d4d3b] border-b border-[#1a5d4e]/40">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/40 p-2.5 rounded-xl text-center">
                                  <span className="text-[8px] font-black text-emerald-100/50 block uppercase leading-none mb-1">3C 수지</span>
                                  <span className="text-xs font-mono font-black text-emerald-50">{userDama3}점</span>
                                </div>
                                <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/40 p-2.5 rounded-xl text-center">
                                  <span className="text-[8px] font-black text-emerald-100/50 block uppercase leading-none mb-1">4구 수지</span>
                                  <span className="text-xs font-mono font-black text-emerald-50">{userDama4}점</span>
                                </div>
                              </div>
                            </div>

                            {/* Navigations & Actions */}
                            <div className="p-2 space-y-0.5">
                              <Link 
                                to="/friends" 
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center justify-between px-3 py-2.5 text-xs font-black text-emerald-100 hover:text-white hover:bg-[#1a5d4e]/60 rounded-xl transition-all text-left"
                              >
                                <span className="flex items-center gap-2">
                                  <Users size={14} className="text-emerald-400" />
                                  내 친구 목록 관리
                                </span>
                                <ChevronRight size={12} className="text-emerald-100/30" />
                              </Link>
                              
                              <Link 
                                to="/records" 
                                onClick={() => setIsUserMenuOpen(false)}
                                className="flex items-center justify-between px-3 py-2.5 text-xs font-black text-emerald-100 hover:text-white hover:bg-[#1a5d4e]/60 rounded-xl transition-all text-left"
                              >
                                <span className="flex items-center gap-2">
                                  <BarChart3 size={14} className="text-emerald-400" />
                                  개인 전적 상세 리포트
                                </span>
                                <ChevronRight size={12} className="text-emerald-100/30" />
                              </Link>

                              <button 
                                onClick={() => {
                                  setIsSettingsOpen(true);
                                  setIsUserMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-black text-emerald-100 hover:text-white hover:bg-[#1a5d4e]/60 rounded-xl transition-all text-left"
                              >
                                <span className="flex items-center gap-2">
                                  <Settings size={14} className="text-emerald-400" />
                                  설정 (마이페이지)
                                </span>
                                <ChevronRight size={12} className="text-emerald-100/30" />
                              </button>

                              <div className="h-px bg-[#1a5d4e]/40 my-1 mx-2" />

                              <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-black text-orange-400 hover:text-white hover:bg-orange-500/10 rounded-xl transition-all text-left"
                              >
                                <LogOut size={14} />
                                로그아웃
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <div className={cn(
        "flex transition-colors duration-300 min-h-screen",
        isLoggedIn ? "bg-[#0a3d2e]" : "bg-white"
      )}>
        {isLoggedIn && !isGameActive && (
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.aside 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 256, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="border-r border-[#1a5d4e] bg-[#0a3d2e] sticky top-16 h-[calc(100vh-64px)] overflow-hidden z-30"
              >
                <div className="w-64 p-6 space-y-8">
                  <div>
                    <h3 className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-4 px-2">Main Menu</h3>
                    <nav className="space-y-1">
                      <Link 
                        to="/dashboard" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/dashboard' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <BarChart3 size={20} />
                        대시보드
                      </Link>
                      <Link 
                        to="/create-game" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/create-game' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <Plus size={20} />
                        경기 생성
                      </Link>
                      <Link 
                        to="/records" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/records' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <History size={20} />
                        경기 기록
                      </Link>
                      <Link 
                        to="/analysis" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/analysis' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <Activity size={20} />
                        분석
                      </Link>
                      <Link 
                        to="/friends" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/friends' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <Users size={20} />
                        친구 관리
                      </Link>
                      {authSession?.member.role === 'ADMIN' && (
                        <Link
                          to="/admin/contact-inquiries"
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                            location.pathname === '/admin/contact-inquiries'
                              ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10"
                              : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                          )}
                        >
                          <Shield size={20} />
                          문의 관리
                        </Link>
                      )}
                      {authSession?.member.role === 'ADMIN' && (
                        <Link
                          to="/admin/notices"
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                            location.pathname === '/admin/notices'
                              ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10"
                              : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                          )}
                        >
                          <Megaphone size={20} />
                          공지 관리
                        </Link>
                      )}
                    </nav>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-[0.2em] mb-4 px-2">Support</h3>
                    <nav className="space-y-1">
                      <Link 
                        to="/notice" 
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                          location.pathname === '/notice' 
                            ? "bg-[#1a5d4e] text-white shadow-lg shadow-black/10" 
                            : "text-emerald-100/60 hover:text-emerald-100 hover:bg-[#1a5d4e]/50"
                        )}
                      >
                        <Info size={20} />
                        공지사항
                      </Link>
                    </nav>
                  </div>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        )}

        <main className={cn(
          "flex-1 transition-colors duration-300",
          isGameActive
            ? "px-2 py-4"
            : isLoggedIn 
              ? "px-8 py-8" 
              : "max-w-7xl mx-auto px-4 py-8"
        )}>
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/guide" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <GuidePage />} />
          <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={handleAuthenticated} />} />
          <Route path="/contact" element={<ContactPage isLoggedIn={isLoggedIn} />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/signup" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignupPage onAuthenticated={handleAuthenticated} />} />
          <Route path="/dashboard" element={requireAuth(
            <DashboardPage
              records={records}
              stats={gameStatistics}
              filter={filter}
              setFilter={setFilter}
              recentGameCount={recentGameCount}
              setRecentGameCount={setRecentGameCount}
              isStatisticsLoading={isStatisticsLoading}
              statisticsError={statisticsError}
              onRetryStatistics={loadStatistics}
            />
          )} />
          <Route path="/create-game" element={requireAuth(<CreateGamePage onAdd={addRecord} />)} />
          <Route
            path="/records"
            element={requireAuth(
              <GameRecordsPage
				records={recordSearchPage.content}
				pageInfo={recordSearchPage}
				isLoading={isRecordSearchLoading}
				errorMessage={recordSearchError}
				onSearch={loadRecordSearchPage}
                onDelete={removeRecord}
                onUpdate={updateRecord}
              />
            )}
          />
          <Route path="/analysis" element={requireAuth(<AnalysisPage records={records} />)} />
          <Route path="/friends" element={requireAuth(<FriendsPage />)} />
          <Route path="/admin/contact-inquiries" element={requireAdmin(<AdminContactInquiriesPage />)} />
          <Route path="/admin/notices" element={requireAdmin(<AdminNoticesPage />)} />
          <Route path="/" element={
            isLoggedIn ? (
              <Navigate to="/dashboard" replace />
            ) : records.length === 0 ? (
              <div className="py-12 flex flex-col items-center">
                {/* Hero Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-4xl text-center mb-20"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold uppercase tracking-widest mb-6">
                    <Activity size={14} />
                    당구 데이터 분석의 새로운 기준
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight leading-tight text-zinc-900">
                    기록을 넘어 <br />
                    <span className="text-emerald-600 font-extrabold italic">데이터로 승부하세요</span>
                  </h2>
                  <p className="text-zinc-500 text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
                    3구·4구 전문 분석부터 실시간 경기 진행까지. <br className="hidden md:block" />
                    Billiards Analytics가 당신의 당구 라이프를 통합 관리해 드립니다.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link 
                      to="/login"
                      className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2"
                    >
                      로그인하고 시작하기
                    </Link>
                  </div>
                </motion.div>


                {/* Service Introduction Content */}
                <div className="w-full space-y-32">
                  {/* Section 1: Why Billiards Analytics? */}
                  <section className="max-w-3xl mx-auto text-center space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 leading-tight">
                        기록을 넘어 <br />
                        <span className="text-emerald-600 underline decoration-emerald-500/20 underline-offset-8">데이터로 승부하는</span> 당구 라이프
                      </h3>
                      <p className="text-zinc-500 leading-relaxed text-lg">
                        자신의 모든 경기를 데이터로 기록하고 분석하여 
                        체계적으로 실력을 쌓아보세요. 에버리지와 하이런의 변화를 실시간으로 확인하며 
                        어제보다 더 나은 오늘의 기록을 만드는 짜릿한 승부의 세계가 펼쳐집니다.
                      </p>
                      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                        {[
                          "3구·4구 전문 분석 및 정밀 다마 측정",
                          "실시간 경기 방 & 턴 기반 점수 입력 시스템",
                          "친구 랭킹 및 1:1 vs 다수 경기 전적 관리",
                          "최근 실력 변화 추이 및 컨디션 상태 요약"
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-zinc-700 font-medium">
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                              <Plus size={12} />
                            </div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  {/* Section 2: Key Features */}
                  <section className="text-center space-y-16">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-zinc-900">주요 기능 소개</h3>
                      <p className="text-zinc-500">당신이 필요로 하는 모든 분석 도구를 제공합니다.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <FeatureCard 
                        icon={<History />}
                        title="다마 측정"
                        description="최근 5, 10, 20경기 데이터를 기반으로 당신의 진짜 실력을 산출합니다."
                      />
                      <FeatureCard 
                        icon={<BarChart3 />}
                        title="정밀 분석"
                        description="4구 3쿠션 개수 설정 등 종목별 세분화된 데이터 분석을 제공합니다."
                      />
                      <FeatureCard 
                        icon={<Users />}
                        title="친구 경쟁"
                        description="친구별 1:1 승률 및 다수 경기 순위 통계를 통해 경쟁의 재미를 더합니다."
                      />
                      <FeatureCard 
                        icon={<Monitor />}
                        title="실시간 경기"
                        description="턴 기반 점수 입력과 Undo 기능으로 정확하고 편리한 경기 진행이 가능합니다."
                      />
                    </div>
                  </section>

                  {/* Section 3: Call to Action */}
                  <section className="bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#10b98120,transparent_70%)]" />
                    <div className="relative z-10 space-y-8">
                      <h3 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                        지금 바로 <span className="text-emerald-400">Billiards Analytics</span>와 함께 <br />
                        당구를 더욱 재미있게 즐겨보세요!
                      </h3>
                      <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        복잡한 기록은 저희에게 맡기고, 당신은 오직 경기에만 집중하세요. <br />
                        지금 가입하면 모든 분석 기능을 즉시 무료로 이용할 수 있습니다.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link 
                          to="/login"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/20"
                        >
                          지금 당장 시작하기
                        </Link>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <>
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                  {(['All', '3-Cushion', '4-Ball', 'Pocket'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFilter(t)}
                      className={cn(
                        "px-5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                        filter === t 
                          ? "bg-zinc-900 text-white shadow-xl" 
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      )}
                    >
                      {t === 'All' ? '전체' : t === '3-Cushion' ? '3쿠션' : t === '4-Ball' ? '4구' : '포켓볼'}
                    </button>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard 
                    title="승률" 
                    value={`${stats.winRate}%`} 
                    subValue={`${stats.wins}승 ${stats.losses}패`}
                    icon={<Trophy className="text-amber-500" size={20} />}
                  />
                  <StatCard 
                    title="통합 에버리지" 
                    value={stats.overallAverage.toFixed(3)} 
                    subValue={`총 ${stats.totalInnings}이닝`}
                    icon={<TrendingUp className="text-emerald-600" size={20} />}
                  />
                  <StatCard 
                    title="베스트 에버리지" 
                    value={stats.bestAverage.toFixed(3)} 
                    subValue="역대 최고 기록"
                    icon={<Award className="text-purple-600" size={20} />}
                  />
                  <StatCard 
                    title="최고 하이런" 
                    value={stats.maxHighRun.toString()} 
                    subValue="연속 득점"
                    icon={<Activity className="text-blue-600" size={20} />}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Chart Section */}
                  <div className="lg:col-span-2 space-y-8">
                    <StatsChart records={filteredRecords} />
                    
                    {/* Recent Games */}
                    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2 text-zinc-900">
                          <History size={18} className="text-zinc-400" />
                          최근 경기 기록
                        </h3>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {filteredRecords.length > 0 ? (
                          filteredRecords.map((record) => (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              key={record.id} 
                              className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold",
                                  record.win ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                                )}>
                                  <span>{record.win ? 'WIN' : 'LOSS'}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-zinc-900">
                                    {record.myScore} : {record.opponentScore}
                                    <span className="ml-2 text-xs text-zinc-400 font-normal">
                                      ({record.type === '3-Cushion' ? '3쿠션' : record.type === '4-Ball' ? '4구' : '포켓'})
                                    </span>
                                  </p>
                                  <p className="text-xs text-zinc-400">
                                    {format(new Date(record.date), 'yyyy.MM.dd HH:mm', { locale: ko })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-zinc-400 uppercase tracking-wider">AVG</p>
                                  <p className="font-mono font-medium text-emerald-600">{record.average.toFixed(3)}</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                  <p className="text-xs text-zinc-400 uppercase tracking-wider">HR</p>
                                  <p className="font-mono font-medium text-blue-600">{record.highRun}</p>
                                </div>
                                <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="p-12 text-center text-zinc-400">
                            선택한 카테고리에 기록된 경기가 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Side Info / Quick Stats */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                      <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">누적 통계</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-sm">총 경기 수</span>
                          <span className="font-semibold text-zinc-900">{stats.totalGames}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-sm">총 득점</span>
                          <span className="font-semibold text-zinc-900">{stats.totalPoints}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 text-sm">총 이닝</span>
                          <span className="font-semibold text-zinc-900">{stats.totalInnings}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl border border-emerald-100 relative overflow-hidden group shadow-sm">
                      <div className="relative z-10">
                        <h3 className="text-emerald-700 font-bold mb-2">실력 향상 팁</h3>
                        <p className="text-sm text-zinc-600 leading-relaxed">
                          에버리지를 높이기 위해서는 무리한 공격보다 확실한 포지션 플레이가 중요합니다. 
                          기록을 꾸준히 남기면 자신의 약점을 파악할 수 있습니다.
                        </p>
                      </div>
                      <Activity className="absolute -right-4 -bottom-4 text-emerald-100 w-24 h-24 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                  </div>
                </div>
              </>
            )
          } />
        </Routes>
        </Suspense>
      </main>
    </div>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <BilliardsLogo />
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">Billiards Analytics</h1>
              </div>
              <p className="text-zinc-400 text-xs font-medium">
                개발자가 당구를 사랑하는 마음으로 소소하게 시작한 취미 프로젝트입니다.
              </p>
            </div>

            <nav>
              <ul className="flex gap-x-8 text-sm text-zinc-600 font-semibold">
                <li><Link to="/notice" className="hover:text-emerald-600 transition-colors">공지사항</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-600 transition-colors">문의하기</Link></li>
              </ul>
            </nav>
          </div>

          <div className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-zinc-400">
              © 2026 Billiards Analytics. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-zinc-400">
              <button className="hover:text-zinc-900 transition-colors font-medium">개인정보 처리방침</button>
              <a 
                href="https://github.com/kimjunghuni0909" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-zinc-900 transition-colors flex items-center gap-1"
              >
                <Github size={12} />
                만든 사람
              </a>
            </div>
          </div>
        </div>
      </footer>

      <AccountSettingsModal
        isOpen={isSettingsOpen}
        profile={{
          name: userName,
          nickname: userNickname,
          targetCushionCount: userCushionCount,
          threeBallHandicap: userDama3,
          fourBallHandicap: userDama4,
        }}
        records={records}
        onClose={() => setIsSettingsOpen(false)}
        onProfileUpdated={applyMemberProfile}
        onNotification={addSystemNotification}
      />
      {/* Game invitation modal with backdrop blur */}
      <AnimatePresence>
        {incomingInvitation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#041d15]/85 backdrop-blur-md"
            />
            
            {/* Invitation Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-sm bg-[#0d4d3b] border border-emerald-400/30 rounded-3xl shadow-2xl p-6 overflow-hidden text-center text-white z-10"
            >
              {/* Decorative billiard ball accent */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-emerald-500/25 to-teal-500/5 rounded-full blur-xl" />
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-xl" />

              {/* Header Accent */}
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-4 text-emerald-400">
                <Trophy size={22} className="animate-bounce" />
              </div>

              <span className="inline-block text-[9px] font-black tracking-widest text-[#0a3d2e] bg-emerald-400 px-2 py-0.5 rounded-full mb-2 uppercase leading-none font-mono">
                LIVE MATCH PROPOSAL
              </span>

              <h2 className="text-lg font-black text-emerald-50 tracking-tight">
                대국 경기 초대 도착 🎱
              </h2>
              
              {/* Sender profile card */}
              <div className="my-5 bg-[#0a3d2e]/90 border border-[#1a5d4e]/80 p-4 rounded-2xl text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center font-black text-[#0a3d2e] text-sm shadow-md">
                    {incomingInvitation.member.nickname.substring(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-emerald-100 truncate">{incomingInvitation.member.nickname}</h4>
                    <span className="text-[10px] text-emerald-300 font-bold block">
                      {incomingInvitation.gameType === '3-Cushion' ? '3구' : '4구'} 경기 · 3구 수지 {incomingInvitation.member.threeBallHandicap}점 · 4구 수지 {incomingInvitation.member.fourBallHandicap}점
                    </span>
                  </div>
                </div>
              </div>

              {gameInvitationError && (
                <p className="mb-3 text-left text-xs font-semibold text-rose-200" role="alert">
                  {gameInvitationError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleDeclineInvitation()}
                  disabled={Boolean(gameInvitationAction)}
                  className="py-3 bg-red-600/80 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-extrabold rounded-xl hover:shadow-lg transition-all text-xs cursor-pointer active:scale-95"
                >
                  {gameInvitationAction === 'decline' ? '처리 중...' : '거절하기'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptInvitation()}
                  disabled={Boolean(gameInvitationAction)}
                  className="py-3 bg-emerald-500 text-[#0a3d2e] disabled:cursor-not-allowed disabled:opacity-60 font-extrabold rounded-xl hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-xs cursor-pointer active:scale-95"
                >
                  {gameInvitationAction === 'accept' ? '처리 중...' : '수락 및 참가'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status" aria-label="페이지 불러오는 중">
      <Activity size={24} className="animate-pulse text-emerald-500" />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-zinc-200 text-left hover:border-emerald-200 transition-all group shadow-sm">
      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-emerald-600">
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3 text-zinc-900">{title}</h4>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 hover:border-emerald-200 transition-all group shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-zinc-50 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-zinc-400 text-sm font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-zinc-900 mb-1">{value}</h4>
        <p className="text-xs text-zinc-400">{subValue}</p>
      </div>
    </div>
  );
}
