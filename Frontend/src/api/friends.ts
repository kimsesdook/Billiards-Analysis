import { apiRequest } from './client';

export type FriendMember = {
  id: number;
  name: string;
  nickname: string;
  targetCushionCount: number;
  threeBallHandicap: number;
  fourBallHandicap: number;
};

export type Friend = {
  friendshipId: number;
  friend: FriendMember;
  friendsSince: string;
};

export type FriendRequestDirection = 'INCOMING' | 'OUTGOING';

export type FriendRequest = {
  requestId: number;
  member: FriendMember;
  direction: FriendRequestDirection;
  requestedAt: string;
};

export type FriendRequests = {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};

export type FriendSearchStatus = 'NONE' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'FRIEND';

export type FriendSearchResult = {
  memberId: number;
  name: string;
  nickname: string;
  targetCushionCount: number;
  threeBallHandicap: number;
  fourBallHandicap: number;
  relationshipStatus: FriendSearchStatus;
};

export const getFriends = () => apiRequest<Friend[]>('/api/friends');

export const getFriendRequests = () => apiRequest<FriendRequests>('/api/friends/requests');

export const searchFriends = (keyword: string) =>
  apiRequest<FriendSearchResult[]>(`/api/friends/search?keyword=${encodeURIComponent(keyword)}`);

export const sendFriendRequest = (targetMemberId: number) =>
  apiRequest<FriendRequest>('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ targetMemberId }),
  });

export const acceptFriendRequest = (requestId: number) =>
  apiRequest<Friend>(`/api/friends/requests/${requestId}/accept`, {
    method: 'PATCH',
  });

export const declineFriendRequest = (requestId: number) =>
  apiRequest<void>(`/api/friends/requests/${requestId}/decline`, {
    method: 'PATCH',
  });

export const removeFriend = (friendshipId: number) =>
  apiRequest<void>(`/api/friends/${friendshipId}`, {
    method: 'DELETE',
  });
