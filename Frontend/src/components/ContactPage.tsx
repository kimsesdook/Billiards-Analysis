import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, Search, ChevronRight, Lock, User, Clock, Send, ArrowLeft } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  author: string;
  date: string;
  isPrivate: boolean;
  content: string;
  status: '답변대기' | '답변완료';
}

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: '에버리지 계산 방식이 궁금합니다.',
    author: '당구왕',
    date: '2026-04-14',
    isPrivate: true,
    content: '에버리지 계산할 때 소수점 몇 자리까지 반영되나요?',
    status: '답변완료',
  },
  {
    id: '2',
    title: '친구 초대 링크가 안 열려요.',
    author: '초보자',
    date: '2026-04-13',
    isPrivate: false,
    content: '친구에게 링크를 보냈는데 페이지를 찾을 수 없다고 나옵니다.',
    status: '답변대기',
  },
  {
    id: '3',
    title: '다마 측정 기준에 대해 제안합니다.',
    author: '빌리어드',
    date: '2026-04-12',
    isPrivate: false,
    content: '최근 경기 비중을 더 높게 잡으면 좋을 것 같습니다.',
    status: '답변완료',
  }
];

export function ContactPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [isWriting, setIsWriting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', isPrivate: true });
  const [activeTab, setActiveTab] = useState<'전체' | '답변대기' | '답변완료'>('전체');

  const handleWriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const post: Post = {
      id: Math.random().toString(36).substr(2, 9),
      title: newPost.title,
      author: '사용자',
      date: new Date().toISOString().split('T')[0],
      isPrivate: newPost.isPrivate,
      content: newPost.content,
      status: '답변대기'
    };
    setPosts([post, ...posts]);
    setIsWriting(false);
    setNewPost({ title: '', content: '', isPrivate: true });
  };

  const filteredPosts = posts.filter(post => {
    // If logged in, only show my posts
    if (isLoggedIn) {
      if (post.author !== '사용자') return false;
    }
    
    // Filter by tab
    if (activeTab === '전체') return true;
    return post.status === activeTab;
  });

  return (
    <div className="pb-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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

        {/* Tabs */}
        {!isWriting && !selectedPost && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['전체', '답변대기', '답변완료'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab 
                    ? 'bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/20' 
                    : 'bg-[#1a5d4e] text-emerald-100/40 hover:text-emerald-100'
                }`}
              >
                {tab}
              </button>
            ))}
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
                  onClick={() => setIsWriting(false)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-full transition-colors text-emerald-100"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-bold text-emerald-50">새 문의글 작성</h2>
              </div>

              <form onSubmit={handleWriteSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-500/50 ml-1 uppercase tracking-wider">제목</label>
                  <input 
                    required
                    type="text" 
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="제목을 입력하세요"
                    className="w-full px-6 py-4 bg-[#0a3d2e] border border-[#1a5d4e] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-emerald-50 placeholder:text-emerald-100/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-500/50 ml-1 uppercase tracking-wider">내용</label>
                  <textarea 
                    required
                    rows={8}
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="문의하실 내용을 상세히 적어주세요"
                    className="w-full px-6 py-4 bg-[#0a3d2e] border border-[#1a5d4e] rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-emerald-50 placeholder:text-emerald-100/20"
                  ></textarea>
                </div>
                <div className="flex items-center gap-3 ml-1">
                  <input 
                    type="checkbox" 
                    id="private"
                    checked={newPost.isPrivate}
                    onChange={(e) => setNewPost({ ...newPost, isPrivate: e.target.checked })}
                    className="w-5 h-5 rounded border-[#1a5d4e] bg-[#0a3d2e] text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="private" className="text-sm font-bold text-emerald-100/60 flex items-center gap-1.5 cursor-pointer">
                    <Lock size={14} />
                    비밀글로 설정
                  </label>
                </div>
                <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0a3d2e] py-5 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2">
                  작성 완료
                  <Send size={20} />
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
                  onClick={() => setSelectedPost(null)}
                  className="p-2 hover:bg-[#1a5d4e] rounded-full transition-colors text-emerald-100"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedPost.status === '답변완료' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a5d4e] text-emerald-100/40'
                  }`}>
                    {selectedPost.status}
                  </span>
                </div>
              </div>

              <div className="border-b border-[#1a5d4e] pb-6 mb-6">
                <h2 className="text-2xl font-bold text-emerald-50 mb-4 flex items-center gap-2">
                  {selectedPost.isPrivate && <Lock size={20} className="text-emerald-500/30" />}
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-emerald-100/40">
                  <span className="flex items-center gap-1.5">
                    <User size={14} />
                    {selectedPost.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {selectedPost.date}
                  </span>
                </div>
              </div>

              <div className="text-emerald-100/70 leading-relaxed whitespace-pre-wrap min-h-[200px] font-medium">
                {selectedPost.isPrivate && selectedPost.author !== '사용자' ? (
                  <div className="flex flex-col items-center justify-center py-12 text-emerald-500/20 italic">
                    <Lock size={48} className="mb-4 opacity-20" />
                    비밀글입니다. 작성자만 확인할 수 있습니다.
                  </div>
                ) : (
                  selectedPost.content
                )}
              </div>

              {selectedPost.status === '답변완료' && (!selectedPost.isPrivate || selectedPost.author === '사용자') && (
                <div className="mt-12 p-6 bg-[#0a3d2e] rounded-2xl border border-[#1a5d4e]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[#0a3d2e]">
                      <MessageSquare size={12} />
                    </div>
                    <span className="font-bold text-emerald-50">관리자 답변</span>
                  </div>
                  <p className="text-emerald-100/60 text-sm leading-relaxed font-medium">
                    문의하신 내용에 대해 안내드립니다. 해당 기능은 현재 개발팀에서 검토 중이며, 
                    다음 업데이트 시 반영될 예정입니다. 소중한 의견 감사합니다.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#0d4d3b] rounded-[2.5rem] border border-[#1a5d4e] overflow-hidden shadow-2xl shadow-black/20"
            >
              <div className="divide-y divide-[#1a5d4e]">
                {filteredPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="w-full p-6 flex items-center justify-between hover:bg-[#1a5d4e]/30 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          post.status === '답변완료' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#1a5d4e] text-emerald-100/40'
                        }`}>
                          {post.status}
                        </span>
                        <span className="text-xs text-emerald-500/50">{post.date}</span>
                      </div>
                      <h3 className="text-lg font-bold text-emerald-50 truncate flex items-center gap-2">
                        {post.isPrivate && <Lock size={16} className="text-emerald-500/30 shrink-0" />}
                        {post.title}
                      </h3>
                      <p className="text-sm text-emerald-100/40 mt-1 flex items-center gap-1.5 font-medium">
                        <User size={12} />
                        {post.author}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
