import { apiRequest } from './client';

export type InquiryStatus = 'PENDING' | 'ANSWERED';

export type ContactInquirySummary = {
  id: number;
  title: string;
  authorNickname: string;
  isPrivate: boolean;
  status: InquiryStatus;
  createdAt: string;
};

export type ContactInquiryDetail = ContactInquirySummary & {
  content: string;
  answerContent: string | null;
  answeredByNickname: string | null;
  answeredAt: string | null;
};

export type ContactInquiryPage = {
  content: ContactInquirySummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type AdminContactInquirySearchParams = {
  status?: InquiryStatus;
  page: number;
  size: number;
};

export type CreateContactInquiryPayload = {
  title: string;
  content: string;
  isPrivate: boolean;
};

export const getPublicContactInquiries = () =>
  apiRequest<ContactInquirySummary[]>('/api/contact-inquiries', { skipAuth: true });

export const getMyContactInquiries = () =>
  apiRequest<ContactInquirySummary[]>('/api/contact-inquiries/me');

export const getContactInquiry = (inquiryId: number, includeAuth = false) =>
  apiRequest<ContactInquiryDetail>(`/api/contact-inquiries/${inquiryId}`, {
    skipAuth: !includeAuth,
  });

export const getAdminContactInquiries = ({ status, page, size }: AdminContactInquirySearchParams) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (status) {
    query.set('status', status);
  }

  return apiRequest<ContactInquiryPage>(`/api/admin/contact-inquiries?${query}`);
};

export const answerContactInquiry = (inquiryId: number, answerContent: string) =>
  apiRequest<ContactInquiryDetail>(`/api/contact-inquiries/${inquiryId}/answer`, {
    method: 'PATCH',
    body: JSON.stringify({ answerContent }),
  });

export const createContactInquiry = (payload: CreateContactInquiryPayload) =>
  apiRequest<ContactInquiryDetail>('/api/contact-inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
