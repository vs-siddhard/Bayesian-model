import React, { useState, useEffect } from 'react';
import { Server, Cpu, CheckCircle2, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { apiService, BackendMode } from '../services/apiService';

interface HeaderProps {
  currentMode: BackendMode;
  onModeChange: (mode: BackendMode) => void;
  datasetName?: string;
  totalRecords?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  datasetName = 'sample_data.csv',
  totalRecords = 120,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [flaskUrl, setFlaskUrl] = useState(apiService.getFlaskUrl());
  const [healthStatus, setHealthStatus] = useState<{ status: string; engine: string; mode: BackendMode } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    checkHealth();
  }, [currentMode]);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await apiService.checkHealth();
      setHealthStatus(res);
    } catch {
      setHealthStatus({ status: 'error', engine: 'Offline', mode: currentMode });
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggleMode = (newMode: BackendMode) => {
    apiService.setMode(newMode);
    onModeChange(newMode);
    if (newMode === 'flask') {
      setShowConfig(true);
    }
  };

  const handleSaveFlaskUrl = () => {
    apiService.setFlaskUrl(flaskUrl);
    checkHealth();
  };

  const psCommand = `.\\venv\\Scripts\\Activate.ps1; python backend\\app.py`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(psCommand);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const isFlaskHealthy = currentMode === 'flask' && healthStatus?.status === 'healthy';

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-20">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold tracking-tight text-slate-100 font-sans">
          Bayesian Network for Intelligent Medical Analysis
        </span>
      </div>

      {/* Zone 2: Clean unboxed metadata indicators with typographic separators */}
      <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
        <span className="text-slate-300">{datasetName}</span>
        <span aria-hidden="true">·</span>
        <span>{totalRecords} records</span>
        <span aria-hidden="true">·</span>
        <span className="text-cyan-400">pgmpy-compatible DAG</span>
        <span aria-hidden="true">·</span>
        <span>Laplace Estimation</span>
      </div>

      {/* Zone 3: 1-2 primary actions - Engine switch & status */}
      <div className="flex items-center gap-3 relative">
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium">
          <button
            onClick={() => handleToggleMode('integrated')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              currentMode === 'integrated'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Pure mathematical in-browser Bayesian engine with Variable Elimination"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Browser Engine</span>
          </button>

          <button
            onClick={() => {
              handleToggleMode('flask');
              setShowConfig(!showConfig);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
              currentMode === 'flask'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Connect to local Python Flask REST API server (localhost:5000)"
          >
            <Server className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Flask (5000)</span>
          </button>
        </div>

        {/* Status Dot with explicit label */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              currentMode === 'integrated' || isFlaskHealthy
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          ></span>
          <span
            className={`font-medium hidden sm:inline ${
              currentMode === 'integrated' || isFlaskHealthy ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {currentMode === 'integrated'
              ? 'Active'
              : isFlaskHealthy
              ? 'Flask Online'
              : 'Flask Standby'}
          </span>
        </div>

        {/* Flask Configuration Popover */}
        {showConfig && (
          <div className="absolute right-0 top-12 w-96 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-5 z-50 text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>Python Flask REST Backend</span>
              </span>
              <button
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Connection Status:</span>
                <span
                  className={
                    isFlaskHealthy ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                  }
                >
                  {isFlaskHealthy ? 'CONNECTED (HTTP 200)' : 'NOT CONNECTED (USING FALLBACK)'}
                </span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Engine: {healthStatus?.engine || 'Checking...'}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 font-mono block text-[11px]">Flask Host URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={flaskUrl}
                  onChange={e => setFlaskUrl(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="http://localhost:5000"
                />
                <button
                  onClick={handleSaveFlaskUrl}
                  disabled={isChecking}
                  className="px-3 py-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-500 font-medium flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>Ping</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-slate-300 font-medium block">
                Launch Backend in Windows PowerShell:
              </span>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-cyan-300 flex items-center justify-between gap-2">
                <code className="truncate">{psCommand}</code>
                <button
                  onClick={copyToClipboard}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 shrink-0"
                  title="Copy Command"
                >
                  {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Or run <code className="text-slate-400 font-mono">.\run_backend.ps1</code> from the project root.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

