import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  List,
  LoaderCircle,
  Megaphone,
  Pin,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import {
  createAdminNotice,
  getNotice,
  getNotices,
  NoticeCategory,
  NoticeDetail,
  NoticePageResponse,
  NoticeUpsertPayload,
  updateAdminNotice,
} from '../api/notices';

const PAGE_SIZE = 20;

const EMPTY_FORM: NoticeUpsertPayload = {
  title: '',
  content: '',
  category: 'NOTICE',
  isImportant: false,
};

const CATEGORY_LABELS: Record<NoticeCategory, string> = {
  NOTICE: '공지',
  UPDATE: '업데이트',
  EVENT: '이벤트',
};

const CATEGORY_CLASS_NAMES: Record<NoticeCategory, string> = {
  NOTICE: 'bg-blue-500/15 text-blue-200',
  UPDATE: 'bg-emerald-500/15 text-emerald-200',
  EVENT: 'bg-amber-400/15 text-amber-100',
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export function AdminNoticesPage() {
  const [page, setPage] = useState(0);
  const [noticePage, setNoticePage] = useState<NoticePageResponse | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetail | null>(null);
  const [form, setForm] = useState<NoticeUpsertPayload>(EMPTY_FORM);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotices = useCallback(async (nextPage: number) => {
    setIsListLoading(true);
    setErrorMessage(null);

    try {
      setNoticePage(await getNotices({ page: nextPage, size: PAGE_SIZE }));
    } catch (error) {
      setNoticePage(null);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotices(page);
  }, [loadNotices, page]);

  const handleCreate = () => {
    setSelectedNotice(null);
    setForm(EMPTY_FORM);
    setErrorMessage(null);
  };

  const handleOpenNotice = async (noticeId: number) => {
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      const detail = await getNotice(noticeId);
      setSelectedNotice(detail);
      setForm({
        title: detail.title,
        content: detail.content,
        category: detail.category,
        isImportant: detail.isImportant,
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: NoticeUpsertPayload = {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
    };

    if (!payload.title || !payload.content) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const savedNotice = selectedNotice
        ? await updateAdminNotice(selectedNotice.id, payload)
        : await createAdminNotice(payload);
      setSelectedNotice(savedNotice);
      setForm({
        title: savedNotice.title,
        content: savedNotice.content,
        category: savedNotice.category,
        isImportant: savedNotice.isImportant,
      });
      await loadNotices(page);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const notices = noticePage?.content ?? [];

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <header className="mb-7 flex flex-col gap-4 border-b border-[#1a5d4e] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Megaphone size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-50">공지 관리</h1>
            <p className="mt-1 text-sm text-emerald-100/50">서비스 공지를 작성하고 기존 공지 내용을 수정합니다.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-[#0a3d2e] transition-colors hover:bg-emerald-400"
          >
            <Plus size={17} />
            새 공지
          </button>
          <button
            type="button"
            onClick={() => void loadNotices(page)}
            disabled={isListLoading}
            title="공지 목록 새로고침"
            aria-label="공지 목록 새로고침"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1a5d4e] text-emerald-100/70 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={17} className={isListLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="mb-5 border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-h-[560px] overflow-hidden rounded-lg border border-[#1a5d4e] bg-[#0d4d3b]" aria-label="공지 목록">
          <div className="flex items-center justify-between border-b border-[#1a5d4e] px-5 py-4">
            <span className="text-sm font-bold text-emerald-50">발행된 공지</span>
            <span className="text-xs text-emerald-100/45">{noticePage?.totalElements ?? 0}건</span>
          </div>

          {isListLoading ? (
            <div className="flex min-h-[480px] items-center justify-center gap-3 text-sm text-emerald-100/60">
              <LoaderCircle size={18} className="animate-spin" />
              공지 목록을 불러오는 중입니다.
            </div>
          ) : notices.length === 0 ? (
            <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center text-emerald-100/45">
              <List size={28} className="mb-3" />
              <p className="text-sm">등록된 공지사항이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1a5d4e]">
              {notices.map((notice) => (
                <button
                  key={notice.id}
                  type="button"
                  onClick={() => void handleOpenNotice(notice.id)}
                  className={`w-full px-5 py-4 text-left transition-colors hover:bg-[#1a5d4e]/55 ${
                    selectedNotice?.id === notice.id ? 'bg-[#1a5d4e]/70' : ''
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${CATEGORY_CLASS_NAMES[notice.category]}`}>
                      {CATEGORY_LABELS[notice.category]}
                    </span>
                    {notice.isImportant && <span className="rounded bg-rose-400/15 px-2 py-0.5 text-[10px] font-bold text-rose-200">중요</span>}
                    <span className="ml-auto text-xs text-emerald-100/40">{formatDateTime(notice.publishedAt)}</span>
                  </div>
                  <span className="block truncate text-sm font-bold text-emerald-50">{notice.title}</span>
                </button>
              ))}
            </div>
          )}

          {noticePage && noticePage.totalPages > 0 && (
            <div className="flex items-center justify-between border-t border-[#1a5d4e] px-4 py-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || isListLoading}
                title="이전 페이지"
                aria-label="이전 페이지"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-100/70 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs text-emerald-100/55">{page + 1} / {noticePage.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!noticePage.hasNext || isListLoading}
                title="다음 페이지"
                aria-label="다음 페이지"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-100/70 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>

        <section className="min-h-[560px] rounded-lg border border-[#1a5d4e] bg-[#0d4d3b]" aria-label="공지 작성 및 수정">
          {isDetailLoading ? (
            <div className="flex min-h-[560px] items-center justify-center gap-3 text-sm text-emerald-100/60">
              <LoaderCircle size={18} className="animate-spin" />
              공지 내용을 불러오는 중입니다.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-[560px] flex-col px-6 py-5">
              <div className="flex items-start justify-between gap-4 border-b border-[#1a5d4e] pb-5">
                <div className="flex items-start gap-3">
                  <FilePenLine size={20} className="mt-0.5 shrink-0 text-emerald-400" />
                  <div>
                    <h2 className="text-xl font-bold text-emerald-50">{selectedNotice ? '공지 수정' : '새 공지 작성'}</h2>
                    <p className="mt-1 text-xs text-emerald-100/45">
                      {selectedNotice ? `최초 발행 ${formatDateTime(selectedNotice.publishedAt)}` : '작성 후 즉시 공개 목록에 표시됩니다.'}
                    </p>
                  </div>
                </div>
                {selectedNotice?.isImportant && <Pin size={17} className="shrink-0 text-rose-300" />}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="block text-xs font-bold uppercase tracking-wide text-emerald-400/70" htmlFor="notice-category">
                  카테고리
                  <select
                    id="notice-category"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as NoticeCategory }))}
                    className="mt-2 h-10 w-full rounded-md border border-[#1a5d4e] bg-[#0a3d2e] px-3 text-sm font-medium text-emerald-50 outline-none transition-colors focus:border-emerald-400"
                  >
                    {(Object.keys(CATEGORY_LABELS) as NoticeCategory[]).map((category) => (
                      <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end rounded-md border border-[#1a5d4e] bg-[#0a3d2e] px-3 text-sm font-medium text-emerald-100/80">
                  <input
                    type="checkbox"
                    checked={form.isImportant}
                    onChange={(event) => setForm((current) => ({ ...current, isImportant: event.target.checked }))}
                    className="h-4 w-4 rounded border-[#1a5d4e] bg-[#0a3d2e] text-emerald-500 focus:ring-emerald-500"
                  />
                  중요 공지
                </label>
              </div>

              <label className="mt-5 block text-xs font-bold uppercase tracking-wide text-emerald-400/70" htmlFor="notice-title">
                제목
                <input
                  id="notice-title"
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="공지 제목을 입력하세요"
                  className="mt-2 h-11 w-full rounded-md border border-[#1a5d4e] bg-[#0a3d2e] px-3 text-sm text-emerald-50 outline-none transition-colors placeholder:text-emerald-100/25 focus:border-emerald-400"
                />
              </label>

              <label className="mt-5 flex flex-1 flex-col text-xs font-bold uppercase tracking-wide text-emerald-400/70" htmlFor="notice-content">
                내용
                <textarea
                  id="notice-content"
                  required
                  maxLength={5000}
                  rows={10}
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                  placeholder="공지 내용을 입력하세요"
                  className="mt-2 min-h-52 w-full flex-1 resize-y rounded-md border border-[#1a5d4e] bg-[#0a3d2e] px-3 py-3 text-sm font-medium leading-6 text-emerald-50 outline-none transition-colors placeholder:text-emerald-100/25 focus:border-emerald-400"
                />
              </label>

              <div className="mt-5 flex items-center justify-end border-t border-[#1a5d4e] pt-5">
                <button
                  type="submit"
                  disabled={isSubmitting || !form.title.trim() || !form.content.trim()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-bold text-[#0a3d2e] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSubmitting ? '저장 중...' : selectedNotice ? '공지 수정' : '공지 발행'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
