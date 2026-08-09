import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, ChevronRight, Eye, EyeOff, Loader2, Lock, Mail, User, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { login, signUp } from '../api/auth';
import type { AuthSessionPayload } from '../api/authStorage';
import { getApiErrorMessage } from '../api/client';

interface SignupPageProps {
  onAuthenticated: (session: AuthSessionPayload) => void;
}

export function SignupPage({ onAuthenticated }: SignupPageProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isPasswordMatch = formData.password && formData.confirmPassword
    ? formData.password === formData.confirmPassword
    : true;
  const isPasswordLengthValid = formData.password.length >= 8;
  const canSubmit = Boolean(
    formData.email.trim()
    && formData.nickname.trim()
    && isPasswordLengthValid
    && isPasswordMatch,
  );

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordLengthValid) {
      setErrorMessage('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        email: formData.email.trim(),
        password: formData.password,
        nickname: formData.nickname.trim(),
      });

      const session = await login({
        email: formData.email.trim(),
        password: formData.password,
      });
      onAuthenticated(session);
      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 md:p-10 shadow-xl shadow-zinc-900/5"
        >
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-4">
              <UserPlus size={28} />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900">회원가입</h1>
            <p className="text-zinc-500 mt-2">계정을 만들고 경기 기록을 안전하게 저장해 보세요.</p>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-bold text-zinc-700 ml-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  id="signup-email"
                  required
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateFormData('email', event.target.value)}
                  placeholder="player@example.com"
                  autoComplete="email"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-nickname" className="text-sm font-bold text-zinc-700 ml-1">닉네임</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  id="signup-nickname"
                  required
                  type="text"
                  maxLength={30}
                  value={formData.nickname}
                  onChange={(event) => updateFormData('nickname', event.target.value)}
                  placeholder="표시할 닉네임"
                  autoComplete="nickname"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-bold text-zinc-700 ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  id="signup-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => updateFormData('password', event.target.value)}
                  placeholder="8자 이상 입력"
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-12 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                    formData.password && !isPasswordLengthValid
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.password && !isPasswordLengthValid && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle size={12} />
                  비밀번호는 8자 이상이어야 합니다.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-confirm-password" className="text-sm font-bold text-zinc-700 ml-1">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  id="signup-confirm-password"
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(event) => updateFormData('confirmPassword', event.target.value)}
                  placeholder="비밀번호 재입력"
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-12 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                    !isPasswordMatch && formData.confirmPassword
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {!isPasswordMatch && formData.confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle size={12} />
                  비밀번호가 일치하지 않습니다.
                </p>
              )}
              {isPasswordMatch && formData.confirmPassword && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 ml-1">
                  <CheckCircle2 size={12} />
                  비밀번호가 일치합니다.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
              가입하고 시작하기
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-zinc-500">
              이미 계정이 있나요?{' '}
              <Link to="/login" className="text-emerald-600 font-bold hover:underline">
                로그인하기
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
