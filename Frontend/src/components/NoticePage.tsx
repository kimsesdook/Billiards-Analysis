import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Megaphone,
} from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import {
  getNotice,
  getNotices,
  NoticeCategory,
  NoticeDetail,
  NoticePageResponse,
} from '../api/notices';

const PAGE_SIZE = 20;

const categoryLabels: Record<NoticeCategory, string> = {
  NOTICE: '공지',
  UPDATE: '업데이트',
  EVENT: '이벤트',
};

const categoryClassNames: Record<NoticeCategory, string> = {
  NOTICE: 'bg-blue-500/20 text-blue-300',
  UPDATE: 'bg-emerald-500/20 text-emerald-300',
  EVENT: 'bg-amber-500/20 text-amber-300',
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export function NoticePage() {
  const [noticePage, setNoticePage] = useState<NoticePageResponse | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotices = async (page: number) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setNoticePage(await getNotices({ page, size: PAGE_SIZE }));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices(0);
  }, []);

  const openNotice = async (noticeId: number) => {
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      setSelectedNotice(await getNotice(noticeId));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const currentPage = noticePage?.page ?? 0;
  const notices = noticePage?.content ?? [];

  return (
    <div className="pb-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-lg bg-[#1a5d4e] p-3 text-emerald-400">
            <Megaphone size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-emerald-50 mix-blend-difference">공지사항</h1>
          <p className="mt-2 font-medium text-emerald-100/60 mix-blend-difference">
            Billiards Analytics의 새로운 소식을 확인하세요.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-100" role="alert">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => void loadNotices(currentPage)}
              className="shrink-0 font-bold text-red-200 underline underline-offset-4 hover:text-white"
            >
              다시 시도
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {selectedNotice ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-lg border border-[#1a5d4e] bg-[#0d4d3b] p-8 shadow-2xl shadow-black/20"
            >
              <div className="mb-8 flex items-center gap-4">
                <button
                  type="button"
                  title="공지 목록으로"
                  aria-label="공지 목록으로"
                  onClick={() => setSelectedNotice(null)}
                  className="rounded-md p-2 text-emerald-100 transition-colors hover:bg-[#1a5d4e]"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${categoryClassNames[selectedNotice.category]}`}>
                  {categoryLabels[selectedNotice.category]}
                </span>
              </div>

              <div className="mb-6 border-b border-[#1a5d4e] pb-6">
                <h2 className="mb-4 text-2xl font-bold text-emerald-50">
                  {selectedNotice.isImportant && <span className="mr-2 text-red-400">[중요]</span>}
                  {selectedNotice.title}
                </h2>
                <div className="flex items-center gap-1.5 text-sm text-emerald-100/40">
                  <Calendar size={14} />
                  {formatDate(selectedNotice.publishedAt)}
                </div>
              </div>

              <div className="whitespace-pre-wrap font-medium leading-relaxed text-emerald-100/70">
                {selectedNotice.content}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-lg border border-[#1a5d4e] bg-[#0d4d3b] shadow-2xl shadow-black/20"
            >
              {isLoading || isDetailLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-emerald-100/60">
                  <LoaderCircle size={20} className="animate-spin" />
                  공지사항을 불러오는 중입니다.
                </div>
              ) : notices.length === 0 ? (
                <div className="flex min-h-48 items-center justify-center text-sm font-medium text-emerald-100/60">
                  등록된 공지사항이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-[#1a5d4e]">
                  {notices.map((notice) => (
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => void openNotice(notice.id)}
                      className="group flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-[#1a5d4e]/30"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <div className="mb-2 flex items-center gap-3">
                          <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${categoryClassNames[notice.category]}`}>
                            {categoryLabels[notice.category]}
                          </span>
                          <span className="text-xs text-emerald-500/50">{formatDate(notice.publishedAt)}</span>
                        </div>
                        <h3 className={`flex items-center gap-2 truncate text-lg font-bold ${notice.isImportant ? 'text-emerald-50' : 'text-emerald-100/80'}`}>
                          {notice.isImportant && <span className="shrink-0 text-red-400">[중요]</span>}
                          {notice.title}
                        </h3>
                      </div>
                      <ChevronRight size={20} className="shrink-0 text-emerald-500/30 transition-colors group-hover:text-emerald-400" />
                    </button>
                  ))}
                </div>
              )}

              {noticePage && noticePage.totalPages > 1 && !isLoading && (
                <div className="flex items-center justify-between border-t border-[#1a5d4e] px-5 py-3">
                  <button
                    type="button"
                    title="이전 페이지"
                    aria-label="이전 페이지"
                    onClick={() => void loadNotices(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="rounded-md p-2 text-emerald-100 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-medium text-emerald-100/60">
                    {currentPage + 1} / {noticePage.totalPages}
                  </span>
                  <button
                    type="button"
                    title="다음 페이지"
                    aria-label="다음 페이지"
                    onClick={() => void loadNotices(currentPage + 1)}
                    disabled={!noticePage.hasNext}
                    className="rounded-md p-2 text-emerald-100 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
