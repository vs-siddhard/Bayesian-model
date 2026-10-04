import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { apiService } from '../services/apiService';
import { EvaluationResults } from '../types';

export const ModelEvaluationPage: React.FC = () => {
  const [evaluation, setEvaluation] = useState<EvaluationResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEval = async () => {
      try {
        const data = await apiService.getEvaluation();
        setEvaluation(data);
      } catch (err) {
        console.error('Failed to load evaluation metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEval();
  }, []);

  if (loading || !evaluation) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-mono">
        Loading model evaluation metrics...
      </div>
    );
  }

  const bn = evaluation.bayesianNetwork;
  const base = evaluation.baseline;
  const classes = evaluation.classes;

  const comparisonData = [
    {
      metric: 'Accuracy',
      'Bayesian Network': Math.round(bn.accuracy * 1000) / 10,
      'Baseline (Decision Tree)': Math.round(base.accuracy * 1000) / 10,
    },
    {
      metric: 'Precision (W)',
      'Bayesian Network': Math.round(bn.precision * 1000) / 10,
      'Baseline (Decision Tree)': Math.round(base.precision * 1000) / 10,
    },
    {
      metric: 'Recall (W)',
      'Bayesian Network': Math.round(bn.recall * 1000) / 10,
      'Baseline (Decision Tree)': Math.round(base.recall * 1000) / 10,
    },
    {
      metric: 'F1-Score',
      'Bayesian Network': Math.round(bn.f1Score * 1000) / 10,
      'Baseline (Decision Tree)': Math.round(base.f1Score * 1000) / 10,
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <LineChartIcon className="w-4 h-4 text-cyan-400" />
            <span>Model Evaluation & Baseline Benchmark</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical validation on held-out test data (seed=42) against standard Decision Tree classifier.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>{evaluation.trainSampleSize} Train</span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400 font-semibold">{evaluation.testSampleSize} Test (20%)</span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">ACCURACY</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums mt-1">
            {(bn.accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Baseline: {(base.accuracy * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">PRECISION (WEIGHTED)</div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-1">
            {(bn.precision * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Low false discovery
          </div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">RECALL (SENSITIVITY)</div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-1">
            {(bn.recall * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            True positive capture
          </div>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4">
          <div className="text-[11px] font-mono text-slate-400">F1-SCORE</div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-1">
            {(bn.f1Score * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Harmonic balance
          </div>
        </div>
      </div>

      {/* Benchmark Chart & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comparison Chart (6 cols) */}
        <div className="lg:col-span-6 bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Comparative Performance
              </h2>
              <p className="text-xs text-slate-400">Bayesian Network vs Decision Tree</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Test Split</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#1e293b',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, '']}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  formatter={val => <span className="text-xs text-slate-300 font-mono">{val}</span>}
                />
                <Bar dataKey="Bayesian Network" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Baseline (Decision Tree)" fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix (6 cols) */}
        <div className="lg:col-span-6 bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Confusion Matrix
              </h2>
              <p className="text-xs text-slate-400">Actual vs Predicted target classes</p>
            </div>
            <span className="text-xs font-mono text-slate-400">N={evaluation.testSampleSize}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="p-2 text-left font-normal text-slate-500">True \ Pred</th>
                  {classes.map(c => (
                    <th key={c} className="p-2 font-normal text-slate-300">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {classes.map((trueClass, rowIdx) => (
                  <tr key={trueClass}>
                    <td className="p-2 text-left font-semibold text-slate-300 bg-[#070a10]">
                      {trueClass}
                    </td>
                    {classes.map((predClass, colIdx) => {
                      const count = bn.confusionMatrix[rowIdx]?.[colIdx] ?? 0;
                      const isDiagonal = rowIdx === colIdx;
                      return (
                        <td
                          key={predClass}
                          className={`p-2.5 font-bold tabular-nums text-sm ${
                            isDiagonal
                              ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-800/40'
                              : count > 0
                              ? 'bg-rose-950/30 text-rose-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-cyan-400"></span> Correct Classifications
            </span>
            <span>Accuracy: {(bn.accuracy * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Per-Class Report Table */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono mb-3">
          Per-Class Detailed Report
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070a10] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 px-3 font-normal">Class</th>
                <th className="py-2 px-3 font-normal">Precision</th>
                <th className="py-2 px-3 font-normal">Recall</th>
                <th className="py-2 px-3 font-normal">F1-Score</th>
                <th className="py-2 px-3 font-normal">Support</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {bn.perClassReport?.map(row => (
                <tr key={row.className} className="hover:bg-slate-900/40">
                  <td className="py-2 px-3 font-bold text-slate-200">{row.className}</td>
                  <td className="py-2 px-3 tabular-nums">{(row.precision * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3 tabular-nums">{(row.recall * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3 tabular-nums text-cyan-300 font-semibold">
                    {(row.f1 * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-slate-400">{row.support}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3.5 bg-[#0b101b] border border-slate-800/70 rounded-lg flex items-center gap-2.5 text-xs text-slate-400">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Academic Evaluation Disclaimer: Metrics reflect algorithmic reasoning on the partitioned dataset and do not imply certified clinical diagnostic validation.
        </span>
      </div>
    </div>
  );
};
