import React, { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { GameMode, GameRecord, GameRecordDraft, GameType } from '../types';
import { cn } from '../lib/utils';

interface GameRecordEditModalProps {
  record: GameRecord;
  onClose: () => void;
  onUpdate: (record: GameRecordDraft) => Promise<GameRecord | void> | GameRecord | void;
}

const toDateTimeLocal = (date: string) => {
  const parsedDate = new Date(date);
  const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
};

export function GameRecordEditModal({ record, onClose, onUpdate }: GameRecordEditModalProps) {
  const [date, setDate] = useState(() => toDateTimeLocal(record.date));
  const [type, setType] = useState<GameType>(record.type);
  const [mode, setMode] = useState<GameMode>(record.mode);
  const [myScore, setMyScore] = useState(record.myScore);
  const [opponentScore, setOpponentScore] = useState(record.opponentScore);
  const [innings, setInnings] = useState(record.innings);
  const [highRun, setHighRun] = useState(record.highRun);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(record.playerCount);
  const [rank, setRank] = useState(record.rank ?? 1);
  const [lastThreeCushions, setLastThreeCushions] = useState<0 | 1 | 2>(record.lastThreeCushions ?? 0);
  const [opponentName, setOpponentName] = useState(record.opponentName ?? '');
  const [notes, setNotes] = useState(record.notes ?? '');
  const [inningScores, setInningScores] = useState((record.inningScores ?? []).join(', '));
  const [myCushionScore, setMyCushionScore] = useState(record.myCushionScore ?? 0);
  const [opponentCushionScore, setOpponentCushionScore] = useState(record.opponentCushionScore ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;

    const parsedInningScores = inningScores.trim() === ''
      ? []
      : inningScores.split(',').map((score) => Number(score.trim()));

    if (parsedInningScores.some((score) => !Number.isInteger(score) || score < 0)) {
      setFormError('이닝별 점수는 0 이상의 정수로 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await onUpdate({
        date: new Date(date).toISOString(),
        type,
        mode,
        myScore,
        opponentScore,
        innings,
        highRun,
        playerCount,
        rank: playerCount > 2 ? rank : undefined,
        lastThreeCushions: type === '4-Ball' ? lastThreeCushions : undefined,
        opponentName: opponentName.trim() || undefined,
        notes: notes.trim() || undefined,
        inningScores: parsedInningScores,
        myCushionScore: type === '4-Ball' ? myCushionScore : undefined,
        opponentCushionScore: type === '4-Ball' ? opponentCushionScore : undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '경기 기록을 수정하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="경기 기록 수정 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-record-edit-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#1a5d4e] bg-[#0a3d2e] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#1a5d4e] bg-[#0d4d3b]/60 px-6 py-5 sm:px-8">
          <div>
            <h2 id="game-record-edit-title" className="text-xl font-black text-emerald-50">경기 기록 수정</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-emerald-100/70 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="닫기"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold text-emerald-100/60">경기 일시</span>
              <input
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">종목</span>
              <div className="grid grid-cols-2 gap-2">
                {(['3-Cushion', '4-Ball'] as const).map((gameType) => (
                  <button
                    key={gameType}
                    type="button"
                    onClick={() => setType(gameType)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-sm font-bold transition-colors',
                      type === gameType
                        ? 'border-emerald-400 bg-emerald-400 text-[#0a3d2e]'
                        : 'border-[#2d8a75] bg-[#0d4d3b] text-emerald-100/60 hover:border-emerald-400/60',
                    )}
                  >
                    {gameType === '3-Cushion' ? '3쿠션' : '4구'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">경기 방식</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Individual', 'Team'] as const).map((gameMode) => (
                  <button
                    key={gameMode}
                    type="button"
                    onClick={() => setMode(gameMode)}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-sm font-bold transition-colors',
                      mode === gameMode
                        ? 'border-emerald-400 bg-emerald-400 text-[#0a3d2e]'
                        : 'border-[#2d8a75] bg-[#0d4d3b] text-emerald-100/60 hover:border-emerald-400/60',
                    )}
                  >
                    {gameMode === 'Individual' ? '개인전' : '팀전'}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">내 점수</span>
              <input
                type="number"
                min="0"
                value={myScore}
                onChange={(event) => setMyScore(Number(event.target.value))}
                required
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">상대 점수</span>
              <input
                type="number"
                min="0"
                value={opponentScore}
                onChange={(event) => setOpponentScore(Number(event.target.value))}
                required
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">이닝</span>
              <input
                type="number"
                min="1"
                value={innings}
                onChange={(event) => setInnings(Number(event.target.value))}
                required
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">하이런</span>
              <input
                type="number"
                min="0"
                value={highRun}
                onChange={(event) => setHighRun(Number(event.target.value))}
                required
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-100/60">인원</span>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    className={cn(
                      'rounded-lg border py-3 text-sm font-bold transition-colors',
                      playerCount === count
                        ? 'border-emerald-400 bg-emerald-400 text-[#0a3d2e]'
                        : 'border-[#2d8a75] bg-[#0d4d3b] text-emerald-100/60 hover:border-emerald-400/60',
                    )}
                  >
                    {count}명
                  </button>
                ))}
              </div>
            </div>

            {playerCount > 2 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-100/60">순위</span>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: playerCount }, (_, index) => index + 1).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRank(value)}
                      className={cn(
                        'rounded-lg border py-3 text-sm font-bold transition-colors',
                        rank === value
                          ? 'border-blue-400 bg-blue-400/20 text-blue-200'
                          : 'border-[#2d8a75] bg-[#0d4d3b] text-emerald-100/60 hover:border-emerald-400/60',
                      )}
                    >
                      {value}위
                    </button>
                  ))}
                </div>
              </div>
            )}

            {type === '4-Ball' && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-orange-200/80">마지막 3쿠션</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([0, 1, 2] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setLastThreeCushions(count)}
                        className={cn(
                          'rounded-lg border py-3 text-sm font-bold transition-colors',
                          lastThreeCushions === count
                            ? 'border-orange-400 bg-orange-400/20 text-orange-200'
                            : 'border-[#2d8a75] bg-[#0d4d3b] text-emerald-100/60 hover:border-orange-400/60',
                        )}
                      >
                        {count}개
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-orange-200/80">내 마무리 3C</span>
                    <input
                      type="number"
                      min="0"
                      max={lastThreeCushions}
                      value={myCushionScore}
                      onChange={(event) => setMyCushionScore(Number(event.target.value))}
                      className="w-full rounded-lg border border-orange-400/40 bg-[#0d4d3b] px-3 py-3 text-sm text-orange-100 outline-none transition-colors focus:border-orange-400"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-bold text-orange-200/80">상대 마무리 3C</span>
                    <input
                      type="number"
                      min="0"
                      max={lastThreeCushions}
                      value={opponentCushionScore}
                      onChange={(event) => setOpponentCushionScore(Number(event.target.value))}
                      className="w-full rounded-lg border border-orange-400/40 bg-[#0d4d3b] px-3 py-3 text-sm text-orange-100 outline-none transition-colors focus:border-orange-400"
                    />
                  </label>
                </div>
              </>
            )}

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold text-emerald-100/60">상대 이름</span>
              <input
                type="text"
                maxLength={100}
                value={opponentName}
                onChange={(event) => setOpponentName(event.target.value)}
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold text-emerald-100/60">이닝별 점수</span>
              <input
                type="text"
                value={inningScores}
                onChange={(event) => setInningScores(event.target.value)}
                className="w-full rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-bold text-emerald-100/60">메모</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full resize-none rounded-lg border border-[#2d8a75] bg-[#0d4d3b] px-3 py-3 text-sm text-emerald-50 outline-none transition-colors focus:border-emerald-400"
              />
            </label>
          </div>

          {formError && (
            <p className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">
              {formError}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#1a5d4e] bg-[#0d4d3b]/60 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-4 py-2 text-sm font-bold text-emerald-100/70 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-[#0a3d2e] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
            수정 저장
          </button>
        </div>
      </form>
    </div>
  );
}
