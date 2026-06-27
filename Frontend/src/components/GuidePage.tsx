import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Target, 
  BarChart3, 
  Trophy, 
  PlusCircle, 
  CheckCircle2,
  ArrowRight,
  Users,
  Monitor
} from 'lucide-react';

export function GuidePage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-6">
            <BookOpen size={32} />
          </div>
          <h1 className="text-4xl font-bold text-zinc-900 mb-4">이용 안내</h1>
        </motion.div>

        <div className="space-y-16">
          {/* Step 1 */}
          <section className="relative pl-12 border-l-2 border-zinc-100 pb-12">
            <div className="absolute left-[-17px] top-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              1
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <PlusCircle className="text-emerald-500" />
                경기 기록 및 다마 측정
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                3구와 4구 경기를 기록하고, 이를 기반으로 자신의 실력을 수치화된 <span className="font-bold text-emerald-600">'다마'</span>로 확인하세요. 
                최근 5, 10, 20경기 데이터를 기준으로 정밀하게 산출됩니다.
              </p>
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <h3 className="font-semibold text-zinc-800 mb-3 text-sm uppercase tracking-wider">기능 특징</h3>
                <ul className="space-y-3 text-sm text-zinc-500">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>4구 세분화:</strong> 마지막 3쿠션 개수(0, 1, 2개) 설정에 따른 맞춤형 다마 제공</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>통합 데이터:</strong> 2인, 3인, 4인 경기를 통합하거나 각 경기별로 분리하여 분석 가능</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 2 */}
          <section className="relative pl-12 border-l-2 border-zinc-100 pb-12">
            <div className="absolute left-[-17px] top-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              2
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <BarChart3 className="text-emerald-500" />
                스마트 대시보드 & 분석
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                단순한 기록 저장을 넘어 데이터 기반의 인사이트를 제공합니다. 
                최근 실력 변화 추이를 통해 본인의 상태를 한눈에 파악하세요.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                  <p className="font-bold text-zinc-800 mb-1">상태 요약 시스템</p>
                  <p className="text-xs text-zinc-400">상승세, 하락세, 유지 등 현재 컨디션을 요약하여 동기부여를 제공합니다.</p>
                </div>
                <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                  <p className="font-bold text-zinc-800 mb-1">상세 그래프 분석</p>
                  <p className="text-xs text-zinc-400">다마 변화 추이와 경기별 성과를 시각화하여 슬럼프 구간을 분석합니다.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Step 3 */}
          <section className="relative pl-12 border-l-2 border-zinc-100 pb-12">
            <div className="absolute left-[-17px] top-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              3
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <Users className="text-emerald-500" />
                친구 관리 및 경쟁
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                친구와 함께 플레이하며 경쟁의 재미를 느껴보세요. 
                상대 전적 분석을 통해 필승 전략을 세울 수 있습니다.
              </p>
              <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                <ul className="space-y-3 text-sm text-zinc-500">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>1:1 경기:</strong> 승, 패, 승률 기반의 명확한 경쟁 데이터 제공</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><strong>다수 경기(3~4인):</strong> 승패 대신 순위(Rank)와 평균 등수로 실력 평가</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 4 */}
          <section className="relative pl-12 border-l-2 border-zinc-100">
            <div className="absolute left-[-17px] top-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
              4
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                <Monitor className="text-emerald-500" />
                실시간 경기 방 시스템
              </h2>
              <p className="text-zinc-600 leading-relaxed">
                실시간으로 경기를 진행하고 기록을 동시에 수행하세요. 
                초대 링크로 친구들을 간편하게 초대할 수 있습니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                  <p className="font-bold text-zinc-800 mb-1">턴 기반 점수 입력</p>
                  <p className="text-xs text-zinc-400">현재 턴인 플레이어만 점수 입력이 가능하여 데이터 충돌을 방지합니다.</p>
                </div>
                <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                  <p className="font-bold text-zinc-800 mb-1">되돌리기 기능</p>
                  <p className="text-xs text-zinc-400">실수로 입력한 점수를 되돌릴 수 있어 정확한 기록이 가능합니다.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-20 p-8 bg-zinc-900 rounded-[2.5rem] text-center text-white"
        >
          <h3 className="text-2xl font-bold mb-4">준비가 되셨나요?</h3>
          <p className="text-zinc-400 mb-8">지금 바로 첫 번째 경기를 기록하고 당신의 성장을 확인해보세요.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold transition-all"
          >
            메인으로 돌아가기
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
