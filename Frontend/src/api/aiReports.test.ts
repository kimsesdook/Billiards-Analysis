import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateWeeklyAiReport, getWeeklyAiReport } from './aiReports';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  apiRequest,
}));

describe('AI weekly report API contract', () => {
  beforeEach(() => {
    apiRequest.mockReset();
  });

  it('requests the cached 3-Cushion report with the selected game type', () => {
    getWeeklyAiReport('3-Cushion');

    expect(apiRequest).toHaveBeenCalledWith('/api/ai-reports/weekly?type=3-Cushion');
  });

  it('creates a 4-Ball report only with an explicit POST request', () => {
    generateWeeklyAiReport('4-Ball');

    expect(apiRequest).toHaveBeenCalledWith('/api/ai-reports/weekly?type=4-Ball', {
      method: 'POST',
    });
  });

  it('passes API failures to the caller without hiding the error', async () => {
    const failure = new Error('AI service is unavailable.');
    apiRequest.mockRejectedValueOnce(failure);

    await expect(generateWeeklyAiReport('3-Cushion')).rejects.toThrow(failure);
  });
});
