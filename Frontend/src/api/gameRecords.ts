import { GameRecord, GameRecordDraft } from '../types';
import { apiRequest } from './client';

type ApiGameRecord = Omit<GameRecord, 'id' | 'average'> & {
  id: number | string;
  average: number | string;
};

const normalizeGameRecord = (record: ApiGameRecord): GameRecord => ({
  ...record,
  id: String(record.id),
  average: Number(record.average),
});

const toCreateRequest = (record: GameRecordDraft) => ({
  ...record,
  mode: record.mode || 'Individual',
});

export const getGameRecords = async () => {
  const records = await apiRequest<ApiGameRecord[]>('/api/game-records');
  return records.map(normalizeGameRecord);
};

export const createGameRecord = async (record: GameRecordDraft) => {
  const savedRecord = await apiRequest<ApiGameRecord>('/api/game-records', {
    method: 'POST',
    body: JSON.stringify(toCreateRequest(record)),
  });

  return normalizeGameRecord(savedRecord);
};

export const deleteGameRecord = async (id: string) => {
  await apiRequest<void>(`/api/game-records/${id}`, {
    method: 'DELETE',
  });
};
