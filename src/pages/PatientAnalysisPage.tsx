import React, { useState, useEffect } from 'react';
import {
  Activity,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
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
import { InferenceResult, AnalysisHistoryItem } from '../types';

interface PatientAnalysisPageProps {
  onAddHistory: (item: AnalysisHistoryItem) => void;
}

export const PatientAnalysisPage: React.FC<PatientAnalysisPageProps> = ({ onAddHistory }) => {
  const [evidence, setEvidence] = useState<Record<string, string>>({
    age: 'High',
    smoking: 'Yes',
    physical_activity: 'Low',
    hypertension: 'High',
    cholesterol: 'High',
    chest_pain: 'Typical_Angina',
    shortness_of_breath: 'Severe',
    fatigue: 'Severe',
    resting_ecg: 'ST_T_Abnormality',
  });

  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    handleRunInference(evidence);
  }, []);

  const handleRunInference = async (currentEvidence: Record<string, string>) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiService.analyzePatient(currentEvidence);
      setInferenceResult(res);

      const historyItem: AnalysisHistoryItem = {
        ...res,
        id: `INF-${Date.now()}`,
        patientName: `Patient Record #${Math.floor(1000 + Math.random() * 9000)}`,
      };
      onAddHistory(historyItem);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to compute Bayesian inference.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEvidence(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    const baseline: Record<string, string> = {
      age: 'Normal',
      smoking: 'No',
      physical_activity: 'Moderate',
      hypertension: 'Normal',
      cholesterol: 'Normal',
      chest_pain: 'None',
      shortness_of_breath: 'No',
      fatigue: 'Normal',
      resting_ecg: 'Normal',
    };
    setEvidence(baseline);
    handleRunInference(baseline);
  };

  const loadArchetype = (type: 'high' | 'moderate' | 'low') => {
    let preset: Record<string, string> = {};
    if (type === 'high') {
      preset = {
        age: 'High',
        smoking: 'Yes',
        physical_activity: 'Low',
        hypertension: 'High',
        cholesterol: 'High',
        chest_pain: 'Typical_Angina',
        shortness_of_breath: 'Severe',
        fatigue: 'Severe',
        resting_ecg: 'Hypertrophy',
      };
    } else if (type === 'low') {
      preset = {
        age: 'Low',
        smoking: 'No',
        physical_activity: 'High',
        hypertension: 'Normal',
        cholesterol: 'Normal',
        chest_pain: 'None',
        shortness_of_breath: 'No',
        fatigue: 'Normal',
        resting_ecg: 'Normal',
      };
    } else {
      preset = {
        age: 'Normal',
        smoking: 'Yes',
        physical_activity: 'Moderate',
        hypertension: 'High',
        cholesterol: 'Borderline',
        chest_pain: 'Atypical',
        shortness_of_breath: 'Mild',
        fatigue: 'Elevated',
        resting_ecg: 'Normal',
      };
    }
    setEvidence(preset);
    handleRunInference(preset);
  };

  const chartData = inferenceResult
    ? Object.keys(inferenceResult.posteriorProbabilities).map(state => {
        const prior = (inferenceResult.priorProbabilities[state] || 0) * 100;
        const posterior = (inferenceResult.posteriorProbabilities[state] || 0) * 100;
        return {
          state,
          Prior: Math.round(prior * 10) / 10,
          Posterior: Math.round(posterior * 10) / 10,
          delta: Math.round((posterior - prior) * 10) / 10,
        };
      })
    : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Simple Header with Preset Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Patient Analysis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bayesian Variable Elimination calculates posterior distribution P(Target | Evidence).
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b101b] p-1 rounded-md border border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400 px-2">Presets:</span>
          <button
            onClick={() => loadArchetype('high')}
            className="px-2.5 py-1 text-xs rounded font-medium bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 transition-colors"
          >
            Acute High Risk
          </button>
          <button
            onClick={() => loadArchetype('moderate')}
            className="px-2.5 py-1 text-xs rounded font-medium bg-amber-950/60 text-amber-300 hover:bg-amber-900/60 transition-colors"
          >
            Moderate Case
          </button>
          <button
            onClick={() => loadArchetype('low')}
            className="px-2.5 py-1 text-xs rounded font-medium bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
          >
            Healthy Baseline
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (5 cols) */}
        <div className="lg:col-span-5 bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Clinical Evidence Intake
            </h2>
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              handleRunInference(evidence);
            }}
            className="space-y-3.5 text-xs"
          >
            {/* Risk factors */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">
                1. DEMOGRAPHICS & HABITS
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Age</label>
                  <select
                    value={evidence.age || 'Normal'}
                    onChange={e => handleFieldChange('age', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Low">Young (&lt;40 yrs)</option>
                    <option value="Normal">Middle-Aged (40-60)</option>
                    <option value="High">Senior (&gt;60 yrs)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Smoking</label>
                  <select
                    value={evidence.smoking || 'No'}
                    onChange={e => handleFieldChange('smoking', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes (Smoker)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Physical Activity</label>
                <select
                  value={evidence.physical_activity || 'Moderate'}
                  onChange={e => handleFieldChange('physical_activity', e.target.value)}
                  className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Low">Low / Sedentary</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High Regular</option>
                </select>
              </div>
            </div>

            {/* Vitals */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">
                2. PHYSIOLOGICAL VITALS
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Hypertension</label>
                  <select
                    value={evidence.hypertension || 'Normal'}
                    onChange={e => handleFieldChange('hypertension', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High Blood Pressure</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Cholesterol</label>
                  <select
                    value={evidence.cholesterol || 'Normal'}
                    onChange={e => handleFieldChange('cholesterol', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Normal">Normal (&lt;200)</option>
                    <option value="Borderline">Borderline</option>
                    <option value="High">High (&ge;240)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Symptoms */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-cyan-400 font-semibold block">
                3. MANIFESTING SYMPTOMS
              </span>
              <div>
                <label className="text-slate-300 block mb-1">Chest Pain</label>
                <select
                  value={evidence.chest_pain || 'None'}
                  onChange={e => handleFieldChange('chest_pain', e.target.value)}
                  className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="None">None (Asymptomatic)</option>
                  <option value="Atypical">Atypical Pain</option>
                  <option value="Typical_Angina">Typical Substernal Angina</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Shortness of Breath</label>
                  <select
                    value={evidence.shortness_of_breath || 'No'}
                    onChange={e => handleFieldChange('shortness_of_breath', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="No">No</option>
                    <option value="Mild">Mild</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Fatigue</label>
                  <select
                    value={evidence.fatigue || 'Normal'}
                    onChange={e => handleFieldChange('fatigue', e.target.value)}
                    className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Elevated">Elevated</option>
                    <option value="Severe">Severe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Resting ECG</label>
                <select
                  value={evidence.resting_ecg || 'Normal'}
                  onChange={e => handleFieldChange('resting_ecg', e.target.value)}
                  className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Normal">Normal Waveforms</option>
                  <option value="ST_T_Abnormality">ST-T Abnormality</option>
                  <option value="Hypertrophy">Hypertrophy</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2 px-4 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{loading ? 'Calculating...' : 'Run Bayesian Inference'}</span>
            </button>
          </form>
        </div>

        {/* Right: Output Probabilities (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded text-xs">
              {errorMessage}
            </div>
          )}

          {inferenceResult ? (
            <>
              {/* Primary Output Classification Card */}
              <div
                className={`p-5 rounded-lg border ${
                  inferenceResult.mostProbableClass === 'High'
                    ? 'bg-[#150a0d] border-rose-900/60'
                    : inferenceResult.mostProbableClass === 'Moderate'
                    ? 'bg-[#151007] border-amber-900/60'
                    : 'bg-[#07130e] border-emerald-900/60'
                }`}
              >
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  POSTERIOR INFERENCE RESULT
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold text-slate-100">
                    {inferenceResult.mostProbableClass} Risk
                  </div>
                  <div className="text-xl font-mono font-bold text-cyan-300 tabular-nums">
                    {(inferenceResult.confidence * 100).toFixed(1)}% Belief
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Conditional belief distribution calculated using Bayes' theorem across all 9
                  supplied evidence variables.
                </p>
              </div>

              {/* Prior vs Posterior Comparison Chart */}
              <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Prior vs Posterior Belief Shift
                    </h3>
                    <p className="text-xs text-slate-400">Baseline population prior vs evidence-conditioned posterior</p>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">Bayesian Updating</span>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <XAxis dataKey="state" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit="%" domain={[0, 100]} />
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
                      <Bar dataKey="Prior" name="Prior P(H)" fill="#475569" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Posterior" name="Posterior P(H|E)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Metric Delta Strip */}
                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-800">
                  {chartData.map(c => {
                    const isPositive = c.delta >= 0;
                    return (
                      <div key={c.state} className="bg-[#070a10] p-2 rounded border border-slate-800/70 text-center">
                        <div className="text-[11px] text-slate-400 font-mono">{c.state}</div>
                        <div className="text-sm font-mono font-bold text-slate-100 tabular-nums">
                          {c.Posterior}%
                        </div>
                        <div
                          className={`text-[10px] font-mono ${
                            isPositive ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {c.delta}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explainability Summary */}
              <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4 space-y-2 text-xs">
                <span className="font-semibold text-slate-200 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Explainability Analysis</span>
                </span>
                <p className="text-slate-400 leading-relaxed">
                  Supplied symptoms (<code className="text-cyan-300">{evidence.chest_pain}</code>,{' '}
                  <code className="text-cyan-300">{evidence.resting_ecg}</code>) and physiological factors
                  shifted the prior probability mass toward{' '}
                  <strong className="text-slate-200">{inferenceResult.mostProbableClass} Risk</strong>.
                </p>
                <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded text-[11px] text-amber-300/90 leading-relaxed">
                  {inferenceResult.disclaimer}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-[#0b101b] rounded-lg border border-slate-800">
              Loading inference engine...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
