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

export const createContactInquiry = (payload: CreateContactInquiryPayload) =>
  apiRequest<ContactInquiryDetail>('/api/contact-inquiries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
