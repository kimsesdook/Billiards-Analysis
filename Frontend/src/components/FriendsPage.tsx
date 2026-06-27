import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Check, 
  X, 
  UserCheck, 
  Trophy, 
  Sparkles,
  SearchCode,
  TrendingUp,
  Clock,
  ShieldAlert,
  Activity,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Friend {
  id: string;
  name: string;
  nickname: string;
  dama3: number;
  dama4: number;
  status: 'online' | 'offline' | 'playing';
  winRate: number;
  recentForm: Array<'W' | 'L'>;
  lastMatchAt: string;
}

interface FriendRequest {
  id: string;
  name: string;
  nickname: string;
  dama3: number;
  dama4: number;
  sentByMe?: boolean;
}

const DEFAULT_FRIENDS: Friend[] = [
  { id: 'f-1', name: '김동우', nickname: '신림동3구왕', dama3: 200, dama4: 250, status: 'online', winRate: 54, recentForm: ['W', 'W', 'L'], lastMatchAt: '2026-06-11' },
  { id: 'f-2', name: '이재욱', nickname: '죽빵킬러', dama3: 150, dama4: 200, status: 'offline', winRate: 48, recentForm: ['L', 'W', 'L'], lastMatchAt: '2026-06-08' },
  { id: 'f-3', name: '최성민', nickname: '예각의마술사', dama3: 400, dama4: 500, status: 'playing', winRate: 65, recentForm: ['W', 'W', 'W'], lastMatchAt: '2026-06-12' },
  { id: 'f-4', name: '박한솔', nickname: '무회전샷', dama3: 120, dama4: 150, status: 'offline', winRate: 42, recentForm: ['L', 'L', 'W'], lastMatchAt: '2026-05-30' },
  { id: 'f-5', name: '정유안', nickname: '황오시', dama3: 250, dama4: 300, status: 'online', winRate: 58, recentForm: ['W', 'L', 'W'], lastMatchAt: '2026-06-10' },
  { id: 'f-6', name: '임채원', nickname: '빈쿠션달인', dama3: 300, dama4: 400, status: 'online', winRate: 61, recentForm: ['W', 'W', 'L'], lastMatchAt: '2026-06-05' },
];

const DEFAULT_REQUESTS: FriendRequest[] = [
  { id: 'r-1', name: '강태윤', nickname: '끌어치기고수', dama3: 180, dama4: 200 },
  { id: 'r-2', name: '윤시우', nickname: '원쿠션제왕', dama3: 300, dama4: 400 },
];

const RECOMMENDED_RIVALS: Omit<Friend, 'lastMatchAt'>[] = [
  { id: 'rec-1', name: '황준혁', nickname: '밀어치기달인', dama3: 200, dama4: 250, status: 'online', winRate: 51, recentForm: ['W', 'L', 'L'] },
  { id: 'rec-2', name: '송지호', nickname: '오시대장', dama3: 180, dama4: 200, status: 'online', winRate: 46, recentForm: ['L', 'W', 'W'] },
  { id: 'rec-3', name: '조현우', nickname: '더블레일', dama3: 300, dama4: 400, status: 'offline', winRate: 59, recentForm: ['W', 'L', 'W'] },
  { id: 'rec-4', name: '백하준', nickname: '큐걸이장인', dama3: 350, dama4: 450, status: 'playing', winRate: 62, recentForm: ['W', 'W', 'W'] },
];

export const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'requests'>('list');
  
  // Search state inside Page
  const [searchQuery, setSearchQuery] = useState('');
  const [newFriendSearch, setNewFriendSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Load from localStorage or initialize with default template data
  useEffect(() => {
    const cachedFriends = localStorage.getItem('billiards_friends');
    const cachedRequests = localStorage.getItem('billiards_friend_requests');

    if (cachedFriends) {
      try {
        const parsed = JSON.parse(cachedFriends);
        const migrated = parsed.map((f: any) => {
          if (!f.nickname) {
            const defaultFriend = DEFAULT_FRIENDS.find(df => df.name === f.name);
            if (defaultFriend) {
              return { ...f, nickname: defaultFriend.nickname };
            }
            const recRival = RECOMMENDED_RIVALS.find(r => r.name === f.name);
            if (recRival) {
              return { ...f, nickname: recRival.nickname };
            }
            return { ...f, nickname: `${f.name}마스터` };
          }
          return f;
        });
        setFriends(migrated);
        localStorage.setItem('billiards_friends', JSON.stringify(migrated));
      } catch (e) {
        setFriends(DEFAULT_FRIENDS);
        localStorage.setItem('billiards_friends', JSON.stringify(DEFAULT_FRIENDS));
      }
    } else {
      setFriends(DEFAULT_FRIENDS);
      localStorage.setItem('billiards_friends', JSON.stringify(DEFAULT_FRIENDS));
    }

    if (cachedRequests) {
      try {
        const parsedReq = JSON.parse(cachedRequests);
        const migratedReq = parsedReq.map((r: any) => {
          if (!r.nickname) {
            const defaultRequest = DEFAULT_REQUESTS.find(dr => dr.name === r.name);
            if (defaultRequest) {
              return { ...r, nickname: defaultRequest.nickname };
            }
            return { ...r, nickname: `${r.name}고수` };
          }
          return r;
        });
        setRequests(migratedReq);
        localStorage.setItem('billiards_friend_requests', JSON.stringify(migratedReq));
      } catch (e) {
        setRequests(DEFAULT_REQUESTS);
        localStorage.setItem('billiards_friend_requests', JSON.stringify(DEFAULT_REQUESTS));
      }
    } else {
      setRequests(DEFAULT_REQUESTS);
      localStorage.setItem('billiards_friend_requests', JSON.stringify(DEFAULT_REQUESTS));
    }
  }, []);

  // Save utility with custom events
  const saveFriendsData = (updatedFriends: Friend[]) => {
    setFriends(updatedFriends);
    localStorage.setItem('billiards_friends', JSON.stringify(updatedFriends));
    window.dispatchEvent(new CustomEvent('billiards_friends_updated', { detail: { friends: updatedFriends } }));
  };

  const saveRequestsData = (updatedRequests: FriendRequest[]) => {
    setRequests(updatedRequests);
    localStorage.setItem('billiards_friend_requests', JSON.stringify(updatedRequests));
    window.dispatchEvent(new CustomEvent('billiards_requests_updated', { detail: { requests: updatedRequests } }));
  };

  // 1. Accept request
  const handleAcceptRequest = (requestId: string) => {
    const requestItem = requests.find(r => r.id === requestId);
    if (!requestItem) return;

    const newFriend: Friend = {
      id: `f-${Date.now()}`,
      name: requestItem.name,
      nickname: requestItem.nickname || '닉네임미설정',
      dama3: requestItem.dama3,
      dama4: requestItem.dama4,
      status: 'online',
      winRate: 50,
      recentForm: ['W'],
      lastMatchAt: '경기 기록 없음'
    };

    const newFriendsList = [...friends, newFriend];
    saveFriendsData(newFriendsList);

    const newRequestsList = requests.filter(r => r.id !== requestId);
    saveRequestsData(newRequestsList);
  };

  // 2. Decline request
  const handleDeclineRequest = (requestId: string) => {
    const newRequestsList = requests.filter(r => r.id !== requestId);
    saveRequestsData(newRequestsList);
  };

  // 3. Remove friend
  const handleRemoveFriend = (friendId: string) => {
    const newFriendsList = friends.filter(f => f.id !== friendId);
    saveFriendsData(newFriendsList);
    setPendingDeleteId(null);
  };

  // 4. Search prospective friends from a mock list (plus recommended pool)
  const handleSearchFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFriendSearch.trim()) return;

    setHasSearched(true);
    const searchName = newFriendSearch.trim();

    // Check if already friend
    const isAlreadyFriend = friends.some(f => f.name === searchName);
    const isAlreadyRequested = requests.some(r => r.name === searchName);

    if (isAlreadyFriend) {
      const existing = friends.find(f => f.name === searchName)!;
      setSearchResult(existing);
      return;
    }

    // Try finding in recommended list
    const foundInRecs = RECOMMENDED_RIVALS.find(r => r.name === searchName || r.nickname.toLowerCase().includes(searchName.toLowerCase()));
    if (foundInRecs) {
      setSearchResult({
        ...foundInRecs,
        lastMatchAt: '경기 기록 없음'
      } as Friend);
    } else {
      // Generate dynamically to show realistic result
      const mockDama3 = Math.floor(Math.random() * 5 + 3) * 50; // Random 150~350
      setSearchResult({
        id: `mock-${Date.now()}`,
        name: searchName,
        nickname: `${searchName}마스터`,
        dama3: mockDama3,
        dama4: mockDama3 + 50,
        status: 'offline',
        winRate: 50,
        recentForm: ['W', 'L'],
        lastMatchAt: '경기 기록 없음'
      });
    }
  };

  // 5. Send Friend Request
  const handleSendRequest = (recipient: Friend) => {
    const alreadyRequested = requests.some(r => r.name === recipient.name);
    if (alreadyRequested) {
      alert('이미 대기 중인 친구 요청입니다.');
      return;
    }

    const newRequest: FriendRequest = {
      id: `r-${Date.now()}`,
      name: recipient.name,
      nickname: recipient.nickname || '닉네임미설정',
      dama3: recipient.dama3,
      dama4: recipient.dama4,
      sentByMe: true
    };

    const updated = [...requests, newRequest];
    saveRequestsData(updated);
    alert(`${recipient.name}님에게 친구 요청을 보냈습니다!`);
    setNewFriendSearch('');
    setSearchResult(null);
    setHasSearched(false);
  };

  // Filter friends on current view
  const filteredFriends = useMemo(() => {
    return friends.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friends, searchQuery]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12" id="friends-page-root">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-emerald-50 flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users size={24} />
            </span>
            친구 관리
          </h2>
          <p className="text-xs font-bold text-emerald-500/50 uppercase tracking-widest mt-1">
            Billiards Analytics Social & Rival Manager
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#0b3127] border border-[#16503f] p-1.5 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'list' 
                ? "bg-[#1a5d4e] text-white shadow-md shadow-black/15" 
                : "text-emerald-100/60 hover:text-emerald-50"
            )}
          >
            내 친구 ({friends.length}명)
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              setSearchResult(null);
              setHasSearched(false);
              setNewFriendSearch('');
            }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === 'add' 
                ? "bg-[#1a5d4e] text-white shadow-md shadow-black/15" 
                : "text-emerald-100/60 hover:text-emerald-50"
            )}
          >
            <UserPlus size={14} />
            친구 추가
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative",
              activeTab === 'requests' 
                ? "bg-[#1a5d4e] text-white shadow-md shadow-black/15" 
                : "text-emerald-100/60 hover:text-emerald-50"
            )}
          >
            요청 대기 ({requests.filter(r => !r.sentByMe).length})
            {requests.filter(r => !r.sentByMe).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full ring-2 ring-[#0a3d2e]" />
            )}
          </button>
        </div>
      </div>

      {/* Main Containers */}
      <AnimatePresence mode="wait">
        {activeTab === 'list' && (
          <motion.div
            key="friends-list"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Search Bar for Friends */}
            <div className="bg-[#0d4d3b] border border-[#1a5d4e] p-4 rounded-3xl flex items-center gap-3">
              <Search className="text-emerald-400" size={18} />
              <input
                type="text"
                placeholder="친구 이름을 검색해 보세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-emerald-50 placeholder:text-emerald-100/30 focus:outline-none font-bold text-sm"
              />
            </div>

            {/* Grid list of Friends */}
            {filteredFriends.length === 0 ? (
              <div className="bg-[#0d4d3b]/30 border border-[#1a5d4e]/40 py-16 px-4 rounded-[2.5rem] text-center">
                <Users size={48} className="text-[#1a5d4e] mx-auto mb-4" />
                <p className="text-sm font-bold text-emerald-100/40">검색어와 일치하는 친구가 없습니다.</p>
                <p className="text-xs font-medium text-emerald-500/30 mt-1">새로운 라이벌을 찾거나 검색 닉네임을 다시 확인해 보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="bg-[#0d4d3b] border border-[#1a5d4e] p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Informational */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center font-black text-emerald-400 text-lg">
                            {friend.name.substring(0, 1)}
                          </div>
                          {/* Live Indicator */}
                          <span className={cn(
                            "absolute bottom-0.5 right-0.5 w-3.5 h-3.5 border-2 border-[#0d4d3b] rounded-full",
                            friend.status === 'playing' ? "bg-amber-400 animate-pulse" : "bg-emerald-500"
                          )} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white">
                              {friend.name}
                              {friend.nickname && (
                                <span className="text-xs text-emerald-400 font-bold ml-1.5">({friend.nickname})</span>
                              )}
                            </h4>
                            <span className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              friend.status === 'playing' ? "text-amber-400 animate-pulse" : "text-emerald-400"
                            )}>
                              {friend.status === 'playing' ? '경기 중' : '대기 중'}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-emerald-500/50 mt-1 uppercase tracking-wider">
                            최근 경기일: {friend.lastMatchAt}
                          </p>
                        </div>
                      </div>

                      {/* Right action button */}
                      <button
                        onClick={() => setPendingDeleteId(friend.id)}
                        className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm focus:outline-none shrink-0"
                        title="친구 삭제"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>

                    {/* Confirmation Overlay */}
                    <AnimatePresence>
                      {pendingDeleteId === friend.id && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-[#07241c]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10 text-center"
                        >
                          <UserMinus size={32} className="text-red-400 mb-2" />
                          <p className="text-xs font-black text-red-100 flex items-center gap-1">
                            정말로 {friend.name}{friend.nickname ? `(${friend.nickname})` : ''}님을 삭제하시겠습니까?
                          </p>
                          <p className="text-[10px] text-emerald-100/40 mt-1 mb-4 leading-relaxed">
                            친구에서 해제되면 해당 기록 및 수지 대조가 불가능해집니다.
                          </p>
                          <div className="flex gap-2 w-full max-w-[200px]">
                            <button
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="w-1/2 py-2 bg-red-500 hover:bg-red-400 text-white font-extrabold rounded-xl text-xs transition-colors"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(null)}
                              className="w-1/2 py-2 bg-[#1a5d4e] hover:bg-[#237a66] text-white font-extrabold rounded-xl text-xs transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Stats Specs Breakdown */}
                    <div className="grid grid-cols-3 gap-2 mt-6">
                      <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/50 rounded-2xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-emerald-500/60 uppercase block mb-0.5">3구 다마</span>
                        <span className="text-sm font-black text-emerald-50 font-mono">{friend.dama3}점</span>
                      </div>
                      <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/50 rounded-2xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-emerald-500/60 uppercase block mb-0.5">4구 다마</span>
                        <span className="text-sm font-black text-emerald-50 font-mono">{friend.dama4}점</span>
                      </div>
                      <div className="bg-[#1a5d4e]/30 border border-[#1a5d4e]/50 rounded-2xl p-2.5 text-center">
                        <span className="text-[8px] font-black text-emerald-500/60 uppercase block mb-0.5">나와의 승률</span>
                        <span className="text-sm font-black text-amber-300 font-mono">{friend.winRate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'add' && (
          <motion.div
            key="friends-add"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-8"
          >
            {/* Custom search container */}
            <div className="bg-[#0d4d3b] border border-[#1a5d4e] p-6 rounded-[2.5rem] shadow-xl text-left">
              <h4 className="text-sm font-black text-emerald-50 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Search size={16} className="text-emerald-400" />
                이름(닉네임)으로 검색해서 추가
              </h4>
              <form onSubmit={handleSearchFriendSubmit} className="flex gap-3">
                <input
                  type="text"
                  placeholder="추가하고 싶은 당구 친구의 이름(닉네임)을 입력하세요..."
                  value={newFriendSearch}
                  onChange={(e) => setNewFriendSearch(e.target.value)}
                  className="w-full bg-[#16503f] border border-[#2d8a75] rounded-xl px-4 py-3 placeholder:text-emerald-100/30 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  required
                />
                <button
                  type="submit"
                  className="px-6 bg-emerald-500 hover:bg-emerald-400 transition-colors text-[#0a3d2e] font-black rounded-xl text-sm whitespace-nowrap"
                >
                  검색하기
                </button>
              </form>

              {/* Display Single Search Result */}
              <AnimatePresence>
                {hasSearched && searchResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 bg-[#114537] border border-[#237a66]/50 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="w-12 h-12 bg-emerald-400/20 border border-emerald-400/30 rounded-full flex items-center justify-center font-bold text-emerald-400 text-lg">
                        {searchResult.name.substring(0, 1)}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-emerald-50">
                          {searchResult.name}
                          {searchResult.nickname && (
                            <span className="text-xs text-emerald-400 font-bold ml-1.5">({searchResult.nickname})</span>
                          )}
                        </h4>
                        <p className="text-xs text-emerald-100/50 font-medium">
                          3구 다마: <span className="font-bold text-emerald-300 font-mono">{searchResult.dama3}</span> | 
                          4구 다마: <span className="font-bold text-emerald-300 font-mono">{searchResult.dama4}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Send Action */}
                    {friends.some(f => f.name === searchResult.name) ? (
                      <span className="flex items-center gap-1 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
                        <Check size={14} />
                        이미 친구 사이
                      </span>
                    ) : requests.some(r => r.name === searchResult.name && r.sentByMe) ? (
                      <span className="flex items-center gap-1 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 text-xs font-bold">
                        <Clock size={14} />
                        친구 승인 대기 중
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(searchResult)}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] font-black rounded-xl text-xs transition-colors"
                      >
                        <UserPlus size={14} />
                        친구 신청 보내기
                      </button>
                    )}
                  </motion.div>
                )}
                {hasSearched && !searchResult && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold text-orange-400 mt-4 text-left"
                  >
                    해당 이름(닉네임)의 동호인이 배정되어 있지 않습니다. 다시 한번 조회해 주세요.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div
            key="friends-requests"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6 text-left"
          >
            {/* Incoming Requests */}
            <div className="bg-[#0d4d3b] border border-[#1a5d4e] p-6 rounded-[2.5rem] shadow-xl">
              <h4 className="text-sm font-black text-emerald-50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block animate-pulse" />
                나에게 도착한 친구 신청목록
              </h4>

              {requests.filter(r => !r.sentByMe).length === 0 ? (
                <div className="py-12 text-center">
                  <UserCheck className="mx-auto text-emerald-500/20 mb-3" size={36} />
                  <p className="text-xs font-bold text-emerald-100/40">신규 도착 요청이 존재하지 않습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.filter(r => !r.sentByMe).map((req) => (
                    <div
                      key={req.id}
                      className="bg-[#144b3c] border border-[#237a66]/50 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                        <div className="w-9 h-9 bg-emerald-500/20 rounded-full flex items-center justify-center font-bold text-emerald-400 text-xs">
                          {req.name.substring(0, 1)}
                        </div>
                        <div>
                          <h5 className="font-bold text-emerald-50 text-sm">
                            {req.name}
                            {req.nickname && (
                              <span className="text-xs text-emerald-400 font-bold ml-1.5">({req.nickname})</span>
                            )}
                          </h5>
                          <p className="text-[10px] text-emerald-100/50 mt-0.5">
                            3구 다마: <span className="font-mono text-emerald-300 font-bold">{req.dama3}</span> | 
                            4구 다마: <span className="font-mono text-emerald-300 font-bold">{req.dama4}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action trigger */}
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] text-xs font-extrabold rounded-lg transition-all"
                        >
                          <Check size={14} />
                          승인
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(req.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-extrabold rounded-lg transition-all"
                        >
                          <X size={14} />
                          거절
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div className="bg-[#0b3127]/60 border border-[#16503f] p-6 rounded-[2.5rem]">
              <h4 className="text-xs font-black text-emerald-500/60 uppercase tracking-widest mb-4">
                내가 발송한 신규 신청 현황
              </h4>

              {requests.filter(r => r.sentByMe).length === 0 ? (
                <p className="text-xs font-bold text-emerald-100/20 py-4 text-center">보낸 신청이 기록되어 있지 않습니다.</p>
              ) : (
                <div className="space-y-2">
                  {requests.filter(r => r.sentByMe).map((req) => (
                    <div
                      key={req.id}
                      className="bg-black/10 border border-[#1a5d4e]/30 px-4 py-3 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-emerald-100/70">{req.name}{req.nickname ? `(${req.nickname})` : ''}님에게 보낸 라이벌 제정서</span>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-400/20 px-2 py-1 rounded-lg">
                        수락 대기중
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
