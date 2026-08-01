import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createContactInquiry,
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
