import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, ChevronRight, Clock, ArrowLeft, Calendar, Tag } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  date: string;
  category: '공지' | '업데이트' | '이벤트';
  content: string;
  isImportant: boolean;
}

const MOCK_NOTICES: Notice[] = [
  {
    id: '1',
    title: 'Billiards Analytics 정식 서비스 런칭 안내',
    date: '2026-04-15',
    category: '공지',
    isImportant: true,
    content: `안녕하세요. Billiards Analytics 팀입니다.

오랜 준비 끝에 당구 데이터 분석의 새로운 기준, Billiards Analytics가 정식으로 서비스를 시작하게 되었습니다.

저희 서비스는 다음과 같은 핵심 기능을 제공합니다:
- 3구 및 4구 경기 기록 및 정밀 다마 측정
- 실시간 경기 방 시스템을 통한 동시 기록
- 데이터 기반의 스마트 대시보드 분석
- 친구 관리 및 상대 전적 분석

앞으로도 여러분의 당구 실력 향상을 위해 최선을 다하는 서비스가 되겠습니다.
많은 이용 부탁드립니다.

감사합니다.`
  },
  {
    id: '2',
    title: '실시간 경기 방 시스템 업데이트 (v1.1.0)',
    date: '2026-04-10',
    category: '업데이트',
    isImportant: false,
    content: `실시간 경기 방 시스템에 '되돌리기' 기능이 추가되었습니다.

[업데이트 내용]
1. 되돌리기(Undo) 기능 추가: 실수로 입력한 점수를 즉시 취소할 수 있습니다.
2. 경기 방 로딩 속도 개선: 데이터 동기화 알고리즘 최적화로 더 빠른 반응 속도를 제공합니다.
3. UI 개선: 모바일 환경에서 점수 입력 버튼의 가독성을 높였습니다.

더욱 쾌적한 경기 환경을 위해 항상 노력하겠습니다.`
  },
  {
    id: '3',
    title: '베타 테스트 참여 감사 이벤트 당첨자 발표',
    date: '2026-04-05',
    category: '이벤트',
    isImportant: false,
    content: `베타 테스트 기간 동안 소중한 의견을 주신 모든 분들께 감사드립니다.

이벤트 당첨자 분들께는 가입 시 등록하신 이메일로 개별 안내를 드렸습니다.
경품은 이번 주 내로 순차 발송될 예정입니다.

참여해주신 모든 분들께 다시 한번 감사 인사를 전합니다.`
  }
];

export function NoticePage() {
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  return (
    <div className="pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#1a5d4e] rounded-2xl text-emerald-400 mb-4 mx-auto">
            <Megaphone size={28} />
          </div>
          <h1 className="text-3xl font-black text-emerald-50 tracking-tight mix-blend-difference">공지사항</h1>
          <p className="text-emerald-100/60 mt-2 font-medium mix-blend-difference">Billiards Analytics의 새로운 소식을 전해드립니다.</p>
        </div>

        <AnimatePresence mode="wait">
          {selectedNotice ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] p-8 shadow-2xl shadow-black/20"
            >
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setSelectedNotice(null)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-full transition-colors text-emerald-100"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedNotice.category === '공지' ? 'bg-blue-500/20 text-blue-400' : 
                    selectedNotice.category === '업데이트' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedNotice.category}
                  </span>
                </div>
              </div>

              <div className="border-b border-[#1a5d4e] pb-6 mb-6">
                <h2 className="text-2xl font-bold text-emerald-50 mb-4">
                  {selectedNotice.isImportant && <span className="text-red-400 mr-2">[중요]</span>}
                  {selectedNotice.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-emerald-100/40">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {selectedNotice.date}
                  </span>
                </div>
              </div>

              <div className="text-emerald-100/70 leading-relaxed whitespace-pre-wrap min-h-[300px] font-medium">
                {selectedNotice.content}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] overflow-hidden shadow-2xl shadow-black/20"
            >
              <div className="divide-y divide-[#1a5d4e]">
                {MOCK_NOTICES.map((notice) => (
                  <button
                    key={notice.id}
                    onClick={() => setSelectedNotice(notice)}
                    className="w-full p-6 flex items-center justify-between hover:bg-[#1a5d4e]/30 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          notice.category === '공지' ? 'bg-blue-500/20 text-blue-400' : 
                          notice.category === '업데이트' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {notice.category}
                        </span>
                        <span className="text-xs text-emerald-500/50">{notice.date}</span>
                      </div>
                      <h3 className={`text-lg font-bold truncate flex items-center gap-2 ${
                        notice.isImportant ? 'text-emerald-50' : 'text-emerald-100/80'
                      }`}>
                        {notice.isImportant && <span className="text-red-400 shrink-0">[중요]</span>}
                        {notice.title}
                      </h3>
                    </div>
                    <ChevronRight size={20} className="text-emerald-500/30 group-hover:text-emerald-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
