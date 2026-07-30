import {
  GameAverageTrend,
  GameRecord,
  GameRecordDraft,
	GameRecordPage,
	GameRecordSearchParams,
	OpponentStatistics,
  GameStatistics,
  GameType,
	WeeklyGameReport,
	WeeklyGameReportComparison,
	WeeklyGameSummary,
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

type ApiGameRecordPage = Omit<GameRecordPage, 'content'> & {
	content: ApiGameRecord[];
};

type ApiOpponentStatistics = Omit<OpponentStatistics, 'overallAverage' | 'bestAverage'> & {
	overallAverage: number | string;
	bestAverage: number | string;
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

type ApiWeeklyGameSummary = Omit<WeeklyGameSummary, 'overallAverage'> & {
	overallAverage: number | string;
};

type ApiWeeklyGameReportComparison = Omit<
	WeeklyGameReportComparison,
	'overallAverageChange' | 'overallAverageChangeRate'
> & {
	overallAverageChange: number | string;
	overallAverageChangeRate: number | string;
};

type ApiWeeklyGameReport = Omit<
	WeeklyGameReport,
	'currentWeek' | 'previousWeek' | 'comparison'
> & {
	currentWeek: ApiWeeklyGameSummary;
	previousWeek: ApiWeeklyGameSummary;
	comparison: ApiWeeklyGameReportComparison;
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

const normalizeOpponentStatistics = (statistics: ApiOpponentStatistics): OpponentStatistics => ({
	...statistics,
	overallAverage: Number(statistics.overallAverage),
	bestAverage: Number(statistics.bestAverage),
});

const normalizeWeeklyGameSummary = (summary: ApiWeeklyGameSummary): WeeklyGameSummary => ({
	...summary,
	overallAverage: Number(summary.overallAverage),
});

const normalizeWeeklyGameReport = (report: ApiWeeklyGameReport): WeeklyGameReport => ({
	...report,
	currentWeek: normalizeWeeklyGameSummary(report.currentWeek),
	previousWeek: normalizeWeeklyGameSummary(report.previousWeek),
	comparison: {
		...report.comparison,
		overallAverageChange: Number(report.comparison.overallAverageChange),
		overallAverageChangeRate: Number(report.comparison.overallAverageChangeRate),
	},
});

const toCreateRequest = (record: GameRecordDraft) => ({
  ...record,
  mode: record.mode || 'Individual',
});

export const getGameRecords = async () => {
  const records = await apiRequest<ApiGameRecord[]>('/api/game-records');
  return records.map(normalizeGameRecord);
};

export const searchGameRecords = async (params: GameRecordSearchParams) => {
	const query = new URLSearchParams({
		page: String(params.page),
		size: String(params.size),
	});

	if (params.type) query.set('type', params.type);
	if (params.mode) query.set('mode', params.mode);
	if (params.playerCount) query.set('playerCount', String(params.playerCount));
	if (params.keyword) query.set('keyword', params.keyword);

	const result = await apiRequest<ApiGameRecordPage>(`/api/game-records/search?${query}`);

	return {
		...result,
		content: result.content.map(normalizeGameRecord),
	};
};

export const getOpponentStatistics = async () => {
	const statistics = await apiRequest<ApiOpponentStatistics[]>('/api/game-records/opponent-statistics');

	return statistics.map(normalizeOpponentStatistics);
};

export const getGameStatistics = async (type: GameType, recentGameCount: number) => {
	const query = new URLSearchParams({
		type,
		recentGameCount: String(recentGameCount),
	});
	const statistics = await apiRequest<ApiGameStatistics>(`/api/game-records/statistics?${query}`);

	return normalizeGameStatistics(statistics);
};

export const getWeeklyGameReport = async (type: GameType) => {
	const query = new URLSearchParams({ type });
	const report = await apiRequest<ApiWeeklyGameReport>(`/api/game-records/weekly-report?${query}`);

	return normalizeWeeklyGameReport(report);
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
