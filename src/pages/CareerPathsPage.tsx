import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  DollarSign,
  ChevronRight,
  Layers,
  Compass
} from 'lucide-react';
import { TransitionRecommendation } from '../types/transitions.ts';

interface CareerPathsPageProps {
  recommendations: TransitionRecommendation[];
  onSelectPath: (rec: TransitionRecommendation) => void;
  onGenerateRoadmap: (rec: TransitionRecommendation) => void;
  onNavigate: (route: string) => void;
}

export const CareerPathsPage: React.FC<CareerPathsPageProps> = ({
  recommendations,
  onSelectPath,
  onGenerateRoadmap,
  onNavigate
}) => {
  const [selectedRecId, setSelectedRecId] = useState<string | null>(
    recommendations.length > 0 ? recommendations[0].id : null
  );

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mx-auto">
          <GitFork className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">No Transition Paths Evaluated Yet</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Confirm your profile skills to dynamically calculate realistic transition trajectories.
        </p>
        <button
          onClick={() => onNavigate('/profile')}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  // Top 3 primary recommendations
  const topPaths = recommendations.slice(0, 3);
  const selectedRec = recommendations.find(r => r.id === selectedRecId) || topPaths[0];

  return (
    <div className="space-y-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Transition Intelligence
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
              Evaluated 20 Target Roles
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Recommended Career Transition Paths
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Calculated using deterministic skill overlap, cross-domain transferability, and gap-effort optimization. Not arbitrary LLM guesses.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/command-center')}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 transition shadow-sm shrink-0"
        >
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>View 3D Topology</span>
        </button>
      </div>

      {/* Top 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topPaths.map((rec, idx) => {
          const isSelected = selectedRec.id === rec.id;
          return (
            <div
              key={rec.id}
              onClick={() => setSelectedRecId(rec.id)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative shadow-xl ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500/80 shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    Rank #{idx + 1} Pathway
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-cyan-400">
                      {rec.fitScore}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/100 Fit</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{rec.targetRole.title}</h3>
                  <span className="text-xs text-slate-400">{rec.targetRole.category} • {rec.targetRole.growthTrend}</span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {rec.targetRole.description}
                </p>

                {/* Overlap & Delta metrics */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Skill Overlap</span>
                    <span className="font-bold font-mono text-emerald-400">{rec.skillOverlapPercentage}%</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Resilience Uplift</span>
                    <span className="font-bold font-mono text-cyan-400">+{rec.projectedResilienceDelta} pts</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
                <span>Inspect Skill Gaps</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Transition Deep Dive Details */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Transition Blueprint
              </span>
              <span className="text-xs text-slate-400">• Est. {selectedRec.estimatedTransitionWeeks} Weeks Effort</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {selectedRec.targetRole.title}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {selectedRec.rationale}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onGenerateRoadmap(selectedRec);
                onNavigate('/roadmap');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition hover:scale-105"
            >
              <BookOpen className="w-4 h-4" />
              Generate 10-Week Roadmap
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Skill Gap Comparison: Already Have vs Need to Develop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Already Have */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-emerald-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Already Secured Competencies ({selectedRec.alreadyHaveSkills.length})
              </h4>
              <span className="text-[11px] font-mono text-emerald-400/80">Direct Overlap</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {selectedRec.alreadyHaveSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-950/40 border border-emerald-800/50 text-emerald-200"
                >
                  {s}
                </span>
              ))}
              {selectedRec.alreadyHaveSkills.length === 0 && (
                <p className="text-xs text-slate-500 italic">No exact core skill overlap detected.</p>
              )}
            </div>
          </div>

          {/* Need to Develop */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-amber-900/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Need to Develop ({selectedRec.needToDevelopSkills.length})
              </h4>
              <span className="text-[11px] font-mono text-amber-400/80">Targeted Upskilling</span>
            </div>

            <div className="space-y-2 pt-1">
              {selectedRec.needToDevelopSkills.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{gap.skill}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({gap.category})</span>
                    <div className="text-[11px] text-slate-400">{gap.whyNeeded}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      gap.priority === 'High'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {gap.priority} Prio
                    </span>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">~{gap.estimatedEffortWeeks} wks</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
