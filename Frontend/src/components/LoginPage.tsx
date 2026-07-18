import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import type { AuthSessionPayload } from '../api/authStorage';
import { getApiErrorMessage } from '../api/client';

interface LoginPageProps {
  onLogin: (session: AuthSessionPayload) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const session = await login({
        email: email.trim(),
        password,
      });
      onLogin(session);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
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
          <p className="text-zinc-500">경기 기록을 불러오려면 계정으로 로그인해 주세요.</p>
        </div>

        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 ml-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="player@example.com"
                autoComplete="email"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            로그인하기
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-zinc-500">
            계정이 없나요?{' '}
            <Link to="/signup" className="text-emerald-600 font-bold hover:underline">
              회원가입
            </Link>
          </p>
          <Link to="/" className="inline-block text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
            메인으로 돌아가기
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
