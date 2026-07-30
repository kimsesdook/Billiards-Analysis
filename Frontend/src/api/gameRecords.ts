import {
  GameAverageTrend,
  GameRecord,
  GameRecordDraft,
  GameStatistics,
  GameType,
} from '../types';
import { apiRequest } from './client';

type ApiGameRecord = Omit<GameRecord, 'id' | 'average'> & {
	id: number | string;
	average: number | string;
};

type ApiGameAverageTrend = Omit<GameAverageTrend, 'gameRecordId' | 'average'> & {
	gameRecordId: number | string;
	average: number | string;
};

type ApiGameStatistics = Omit<
	GameStatistics,
	'overallAverage' | 'bestAverage' | 'changeRate' | 'recentAverageTrends'
> & {
	overallAverage: number | string;
	bestAverage: number | string;
	changeRate: number | string;
	recentAverageTrends: ApiGameAverageTrend[];
};

const normalizeGameRecord = (record: ApiGameRecord): GameRecord => ({
  ...record,
  id: String(record.id),
  average: Number(record.average),
});

const normalizeGameStatistics = (statistics: ApiGameStatistics): GameStatistics => ({
	...statistics,
	overallAverage: Number(statistics.overallAverage),
	bestAverage: Number(statistics.bestAverage),
	changeRate: Number(statistics.changeRate),
	recentAverageTrends: statistics.recentAverageTrends.map((trend) => ({
		...trend,
		gameRecordId: String(trend.gameRecordId),
		average: Number(trend.average),
	})),
});

const toCreateRequest = (record: GameRecordDraft) => ({
  ...record,
  mode: record.mode || 'Individual',
});

export const getGameRecords = async () => {
  const records = await apiRequest<ApiGameRecord[]>('/api/game-records');
  return records.map(normalizeGameRecord);
};

export const getGameStatistics = async (type: GameType, recentGameCount: number) => {
	const query = new URLSearchParams({
		type,
		recentGameCount: String(recentGameCount),
	});
	const statistics = await apiRequest<ApiGameStatistics>(`/api/game-records/statistics?${query}`);

	return normalizeGameStatistics(statistics);
};

export const createGameRecord = async (record: GameRecordDraft) => {
  const savedRecord = await apiRequest<ApiGameRecord>('/api/game-records', {
    method: 'POST',
    body: JSON.stringify(toCreateRequest(record)),
  });

  return normalizeGameRecord(savedRecord);
};

export const updateGameRecord = async (id: string, record: GameRecordDraft) => {
  const updatedRecord = await apiRequest<ApiGameRecord>(`/api/game-records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toCreateRequest(record)),
  });

  return normalizeGameRecord(updatedRecord);
};

export const deleteGameRecord = async (id: string) => {
  await apiRequest<void>(`/api/game-records/${id}`, {
    method: 'DELETE',
  });
};
