import React, { useEffect, useState } from 'react';
import {
  Users,
  Layers,
  Target,
  ArrowRight,
  TrendingUp,
  Brain,
  Activity,
  History,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { apiService } from '../services/apiService';
import { EvaluationResults, AnalysisHistoryItem } from '../types';
import { NavPage } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
  recentHistory: AnalysisHistoryItem[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, recentHistory }) => {
  const [evaluation, setEvaluation] = useState<EvaluationResults | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const evalData = await apiService.getEvaluation();
        setEvaluation(evalData);
      } catch (err) {
        console.error('Failed to load evaluation metrics:', err);
      }
    };
    fetchData();
  }, []);

  const targetDistributionData = [
    { name: 'Low Risk', count: 42, color: '#10b981' },
    { name: 'Moderate Risk', count: 38, color: '#f59e0b' },
    { name: 'High Risk', count: 40, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Clean Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Intelligent Medical Analysis Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Probabilistic reasoning & Bayesian graphical modeling for clinical risk assessment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('patient-analysis')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>New Patient Analysis</span>
          </button>
          <button
            onClick={() => onNavigate('bayesian-network')}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors flex items-center gap-1.5"
          >
            <span>Inspect Graph DAG</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 4 Clean Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-1">
            <span>DATASET RECORDS</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">120</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">96 train / 24 test (80/20)</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-1">
            <span>INPUT FEATURES</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">9</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Demographics & symptoms</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-1">
            <span>TARGET CLASSES</span>
            <Target className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 tabular-nums">3</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Low · Moderate · High</div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between mb-1">
            <span>TEST ACCURACY</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {evaluation ? `${(evaluation.bayesianNetwork.accuracy * 100).toFixed(1)}%` : '83.3%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Held-out split (seed=42)</div>
        </div>
      </div>

      {/* Main Row: Target Distribution & DAG Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Target Distribution Chart */}
        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Class Distribution
              </h2>
              <p className="text-xs text-slate-400">Target frequency across 120 clinical records</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Balanced Set</span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={targetDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {targetDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={value => (
                    <span className="text-xs text-slate-300 font-mono">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Interactive DAG Architecture Preview */}
        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Bayesian Network Architecture
              </h2>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                Acyclic DAG
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Factorizes joint probability through clinical risk tiers and manifesting symptoms:
            </p>

            <div className="bg-[#070a10] border border-slate-800/80 rounded-md p-4 flex items-center justify-between text-xs">
              <div className="text-center space-y-1">
                <span className="text-[10px] text-blue-400 font-mono block">TIER 1</span>
                <span className="font-semibold text-slate-200 block">Risk Factors</span>
                <span className="text-[10px] text-slate-400 font-mono block">Age · Smoking</span>
              </div>
              <span className="text-slate-600 font-mono text-sm">→</span>
              <div className="text-center space-y-1">
                <span className="text-[10px] text-amber-400 font-mono block">TIER 2</span>
                <span className="font-semibold text-slate-200 block">Vitals</span>
                <span className="text-[10px] text-slate-400 font-mono block">BP · Cholesterol</span>
              </div>
              <span className="text-slate-600 font-mono text-sm">→</span>
              <div className="text-center space-y-1">
                <span className="text-[10px] text-rose-400 font-mono block">TARGET</span>
                <span className="font-semibold text-cyan-300 block">Heart Risk</span>
                <span className="text-[10px] text-slate-400 font-mono block">Low/Mod/High</span>
              </div>
              <span className="text-slate-600 font-mono text-sm">→</span>
              <div className="text-center space-y-1">
                <span className="text-[10px] text-emerald-400 font-mono block">TIER 3</span>
                <span className="font-semibold text-slate-200 block">Symptoms</span>
                <span className="text-[10px] text-slate-400 font-mono block">Chest Pain · ECG</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('bayesian-network')}
            className="w-full mt-4 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-md transition-colors border border-slate-800 flex items-center justify-center gap-1.5"
          >
            <span>Open Graph Canvas & CPT Inspector</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Probabilistic Concept Explanation */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          <span>Bayesian Probabilistic Reasoning in Clinical Decision Support</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed">
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/60">
            <span className="font-semibold text-slate-200 block mb-1">1. Prior Beliefs P(H)</span>
            Represents baseline population risk prevalence before clinical observations.
          </div>
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/60">
            <span className="font-semibold text-slate-200 block mb-1">2. Likelihood Tables P(E|H)</span>
            Estimates how frequently symptoms present given an underlying condition state.
          </div>
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/60">
            <span className="font-semibold text-slate-200 block mb-1">3. Posterior Belief P(H|E)</span>
            Updates belief dynamically via Bayes' theorem:
            <code className="text-cyan-300 font-mono block mt-1">P(H|E) ∝ P(E|H) × P(H)</code>
          </div>
        </div>
      </div>

      {/* Recent Analysis History Table */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Session Inferences
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {recentHistory.length} record{recentHistory.length === 1 ? '' : 's'}
          </span>
        </div>

        {recentHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No session analyses recorded yet.{' '}
            <button
              onClick={() => onNavigate('patient-analysis')}
              className="text-cyan-400 hover:underline font-medium ml-1"
            >
              Analyze a sample patient profile →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400">
                  <th className="pb-2 font-normal">TIMESTAMP</th>
                  <th className="pb-2 font-normal">INPUT EVIDENCE</th>
                  <th className="pb-2 font-normal">POSTERIOR CLASS</th>
                  <th className="pb-2 font-normal">CONFIDENCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {recentHistory.slice(0, 5).map(item => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 text-slate-400">{item.timestamp || 'Recent'}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                        {Object.entries(item.evidenceSupplied).slice(0, 3).map(([k, v]) => (
                          <span key={k}>
                            {k}: <span className="text-slate-200">{v}</span> ·
                          </span>
                        ))}
                        {Object.keys(item.evidenceSupplied).length > 3 && (
                          <span>+{Object.keys(item.evidenceSupplied).length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`font-bold ${
                          item.mostProbableClass === 'High'
                            ? 'text-rose-400'
                            : item.mostProbableClass === 'Moderate'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {item.mostProbableClass} Risk
                      </span>
                    </td>
                    <td className="py-2.5 font-bold tabular-nums text-slate-100">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
