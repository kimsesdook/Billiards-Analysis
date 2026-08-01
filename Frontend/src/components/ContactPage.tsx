import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  LoaderCircle,
  Lock,
  MessageSquare,
  Plus,
  Send,
  User,
} from 'lucide-react';
import {
  ContactInquiryDetail,
  ContactInquirySummary,
  createContactInquiry,
  getContactInquiry,
  getMyContactInquiries,
  getPublicContactInquiries,
  InquiryStatus,
} from '../api/contactInquiries';
import { getApiErrorMessage } from '../api/client';

const STATUS_LABELS: Record<InquiryStatus, string> = {
  PENDING: '답변 대기',
  ANSWERED: '답변 완료',
};

const TABS: Array<{ value: 'ALL' | InquiryStatus; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: STATUS_LABELS.PENDING },
  { value: 'ANSWERED', label: STATUS_LABELS.ANSWERED },
];

const formatDate = (createdAt: string) => createdAt.slice(0, 10);

export function ContactPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [posts, setPosts] = useState<ContactInquirySummary[]>([]);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContactInquiryDetail | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', isPrivate: true });
  const [activeTab, setActiveTab] = useState<'ALL' | InquiryStatus>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const inquiries = isLoggedIn ? await getMyContactInquiries() : await getPublicContactInquiries();
      setPosts(inquiries);
    } catch (error) {
      setPosts([]);
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    setSelectedPost(null);
    setIsWriting(false);
    void loadPosts();
  }, [loadPosts]);

  const handleWriteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createContactInquiry(newPost);
      setNewPost({ title: '', content: '', isPrivate: true });
      setIsWriting(false);
      await loadPosts();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostClick = async (post: ContactInquirySummary) => {
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      const inquiry = await getContactInquiry(post.id, isLoggedIn);
      setSelectedPost(inquiry);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) => activeTab === 'ALL' || post.status === activeTab);

  return (
    <div className="pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-[#1a5d4e] rounded-2xl text-emerald-400 mb-4 mx-auto">
            <MessageSquare size={28} />
          </div>
          <h1 className="text-3xl font-black text-emerald-50 tracking-tight mix-blend-difference">문의 게시판</h1>
          <p className="text-emerald-100/60 mt-2 font-medium mix-blend-difference">
            {isLoggedIn ? '내가 작성한 문의 내역을 확인하세요.' : '궁금하신 점이나 건의사항을 남겨주세요.'}
          </p>

          {isLoggedIn && !isWriting && !selectedPost && (
            <div className="mt-8">
              <button
                onClick={() => setIsWriting(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-black/20 mx-auto"
              >
                <Plus size={20} />
                문의글 작성하기
              </button>
            </div>
          )}
        </div>

        {!isWriting && !selectedPost && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.value
                    ? 'bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/20'
                    : 'bg-[#1a5d4e] text-emerald-100/40 hover:text-emerald-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-5 py-4 text-sm font-medium text-rose-100" role="alert">
            {errorMessage}
          </div>
        )}

        <AnimatePresence mode="wait">
          {isWriting ? (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] p-8 shadow-2xl shadow-black/20"
            >
              <div className="flex items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-full transition-colors text-emerald-100"
                  aria-label="문의 작성 취소"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-emerald-50">새 문의글 작성</h2>
              </div>

              <form onSubmit={handleWriteSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-500/50 ml-1 uppercase tracking-wider" htmlFor="inquiry-title">제목</label>
                  <input
                    required
                    maxLength={150}
                    id="inquiry-title"
                    type="text"
                    value={newPost.title}
                    onChange={(event) => setNewPost({ ...newPost, title: event.target.value })}
                    placeholder="제목을 입력하세요"
                    className="w-full px-6 py-4 bg-[#0a3d2e] border border-[#1a5d4e] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-emerald-50 placeholder:text-emerald-100/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-500/50 ml-1 uppercase tracking-wider" htmlFor="inquiry-content">내용</label>
                  <textarea
                    required
                    maxLength={5000}
                    id="inquiry-content"
                    rows={8}
                    value={newPost.content}
                    onChange={(event) => setNewPost({ ...newPost, content: event.target.value })}
                    placeholder="문의하실 내용을 상세히 적어주세요"
                    className="w-full px-6 py-4 bg-[#0a3d2e] border border-[#1a5d4e] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-emerald-50 placeholder:text-emerald-100/20"
                  />
                </div>
                <div className="flex items-center gap-3 ml-1">
                  <input
                    type="checkbox"
                    id="private"
                    checked={newPost.isPrivate}
                    onChange={(event) => setNewPost({ ...newPost, isPrivate: event.target.checked })}
                    className="w-5 h-5 rounded border-[#1a5d4e] bg-[#0a3d2e] text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="private" className="text-sm font-bold text-emerald-100/60 flex items-center gap-1.5 cursor-pointer">
                    <Lock size={14} />
                    비밀글로 설정
                  </label>
                </div>
                <button
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 text-[#0a3d2e] py-5 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />}
                  {isSubmitting ? '등록 중...' : '작성 완료'}
                </button>
              </form>
            </motion.div>
          ) : selectedPost ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] p-8 shadow-2xl shadow-black/20"
            >
              <div className="flex items-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-full transition-colors text-emerald-100"
                  aria-label="문의 목록으로 돌아가기"
                >
                  <ArrowLeft size={20} />
                </button>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedPost.status === 'ANSWERED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a5d4e] text-emerald-100/40'
                }`}>
                  {STATUS_LABELS[selectedPost.status]}
                </span>
              </div>

              <div className="border-b border-[#1a5d4e] pb-6 mb-6">
                <h2 className="text-2xl font-bold text-emerald-50 mb-4 flex items-center gap-2">
                  {selectedPost.isPrivate && <Lock size={20} className="text-emerald-500/30" />}
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-emerald-100/40">
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    {selectedPost.authorNickname}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {formatDate(selectedPost.createdAt)}
                  </span>
                </div>
              </div>

              <div className="text-emerald-100/70 leading-relaxed whitespace-pre-wrap min-h-[200px] font-medium">
                {selectedPost.content}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] overflow-hidden shadow-2xl shadow-black/20"
            >
              {isLoading || isDetailLoading ? (
                <div className="py-20 flex items-center justify-center gap-3 text-emerald-100/60 font-medium">
                  <LoaderCircle size={20} className="animate-spin" />
                  문의 내역을 불러오는 중입니다.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#1a5d4e]">
                    {filteredPosts.map((post) => (
                      <button
                        key={post.id}
                        onClick={() => void handlePostClick(post)}
                        className="w-full p-6 flex items-center justify-between hover:bg-[#1a5d4e]/30 transition-colors text-left group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                              post.status === 'ANSWERED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a5d4e] text-emerald-100/40'
                            }`}>
                              {STATUS_LABELS[post.status]}
                            </span>
                            <span className="text-xs text-emerald-500/50">{formatDate(post.createdAt)}</span>
                          </div>
                          <h3 className="text-lg font-bold text-emerald-50 truncate flex items-center gap-2">
                            {post.isPrivate && <Lock size={16} className="text-emerald-500/30 shrink-0" />}
                            {post.title}
                          </h3>
                          <p className="text-sm text-emerald-100/40 mt-1 flex items-center gap-1.5 font-medium">
                            <User size={12} />
                            {post.authorNickname}
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-emerald-500/30 group-hover:text-emerald-400 transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                  {filteredPosts.length === 0 && (
                    <div className="py-20 text-center text-emerald-500/30 font-medium">
                      등록된 문의글이 없습니다.
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
