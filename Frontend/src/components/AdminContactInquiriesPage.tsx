import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  answerContactInquiry,
  ContactInquiryDetail,
  ContactInquiryPage,
  ContactInquirySummary,
  getAdminContactInquiries,
  getContactInquiry,
  InquiryStatus,
} from '../api/contactInquiries';
import { getApiErrorMessage } from '../api/client';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING: '답변 대기',
  ANSWERED: '답변 완료',
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

export function AdminContactInquiriesPage() {
  const [status, setStatus] = useState<InquiryStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [inquiryPage, setInquiryPage] = useState<ContactInquiryPage | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryDetail | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInquiries = useCallback(async () => {
    setIsListLoading(true);
    setErrorMessage(null);

    try {
      setInquiryPage(await getAdminContactInquiries({ status, page, size: PAGE_SIZE }));
    } catch (error) {
      setInquiryPage(null);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsListLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadInquiries();
  }, [loadInquiries]);

  const handleStatusChange = (nextStatus: InquiryStatus) => {
    setStatus(nextStatus);
    setPage(0);
    setSelectedInquiry(null);
  };

  const handleOpenInquiry = async (inquiry: ContactInquirySummary) => {
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      const detail = await getContactInquiry(inquiry.id, true);
      setSelectedInquiry(detail);
      setAnswerContent(detail.answerContent ?? '');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleAnswerSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedInquiry || !answerContent.trim()) {
      return;
    }

    setIsAnswerSubmitting(true);
    setErrorMessage(null);

    try {
      const updatedInquiry = await answerContactInquiry(selectedInquiry.id, answerContent.trim());
      setSelectedInquiry(updatedInquiry);
      setAnswerContent(updatedInquiry.answerContent ?? '');
      await loadInquiries();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAnswerSubmitting(false);
    }
  };

  const inquiries = inquiryPage?.content ?? [];

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <header className="mb-7 flex flex-col gap-4 border-b border-[#1a5d4e] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <ShieldCheck size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-emerald-50">문의 관리</h1>
            <p className="mt-1 text-sm text-emerald-100/50">고객 문의를 확인하고 답변을 등록합니다.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadInquiries()}
          disabled={isListLoading}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1a5d4e] text-emerald-100/70 transition-colors hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-50"
          title="목록 새로고침"
          aria-label="목록 새로고침"
        >
          <RefreshCw size={17} className={isListLoading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="mb-5 flex items-center gap-1 rounded-lg border border-[#1a5d4e] bg-[#0d4d3b] p-1" role="tablist" aria-label="문의 상태">
        {(['PENDING', 'ANSWERED'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={status === value}
            onClick={() => handleStatusChange(value)}
            className={`min-h-9 flex-1 rounded-md px-3 text-sm font-bold transition-colors ${
              status === value
                ? 'bg-emerald-500 text-[#0a3d2e]'
                : 'text-emerald-100/55 hover:bg-[#1a5d4e] hover:text-emerald-50'
            }`}
          >
            {STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-5 border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-medium text-rose-100" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="min-h-[560px] overflow-hidden rounded-lg border border-[#1a5d4e] bg-[#0d4d3b]" aria-label="문의 목록">
          <div className="flex items-center justify-between border-b border-[#1a5d4e] px-5 py-4">
            <span className="text-sm font-bold text-emerald-50">{STATUS_LABELS[status]}</span>
            <span className="text-xs text-emerald-100/45">{inquiryPage?.totalElements ?? 0}건</span>
          </div>

          {isListLoading ? (
            <div className="flex min-h-[480px] items-center justify-center gap-3 text-sm text-emerald-100/60">
              <LoaderCircle size={18} className="animate-spin" />
              문의 목록을 불러오는 중입니다.
            </div>
          ) : inquiries.length === 0 ? (
            <div className="flex min-h-[480px] items-center justify-center px-6 text-center text-sm text-emerald-100/45">
              해당 상태의 문의가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-[#1a5d4e]">
              {inquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => void handleOpenInquiry(inquiry)}
                  className={`w-full px-5 py-4 text-left transition-colors hover:bg-[#1a5d4e]/55 ${
                    selectedInquiry?.id === inquiry.id ? 'bg-[#1a5d4e]/70' : ''
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      inquiry.status === 'ANSWERED' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'
                    }`}>
                      {STATUS_LABELS[inquiry.status]}
                    </span>
                    <span className="text-xs text-emerald-100/40">{formatDateTime(inquiry.createdAt)}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    {inquiry.isPrivate && <Lock size={15} className="shrink-0 text-emerald-400/60" />}
                    <span className="truncate text-sm font-bold text-emerald-50">{inquiry.title}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-100/45">
                    <User size={13} />
                    {inquiry.authorNickname}
                  </div>
                </button>
              ))}
            </div>
          )}

          {inquiryPage && inquiryPage.totalPages > 0 && (
            <div className="flex items-center justify-between border-t border-[#1a5d4e] px-4 py-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0 || isListLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-100/70 hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
                title="이전 페이지"
                aria-label="이전 페이지"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs text-emerald-100/55">{page + 1} / {inquiryPage.totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!inquiryPage.hasNext || isListLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-100/70 hover:bg-[#1a5d4e] disabled:cursor-not-allowed disabled:opacity-30"
                title="다음 페이지"
                aria-label="다음 페이지"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>

        <section className="min-h-[560px] rounded-lg border border-[#1a5d4e] bg-[#0d4d3b]" aria-label="문의 상세">
          {isDetailLoading ? (
            <div className="flex min-h-[560px] items-center justify-center gap-3 text-sm text-emerald-100/60">
              <LoaderCircle size={18} className="animate-spin" />
              문의 내용을 불러오는 중입니다.
            </div>
          ) : !selectedInquiry ? (
            <div className="flex min-h-[560px] flex-col items-center justify-center px-6 text-center text-emerald-100/45">
              <MessageSquare size={28} className="mb-3" />
              <p className="text-sm">문의 목록에서 항목을 선택하세요.</p>
            </div>
          ) : (
            <div className="flex min-h-[560px] flex-col">
              <div className="border-b border-[#1a5d4e] px-6 py-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    selectedInquiry.status === 'ANSWERED' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'
                  }`}>
                    {STATUS_LABELS[selectedInquiry.status]}
                  </span>
                  {selectedInquiry.isPrivate && <Lock size={14} className="text-emerald-400/60" />}
                </div>
                <h2 className="break-words text-xl font-bold text-emerald-50">{selectedInquiry.title}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-emerald-100/45">
                  <span className="flex items-center gap-1.5"><User size={13} />{selectedInquiry.authorNickname}</span>
                  <span className="flex items-center gap-1.5"><Clock size={13} />{formatDateTime(selectedInquiry.createdAt)}</span>
                </div>
              </div>

              <div className="border-b border-[#1a5d4e] px-6 py-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400/70">문의 내용</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-emerald-100/75">{selectedInquiry.content}</p>
              </div>

              <form onSubmit={handleAnswerSubmit} className="flex flex-1 flex-col px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="admin-answer" className="text-xs font-bold uppercase tracking-wide text-emerald-400/70">
                    {selectedInquiry.status === 'ANSWERED' ? '답변 수정' : '관리자 답변'}
                  </label>
                  {selectedInquiry.answeredAt && (
                    <span className="text-xs text-emerald-100/40">최종 답변 {formatDateTime(selectedInquiry.answeredAt)}</span>
                  )}
                </div>
                <textarea
                  id="admin-answer"
                  required
                  maxLength={5000}
                  rows={7}
                  value={answerContent}
                  onChange={(event) => setAnswerContent(event.target.value)}
                  placeholder="문의에 대한 답변을 작성하세요."
                  className="mt-3 min-h-36 w-full flex-1 resize-y rounded-md border border-[#1a5d4e] bg-[#0a3d2e] px-4 py-3 text-sm leading-6 text-emerald-50 outline-none transition-colors placeholder:text-emerald-100/25 focus:border-emerald-400"
                />
                <div className="mt-4 flex items-center justify-end">
                  <button
                    disabled={isAnswerSubmitting || !answerContent.trim()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-bold text-[#0a3d2e] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAnswerSubmitting ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
                    {isAnswerSubmitting ? '저장 중...' : selectedInquiry.status === 'ANSWERED' ? '답변 수정' : '답변 등록'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
