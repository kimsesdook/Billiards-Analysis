import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAdminNotice,
  getNotice,
  getNotices,
  NoticeDetail,
  updateAdminNotice,
} from './notices';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('notice API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('requests a public notice page without attaching a login token', () => {
    getNotices({ page: 1, size: 20 });

    expect(apiRequest).toHaveBeenCalledWith('/api/notices?page=1&size=20', { skipAuth: true });
  });

  it('requests a public notice detail without attaching a login token', () => {
    getNotice(42);

    expect(apiRequest).toHaveBeenCalledWith('/api/notices/42', { skipAuth: true });
  });

  it('creates a notice through the protected administrator endpoint', () => {
    const payload = {
      title: 'Scheduled maintenance',
      content: 'The service will be unavailable for one hour.',
      category: 'NOTICE' as const,
      isImportant: true,
    };

    createAdminNotice(payload);

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/notices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('updates a notice through the protected administrator endpoint', () => {
    const payload = {
      title: 'Release update',
      content: 'Updated notice content.',
      category: 'UPDATE' as const,
      isImportant: false,
    };

    updateAdminNotice(42, payload);

    expect(apiRequest).toHaveBeenCalledWith('/api/admin/notices/42', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });

  it('keeps the detail fields returned by the backend', async () => {
    const detail: NoticeDetail = {
      id: 42,
      title: 'Scheduled maintenance',
      content: 'The service will be unavailable for one hour.',
      category: 'NOTICE',
      isImportant: true,
      publishedAt: '2026-08-02T09:00:00',
      updatedAt: '2026-08-02T09:00:00',
    };
    apiRequest.mockResolvedValueOnce(detail);

    await expect(getNotice(42)).resolves.toEqual(detail);
  });

  it('passes API failures to the screen without hiding the error', async () => {
    const failure = new Error('Notice API is unavailable.');
    apiRequest.mockRejectedValueOnce(failure);

    await expect(getNotices({ page: 0, size: 20 })).rejects.toThrow(failure);
  });
});
