import React, { useState, useEffect } from 'react';
import { Sidebar, NavPage } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { PatientAnalysisPage } from './pages/PatientAnalysisPage';
import { BayesianNetworkPage } from './pages/BayesianNetworkPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { ModelEvaluationPage } from './pages/ModelEvaluationPage';
import { ReportsPage } from './pages/ReportsPage';
import { AboutProjectPage } from './pages/AboutProjectPage';
import { apiService, BackendMode } from './services/apiService';
import { AnalysisHistoryItem } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [backendMode, setBackendMode] = useState<BackendMode>('integrated');
  const [recentHistory, setRecentHistory] = useState<AnalysisHistoryItem[]>([]);

  useEffect(() => {
    // Initialize default model
    apiService.initDefaultModel();

    // Load initial sample patient analysis into history for demonstration
    const initialSample: AnalysisHistoryItem = {
      id: 'INF-INITIAL',
      patientName: 'Reference Case #1001 (High Cardiac Presentation)',
      targetVariable: 'heart_disease_risk',
      evidenceSupplied: {
        age: 'High',
        smoking: 'Yes',
        hypertension: 'High',
        chest_pain: 'Typical_Angina',
        resting_ecg: 'ST_T_Abnormality',
      },
      priorProbabilities: { Low: 0.35, Moderate: 0.32, High: 0.33 },
      posteriorProbabilities: { Low: 0.08, Moderate: 0.22, High: 0.70 },
      mostProbableClass: 'High',
      confidence: 0.70,
      deltas: { Low: -0.27, Moderate: -0.10, High: 0.37 },
      timestamp: 'Initial Session',
      disclaimer:
        'Educational Decision-Support Prototype. Probabilistic estimates reflect dataset distributions and do not substitute for clinical medical advice.',
    };

    setRecentHistory([initialSample]);
  }, []);

  const handleAddHistory = (item: AnalysisHistoryItem) => {
    setRecentHistory(prev => [item, ...prev].slice(0, 20));
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentMode={backendMode}
          onModeChange={setBackendMode}
          datasetName="sample_data.csv"
          totalRecords={120}
        />

        {/* Scrollable Viewport Stage */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {currentPage === 'dashboard' && (
            <DashboardPage onNavigate={setCurrentPage} recentHistory={recentHistory} />
          )}
          {currentPage === 'patient-analysis' && (
            <PatientAnalysisPage onAddHistory={handleAddHistory} />
          )}
          {currentPage === 'bayesian-network' && <BayesianNetworkPage />}
          {currentPage === 'dataset-explorer' && <DatasetExplorerPage />}
          {currentPage === 'model-evaluation' && <ModelEvaluationPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'about-project' && <AboutProjectPage />}
        </main>
      </div>
    </div>
  );
}
