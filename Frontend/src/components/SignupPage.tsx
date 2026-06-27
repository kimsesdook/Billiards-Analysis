import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Lock, User, ChevronRight, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idChecked, setIdChecked] = useState(false);
  const [nicknameChecked, setNicknameChecked] = useState(false);

  const isPasswordMatch = formData.password && formData.confirmPassword 
    ? formData.password === formData.confirmPassword 
    : true;

  const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>])/;
  const isPasswordComplex = passwordRegex.test(formData.password);

  const handleIdCheck = () => {
    if (!formData.username) return;
    // Simulate API call
    setIdChecked(true);
    alert('사용 가능한 아이디입니다.');
  };

  const handleNicknameCheck = () => {
    const nick = formData.nickname.trim();
    if (!nick) {
      alert('닉네임을 입력해 주세요.');
      return;
    }
    const forbidden = [
      '신림동3구왕', '죽빵킬러', '예각의마술사', '무회전샷', '황오시', '빈쿠션달인',
      '밀어치기달인', '오시대장', '더블레일', '끌어치기고수', '원쿠션제왕', '당구의신',
      '하점자클럽', '예술구전설', '큐걸이장인'
    ];
    if (forbidden.some(fn => fn === nick)) {
      alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
      setNicknameChecked(false);
      return;
    }
    try {
      const cached = localStorage.getItem('billiards_friends');
      if (cached) {
        const friends = JSON.parse(cached);
        if (friends.some((f: any) => f.nickname === nick)) {
          alert('이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.');
          setNicknameChecked(false);
          return;
        }
      }
    } catch (_) {}

    setNicknameChecked(true);
    alert('사용 가능한 닉네임입니다.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.username.length < 6) {
      alert('아이디는 6자 이상이어야 합니다.');
      return;
    }
    if (!idChecked) {
      alert('아이디 중복 확인을 해주세요.');
      return;
    }
    if (!formData.name.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }
    if (!nicknameChecked) {
      alert('닉네임 중복 확인을 해주세요.');
      return;
    }
    if (formData.password.length < 10) {
      alert('비밀번호는 10자 이상이어야 합니다.');
      return;
    }
    if (!isPasswordComplex) {
      alert('비밀번호는 숫자와 특수문자를 포함해야 합니다.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // Handle signup logic
    console.log('Signup data:', formData);
    localStorage.setItem('billiards_name', formData.name.trim());
    localStorage.setItem('billiards_nickname', formData.nickname.trim());
    alert('회원가입이 완료되었습니다! (데모)');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 md:p-10 shadow-xl shadow-zinc-900/5"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-4">
              <UserPlus size={28} />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900">회원가입</h1>
            <p className="text-zinc-500 mt-2">Billiards Analytics와 함께 성장을 기록하세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ID Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">아이디</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value });
                      setIdChecked(false);
                    }}
                    placeholder="6자 이상 입력"
                    className={`w-full pl-12 pr-6 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                      formData.username && formData.username.length < 6
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIdCheck}
                  disabled={formData.username.length < 6}
                  className={`px-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                    idChecked 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : formData.username.length < 6
                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {idChecked ? '확인됨' : '중복확인'}
                </button>
              </div>
              {formData.username && formData.username.length < 6 && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle size={12} />
                  아이디는 6자 이상이어야 합니다.
                </p>
              )}
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">이름</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="본인의 본명 또는 실명을 입력하세요"
                  className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Nickname Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">닉네임</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input
                    required
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => {
                      setFormData({ ...formData, nickname: e.target.value });
                      setNicknameChecked(false);
                    }}
                    placeholder="활동할 고유 닉네임을 입력하세요"
                    className="w-full pl-12 pr-6 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleNicknameCheck}
                  className={`px-4 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                    nicknameChecked 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {nicknameChecked ? '확인됨' : '중복확인'}
                </button>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="10자 이상, 숫자+특수문자 포함"
                  className={`w-full pl-12 pr-12 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                    formData.password && (formData.password.length < 10 || !isPasswordComplex)
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.password && formData.password.length < 10 && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle size={12} />
                  비밀번호는 10자 이상이어야 합니다.
                </p>
              )}
              {formData.password && formData.password.length >= 10 && !isPasswordComplex && (
                <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                  <AlertCircle size={12} />
                  숫자와 특수문자를 포함해야 합니다.
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 ml-1">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="비밀번호 재입력"
                  className={`w-full pl-12 pr-12 py-4 bg-zinc-50 border rounded-2xl focus:outline-none focus:ring-2 transition-all ${
                    !isPasswordMatch && formData.confirmPassword
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-zinc-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
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
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-5 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 mt-4"
            >
              가입 완료
              <ChevronRight size={20} />
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-zinc-500">
              이미 계정이 있으신가요?{' '}
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
