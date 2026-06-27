/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Shield,
  Calendar,
  Smartphone,
  Laptop,
  Globe,
  Key
} from 'lucide-react';
import { GameRecord, PlayerStats, GameType } from './types';
import { StatsChart } from './components/StatsChart';
import { GuidePage } from './components/GuidePage';
import { LoginPage } from './components/LoginPage';
import { ContactPage } from './components/ContactPage';
import { NoticePage } from './components/NoticePage';
import { SignupPage } from './components/SignupPage';
import { DashboardPage } from './components/DashboardPage';
import { CreateGamePage } from './components/CreateGamePage';
import { GameRecordsPage } from './components/GameRecordsPage';
import { AnalysisPage } from './components/AnalysisPage';
import { FriendsPage } from './components/FriendsPage';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { sampleRecords } from './sampleData';

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
  const [incomingInvitation, setIncomingInvitation] = useState<any | null>(null);
  const [invitedAutoTriggered, setInvitedAutoTriggered] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [filter, setFilter] = useState<GameType>('3-Cushion');
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('billiards_name') || '사용자');
  const [userNickname, setUserNickname] = useState(() => localStorage.getItem('billiards_nickname') || '사용자');
  
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

  const [settingsTab, setSettingsTab] = useState<'profile' | 'preferences' | 'security' | 'withdraw'>('profile');
  const [settingsName, setSettingsName] = useState('');
  const [settingsNickname, setSettingsNickname] = useState('');
  const [settingsNicknameChecked, setSettingsNicknameChecked] = useState(true);
  const [settingsCushionCount, setSettingsCushionCount] = useState<number>(1);
  const [settingsDama3, setSettingsDama3] = useState<number>(200);
  const [settingsDama4, setSettingsDama4] = useState<number>(250);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawConfirmed, setWithdrawConfirmed] = useState(false);

  // My Page related states: Registration date, last login level, login history, toggles, devices
  const [joinDate] = useState(() => {
    const saved = localStorage.getItem('billiards_join_date');
    if (!saved) {
      const now = new Date();
      const joinStr = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // joined 8 days ago
      localStorage.setItem('billiards_join_date', joinStr);
      return joinStr;
    }
    return saved;
  });

  const [lastLoginDate] = useState(() => {
    const saved = localStorage.getItem('billiards_last_login');
    if (!saved) {
      const parts = new Date();
      const formatted = `${parts.getFullYear()}-${String(parts.getMonth() + 1).padStart(2, '0')}-${String(parts.getDate()).padStart(2, '0')} ${String(parts.getHours()).padStart(2, '0')}:${String(parts.getMinutes()).padStart(2, '0')}`;
      localStorage.setItem('billiards_last_login', formatted);
      return formatted;
    }
    return saved;
  });

  const [loginHistory, setLoginHistory] = useState(() => {
    const saved = localStorage.getItem('billiards_login_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const initialList = [
      { id: 1, date: '2026-06-13 16:24:44', ip: '211.234.56.78', device: 'Chrome on macOS (현재 기기)' },
      { id: 2, date: '2026-06-12 11:20:15', ip: '211.234.56.78', device: 'Safari on iPhone' },
      { id: 3, date: '2026-06-10 18:45:09', ip: '112.169.34.120', device: 'Chrome on Windows 11' },
    ];
    localStorage.setItem('billiards_login_history', JSON.stringify(initialList));
    return initialList;
  });

  const [activeDevices, setActiveDevices] = useState(() => {
    const saved = localStorage.getItem('billiards_active_devices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    const initialDevices = [
      { id: 'dev-1', device: 'Chrome on macOS', ip: '211.234.56.78', location: '서울, 대한민국', isCurrent: true, lastActive: '방금 전' },
      { id: 'dev-2', device: 'Safari on iPhone 15', ip: '211.234.56.90', location: '경기, 대한민국', isCurrent: false, lastActive: '2시간 전' },
      { id: 'dev-3', device: 'Chrome on Windows 11', ip: '112.169.34.120', location: '부산, 대한민국', isCurrent: false, lastActive: '3일 전' }
    ];
    localStorage.setItem('billiards_active_devices', JSON.stringify(initialDevices));
    return initialDevices;
  });

  const [alertMatch, setAlertMatch] = useState(() => {
    const saved = localStorage.getItem('alert_match');
    return saved ? saved === 'true' : true;
  });
  const [alertFriend, setAlertFriend] = useState(() => {
    const saved = localStorage.getItem('alert_friend');
    return saved ? saved === 'true' : true;
  });
  const [alertAiReport, setAlertAiReport] = useState(() => {
    const saved = localStorage.getItem('alert_aireport');
    return saved ? saved === 'true' : true;
  });
  const [alertSystem, setAlertSystem] = useState(() => {
    const saved = localStorage.getItem('alert_system');
    return saved ? saved === 'true' : false;
  });

  const handleToggleAlert = (key: 'match' | 'friend' | 'aireport' | 'system', value: boolean) => {
    localStorage.setItem(`alert_${key}`, value.toString());
    if (key === 'match') setAlertMatch(value);
    if (key === 'friend') setAlertFriend(value);
    if (key === 'aireport') setAlertAiReport(value);
    if (key === 'system') setAlertSystem(value);
  };

  const handleLogoutAllDevices = () => {
    if (window.confirm('현재 기기를 제외한 다른 모든 기기에서 로그아웃하시겠습니까?')) {
      const remaining = activeDevices.filter(d => d.isCurrent);
      setActiveDevices(remaining);
      localStorage.setItem('billiards_active_devices', JSON.stringify(remaining));

      const newNotif = {
        id: `notif-${Date.now()}`,
        title: '보안 알림: 모든 기기 로그아웃 완료',
        message: '현재 활성화 세션을 제외한 다른 모든 기기에서의 자격 증명이 말소 처리되었습니다.',
        time: '방금 전',
        isNew: true,
        type: 'system'
      };
      setNotifications(prev => [newNotif, ...prev]);
      alert('다른 모든 기기에서 안전하게 로그아웃되었습니다.');
    }
  };

  const handleLogoutDevice = (id: string, name: string) => {
    if (window.confirm(`선택하신 기기 [${name}]를 강제 로그아웃 시키시겠습니까?`)) {
      const updated = activeDevices.filter(d => d.id !== id);
      setActiveDevices(updated);
      localStorage.setItem('billiards_active_devices', JSON.stringify(updated));

      const newNotif = {
        id: `notif-${Date.now()}`,
        title: '보안 알림: 특정 기기 접속 해제',
        message: `${name} 기기의 로그인 접속이 해제되었습니다.`,
        time: '방금 전',
        isNew: true,
        type: 'system'
      };
      setNotifications(prev => [newNotif, ...prev]);
      alert('접속이 해제되었습니다.');
    }
  };

  // Helper function to calculate auto-handicaps based on records and cushionCount in 4-Ball
  const calculateAutoHandicaps = (currentRecords: GameRecord[], cushionCount: number) => {
    const mdClampDama = (val: number) => {
      const list = [50, 80, 100, 120, 150, 180, 200, 250, 300, 400, 500, 700, 1000];
      return list.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
    };

    const tripleMatches = currentRecords.filter(r => r.type === '3-Cushion');
    const fourMatches = currentRecords.filter(r => r.type === '4-Ball');

    let winRate3 = 50;
    let avgHighrun3 = 3;
    if (tripleMatches.length > 0) {
      const wins = tripleMatches.filter(r => r.win).length;
      winRate3 = (wins / tripleMatches.length) * 100;
      avgHighrun3 = tripleMatches.reduce((acc, r) => acc + (r.highRun || 0), 0) / tripleMatches.length;
    }

    let winRate4 = 50;
    let avgHighrun4 = 6;
    if (fourMatches.length > 0) {
      const wins = fourMatches.filter(r => r.win).length;
      winRate4 = (wins / fourMatches.length) * 100;
      avgHighrun4 = fourMatches.reduce((acc, r) => acc + (r.highRun || 0), 0) / fourMatches.length;
    }

    let autoDama3 = 150;
    if (avgHighrun3 >= 7) autoDama3 = 300;
    else if (avgHighrun3 >= 5) autoDama3 = 250;
    else if (avgHighrun3 >= 4) autoDama3 = 200;
    else if (avgHighrun3 >= 3) autoDama3 = 180;
    else if (avgHighrun3 >= 2) autoDama3 = 120;
    else autoDama3 = 100;

    if (winRate3 > 60) autoDama3 = mdClampDama(autoDama3 + 20);
    else if (winRate3 > 55) autoDama3 = mdClampDama(autoDama3 + 10);
    else if (winRate3 < 40) autoDama3 = mdClampDama(autoDama3 - 20);

    let autoDama4 = 200;
    if (avgHighrun4 >= 15) autoDama4 = 400;
    else if (avgHighrun4 >= 10) autoDama4 = 300;
    else if (avgHighrun4 >= 8) autoDama4 = 250;
    else if (avgHighrun4 >= 6) autoDama4 = 200;
    else if (avgHighrun4 >= 4) autoDama4 = 150;
    else autoDama4 = 100;

    // 4구 시 마무리 3쿠션 개수 (0, 1, 2)에 따른 수지 보정
    if (cushionCount === 0) {
      autoDama4 += 55; // 마무리 3쿠션이 없는 경우, 상대적으로 기본 수지(다마)를 더 높게 산정
    } else if (cushionCount === 2) {
      autoDama4 -= 50; // 마무리 3쿠션이 2개인 경우, 까다로운 마무리 조건으로 인해 실전 기준 수지를 낮춰 노출
    }

    if (winRate4 > 60) autoDama4 = mdClampDama(autoDama4 + 50);
    else if (winRate4 > 55) autoDama4 = mdClampDama(autoDama4 + 30);
    else if (winRate4 < 40) autoDama4 = mdClampDama(autoDama4 - 30);

    return {
      dama3: Math.max(50, Math.min(1000, autoDama3)),
      dama4: Math.max(50, Math.min(1000, autoDama4))
    };
  };

  // Dynamic automatic calculation sync
  useEffect(() => {
    const { dama3, dama4 } = calculateAutoHandicaps(records, userCushionCount);
    setUserDama3(dama3);
    setUserDama4(dama4);
    localStorage.setItem('billiards_dama3', dama3.toString());
    localStorage.setItem('billiards_dama4', dama4.toString());
  }, [records, userCushionCount]);

  // Initialize settings input values from localstorage when modal opens or mounted
  useEffect(() => {
    if (isSettingsOpen) {
      setSettingsName(localStorage.getItem('billiards_name') || '사용자');
      setSettingsNickname(localStorage.getItem('billiards_nickname') || '사용자');
      setSettingsNicknameChecked(true);
      const savedCushion = localStorage.getItem('billiards_cushion_count');
      const parsedCushion = savedCushion ? parseInt(savedCushion, 10) : 1;
      setSettingsCushionCount(parsedCushion);
      
      // Calculate preview dama scores dynamically
      const { dama3, dama4 } = calculateAutoHandicaps(records, parsedCushion);
      setSettingsDama3(dama3);
      setSettingsDama4(dama4);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setWithdrawReason('');
      setWithdrawConfirmed(false);
    }
  }, [isSettingsOpen, records]);

  // Real-time update preview of dama when settings cushion count changes
  useEffect(() => {
    if (isSettingsOpen) {
      const { dama3, dama4 } = calculateAutoHandicaps(records, settingsCushionCount);
      setSettingsDama3(dama3);
      setSettingsDama4(dama4);
    }
  }, [settingsCushionCount, isSettingsOpen, records]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }
    if (!settingsNickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }
    const originalNickname = localStorage.getItem('billiards_nickname') || '사용자';
    if (settingsNickname.trim() !== originalNickname && !settingsNicknameChecked) {
      alert('닉네임 중복 확인을 해주세요.');
      return;
    }
    localStorage.setItem('billiards_name', settingsName.trim());
    localStorage.setItem('billiards_nickname', settingsNickname.trim());
    localStorage.setItem('billiards_cushion_count', settingsCushionCount.toString());
    
    setUserName(settingsName.trim());
    setUserNickname(settingsNickname.trim());
    setUserCushionCount(settingsCushionCount);

    const { dama3, dama4 } = calculateAutoHandicaps(records, settingsCushionCount);
    setUserDama3(dama3);
    setUserDama4(dama4);
    localStorage.setItem('billiards_dama3', dama3.toString());
    localStorage.setItem('billiards_dama4', dama4.toString());
    
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: 'AI 수지 및 프로필 설정 완료',
      message: `회원 정보가 반영되었습니다. 4구 수지 표시 기준이 마무리 3쿠션 ${settingsCushionCount}개로 지정되었으며, AI가 경기 기록을 분석하여 4구 수지를 ${dama4}점으로 자동 반영하였습니다.`,
      time: '방금 전',
      isNew: true,
      type: 'system'
    };
    setNotifications(prev => [newNotif, ...prev]);
    setIsSettingsOpen(false);
    alert(`회원 정보가 수정되었습니다.\n\n[자동 AI 분석 수지 갱신 결과]\n- 3구 수지: ${dama3}점\n- 4구 수지: ${dama4}점 (마무리 3쿠션 ${settingsCushionCount}개 기준)`);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      alert('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      alert('새 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    localStorage.setItem('billiards_password', newPassword);
    
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: '비밀번호 변경 완료',
      message: '계정 보안 비밀번호가 정상적으로 변경되었습니다.',
      time: '방금 전',
      isNew: true,
      type: 'system'
    };
    setNotifications(prev => [newNotif, ...prev]);
    setIsSettingsOpen(false);
    alert('비밀번호가 성공적으로 변경되었습니다!');
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawConfirmed) {
      alert('동의 항목에 체크해야 진행할 수 있습니다.');
      return;
    }
    
    localStorage.removeItem('billiards_nickname');
    localStorage.removeItem('billiards_dama3');
    localStorage.removeItem('billiards_dama4');
    localStorage.removeItem('billiards_password');
    localStorage.removeItem('billiards_records');
    localStorage.removeItem('billiards_friends');
    
    alert('회원 탈퇴가 완료되었습니다. 그동안 Billiards Analytics를 이용해 주셔서 감사합니다.');
    setIsLoggedIn(false);
    setIsSettingsOpen(false);
    setIsUserMenuOpen(false);
  };

  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 'notif-1',
      title: '새로운 교류전 제안',
      message: '최성민님이 친선 대국 매치를 제안했습니다. 수지 조율이 자동 적용됩니다.',
      time: '방금 전',
      isNew: true,
      type: 'match'
    },
    {
      id: 'notif-2',
      title: '신규 친구 도달',
      message: '강태윤님으로부터 대기 중인 친구 신청이 들어왔습니다.',
      time: '15분 전',
      isNew: true,
      type: 'friend'
    },
    {
      id: 'notif-3',
      title: '주간 매뉴얼 리포트',
      message: '최근 5경기 에버리지가 12% 상승했습니다! 📈 기록 분석 탭에서 차트를 확인해보세요.',
      time: '2시간 전',
      isNew: false,
      type: 'report'
    },
    {
      id: 'notif-4',
      title: 'AI 수지 가이드',
      message: '최근 10경기 고승률(65%) 기록 감안 시, 3구 수지를 +20점 향상하는 것이 공평합니다.',
      time: '2일 전',
      isNew: false,
      type: 'system'
    }
  ]);

  const [headerFriendsCount, setHeaderFriendsCount] = useState(6);
  const [headerRequests, setHeaderRequests] = useState<any[]>([
    { id: 'r-1', name: '강태윤', dama3: 180, dama4: 200 },
    { id: 'r-2', name: '윤시우', dama3: 300, dama4: 400 },
  ]);

  // Sync Header Friend status from storage and custom reactive triggers
  useEffect(() => {
    const updateFromStorage = () => {
      const cachedFriends = localStorage.getItem('billiards_friends');
      const cachedRequests = localStorage.getItem('billiards_friend_requests');
      if (cachedFriends) {
        try {
          const parsed = JSON.parse(cachedFriends);
          setHeaderFriendsCount(parsed.length);
        } catch (_) {}
      }
      if (cachedRequests) {
        try {
          const parsed = JSON.parse(cachedRequests);
          setHeaderRequests(parsed.filter((r: any) => !r.sentByMe));
        } catch (_) {}
      }
    };

    updateFromStorage();

    const handleFriendsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.friends) {
        setHeaderFriendsCount(detail.friends.length);
      }
    };

    const handleRequestsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.requests) {
        setHeaderRequests(detail.requests.filter((r: any) => !r.sentByMe));
      }
    };

    window.addEventListener('billiards_friends_updated', handleFriendsUpdated);
    window.addEventListener('billiards_requests_updated', handleRequestsUpdated);
    window.addEventListener('storage', updateFromStorage);

    return () => {
      window.removeEventListener('billiards_friends_updated', handleFriendsUpdated);
      window.removeEventListener('billiards_requests_updated', handleRequestsUpdated);
      window.removeEventListener('storage', updateFromStorage);
    };
  }, []);

  const handleHeaderAccept = (reqId: string) => {
    const cachedFriends = localStorage.getItem('billiards_friends');
    const cachedRequests = localStorage.getItem('billiards_friend_requests');

    let currentFriends = [];
    let currentRequests = [];

    try { currentFriends = cachedFriends ? JSON.parse(cachedFriends) : []; } catch (_) {}
    try { currentRequests = cachedRequests ? JSON.parse(cachedRequests) : []; } catch (_) {}

    const reqItem = currentRequests.find((r: any) => r.id === reqId);
    if (!reqItem) return;

    const newFriend = {
      id: `f-${Date.now()}`,
      name: reqItem.name,
      dama3: reqItem.dama3 || 150,
      dama4: reqItem.dama4 || 200,
      status: 'online' as const,
      winRate: 50,
      recentForm: ['W' as const],
      addedAt: new Date().toISOString().split('T')[0]
    };

    const updatedFriends = [...currentFriends, newFriend];
    const updatedRequests = currentRequests.filter((r: any) => r.id !== reqId);

    localStorage.setItem('billiards_friends', JSON.stringify(updatedFriends));
    localStorage.setItem('billiards_friend_requests', JSON.stringify(updatedRequests));

    setHeaderFriendsCount(updatedFriends.length);
    setHeaderRequests(updatedRequests.filter((r: any) => !r.sentByMe));

    window.dispatchEvent(new CustomEvent('billiards_friends_updated', { detail: { friends: updatedFriends } }));
    window.dispatchEvent(new CustomEvent('billiards_requests_updated', { detail: { requests: updatedRequests } }));
  };

  const handleHeaderDecline = (reqId: string) => {
    const cachedRequests = localStorage.getItem('billiards_friend_requests');
    let currentRequests = [];
    try { currentRequests = cachedRequests ? JSON.parse(cachedRequests) : []; } catch (_) {}

    const updatedRequests = currentRequests.filter((r: any) => r.id !== reqId);

    localStorage.setItem('billiards_friend_requests', JSON.stringify(updatedRequests));
    setHeaderRequests(updatedRequests.filter((r: any) => !r.sentByMe));

    window.dispatchEvent(new CustomEvent('billiards_requests_updated', { detail: { requests: updatedRequests } }));
  };
  const [searchResult, setSearchResult] = useState<any>(null);
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

  const triggerMockInvitation = () => {
    setIncomingInvitation({
      id: `inv-${Date.now()}`,
      name: '최성민 (프로 3구)',
      dama3: 250,
      dama4: 300,
      gameType: '3구',
      message: '친선 매치 한 판 어떠신가요? AI 정밀 수지 보정이 완료되었습니다! 🎱'
    });
  };

  const handleDeclineInvitation = () => {
    const decNotif = {
      id: `notif-${Date.now()}`,
      title: '경기 초대 거절함',
      message: `${incomingInvitation?.name || '동호인'}님의 경기 초대를 거절하였습니다.`,
      time: '방금 전',
      isNew: true,
      type: 'system'
    };
    setNotifications(prev => [decNotif, ...prev]);
    setIncomingInvitation(null);
  };

  const handleAcceptInvitation = () => {
    // Save accepted state to local storage so CreateGamePage can catch it
    localStorage.setItem('game_invitation_accepted', JSON.stringify({
      opponent: incomingInvitation?.name || '최성민',
      dama: incomingInvitation?.dama4 || 300,
      gameType: incomingInvitation?.gameType || '3구'
    }));
    
    const accNotif = {
      id: `notif-${Date.now()}`,
      title: '대국 매치 이동 중',
      message: `${incomingInvitation?.name || '동호인'}님의 초대를 수락하여 대국방에 입장합니다.`,
      time: '방금 전',
      isNew: true,
      type: 'match'
    };
    setNotifications(prev => [accNotif, ...prev]);
    setIncomingInvitation(null);
    setIsNotificationsOpen(false);
    
    // Redirect to CreateGamePage
    navigate('/create-game');
  };

  // Mock visitor counts
  const [visitors] = useState({ today: 124, total: 15420, active: 42 });

  // Load records from localStorage with migration
  useEffect(() => {
    const migrateRecords = (data: GameRecord[]) => {
      return data.map(r => {
        if (!r.inningScores || r.inningScores.length === 0) {
          const simulatedScores = Array.from({ length: r.innings }, (_, idx) => {
            // Distribute score: highRun at a random inning, others random
            if (r.innings === 0) return 0;
            return Math.floor(Math.random() * (r.highRun + 1));
          });
          // Adjust to match total score roughly (optional but better)
          return { ...r, inningScores: simulatedScores };
        }
        return r;
      });
    };

    const saved = localStorage.getItem('billiards_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          setRecords(migrateRecords(parsed));
        } else {
          setRecords(migrateRecords(sampleRecords));
        }
      } catch (e) {
        setRecords(migrateRecords(sampleRecords));
      }
    } else {
      setRecords(migrateRecords(sampleRecords));
    }
  }, []);

  // Save records to localStorage
  useEffect(() => {
    localStorage.setItem('billiards_records', JSON.stringify(records));
  }, [records]);

  // Robust real-time search logic
  const performSearch = (queryStr: string) => {
    const query = queryStr.trim().toLowerCase();
    if (!query) {
      setSearchResult(null);
      return;
    }

    const defaultSystemFriends = [
      { id: 'f-1', name: '김동우', nickname: '신림동3구왕', dama3: 200, dama4: 250, status: 'online', winRate: 54, recentForm: ['W', 'W', 'L'], lastMatchAt: '2026-06-11' },
      { id: 'f-2', name: '이재욱', nickname: '죽빵킬러', dama3: 150, dama4: 200, status: 'offline', winRate: 48, recentForm: ['L', 'W', 'L'], lastMatchAt: '2026-06-08' },
      { id: 'f-3', name: '최성민', nickname: '예각의마술사', dama3: 400, dama4: 500, status: 'playing', winRate: 65, recentForm: ['W', 'W', 'W'], lastMatchAt: '2026-06-12' },
      { id: 'f-4', name: '박한솔', nickname: '무회전샷', dama3: 120, dama4: 150, status: 'offline', winRate: 42, recentForm: ['L', 'L', 'W'], lastMatchAt: '2026-05-30' },
      { id: 'f-5', name: '정유안', nickname: '황오시', dama3: 250, dama4: 300, status: 'online', winRate: 58, recentForm: ['W', 'L', 'W'], lastMatchAt: '2026-06-10' },
      { id: 'f-6', name: '임채원', nickname: '빈쿠션달인', dama3: 300, dama4: 400, status: 'online', winRate: 61, recentForm: ['W', 'W', 'L'], lastMatchAt: '2026-06-05' },
    ];

    const otherPotentialUsers = [
      { id: 'pot-1', name: '황준혁', nickname: '밀어치기달인', dama3: 200, dama4: 250, status: 'online', winRate: 51, recentForm: ['W', 'L', 'L'] },
      { id: 'pot-2', name: '송지호', nickname: '오시대장', dama3: 180, dama4: 200, status: 'online', winRate: 46, recentForm: ['L', 'W', 'W'] },
      { id: 'pot-3', name: '조현우', nickname: '더블레일', dama3: 300, dama4: 400, status: 'offline', winRate: 59, recentForm: ['W', 'L', 'W'] },
      { id: 'pot-4', name: '강태윤', nickname: '끌어치기고수', dama3: 180, dama4: 200, status: 'offline', winRate: 45, recentForm: ['L'] },
      { id: 'pot-5', name: '윤시우', nickname: '원쿠션제왕', dama3: 300, dama4: 400, status: 'offline', winRate: 55, recentForm: ['W', 'L'] },
      { id: 'pot-6', name: '김당구', nickname: '당구의신', dama3: 250, dama4: 300, status: 'online', winRate: 75, recentForm: ['W', 'W'] },
      { id: 'pot-7', name: '이초보', nickname: '하점자클럽', dama3: 150, dama4: 180, status: 'offline', winRate: 33, recentForm: ['L', 'L'] },
      { id: 'pot-8', name: '박프로', nickname: '예술구전설', dama3: 350, dama4: 500, status: 'playing', winRate: 80, recentForm: ['W', 'W', 'W'] }
    ];

    let currentFriendsList = [];
    try {
      const cached = localStorage.getItem('billiards_friends');
      const parsed = cached ? JSON.parse(cached) : defaultSystemFriends;
      currentFriendsList = parsed.map((f: any) => {
        if (!f.nickname) {
          const defaultFriend = defaultSystemFriends.find((df: any) => df.name === f.name);
          if (defaultFriend) {
            return { ...f, nickname: defaultFriend.nickname };
          }
          const potRival = otherPotentialUsers.find((p: any) => p.name === f.name);
          if (potRival) {
            return { ...f, nickname: potRival.nickname };
          }
          return { ...f, nickname: `${f.name}마스터` };
        }
        return f;
      });
    } catch (_) {
      currentFriendsList = defaultSystemFriends;
    }

    // 1. Look up in current friends list (match name or nickname)
    const matchedFriend = currentFriendsList.find((f: any) => 
      f.name.toLowerCase().includes(query) || (f.nickname && f.nickname.toLowerCase().includes(query))
    );

    if (matchedFriend) {
      setSearchResult({
        ...matchedFriend,
        isFriend: true
      });
      return;
    }

    // 2. Look up in potential other users (match name or nickname)
    const matchedPotential = otherPotentialUsers.find((u: any) => 
      u.name.toLowerCase().includes(query) || u.nickname.toLowerCase().includes(query)
    );

    if (matchedPotential) {
      let requestsList = [];
      try {
        const cachedReq = localStorage.getItem('billiards_friend_requests');
        requestsList = cachedReq ? JSON.parse(cachedReq) : [];
      } catch (_) {}

      const isAlreadyRequested = requestsList.some((r: any) => r.name === matchedPotential.name);

      setSearchResult({
        ...matchedPotential,
        isFriend: false,
        isPending: isAlreadyRequested
      });
      return;
    }

    // 3. Fallback dynamically generated card
    setSearchResult({
      id: `dyn-${Date.now()}`,
      name: queryStr.trim(),
      nickname: '당구동호인',
      isFriend: false,
      dama3: 150,
      dama4: 200,
      status: 'offline',
      winRate: 50,
      isPending: false,
      isDynamic: true
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const handleHeaderSendRequest = (recipient: any) => {
    let currentRequests = [];
    try {
      const cached = localStorage.getItem('billiards_friend_requests');
      currentRequests = cached ? JSON.parse(cached) : [];
    } catch (_) {}

    const alreadyRequested = currentRequests.some((r: any) => r.name === recipient.name);
    if (alreadyRequested) {
      alert('이미 대기 중인 친구 요청입니다.');
      return;
    }

    const newRequest = {
      id: `r-${Date.now()}`,
      name: recipient.name,
      dama3: recipient.dama3 || 150,
      dama4: recipient.dama4 || 200,
      sentByMe: true
    };

    const updated = [...currentRequests, newRequest];
    localStorage.setItem('billiards_friend_requests', JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('billiards_requests_updated', { detail: { requests: updated } }));

    alert(`${recipient.name}님에게 친구 요청을 보냈습니다!`);
    
    setSearchResult({
      ...recipient,
      isPending: true
    });
  };

  const addRecord = (newRecord: Omit<GameRecord, 'id' | 'average' | 'win'>) => {
    const average = Number((newRecord.myScore / newRecord.innings).toFixed(3));
    const win = newRecord.myScore > newRecord.opponentScore;
    
    // Generate simulated inning scores if not provided
    const inningScores = (newRecord as any).inningScores || Array.from({ length: newRecord.innings }, () => {
      return Math.floor(Math.random() * (newRecord.highRun + 1));
    });

    const record: GameRecord = {
      ...newRecord,
      id: crypto.randomUUID(),
      average,
      win,
      inningScores
    } as GameRecord;
    
    setRecords([record, ...records]);
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
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        performSearch(e.target.value);
                      }}
                      className="w-full bg-[#1a5d4e] text-emerald-50 placeholder:text-emerald-100/30 pl-4 pr-10 py-2 rounded-xl border border-[#2d8a75] focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm font-bold"
                    />
                    <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-100/30 group-focus-within:text-emerald-400 transition-colors" />
                  </form>

                  <AnimatePresence>
                    {searchResult && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setSearchResult(null)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-full left-0 right-0 mt-2 bg-[#0d4d3b] border border-[#1a5d4e] rounded-2xl shadow-2xl z-50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <User size={20} className="text-emerald-400" />
                              </div>
                              <div className="text-left">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-50">
                                    {searchResult.name}
                                    {searchResult.nickname && (
                                      <span className="text-xs text-emerald-400 font-bold ml-1.5">({searchResult.nickname})</span>
                                    )}
                                  </span>
                                  {searchResult.isFriend && (
                                    <span className={cn(
                                      "w-2 h-2 rounded-full",
                                      searchResult.status === 'playing' ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                                    )} />
                                  )}
                                </div>
                                <p className="text-[10px] text-emerald-100/40 font-bold uppercase tracking-wider">
                                  {searchResult.isFriend 
                                    ? (searchResult.status === 'playing' ? '경기 중' : '대기 중') 
                                    : '비친구'}
                                </p>
                              </div>
                            </div>
                            {!searchResult.isFriend && (
                              <button
                                onClick={() => {
                                  if (!searchResult.isPending) {
                                    handleHeaderSendRequest(searchResult);
                                  }
                                }}
                                disabled={searchResult.isPending}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                  searchResult.isPending 
                                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                                    : "bg-emerald-500 text-[#0a3d2e] hover:bg-emerald-400"
                                )}
                              >
                                <UserPlus size={14} />
                                {searchResult.isPending ? '요청 대기 중' : '친구 요청'}
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-4">
                            <div className="bg-[#1a5d4e]/50 p-2 rounded-xl text-center">
                              <p className="text-[8px] font-bold text-emerald-500/50 uppercase">3구 다마</p>
                              <p className="text-sm font-black text-emerald-50">{searchResult.dama3}</p>
                            </div>
                            <div className="bg-[#1a5d4e]/50 p-2 rounded-xl text-center">
                              <p className="text-[8px] font-bold text-emerald-500/50 uppercase">4구 다마</p>
                              <p className="text-sm font-black text-emerald-50">{searchResult.dama4}</p>
                            </div>
                            <div className="bg-[#1a5d4e]/50 p-2 rounded-xl text-center">
                              <p className="text-[8px] font-bold text-emerald-500/50 uppercase">상대 승률</p>
                              <p className="text-sm font-black text-emerald-50">{searchResult.isFriend ? `${searchResult.winRate}%` : '-'}</p>
                            </div>
                          </div>
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
                        setIsFriendsOpen(!isFriendsOpen);
                        setIsNotificationsOpen(false);
                        setIsUserMenuOpen(false);
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
                                <span className="text-xs font-bold text-emerald-50">{headerFriendsCount}명</span>
                              </div>
                              <div className="space-y-2 text-left">
                                <p className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-wider">대기 중인 요청</p>
                                <div className="space-y-2">
                                  {headerRequests.length === 0 ? (
                                    <p className="text-[10px] text-emerald-100/30 text-center py-2 font-bold">도착한 요청이 없습니다.</p>
                                  ) : (
                                    headerRequests.map((req) => (
                                      <div key={req.id} className="flex items-center justify-between bg-[#1a5d4e]/30 p-2 rounded-xl border border-[#1a5d4e]">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                                            {req.name.substring(0, 1)}
                                          </div>
                                          <span className="text-xs font-medium text-emerald-50">{req.name}</span>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                          <button 
                                            onClick={() => handleHeaderAccept(req.id)}
                                            className="px-2 py-1 hover:bg-emerald-500/20 rounded text-[10px] font-bold text-emerald-400 transition-colors"
                                          >
                                            승인
                                          </button>
                                          <button 
                                            onClick={() => handleHeaderDecline(req.id)}
                                            className="px-2 py-1 hover:bg-orange-500/20 rounded text-[10px] font-bold text-orange-400 transition-colors"
                                          >
                                            거절
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
                                    setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
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
                                      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isNew: false } : n));
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
                                            setNotifications(prev => prev.filter(n => n.id !== notif.id));
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
                            <div className="flex border-t border-[#1a5d4e]">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsNotificationsOpen(false);
                                  setTimeout(triggerMockInvitation, 200);
                                }}
                                className="flex-1 text-center py-3 text-[10px] font-black text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors uppercase tracking-wider border-r border-[#1a5d4e]/40"
                              >
                                경기 초대 시뮬레이터 🎱
                              </button>
                              {notifications.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setNotifications([])}
                                  className="flex-1 text-center py-3 text-[10px] font-black text-orange-400 hover:bg-orange-500/10 transition-colors uppercase tracking-wider"
                                >
                                  전체 삭제
                                </button>
                              )}
                            </div>
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
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a5d4e]/50 text-[10px] text-emerald-100/60 font-medium pb-1">
                                <div className="space-y-0.5">
                                  <span className="flex items-center gap-1 text-[9px] text-emerald-300 font-bold">
                                    <Calendar size={10} /> 가입일
                                  </span>
                                  <span className="font-mono text-emerald-50 font-black block">{joinDate}</span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="flex items-center gap-1 text-[9px] text-emerald-300 font-bold">
                                    <History size={10} /> 최근 로그인
                                  </span>
                                  <span className="font-mono text-emerald-50 font-black block truncate" title={lastLoginDate}>
                                    {lastLoginDate}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Mini Metrics Dashboard */}
                            <div className="p-4 bg-[#0d4d3b] border-b border-[#1a5d4e]/40">
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/40 p-2.5 rounded-xl text-center">
                                  <span className="text-[8px] font-black text-emerald-100/50 block uppercase leading-none mb-1">3C 수지</span>
                                  <span className="text-xs font-mono font-black text-emerald-50">{userDama3}점</span>
                                </div>
                                <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/40 p-2.5 rounded-xl text-center">
                                  <span className="text-[8px] font-black text-emerald-100/50 block uppercase leading-none mb-1">4구 수지</span>
                                  <span className="text-xs font-mono font-black text-emerald-50">{userDama4}점</span>
                                </div>
                                <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/40 p-2.5 rounded-xl text-center">
                                  <span className="text-[8px] font-black text-emerald-100/50 block uppercase leading-none mb-1">최근 승률</span>
                                  <span className="text-xs font-mono font-black text-emerald-50">58.3%</span>
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
                                onClick={() => {
                                  setIsLoggedIn(false);
                                  setIsUserMenuOpen(false);
                                }}
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
        <Routes>
          <Route path="/guide" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <GuidePage />} />
          <Route path="/login" element={<LoginPage onLogin={() => setIsLoggedIn(true)} />} />
          <Route path="/contact" element={<ContactPage isLoggedIn={isLoggedIn} />} />
          <Route path="/notice" element={<NoticePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage records={records} stats={stats} filter={filter} setFilter={(f) => setFilter(f as GameType)} />} />
          <Route path="/create-game" element={<CreateGamePage onAdd={addRecord} />} />
          <Route path="/records" element={<GameRecordsPage records={records} />} />
          <Route path="/analysis" element={<AnalysisPage records={records} />} />
          <Route path="/friends" element={<FriendsPage />} />
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

      {/* Settings (My Page) Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0d4d3b] border border-[#1a5d4e] rounded-3xl shadow-2xl overflow-hidden z-10 text-white"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#1a5d4e] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Settings size={18} />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-black text-emerald-50">설정 및 마이페이지</h2>
                    <p className="text-[10px] text-emerald-300/60 font-semibold font-mono">My Account & Preferences</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 hover:bg-[#1a5d4e] rounded-xl text-emerald-100/50 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#1a5d4e]/40 bg-[#0a3d2e]/40 p-1.5 gap-1 text-[11px] font-black overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSettingsTab('profile')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-lg text-center transition-all whitespace-nowrap",
                    settingsTab === 'profile'
                      ? "bg-emerald-500 text-[#0a3d2e] shadow"
                      : "text-emerald-100/60 hover:text-white hover:bg-[#1a5d4e]/30"
                  )}
                >
                  프로필 설정
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('preferences')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-lg text-center transition-all whitespace-nowrap",
                    settingsTab === 'preferences'
                      ? "bg-emerald-500 text-[#0a3d2e] shadow"
                      : "text-emerald-100/60 hover:text-white hover:bg-[#1a5d4e]/30"
                  )}
                >
                  알림 설정
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('security')}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-lg text-center transition-all whitespace-nowrap",
                    settingsTab === 'security'
                      ? "bg-emerald-500 text-[#0a3d2e] shadow"
                      : "text-emerald-100/60 hover:text-white hover:bg-[#1a5d4e]/30"
                  )}
                >
                  보안 및 기기 설정
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('withdraw')}
                  className={cn(
                    "py-2 px-2.5 rounded-lg text-center transition-all whitespace-nowrap ml-auto",
                    settingsTab === 'withdraw'
                      ? "bg-orange-600/80 text-white shadow animate-pulse"
                      : "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                  )}
                >
                  탈퇴
                </button>
              </div>

              {/* Content Panels */}
              <div className="p-6">
                {settingsTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Name Input */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase text-emerald-400">이름</label>
                      <input
                        type="text"
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        placeholder="이름을 입력해 주세요"
                        className="w-full bg-[#1a5d4e]/50 border border-[#1a5d4e] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>

                    {/* Nickname Input with Unique Check */}
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase text-emerald-400">닉네임</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settingsNickname}
                          onChange={(e) => {
                            setSettingsNickname(e.target.value);
                            const originalNickname = localStorage.getItem('billiards_nickname') || '사용자';
                            if (e.target.value.trim() === originalNickname) {
                              setSettingsNicknameChecked(true);
                            } else {
                              setSettingsNicknameChecked(false);
                            }
                          }}
                          placeholder="활동할 고유 닉네임을 입력하세요"
                          className="flex-1 bg-[#1a5d4e]/50 border border-[#1a5d4e] rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          maxLength={12}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nick = settingsNickname.trim();
                            if (!nick) {
                              alert('닉네임을 입력해 주세요.');
                              return;
                            }
                            const forbidden = [
                              '신림동3구왕', '죽빵킬러', '예각의마술사', '무회전샷', '황오시', '빈쿠션달인',
                              '밀어치기달인', '오시대장', '더블레일', '끌어치기고수', '원쿠션제왕', '당구의신',
                              '하점자클럽', '예술구전설', '큐걸이장인'
                            ];
                            if (forbidden.some(fn => fn === nick)) {
                              alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
                              setSettingsNicknameChecked(false);
                              return;
                            }
                            try {
                              const cached = localStorage.getItem('billiards_friends');
                              if (cached) {
                                const friends = JSON.parse(cached);
                                if (friends.some((f: any) => f.nickname === nick)) {
                                  alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
                                  setSettingsNicknameChecked(false);
                                  return;
                                }
                              }
                            } catch (_) {}

                            setSettingsNicknameChecked(true);
                            alert('사용 가능한 닉네임입니다.');
                          }}
                          className={cn(
                            "px-4 rounded-xl font-black text-xs transition-all whitespace-nowrap border uppercase tracking-wider",
                            settingsNicknameChecked 
                              ? "bg-[#0d4d3b] text-emerald-400 border-emerald-500/30" 
                              : "bg-emerald-500 text-[#0a3d2e] border-[#1a5d4e] hover:bg-emerald-400"
                          )}
                        >
                          {settingsNicknameChecked ? '확인됨' : '중복확인'}
                        </button>
                      </div>
                    </div>

                    {/* 4구 시 3쿠션 마무리 방식 설정 */}
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                          4구 수지 표시 방식 설정 (마무리 기준)
                        </label>
                        <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">수지 자동 연동</span>
                      </div>
                      <p className="text-[10px] text-emerald-100/60 leading-relaxed mb-2 font-semibold">
                        본인의 평소 4구 마무리 플레이 방식(마무리 3쿠션 개수)을 설정해 주세요. 선택하신 마무리 조건의 난이도에 따라 AI가 대국 통계 데이터를 분석하여, 최적의 4구 수지(다마)를 자동으로 맞춤 계산하여 안내하고 표시합니다.
                      </p>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { count: 0, label: '마무리 없음' },
                          { count: 1, label: '3쿠션 1개' },
                          { count: 2, label: '3쿠션 2개' }
                        ].map(({ count, label }) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setSettingsCushionCount(count)}
                            className={cn(
                              "py-2 px-1 text-xs font-black rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                              settingsCushionCount === count
                                ? "bg-emerald-500 border-emerald-400 text-[#0a3d2e] shadow-lg shadow-emerald-500/10"
                                : "bg-[#1a5d4e]/30 border-[#1a5d4e]/50 text-emerald-100/80 hover:bg-[#1a5d4e]/50 hover:text-white"
                            )}
                          >
                            <span className="text-sm font-mono leading-none">{count}</span>
                            <span className="text-[9px] leading-none shrink-0 font-bold">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 실시간 AI 분석 수지 확인 (읽기 전용) */}
                    <div className="bg-[#0a3d2e]/60 border border-[#1a5d4e]/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1a5d4e]/40 pb-2">
                        <span className="text-[10px] font-black text-emerald-300">실시간 AI 산출 수지 (기록 기반 자동 보정)</span>
                        <span className="text-[8px] font-black text-emerald-200/50 uppercase leading-none px-1.5 py-0.5 rounded border border-[#1a5d4e] bg-[#0d4d3b]">AI Calibrated</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5 text-left">
                          <label className="text-[9px] font-semibold text-emerald-100/50 block">3구 수지</label>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="text-lg font-black text-emerald-100">{settingsDama3}</span>
                            <span className="text-[10px] font-bold text-emerald-100/60">점</span>
                          </div>
                          <span className="text-[8px] text-emerald-100/30 leading-none">대국 에버리지 기반 자동 산출</span>
                        </div>
                        
                        <div className="space-y-0.5 text-left relative">
                          <label className="text-[9px] font-semibold text-emerald-100/50 block">4구 수지</label>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span className="text-lg font-black text-amber-400">{settingsDama4}</span>
                            <span className="text-[10px] font-bold text-amber-400/60">점</span>
                          </div>
                          <span className="text-[8px] text-amber-400/50 leading-none font-semibold">마무리 {settingsCushionCount}개 기준 맞춤 보정됨</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-emerald-500 text-[#0a3d2e] font-black rounded-xl hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-xs uppercase tracking-wider"
                      >
                        프로필 저장하기 (AI 자동 수지 적용)
                      </button>
                    </div>
                  </form>
                )}

                {settingsTab === 'preferences' && (
                  <div className="space-y-4">
                    <div className="text-left py-1">
                      <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">알림 수신 동의 및 푸시 설정</h3>
                      <p className="text-[10px] text-emerald-100/60 leading-relaxed font-semibold">
                        대대 및 중대 매치 매칭 소식과 경기 정보, 친구 소식을 실시간으로 알려드립니다.
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Match Invitation Alerts */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 rounded-2xl">
                        <div className="text-left space-y-0.5">
                          <label className="text-xs font-black text-emerald-100 block">친선 경기 및 교류 대국 제안 알림</label>
                          <span className="text-[9px] text-emerald-100/40 font-semibold block">동호인 친구가 친선 경기를 요청하면 푸시 알림을 보냅니다.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAlert('match', !alertMatch)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus:outline-none shrink-0",
                            alertMatch ? "bg-emerald-500" : "bg-[#145745]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white transition-all shadow-md transform",
                            alertMatch ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* Friend Status Alerts */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 rounded-2xl">
                        <div className="text-left space-y-0.5">
                          <label className="text-xs font-black text-emerald-100 block">친구 신청 및 수락 알림</label>
                          <span className="text-[9px] text-emerald-100/40 font-semibold block">누군가 나를 친구로 추가하거나 신청 결과를 알려줍니다.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAlert('friend', !alertFriend)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus:outline-none shrink-0",
                            alertFriend ? "bg-emerald-500" : "bg-[#145745]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white transition-all shadow-md transform",
                            alertFriend ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* AI Analytics Reports Alerts */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 rounded-2xl">
                        <div className="text-left space-y-0.5">
                          <label className="text-xs font-black text-emerald-100 block">AI 맞춤 분석 및 주간 리포트 알림</label>
                          <span className="text-[9px] text-emerald-100/40 font-semibold block">대국 이력의 정밀 통계 및 AI 정밀 분석 리포트를 알림으로 알립니다.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAlert('aireport', !alertAiReport)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus:outline-none shrink-0",
                            alertAiReport ? "bg-emerald-500" : "bg-[#145745]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white transition-all shadow-md transform",
                            alertAiReport ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      {/* System Tips alerts */}
                      <div className="flex items-center justify-between p-3.5 bg-[#0a3d2e]/40 border border-[#1a5d4e]/50 rounded-2xl">
                        <div className="text-left space-y-0.5">
                          <label className="text-xs font-black text-emerald-100 block">서비스 소식 및 공지사항 팁 알림</label>
                          <span className="text-[9px] text-emerald-100/40 font-semibold block">새로운 업데이트 소식과 공지사항 알림을 발송합니다.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleAlert('system', !alertSystem)}
                          className={cn(
                            "w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus:outline-none shrink-0",
                            alertSystem ? "bg-emerald-500" : "bg-[#145745]"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full bg-white transition-all shadow-md transform",
                            alertSystem ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === 'security' && (
                  <div className="space-y-6">
                    {/* 전체 로그인 기기 관리 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Shield size={12} className="text-emerald-400" />
                            전체 로그인 기기 관리
                          </h3>
                          <p className="text-[10px] text-emerald-100/60 font-semibold">현재 계정으로 로그인된 모든 세션 기기 목록입니다.</p>
                        </div>
                        {activeDevices.length > 1 && (
                          <button
                            type="button"
                            onClick={handleLogoutAllDevices}
                            className="px-2.5 py-1.5 bg-red-500 hover:bg-red-400 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1 leading-none uppercase tracking-wide shrink-0"
                          >
                            <LogOut size={10} />
                            모든 기기 로그아웃
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeDevices.map((dev) => (
                          <div 
                            key={dev.id} 
                            className={cn(
                              "flex items-center justify-between p-3 rounded-2xl border transition-all text-left",
                              dev.isCurrent 
                                ? "bg-emerald-950/40 border-emerald-500/40" 
                                : "bg-[#0a3d2e]/30 border-[#1a5d4e]/40"
                            )}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="p-2 bg-[#1a5d4e]/40 rounded-xl text-emerald-300 mt-0.5">
                                {dev.device.toLowerCase().includes('phone') ? <Smartphone size={14} /> : <Laptop size={14} />}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-emerald-100">{dev.device}</span>
                                  {dev.isCurrent && (
                                    <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/30 uppercase leading-none">CURRENT</span>
                                  )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-[9px] text-emerald-100/40 font-semibold font-mono">
                                  <span>{dev.ip}</span>
                                  <span className="hidden sm:inline text-emerald-100/20">•</span>
                                  <span>{dev.location}</span>
                                  <span className="hidden sm:inline text-emerald-100/20">•</span>
                                  <span className="text-emerald-100/50">{dev.lastActive}</span>
                                </div>
                              </div>
                            </div>
                            
                            {!dev.isCurrent && (
                              <button
                                type="button"
                                onClick={() => handleLogoutDevice(dev.id, dev.device)}
                                className="p-1 px-2.5 rounded-lg border border-emerald-500/20 hover:border-red-500/30 hover:bg-red-500/10 text-emerald-100/60 hover:text-red-400 text-[10px] font-bold transition-all"
                              >
                                로그아웃
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 비밀번호 변경 */}
                    <div className="border-t border-[#1a5d4e]/40 pt-4 space-y-3">
                      <div className="text-left">
                        <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Key size={12} className="text-emerald-400" />
                          보안 비밀번호 변경
                        </h3>
                        <p className="text-[10px] text-emerald-100/60 font-semibold mb-2">원활한 대국 관리를 위해 주기적으로 비밀번호를 변경해 주세요.</p>
                      </div>

                      <form onSubmit={handleChangePassword} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black uppercase text-emerald-400/80">현재 비밀번호</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-[#1a5d4e]/50 border border-[#1a5d4e] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black uppercase text-emerald-400/80">새 비밀번호</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="새 비밀번호"
                              className="w-full bg-[#1a5d4e]/50 border border-[#1a5d4e] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black uppercase text-emerald-400/80">새 비밀번호 확인</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="다시 입력"
                              className="w-full bg-[#1a5d4e]/50 border border-[#1a5d4e] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-500 text-[#0a3d2e] font-black rounded-xl hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-[11px] uppercase tracking-wider"
                        >
                          비밀번호 업데이트 적용
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {settingsTab === 'withdraw' && (
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl p-4 text-xs font-semibold leading-relaxed text-left">
                      ⚠️ 계정 탈퇴 시 대국 매치 내역, 전적 통계, 수지 로그 및 등록된 모든 친구 정보가 영구적으로 파괴되며, 이 작업은 취소하거나 복구할 수 없습니다.
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-black uppercase text-orange-400">탈퇴 사유 (선택)</label>
                      <textarea
                        value={withdrawReason}
                        onChange={(e) => setWithdrawReason(e.target.value)}
                        placeholder="서비스 이용 중 어떤 점이 불편하셨는지 공유해주세요."
                        className="w-full h-24 bg-[#1a5d4e]/30 border border-[#1a5d4e] rounded-xl px-4 py-3 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 border-r-0 border-l-0 border-t-0 border-b border-orange-500 resize-none rounded-b-none"
                      />
                    </div>

                    <div className="flex items-start gap-2.5 p-1 text-left cursor-pointer select-none" onClick={() => setWithdrawConfirmed(!withdrawConfirmed)}>
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                        withdrawConfirmed ? "bg-orange-500 border-orange-500 text-white" : "border-[#1a5d4e]"
                      )}>
                        {withdrawConfirmed && <X size={10} />}
                      </div>
                      <span className="text-[11px] text-emerald-100/70 font-semibold leading-tight">
                        위 유의사항을 모두 숙지하였으며, 영구 삭제 처리에 전적으로 동의합니다.
                      </span>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={!withdrawConfirmed}
                        className={cn(
                          "w-full py-3.5 font-black rounded-xl text-xs uppercase tracking-wider transition-all",
                          withdrawConfirmed 
                            ? "bg-orange-500 text-white hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer" 
                            : "bg-emerald-100/10 text-emerald-100/30 cursor-not-allowed"
                        )}
                      >
                        회원 탈퇴 완료
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              onClick={() => handleDeclineInvitation()}
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
                    {incomingInvitation.name.substring(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-emerald-100 truncate">{incomingInvitation.name}</h4>
                    <span className="text-[10px] text-emerald-300 font-bold block">
                      3구 수지: {incomingInvitation.dama3}점 | 4구 수지: {incomingInvitation.dama4}점
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleDeclineInvitation()}
                  className="py-3 bg-red-600/80 hover:bg-red-500 text-white font-extrabold rounded-xl hover:shadow-lg transition-all text-xs cursor-pointer active:scale-95"
                >
                  거절하기
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptInvitation()}
                  className="py-3 bg-emerald-500 text-[#0a3d2e] font-extrabold rounded-xl hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all text-xs cursor-pointer active:scale-95"
                >
                  수락 및 참가
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
