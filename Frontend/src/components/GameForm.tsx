import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GameRecordDraft, GameType } from '../types';
import { cn } from '../lib/utils';

interface GameFormProps {
  onAdd: (record: GameRecordDraft) => void | Promise<void>;
  onClose: () => void;
}

export const GameForm: React.FC<GameFormProps> = ({ onAdd, onClose }) => {
  const [type, setType] = useState<GameType>('3-Cushion');
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [innings, setInnings] = useState<number>(1);
  const [highRun, setHighRun] = useState<number>(0);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [rank, setRank] = useState<number>(1);
  const [lastThreeCushions, setLastThreeCushions] = useState<0 | 1 | 2>(0);
  const [notes, setNotes] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [myCushionScore, setMyCushionScore] = useState<number>(0);
  const [opponentCushionScore, setOpponentCushionScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAdd({
        date: new Date().toISOString(),
        type,
        mode: 'Individual',
        myScore,
        opponentScore,
        innings,
        highRun,
        playerCount,
        rank: playerCount > 2 ? rank : undefined,
        lastThreeCushions: type === '4-Ball' ? lastThreeCushions : undefined,
        notes,
        opponentName,
        myCushionScore: type === '4-Ball' ? myCushionScore : undefined,
        opponentCushionScore: type === '4-Ball' ? opponentCushionScore : undefined,
      });
      onClose();
    } catch {
      // The parent API handler owns the user-facing error message.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-record-add-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border border-[#1a5d4e] bg-[#0d4d3b] shadow-2xl"
      >
        <div className="p-6 border-b border-[#1a5d4e] flex justify-between items-center">
          <h2 id="game-record-add-title" className="text-xl font-bold text-emerald-50">경기 기록 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-500/50 hover:text-emerald-400 transition-colors"
            aria-label="경기 기록 추가 닫기"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          <div>
            <label htmlFor="game-record-opponent" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">상대 닉네임</label>
            <input
              id="game-record-opponent"
              type="text"
              maxLength={100}
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="상대 이름/닉네임"
              className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold placeholder:text-emerald-100/10"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">게임 종류</label>
            <div className="grid grid-cols-2 gap-2">
              {(['3-Cushion', '4-Ball'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "py-3 px-3 rounded-xl text-sm font-bold transition-all border",
                    type === t 
                      ? "bg-emerald-500 border-emerald-400 text-[#0a3d2e]" 
                      : "bg-[#1a5d4e] border-[#2d8a75] text-emerald-100/40 hover:border-emerald-400/50"
                  )}
                >
                  {t === '3-Cushion' ? '3쿠션' : '4구'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">인원 수</label>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPlayerCount(num)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition-all border",
                    playerCount === num 
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                      : "bg-[#1a5d4e]/50 border-[#1a5d4e] text-emerald-100/30"
                  )}
                >
                  {num}인
                </button>
              ))}
            </div>
          </div>

          {playerCount > 2 && (
            <div>
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">경기 등수</label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <button
                    key={i + 1}
                    type="button"
                    onClick={() => setRank(i + 1)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold transition-all border",
                      rank === i + 1 
                        ? "bg-blue-500/20 border-blue-500 text-blue-400" 
                        : "bg-[#1a5d4e]/50 border-[#1a5d4e] text-emerald-100/30"
                    )}
                  >
                    {i + 1}위
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === '4-Ball' && (
            <div>
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">마지막 3쿠션 개수</label>
              <div className="grid grid-cols-3 gap-2">
                {([0, 1, 2] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLastThreeCushions(num)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold transition-all border",
                      lastThreeCushions === num 
                        ? "bg-orange-500/20 border-orange-500 text-orange-400" 
                        : "bg-[#1a5d4e]/50 border-[#1a5d4e] text-emerald-100/30"
                    )}
                  >
                    {num}개
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="game-record-my-score" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">내 점수</label>
              <input
                id="game-record-my-score"
                type="number"
                min="0"
                value={myScore}
                onChange={(e) => setMyScore(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
            <div>
              <label htmlFor="game-record-opponent-score" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">상대 점수</label>
              <input
                id="game-record-opponent-score"
                type="number"
                min="0"
                value={opponentScore}
                onChange={(e) => setOpponentScore(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
          </div>

          {type === '4-Ball' && lastThreeCushions > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="game-record-my-cushion-score" className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">내 마무리 3C</label>
                <input
                  id="game-record-my-cushion-score"
                  type="number"
                  min="0"
                  max={lastThreeCushions}
                  value={myCushionScore}
                  onChange={(e) => setMyCushionScore(Number(e.target.value))}
                  className="w-full bg-[#1a5d4e] border border-orange-500/40 rounded-xl px-4 py-3 text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                  required
                />
              </div>
              <div>
                <label htmlFor="game-record-opponent-cushion-score" className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">상대 마무리 3C</label>
                <input
                  id="game-record-opponent-cushion-score"
                  type="number"
                  min="0"
                  max={lastThreeCushions}
                  value={opponentCushionScore}
                  onChange={(e) => setOpponentCushionScore(Number(e.target.value))}
                  className="w-full bg-[#1a5d4e] border border-orange-500/40 rounded-xl px-4 py-3 text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="game-record-innings" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">이닝 수</label>
              <input
                id="game-record-innings"
                type="number"
                min="1"
                value={innings}
                onChange={(e) => setInnings(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
            <div>
              <label htmlFor="game-record-high-run" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">하이런</label>
              <input
                id="game-record-high-run"
                type="number"
                min="0"
                value={highRun}
                onChange={(e) => setHighRun(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="game-record-notes" className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">메모</label>
            <textarea
              id="game-record-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full resize-none rounded-xl border border-[#2d8a75] bg-[#1a5d4e] px-4 py-3 font-bold text-emerald-50 placeholder:text-emerald-100/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-[#0a3d2e] font-black py-4 rounded-2xl transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={20} />
            기록 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};
