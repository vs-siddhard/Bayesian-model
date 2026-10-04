/**
 * Unified API & Engine Service
 * Manages calls to either the client-side Bayesian engine or the external Flask REST backend.
 */

import { bayesianEngine } from './bayesianEngine';
import { DEFAULT_CSV_CONTENT } from './sampleData';
import {
  DatasetSummary,
  EvaluationResults,
  InferenceResult,
  NetworkGraphData,
} from '../types';

export type BackendMode = 'integrated' | 'flask';

class APIService {
  private mode: BackendMode = 'integrated';
  private flaskUrl: string =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
      ? window.location.origin
      : 'http://localhost:5000';
  private isInitialized: boolean = false;

  constructor() {
    this.initDefaultModel();
  }

  private getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (
      !this.flaskUrl ||
      (typeof window !== 'undefined' && this.flaskUrl === window.location.origin)
    ) {
      return cleanEndpoint;
    }
    return `${this.flaskUrl.replace(/\/$/, '')}${cleanEndpoint}`;
  }

  public initDefaultModel() {
    if (this.isInitialized) return;
    try {
      bayesianEngine.loadCSV(DEFAULT_CSV_CONTENT);
      const targetCol = 'heart_disease_risk';
      const featureCols = [
        'age',
        'smoking',
        'physical_activity',
        'hypertension',
        'cholesterol',
        'chest_pain',
        'shortness_of_breath',
        'fatigue',
        'resting_ecg',
      ];
      bayesianEngine.prepareData(targetCol, featureCols, 0.2);
      bayesianEngine.constructDAG();
      bayesianEngine.estimateParameters();
      bayesianEngine.evaluateModel();
      this.isInitialized = true;
    } catch (e) {
      console.error('Initialization error in default Bayesian model:', e);
    }
  }

  public getMode(): BackendMode {
    return this.mode;
  }

  public setMode(mode: BackendMode) {
    this.mode = mode;
  }

  public getFlaskUrl(): string {
    return this.flaskUrl;
  }

  public setFlaskUrl(url: string) {
    this.flaskUrl = url;
  }

  public async checkHealth(): Promise<{ status: string; engine: string; mode: BackendMode }> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/health'), {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const data = await res.json();
          return { status: 'healthy', engine: data.engine || 'Flask pgmpy', mode: 'flask' };
        }
      } catch (err) {
        // Fall back or report error
        return { status: 'disconnected', engine: 'Flask Backend Offline (Defaulting to Integrated)', mode: 'flask' };
      }
    }
    return {
      status: 'healthy',
      engine: 'Integrated Pure-Math Discrete Bayesian Engine (pgmpy Equivalent)',
      mode: 'integrated',
    };
  }

  public async uploadDataset(csvContent: string): Promise<{ message: string; summary: DatasetSummary }> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/dataset/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvContent }),
        });
        if (res.ok) {
          const data = await res.json();
          return { message: data.message, summary: data.summary };
        }
      } catch (err) {
        console.warn('Flask upload failed, fallback to integrated:', err);
      }
    }

    const summary = bayesianEngine.loadCSV(csvContent);
    return {
      message: 'Dataset loaded and analyzed successfully.',
      summary,
    };
  }

  public async getDatasetSummary(): Promise<DatasetSummary> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/dataset/summary'));
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Flask summary failed, using integrated engine:', err);
      }
    }

    const summary = bayesianEngine.loadCSV(DEFAULT_CSV_CONTENT);
    return summary;
  }

  public async trainModel(
    targetColumn: string,
    featureColumns: string[],
    testSize: number = 0.2
  ): Promise<{
    message: string;
    network: NetworkGraphData;
    evaluationSummary: any;
    trainingRecords: number;
    testingRecords: number;
  }> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/model/train'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetColumn, featureColumns, testSize }),
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Flask train failed, using integrated engine:', err);
      }
    }

    const { trainCount, testCount } = bayesianEngine.prepareData(targetColumn, featureColumns, testSize);
    const network = bayesianEngine.getNetworkGraphData();
    bayesianEngine.estimateParameters();
    const evalRes = bayesianEngine.evaluateModel();

    return {
      message: 'Bayesian Network successfully constructed and parameters estimated.',
      network,
      evaluationSummary: {
        accuracy: evalRes.bayesianNetwork.accuracy,
        f1Score: evalRes.bayesianNetwork.f1Score,
      },
      trainingRecords: trainCount,
      testingRecords: testCount,
    };
  }

  public async getNetwork(): Promise<NetworkGraphData> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/model/network'));
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Flask get network failed, using integrated engine:', err);
      }
    }

    return bayesianEngine.getNetworkGraphData();
  }

  public async getEvaluation(): Promise<EvaluationResults> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/model/evaluation'));
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Flask get evaluation failed, using integrated engine:', err);
      }
    }

    let evalRes = bayesianEngine.getCachedEvaluation();
    if (!evalRes) {
      evalRes = bayesianEngine.evaluateModel();
    }
    return evalRes;
  }

  public async analyzePatient(evidence: Record<string, string>): Promise<InferenceResult> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl('/api/analyze'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidence }),
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Flask inference failed, using integrated engine:', err);
      }
    }

    return bayesianEngine.infer(evidence);
  }

  public async getReport(format: 'json' | 'html' = 'json'): Promise<any> {
    if (this.mode === 'flask') {
      try {
        const res = await fetch(this.getApiUrl(`/api/report?format=${format}`));
        if (res.ok) {
          return format === 'html' ? await res.text() : await res.json();
        }
      } catch (err) {
        console.warn('Flask report failed, using integrated engine:', err);
      }
    }

    const evaluation = await this.getEvaluation();
    const network = bayesianEngine.getNetworkGraphData();

    // Default sample inference
    const sample = bayesianEngine.infer({
      age: 'High',
      smoking: 'Yes',
      hypertension: 'High',
      chest_pain: 'Typical_Angina',
    });

    return {
      title: 'Bayesian Network for Intelligent Medical Analysis',
      generatedAt: new Date().toISOString(),
      metadata: {
        targetVariable: network.targetVariable,
        totalRows: bayesianEngine.getRawData().length || 120,
        features: bayesianEngine.getFeatureVariables(),
      },
      evaluation,
      sampleInference: sample,
      disclaimer: 'Educational Decision-Support Prototype. Not for clinical diagnostic use.',
    };
  }
}

export const apiService = new APIService();
