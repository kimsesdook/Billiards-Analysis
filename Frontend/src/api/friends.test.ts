import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  searchFriends,
  sendFriendRequest,
} from './friends';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('friend API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('requests the authenticated friend list', () => {
    getFriends();

    expect(apiRequest).toHaveBeenCalledWith('/api/friends');
  });

  it('requests incoming and outgoing friend requests', () => {
    getFriendRequests();

    expect(apiRequest).toHaveBeenCalledWith('/api/friends/requests');
  });

  it('encodes a member search keyword', () => {
    searchFriends('김 당구');

    expect(apiRequest).toHaveBeenCalledWith('/api/friends/search?keyword=%EA%B9%80%20%EB%8B%B9%EA%B5%AC');
  });

  it('sends a friend request to the selected member', () => {
    sendFriendRequest(42);

    expect(apiRequest).toHaveBeenCalledWith('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ targetMemberId: 42 }),
    });
  });

  it('accepts and declines an incoming request through protected endpoints', () => {
    acceptFriendRequest(42);
    declineFriendRequest(42);

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/friends/requests/42/accept', {
      method: 'PATCH',
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/friends/requests/42/decline', {
      method: 'PATCH',
    });
  });
});
