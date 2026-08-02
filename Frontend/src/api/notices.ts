import { apiRequest } from './client';

export type NoticeCategory = 'NOTICE' | 'UPDATE' | 'EVENT';

export type NoticeSummary = {
  id: number;
  title: string;
  category: NoticeCategory;
  isImportant: boolean;
  publishedAt: string;
};

export type NoticeDetail = NoticeSummary & {
  content: string;
  updatedAt: string;
};

export type NoticePageResponse = {
  content: NoticeSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type NoticeSearchParams = {
  page: number;
  size: number;
};

export const getNotices = ({ page, size }: NoticeSearchParams) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiRequest<NoticePageResponse>(`/api/notices?${query}`, { skipAuth: true });
};

export const getNotice = (noticeId: number) =>
  apiRequest<NoticeDetail>(`/api/notices/${noticeId}`, { skipAuth: true });
