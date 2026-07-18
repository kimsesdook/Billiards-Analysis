import { apiRequest } from './client';

export type MemberProfile = {
  id: number;
  email: string;
  name: string;
  nickname: string;
  role: 'USER' | 'ADMIN';
  targetCushionCount: number;
  threeBallHandicap: number;
  fourBallHandicap: number;
};

export type MemberProfileUpdatePayload = {
  name: string;
  nickname: string;
  targetCushionCount: number;
  threeBallHandicap: number;
  fourBallHandicap: number;
};

export type PasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
};

export const getMyProfile = () => apiRequest<MemberProfile>('/api/members/me');

export const updateMyProfile = (payload: MemberProfileUpdatePayload) =>
  apiRequest<MemberProfile>('/api/members/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const changeMyPassword = (payload: PasswordChangePayload) =>
  apiRequest<void>('/api/members/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
