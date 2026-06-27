import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ArrowRight, User, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] border border-zinc-200 p-10 shadow-xl shadow-zinc-900/5"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-2xl text-emerald-600 mb-6">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">로그인</h1>
          <p className="text-zinc-500">Billiards Analytics에 오신 것을 환영합니다.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 ml-1">아이디</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                required
                type="text" 
                placeholder="아이디를 입력하세요"
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                required
                type="password" 
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2">
            로그인하기
            <ArrowRight size={20} />
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-zinc-500">
            계정이 없으신가요? <Link to="/signup" className="text-emerald-600 font-bold hover:underline">회원가입</Link>
          </p>
          <Link to="/" className="inline-block text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            메인으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
