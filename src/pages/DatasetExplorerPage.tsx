import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { DatasetSummary } from '../types';
import { DEFAULT_CSV_CONTENT } from '../services/sampleData';

export const DatasetExplorerPage: React.FC = () => {
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string>('heart_disease_risk');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'age',
    'smoking',
    'physical_activity',
    'hypertension',
    'cholesterol',
    'chest_pain',
    'shortness_of_breath',
    'fatigue',
    'resting_ecg',
  ]);
  const [testSplit, setTestSplit] = useState<number>(0.2);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const rowsPerPage = 8;

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDatasetSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dataset summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadStatus('Error: Only CSV files are supported.');
      return;
    }

    try {
      setLoading(true);
      const text = await file.text();
      const res = await apiService.uploadDataset(text);
      setSummary(res.summary);
      setUploadStatus(`Loaded ${file.name} (${res.summary.totalRows} records).`);

      if (res.summary.columns.length > 1) {
        const lastCol = res.summary.columns[res.summary.columns.length - 1].name;
        setSelectedTarget(lastCol);
        setSelectedFeatures(
          res.summary.columns.map(c => c.name).filter(c => c !== lastCol && c !== 'patient_id')
        );
      }
    } catch (err: any) {
      setUploadStatus(`Upload error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = (featName: string) => {
    if (selectedFeatures.includes(featName)) {
      if (selectedFeatures.length <= 2) return;
      setSelectedFeatures(selectedFeatures.filter(f => f !== featName));
    } else {
      setSelectedFeatures([...selectedFeatures, featName]);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    setUploadStatus(null);
    try {
      const res = await apiService.trainModel(selectedTarget, selectedFeatures, testSplit);
      setUploadStatus(
        `Model retrained: ${res.trainingRecords} train / ${res.testingRecords} test records.`
      );
    } catch (err: any) {
      setUploadStatus(`Retrain failed: ${err.message}`);
    } finally {
      setIsRetraining(false);
    }
  };

  const handleResetToSample = async () => {
    setLoading(true);
    const res = await apiService.uploadDataset(DEFAULT_CSV_CONTENT);
    setSummary(res.summary);
    setSelectedTarget('heart_disease_risk');
    setSelectedFeatures([
      'age',
      'smoking',
      'physical_activity',
      'hypertension',
      'cholesterol',
      'chest_pain',
      'shortness_of_breath',
      'fatigue',
      'resting_ecg',
    ]);
    setUploadStatus('Reset to default sample dataset (120 records).');
    setLoading(false);
  };

  const handleDownloadCSV = () => {
    const blob = new Blob([DEFAULT_CSV_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'medical_examination.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = (summary?.preview || []).filter(row => {
    if (!searchQuery) return true;
    return Object.values(row).some(v =>
      String(v).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
  const displayedRows = filteredRows.slice(
    (previewPage - 1) * rowsPerPage,
    previewPage * rowsPerPage
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Dataset Explorer & Preprocessing</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect data records, column distributions, and configure Bayesian variables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToSample}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Sample</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className="px-2.5 py-1.5 rounded bg-[#0b101b] border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Simple Upload & Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Dropzone (1 col) */}
        <div className="border border-dashed border-slate-800 hover:border-cyan-500/40 rounded-lg p-5 bg-[#0b101b] text-center relative flex flex-col justify-center items-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Upload className="w-6 h-6 text-cyan-400 mb-2" />
          <span className="text-xs font-semibold text-slate-200 block">Upload CSV File</span>
          <span className="text-[11px] text-slate-400 block mt-1">
            Drop medical dataset here or click to browse
          </span>
        </div>

        {/* Retrain Controls (2 cols) */}
        <div className="md:col-span-2 bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Bayesian Feature Selection
            </span>
            <button
              onClick={handleRetrain}
              disabled={isRetraining}
              className="px-3 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRetraining ? 'animate-spin' : ''}`} />
              <span>{isRetraining ? 'Fitting...' : 'Retrain Network'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Target Variable</label>
              <select
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
                className="w-full bg-[#070a10] border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {summary?.columns.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Test Ratio: <span className="text-cyan-300 font-mono">{Math.round(testSplit * 100)}%</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.05"
                value={testSplit}
                onChange={e => setTestSplit(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 mt-1"
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">Active Network Predictors:</span>
            <div className="flex flex-wrap gap-1.5">
              {summary?.columns
                .filter(c => c.name !== selectedTarget && c.name !== 'patient_id')
                .map(c => {
                  const isChecked = selectedFeatures.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      onClick={() => handleToggleFeature(c.name)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        isChecked
                          ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300'
                          : 'bg-[#070a10] border-slate-800 text-slate-400'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {c.name}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div className="p-2.5 bg-[#0b101b] border border-slate-800 rounded text-xs font-mono text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Dataset Preview Table */}
      <div className="bg-[#0b101b] border border-slate-800/70 rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Dataset Records
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Total: {summary?.totalRows} rows · {summary?.totalColumns} columns
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPreviewPage(1);
              }}
              className="bg-[#070a10] border border-slate-800 rounded pl-8 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070a10] text-slate-400 border-b border-slate-800">
              <tr>
                {summary?.columns.map(c => (
                  <th key={c.name} className="py-2 px-3 font-normal whitespace-nowrap">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {displayedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40">
                  {summary?.columns.map(c => (
                    <td key={c.name} className="py-2 px-3 whitespace-nowrap">
                      {row[c.name] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
          <span>
            Page {previewPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
              disabled={previewPage <= 1}
              className="p-1 rounded bg-[#070a10] border border-slate-800 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
              disabled={previewPage >= totalPages}
              className="p-1 rounded bg-[#070a10] border border-slate-800 hover:bg-slate-800 disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
