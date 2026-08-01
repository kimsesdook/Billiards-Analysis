import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answerContactInquiry,
  ContactInquiryDetail,
  createContactInquiry,
  getAdminContactInquiries,
  getContactInquiry,
  getMyContactInquiries,
  getPublicContactInquiries,
} from './contactInquiries';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('contact inquiry API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('requests public inquiries without attaching a login token', () => {
    getPublicContactInquiries();

    expect(apiRequest).toHaveBeenCalledWith('/api/contact-inquiries', { skipAuth: true });
  });

  it('requests the signed-in member inquiries from the private endpoint', () => {
    getMyContactInquiries();

    expect(apiRequest).toHaveBeenCalledWith('/api/contact-inquiries/me');
  });

  it('requests a private inquiry detail with authentication for its owner', () => {
    getContactInquiry(42, true);

    expect(apiRequest).toHaveBeenCalledWith('/api/contact-inquiries/42', { skipAuth: false });
  });

  it('keeps the administrator answer metadata returned by the detail API', async () => {
    const detail: ContactInquiryDetail = {
      id: 42,
      title: 'Question about averages',
      content: 'How is the average calculated?',
      authorNickname: 'PlayerOne',
      isPrivate: true,
      status: 'ANSWERED',
      createdAt: '2026-08-01T12:00:00',
      answerContent: 'The average uses the recorded inning count.',
      answeredByNickname: 'Administrator',
      answeredAt: '2026-08-01T13:00:00',
    };
    apiRequest.mockResolvedValueOnce(detail);

    await expect(getContactInquiry(42, true)).resolves.toEqual(detail);
  });

  it('requests an administrator inquiry page with its status filter', () => {
    getAdminContactInquiries({ status: 'PENDING', page: 1, size: 20 });

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/contact-inquiries?page=1&size=20&status=PENDING');
  });

  it('sends the administrator answer through the protected PATCH endpoint', () => {
    answerContactInquiry(42, 'The average uses the recorded inning count.');

    expect(apiRequest).toHaveBeenCalledWith('/api/contact-inquiries/42/answer', {
      method: 'PATCH',
      body: JSON.stringify({ answerContent: 'The average uses the recorded inning count.' }),
    });
  });

  it('creates an inquiry with the request body expected by the backend', () => {
    createContactInquiry({
      title: 'Question about averages',
      content: 'How is the average calculated?',
      isPrivate: true,
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/contact-inquiries', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Question about averages',
        content: 'How is the average calculated?',
        isPrivate: true,
      }),
    });
  });

  it('passes API failures to the screen without hiding the error', async () => {
    const failure = new Error('Contact inquiry API is unavailable.');
    apiRequest.mockRejectedValueOnce(failure);

    await expect(createContactInquiry({ title: 't', content: 'c', isPrivate: false })).rejects.toThrow(failure);
  });
});
