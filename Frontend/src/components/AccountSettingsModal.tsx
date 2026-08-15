import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Key, Settings, Shield, X } from 'lucide-react';
import { changeMyPassword, updateMyProfile, type MemberProfile } from '../api/memberProfile';
import { getApiErrorMessage } from '../api/client';
import { calculateAutomaticHandicaps } from '../lib/handicap';
import { cn } from '../lib/utils';
import type { GameRecord } from '../types';

type SettingsProfile = Pick<
  MemberProfile,
  'name' | 'nickname' | 'targetCushionCount' | 'threeBallHandicap' | 'fourBallHandicap'
>;

type AccountSettingsModalProps = {
  isOpen: boolean;
  profile: SettingsProfile;
  records: GameRecord[];
  onClose: () => void;
  onProfileUpdated: (profile: MemberProfile) => void;
  onNotification: (title: string, message: string) => void;
};

export function AccountSettingsModal({
  isOpen,
  profile,
  records,
  onClose,
  onProfileUpdated,
  onNotification,
}: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [targetCushionCount, setTargetCushionCount] = useState(profile.targetCushionCount);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab('profile');
    setName(profile.name);
    setNickname(profile.nickname);
    setTargetCushionCount(profile.targetCushionCount);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [
    isOpen,
    profile.name,
    profile.nickname,
    profile.targetCushionCount,
  ]);

  const automaticHandicaps = useMemo(
    () => calculateAutomaticHandicaps(records, targetCushionCount),
    [records, targetCushionCount],
  );

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      alert('이름을 입력해 주세요.');
      return;
    }
    if (!nickname.trim()) {
      alert('닉네임을 입력해 주세요.');
      return;
    }

    setIsProfileSaving(true);
    try {
      const updatedProfile = await updateMyProfile({
        name: name.trim(),
        nickname: nickname.trim(),
        targetCushionCount,
        ...automaticHandicaps,
      });
      onProfileUpdated(updatedProfile);
      onNotification(
        '프로필 설정 완료',
        `회원 정보가 서버에 저장되었습니다. 3구 수지 ${updatedProfile.threeBallHandicap}점, 4구 수지 ${updatedProfile.fourBallHandicap}점으로 반영했습니다.`,
      );
      onClose();
      alert('회원 정보가 수정되었습니다.');
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentPassword) {
      alert('현재 비밀번호를 입력해 주세요.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      alert('새 비밀번호를 입력해 주세요.');
      return;
    }
    if (newPassword.length < 8) {
      alert('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsPasswordChanging(true);
    try {
      await changeMyPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotification('비밀번호 변경 완료', '계정 비밀번호가 서버에 안전하게 반영되었습니다.');
      alert('비밀번호가 성공적으로 변경되었습니다.');
    } catch (error) {
      alert(getApiErrorMessage(error));
    } finally {
      setIsPasswordChanging(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="설정 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-settings-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-[#1a5d4e] bg-[#0d4d3b] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#1a5d4e] p-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Settings size={18} />
                </div>
                <div className="text-left">
                  <h2 id="account-settings-title" className="text-base font-black text-emerald-50">설정 및 마이페이지</h2>
                  <p className="font-mono text-[10px] font-semibold text-emerald-300/60">My Account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="닫기"
                className="rounded-xl p-1.5 text-emerald-100/50 transition-all hover:bg-[#1a5d4e] hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-1 border-b border-[#1a5d4e]/40 bg-[#0a3d2e]/40 p-1.5 text-[11px] font-black">
              <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>프로필 설정</TabButton>
              <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')}>비밀번호 변경</TabButton>
            </div>

            <div className="p-6">
              {activeTab === 'profile' ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <TextField label="이름" value={name} onChange={setName} maxLength={30} />
                  <TextField label="닉네임" value={nickname} onChange={setNickname} maxLength={30} />

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-black uppercase text-emerald-400">4구 마무리 기준</label>
                      <span className="rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-black text-amber-400">수지 자동 연동</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { count: 0, label: '마무리 없음' },
                        { count: 1, label: '3쿠션 1개' },
                        { count: 2, label: '3쿠션 2개' },
                      ].map(({ count, label }) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setTargetCushionCount(count)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 text-center text-xs font-black transition-all',
                            targetCushionCount === count
                              ? 'border-emerald-400 bg-emerald-500 text-[#0a3d2e] shadow-lg shadow-emerald-500/10'
                              : 'border-[#1a5d4e]/50 bg-[#1a5d4e]/30 text-emerald-100/80 hover:bg-[#1a5d4e]/50 hover:text-white',
                          )}
                        >
                          <span className="font-mono text-sm leading-none">{count}</span>
                          <span className="shrink-0 text-[9px] font-bold leading-none">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#1a5d4e]/60 bg-[#0a3d2e]/60 p-4">
                    <p className="border-b border-[#1a5d4e]/40 pb-2 text-left text-[10px] font-black text-emerald-300">최근 기록 기반 자동 수지</p>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <HandicapValue label="3구 수지" value={automaticHandicaps.threeBallHandicap} />
                      <HandicapValue label="4구 수지" value={automaticHandicaps.fourBallHandicap} accent />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProfileSaving}
                    className="w-full rounded-xl bg-emerald-500 py-3.5 text-xs font-black uppercase text-[#0a3d2e] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProfileSaving ? '프로필 저장 중...' : '프로필 저장하기'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="text-left">
                    <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-400">
                      <Shield size={12} />
                      계정 보안
                    </h3>
                  </div>
                  <PasswordField label="현재 비밀번호" value={currentPassword} onChange={setCurrentPassword} />
                  <PasswordField label="새 비밀번호" value={newPassword} onChange={setNewPassword} />
                  <PasswordField label="새 비밀번호 확인" value={confirmPassword} onChange={setConfirmPassword} />
                  <button
                    type="submit"
                    disabled={isPasswordChanging}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-[11px] font-black uppercase tracking-wider text-[#0a3d2e] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Key size={14} />
                    {isPasswordChanging ? '비밀번호 변경 중...' : '비밀번호 변경'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-center transition-all',
        active ? 'bg-emerald-500 text-[#0a3d2e] shadow' : 'text-emerald-100/60 hover:bg-[#1a5d4e]/30 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function TextField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  return (
    <div className="space-y-1 text-left">
      <label className="text-[10px] font-black uppercase text-emerald-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        className="w-full rounded-xl border border-[#1a5d4e] bg-[#1a5d4e]/50 px-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}

function PasswordField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1 text-left">
      <label className="text-[9px] font-black uppercase text-emerald-400/80">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={label === '현재 비밀번호' ? 'current-password' : 'new-password'}
        className="w-full rounded-xl border border-[#1a5d4e] bg-[#1a5d4e]/50 px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}

function HandicapValue({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="space-y-0.5">
      <span className="block text-[9px] font-semibold text-emerald-100/50">{label}</span>
      <div className="flex items-baseline gap-1 font-mono">
        <span className={cn('text-lg font-black', accent ? 'text-amber-400' : 'text-emerald-100')}>{value}</span>
        <span className="text-[10px] font-bold text-emerald-100/60">점</span>
      </div>
    </div>
  );
}
