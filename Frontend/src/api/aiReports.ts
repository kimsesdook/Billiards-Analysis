import { AiWeeklyReport, GameType } from '../types';
import { apiRequest } from './client';

const toQuery = (type: GameType) => new URLSearchParams({ type });

export const getWeeklyAiReport = (type: GameType) =>
  apiRequest<AiWeeklyReport>(`/api/ai-reports/weekly?${toQuery(type)}`);

export const generateWeeklyAiReport = (type: GameType) =>
  apiRequest<AiWeeklyReport>(`/api/ai-reports/weekly?${toQuery(type)}`, {
    method: 'POST',
  });
