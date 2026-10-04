import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { apiService } from '../services/apiService';

export const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await apiService.getReport('json');
      setReportData(data);
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadHTML = async () => {
    try {
      const htmlText = await apiService.getReport('html');
      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bayesian_medical_report.html');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bayesian_metrics.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (!reportData?.evaluation) return;
    const bn = reportData.evaluation.bayesianNetwork;
    const rows = [
      ['Metric', 'Value'],
      ['Model', bn.name],
      ['Accuracy', bn.accuracy],
      ['Precision_Weighted', bn.precision],
      ['Recall_Weighted', bn.recall],
      ['F1_Score', bn.f1Score],
      ['Test_Samples', reportData.evaluation.testSampleSize],
      ['Train_Samples', reportData.evaluation.trainSampleSize],
    ];

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'model_evaluation.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !reportData) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-mono">
        Compiling report...
      </div>
    );
  }

  const bn = reportData.evaluation?.bayesianNetwork || {};
  const base = reportData.evaluation?.baseline || {};
  const samplePost = reportData.sampleInference?.posteriorProbabilities || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3 print:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Case Study Report & Export</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal document of model parameters, DAG architecture, and held-out empirical evaluation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadHTML}
            className="px-3 py-1.5 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download HTML</span>
          </button>
          <button
            onClick={() => window.print()}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <span>CSV</span>
          </button>
          <button
            onClick={handleDownloadJSON}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Clean Document Container */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-8 space-y-6 text-xs text-slate-300 leading-relaxed print:bg-white print:text-black print:p-0 print:border-none">
        <div className="border-b border-slate-800 pb-4">
          <span className="text-[11px] font-mono text-cyan-400 block mb-1">
            UNDERGRADUATE AI & ML CASE STUDY
          </span>
          <h2 className="text-xl font-bold text-slate-100 print:text-black">
            Bayesian Network for Intelligent Medical Analysis
          </h2>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono mt-2">
            <span>Generated: {new Date(reportData.generatedAt).toLocaleDateString()}</span>
            <span>·</span>
            <span>Target: {reportData.metadata?.targetVariable}</span>
            <span>·</span>
            <span>N = {reportData.metadata?.totalRows} Records</span>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-1.5">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            1. Problem Statement & Educational Purpose
          </h3>
          <p className="text-slate-400">
            Medical diagnosis is intrinsically probabilistic. This project demonstrates how a Directed
            Acyclic Graph (DAG) factorizes joint probability and updates diagnostic beliefs using Bayes'
            theorem, providing explainable decisions without black-box opacity.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            2. Mathematical Foundation
          </h3>
          <p className="text-slate-400">
            The joint distribution is factorized via conditional independence:
          </p>
          <div className="p-3 bg-[#070a10] font-mono text-cyan-300 rounded border border-slate-800/70 print:bg-slate-100 print:text-black">
            P(X₁, X₂, ..., Xₙ) = ∏ P(Xᵢ | Parents(Xᵢ))
          </div>
          <p className="text-slate-400">Posterior belief given evidence:</p>
          <div className="p-3 bg-[#070a10] font-mono text-cyan-300 rounded border border-slate-800/70 print:bg-slate-100 print:text-black">
            P(H | E) = [ P(E | H) × P(H) ] / ∑ₖ [ P(E | Hₖ) × P(Hₖ) ]
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            3. Evaluation Results on Held-Out Test Data
          </h3>
          <table className="w-full text-left font-mono border border-slate-800">
            <thead className="bg-[#070a10] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2 font-normal">Model</th>
                <th className="p-2 font-normal">Accuracy</th>
                <th className="p-2 font-normal">Precision (W)</th>
                <th className="p-2 font-normal">Recall (W)</th>
                <th className="p-2 font-normal">F1-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="p-2 font-bold text-cyan-300">Bayesian Network (Variable Elimination)</td>
                <td className="p-2">{(bn.accuracy * 100).toFixed(1)}%</td>
                <td className="p-2">{(bn.precision * 100).toFixed(1)}%</td>
                <td className="p-2">{(bn.recall * 100).toFixed(1)}%</td>
                <td className="p-2">{(bn.f1Score * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td className="p-2 text-slate-400">Baseline (Decision Tree)</td>
                <td className="p-2">{(base.accuracy * 100).toFixed(1)}%</td>
                <td className="p-2">{(base.precision * 100).toFixed(1)}%</td>
                <td className="p-2">{(base.recall * 100).toFixed(1)}%</td>
                <td className="p-2">{(base.f1Score * 100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider font-mono text-[11px]">
            4. Sample Clinical Posterior Inference
          </h3>
          <div className="grid grid-cols-3 gap-3 font-mono">
            {Object.entries(samplePost).map(([state, prob]: [string, any]) => (
              <div key={state} className="p-3 bg-[#070a10] rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">{state} Risk</span>
                <span className="text-base font-bold text-cyan-300">{(prob * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 */}
        <section className="p-3.5 bg-amber-950/20 border border-amber-900/40 rounded flex items-start gap-2 text-amber-300/90 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong>Educational Disclaimer:</strong> This application is a decision-support prototype
            developed for academic machine learning demonstrations and is not an FDA-cleared diagnostic device.
          </div>
        </section>
      </div>
    </div>
  );
};
