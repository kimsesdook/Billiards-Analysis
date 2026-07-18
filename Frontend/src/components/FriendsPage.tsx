import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  searchFriends,
  sendFriendRequest,
  type Friend as ApiFriend,
  type FriendRequest as ApiFriendRequest,
  type FriendSearchResult,
  type FriendSearchStatus,
} from '../api/friends';
import { getApiErrorMessage } from '../api/client';
import {
  AlertCircle,
  Check,
  Clock,
  Search,
  ShieldAlert,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

type PlayStatus = 'online' | 'offline' | 'playing';
type RecentForm = 'W' | 'L';

interface Friend {
  id: string;
  memberId: number;
  name: string;
  nickname: string;
  dama3: number;
  dama4: number;
  status: PlayStatus;
  winRate: number;
  recentForm: RecentForm[];
  lastMatchAt: string;
}

interface FriendRequest {
  id: string;
  memberId: number;
  name: string;
  nickname: string;
  dama3: number;
  dama4: number;
  sentByMe?: boolean;
}

type SearchResult = Friend & {
  relationshipStatus: FriendSearchStatus;
};

const formatDate = (value?: string) => {
  if (!value) return '경기 기록 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '경기 기록 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const toFriend = (item: ApiFriend): Friend => ({
  id: String(item.friendshipId),
  memberId: item.friend.id,
  name: item.friend.name,
  nickname: item.friend.nickname,
  dama3: item.friend.threeBallHandicap,
  dama4: item.friend.fourBallHandicap,
  status: 'offline',
  winRate: 0,
  recentForm: [],
  lastMatchAt: formatDate(item.friendsSince),
});

const toFriendRequest = (item: ApiFriendRequest): FriendRequest => ({
  id: String(item.requestId),
  memberId: item.member.id,
  name: item.member.name,
  nickname: item.member.nickname,
  dama3: item.member.threeBallHandicap,
  dama4: item.member.fourBallHandicap,
  sentByMe: item.direction === 'OUTGOING',
});

const toSearchResult = (item: FriendSearchResult): SearchResult => ({
  id: String(item.memberId),
  memberId: item.memberId,
  name: item.name,
  nickname: item.nickname,
  dama3: item.threeBallHandicap,
  dama4: item.fourBallHandicap,
  status: 'offline',
  winRate: 0,
  recentForm: [],
  lastMatchAt: '경기 기록 없음',
  relationshipStatus: item.relationshipStatus,
});

const syncFriendHeaderCache = (friends: Friend[], requests: FriendRequest[]) => {
  localStorage.setItem('billiards_friends', JSON.stringify(friends));
  localStorage.setItem('billiards_friend_requests', JSON.stringify(requests));
  window.dispatchEvent(new CustomEvent('billiards_friends_updated', { detail: { friends } }));
  window.dispatchEvent(new CustomEvent('billiards_requests_updated', { detail: { requests } }));
};

const getSearchButtonLabel = (status: FriendSearchStatus) => {
  if (status === 'FRIEND') return '이미 친구';
  if (status === 'PENDING_OUTGOING') return '요청 대기 중';
  if (status === 'PENDING_INCOMING') return '받은 요청 확인';
  return '친구 요청';
};

export const FriendsPage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'requests'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [newFriendSearch, setNewFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshFriendState = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [friendItems, requestItems] = await Promise.all([getFriends(), getFriendRequests()]);
      const nextFriends = friendItems.map(toFriend);
      const nextRequests = [
        ...requestItems.incoming.map(toFriendRequest),
        ...requestItems.outgoing.map(toFriendRequest),
      ];

      setFriends(nextFriends);
      setRequests(nextRequests);
      syncFriendHeaderCache(nextFriends, nextRequests);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFriendState();
  }, [refreshFriendState]);

  const incomingRequests = requests.filter((request) => !request.sentByMe);
  const outgoingRequests = requests.filter((request) => request.sentByMe);

  const filteredFriends = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return friends;

    return friends.filter((friend) =>
      friend.name.toLowerCase().includes(keyword)
      || friend.nickname.toLowerCase().includes(keyword)
    );
  }, [friends, searchQuery]);

  const handleSearchFriendSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = newFriendSearch.trim();
    if (!keyword) return;

    setHasSearched(true);
    setIsSearching(true);
    setErrorMessage(null);

    try {
      const results = await searchFriends(keyword);
      setSearchResults(results.map(toSearchResult));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (recipient: SearchResult) => {
    setActionKey(`send-${recipient.memberId}`);
    setErrorMessage(null);

    try {
      await sendFriendRequest(recipient.memberId);
      setNewFriendSearch('');
      setSearchResults([]);
      setHasSearched(false);
      await refreshFriendState();
      alert(`${recipient.nickname}님에게 친구 요청을 보냈습니다.`);
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActionKey(`accept-${requestId}`);

    try {
      await acceptFriendRequest(Number(requestId));
      await refreshFriendState();
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActionKey(`decline-${requestId}`);

    try {
      await declineFriendRequest(Number(requestId));
      await refreshFriendState();
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    setActionKey(`remove-${friendId}`);

    try {
      await removeFriend(Number(friendId));
      setPendingDeleteId(null);
      await refreshFriendState();
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12" id="friends-page-root">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-emerald-50 flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Users size={24} />
            </span>
            친구 관리
          </h2>
          <p className="text-xs font-bold text-emerald-500/60 mt-1">
            함께 경기할 상대를 찾고 친구 요청을 관리합니다.
          </p>
        </div>

        <div className="flex bg-[#0b3127] border border-[#16503f] p-1.5 rounded-2xl shrink-0">
          {[
            { id: 'list', label: `내 친구 (${friends.length}명)` },
            { id: 'add', label: '친구 추가' },
            { id: 'requests', label: `요청 대기 (${incomingRequests.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5',
                activeTab === tab.id
                  ? 'bg-[#1a5d4e] text-white shadow-md shadow-black/15'
                  : 'text-emerald-100/60 hover:text-emerald-50',
              )}
            >
              {tab.id === 'list' && <Users size={14} />}
              {tab.id === 'add' && <UserPlus size={14} />}
              {tab.id === 'requests' && <Clock size={14} />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === 'list' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="친구 이름 또는 닉네임 검색"
              className="w-full bg-[#0b3127] border border-[#16503f] rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-emerald-50 placeholder:text-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          {isLoading ? (
            <EmptyState icon={<Users size={28} />} title="친구 목록을 불러오는 중입니다." />
          ) : filteredFriends.length === 0 ? (
            <EmptyState icon={<UserPlus size={28} />} title="아직 친구가 없습니다." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFriends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  pendingDeleteId={pendingDeleteId}
                  actionKey={actionKey}
                  onAskRemove={setPendingDeleteId}
                  onCancelRemove={() => setPendingDeleteId(null)}
                  onRemove={handleRemoveFriend}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'add' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <form onSubmit={handleSearchFriendSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/40" size={18} />
              <input
                value={newFriendSearch}
                onChange={(event) => setNewFriendSearch(event.target.value)}
                placeholder="이름, 닉네임, 이메일로 회원 검색"
                className="w-full bg-[#0b3127] border border-[#16503f] rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-emerald-50 placeholder:text-emerald-100/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 rounded-2xl bg-emerald-500 text-[#0a3d2e] font-black text-sm hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSearching ? '검색 중' : '검색'}
            </button>
          </form>

          {hasSearched && searchResults.length === 0 && !isSearching && (
            <EmptyState icon={<ShieldAlert size={28} />} title="검색 결과가 없습니다." />
          )}

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((result) => (
                <div key={result.memberId} className="bg-[#0b3127] border border-[#16503f] rounded-2xl p-5">
                  <FriendIdentity friend={result} />
                  <FriendScores friend={result} />
                  <button
                    type="button"
                    disabled={result.relationshipStatus !== 'NONE' || actionKey === `send-${result.memberId}`}
                    onClick={() => handleSendRequest(result)}
                    className="mt-5 w-full py-3 rounded-xl bg-emerald-500 text-[#0a3d2e] font-black text-sm hover:bg-emerald-400 disabled:bg-[#145745] disabled:text-emerald-100/50 disabled:cursor-not-allowed transition-all"
                  >
                    {actionKey === `send-${result.memberId}` ? '요청 중...' : getSearchButtonLabel(result.relationshipStatus)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'requests' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <RequestSection
            title="받은 요청"
            emptyTitle="받은 친구 요청이 없습니다."
            requests={incomingRequests}
            actionKey={actionKey}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
          />
          <RequestSection
            title="보낸 요청"
            emptyTitle="보낸 친구 요청이 없습니다."
            requests={outgoingRequests}
            actionKey={actionKey}
          />
        </motion.div>
      )}
    </div>
  );
};

type FriendCardProps = {
  friend: Friend;
  pendingDeleteId: string | null;
  actionKey: string | null;
  onAskRemove: (friendId: string) => void;
  onCancelRemove: () => void;
  onRemove: (friendId: string) => void | Promise<void>;
};

const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  pendingDeleteId,
  actionKey,
  onAskRemove,
  onCancelRemove,
  onRemove,
}) => {
  return (
    <div className="relative bg-[#0b3127] border border-[#16503f] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <FriendIdentity friend={friend} />
        <button
          type="button"
          onClick={() => onAskRemove(friend.id)}
          className="p-2 rounded-xl text-red-300 hover:bg-red-500/10 transition-colors"
          aria-label="친구 삭제"
        >
          <UserMinus size={18} />
        </button>
      </div>

      <FriendScores friend={friend} />

      <div className="mt-4 flex items-center justify-between text-xs text-emerald-100/50">
        <span>친구 등록일</span>
        <span className="font-bold text-emerald-100/70">{friend.lastMatchAt}</span>
      </div>

      {pendingDeleteId === friend.id && (
        <div className="absolute inset-0 rounded-2xl bg-[#071f19]/95 border border-red-400/30 p-5 flex flex-col justify-center">
          <p className="text-sm font-bold text-red-100 text-center">
            {friend.nickname}님을 친구 목록에서 삭제할까요?
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancelRemove}
              className="py-2.5 rounded-xl bg-[#145745] text-emerald-50 font-bold text-xs"
            >
              취소
            </button>
            <button
              type="button"
              disabled={actionKey === `remove-${friend.id}`}
              onClick={() => onRemove(friend.id)}
              className="py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function RequestSection({
  title,
  emptyTitle,
  requests,
  actionKey,
  onAccept,
  onDecline,
}: {
  title: string;
  emptyTitle: string;
  requests: FriendRequest[];
  actionKey: string | null;
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-black text-emerald-300 flex items-center gap-2">
        <Clock size={16} />
        {title} ({requests.length})
      </h3>

      {requests.length === 0 ? (
        <EmptyState icon={<Clock size={24} />} title={emptyTitle} compact />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-[#0b3127] border border-[#16503f] rounded-2xl p-5">
              <FriendIdentity friend={request} />
              <FriendScores friend={request} />

              {!request.sentByMe ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={actionKey === `accept-${request.id}`}
                    onClick={() => onAccept?.(request.id)}
                    className="py-3 rounded-xl bg-emerald-500 text-[#0a3d2e] font-black text-xs disabled:opacity-60"
                  >
                    <Check size={14} className="inline mr-1" />
                    수락
                  </button>
                  <button
                    type="button"
                    disabled={actionKey === `decline-${request.id}`}
                    onClick={() => onDecline?.(request.id)}
                    className="py-3 rounded-xl bg-red-500/15 text-red-200 border border-red-400/20 font-black text-xs disabled:opacity-60"
                  >
                    <X size={14} className="inline mr-1" />
                    거절
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-xs font-bold text-amber-200 flex items-center gap-2">
                  <Clock size={14} />
                  상대방 수락을 기다리는 중
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FriendIdentity({ friend }: { friend: Pick<Friend, 'name' | 'nickname'> }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-[#0a3d2e] flex items-center justify-center font-black shrink-0">
        {friend.nickname.substring(0, 1)}
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-black text-emerald-50 truncate">{friend.nickname}</h3>
        <p className="text-xs font-bold text-emerald-100/50 truncate">{friend.name}</p>
      </div>
    </div>
  );
}

function FriendScores({ friend }: { friend: Pick<Friend, 'dama3' | 'dama4'> }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-[#145745]/60 border border-[#1a5d4e] p-3">
        <p className="text-[10px] font-bold text-emerald-100/50">3구 수지</p>
        <p className="text-lg font-black text-emerald-50 font-mono">{friend.dama3}점</p>
      </div>
      <div className="rounded-xl bg-[#145745]/60 border border-[#1a5d4e] p-3">
        <p className="text-[10px] font-bold text-emerald-100/50">4구 수지</p>
        <p className="text-lg font-black text-amber-300 font-mono">{friend.dama4}점</p>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  compact = false,
}: {
  icon: React.ReactNode;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border border-dashed border-[#16503f] bg-[#0b3127]/50 flex flex-col items-center justify-center text-center text-emerald-100/50',
      compact ? 'py-8' : 'py-16',
    )}>
      <div className="mb-3 text-emerald-500/50">{icon}</div>
      <p className="text-sm font-bold">{title}</p>
    </div>
  );
}
