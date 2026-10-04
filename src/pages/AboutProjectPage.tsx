import React from 'react';
import {
  Brain,
  GitFork,
  Binary,
  Layers,
  ShieldAlert,
  BookOpen,
} from 'lucide-react';

export const AboutProjectPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-800/60 pb-3">
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>About Project & Theory</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Undergraduate AI/ML guide to Bayesian Networks, DAGs, and reasoning under clinical uncertainty.
        </p>
      </div>

      {/* 6-step pipeline */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          System Workflow Pipeline
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 font-mono text-xs">
          {[
            { step: '01', title: 'Dataset', desc: 'CSV Ingestion' },
            { step: '02', title: 'Prep', desc: 'Discretization' },
            { step: '03', title: 'DAG', desc: 'Network Design' },
            { step: '04', title: 'CPTs', desc: 'Laplace Prior' },
            { step: '05', title: 'Inference', desc: 'Var Elimination' },
            { step: '06', title: 'Validate', desc: 'Held-out Split' },
          ].map(item => (
            <div key={item.step} className="p-2.5 bg-[#070a10] rounded border border-slate-800">
              <span className="text-[10px] text-cyan-400 font-bold block">{item.step}</span>
              <span className="font-semibold text-slate-200 block text-[11px] mt-0.5">{item.title}</span>
              <span className="text-[10px] text-slate-400 block">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bayes' Theorem Breakdown */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
            Bayes' Theorem: Equation & Terms
          </h2>
        </div>

        <div className="p-4 bg-[#070a10] border border-slate-800 rounded text-center">
          <div className="text-lg md:text-xl font-mono text-cyan-300 font-bold">
            P(H | E) = [ P(E | H) × P(H) ] / P(E)
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            Posterior Belief = [ Likelihood × Prior ] / Marginal Evidence
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/70">
            <span className="font-semibold text-cyan-300 block font-mono mb-1">Prior P(H)</span>
            <p className="text-slate-400 leading-relaxed">
              Baseline prevalence of a condition in the population before observing symptoms.
            </p>
          </div>
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/70">
            <span className="font-semibold text-cyan-300 block font-mono mb-1">Likelihood P(E|H)</span>
            <p className="text-slate-400 leading-relaxed">
              Probability that symptom <em>E</em> presents given underlying disease condition <em>H</em>.
            </p>
          </div>
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/70">
            <span className="font-semibold text-cyan-300 block font-mono mb-1">Marginal P(E)</span>
            <p className="text-slate-400 leading-relaxed">
              Sum of likelihoods across all possible conditions, ensuring probabilities sum to 100%.
            </p>
          </div>
          <div className="p-3 bg-[#070a10] rounded border border-slate-800/70">
            <span className="font-semibold text-cyan-300 block font-mono mb-1">Posterior P(H|E)</span>
            <p className="text-slate-400 leading-relaxed">
              Updated clinical confidence conditioned on patient-specific evidence features.
            </p>
          </div>
        </div>
      </div>

      {/* Core Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4 space-y-2">
          <span className="font-bold text-slate-200 block flex items-center gap-1.5">
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>Directed Acyclic Graph (DAG)</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            Nodes represent random variables (features, biomarkers, disease states). Directed edges encode
            conditional independence assumptions, allowing efficient joint probability factorization.
          </p>
        </div>

        <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-4 space-y-2">
          <span className="font-bold text-slate-200 block flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Conditional Probability Tables (CPT)</span>
          </span>
          <p className="text-slate-400 leading-relaxed">
            Each node possesses a local table storing P(Node | Parents). Parameters are estimated from the
            training records using Laplace Dirichlet smoothing to avoid zero probabilities on unseen states.
          </p>
        </div>
      </div>

      {/* Ethics & Safety Notice */}
      <div className="p-4 bg-[#0b101b] border border-slate-800/70 rounded-lg flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200 block mb-0.5">Clinical Decision Support Ethics</span>
          This tool is built strictly as an educational case study prototype. All model predictions are
          preliminary probability distributions and must never substitute for licensed professional medical judgment.
        </div>
      </div>
    </div>
  );
};
