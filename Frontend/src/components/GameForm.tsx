import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { GameRecord, GameType } from '../types';
import { cn } from '../lib/utils';

interface GameFormProps {
  onAdd: (record: Omit<GameRecord, 'id' | 'average' | 'win'>) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      date: new Date().toISOString(),
      type,
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
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d4d3b] border border-[#1a5d4e] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-[#1a5d4e] flex justify-between items-center">
          <h2 className="text-xl font-bold text-emerald-50">경기 기록 추가</h2>
          <button onClick={onClose} className="text-emerald-500/50 hover:text-emerald-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">상대 닉네임</label>
            <input
              type="text"
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
              {[2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPlayerCount(num as any)}
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
                {[0, 1, 2].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLastThreeCushions(num as any)}
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
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">내 점수</label>
              <input
                type="number"
                value={myScore}
                onChange={(e) => setMyScore(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">상대 점수</label>
              <input
                type="number"
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
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">내 마무리 3C</label>
                <input
                  type="number"
                  value={myCushionScore}
                  onChange={(e) => setMyCushionScore(Number(e.target.value))}
                  min="0"
                  max={lastThreeCushions}
                  className="w-full bg-[#1a5d4e] border border-orange-500/40 rounded-xl px-4 py-3 text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">상대 마무리 3C</label>
                <input
                  type="number"
                  value={opponentCushionScore}
                  onChange={(e) => setOpponentCushionScore(Number(e.target.value))}
                  min="0"
                  max={lastThreeCushions}
                  className="w-full bg-[#1a5d4e] border border-orange-500/40 rounded-xl px-4 py-3 text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-bold"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">이닝 수</label>
              <input
                type="number"
                value={innings}
                onChange={(e) => setInnings(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-500/50 uppercase tracking-wider mb-2">하이런</label>
              <input
                type="number"
                value={highRun}
                onChange={(e) => setHighRun(Number(e.target.value))}
                className="w-full bg-[#1a5d4e] border border-[#2d8a75] rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-bold"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] font-black py-4 rounded-2xl transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2 mt-4"
          >
            <Plus size={20} />
            기록 저장하기
          </button>
        </form>
      </div>
    </div>
  );
};
