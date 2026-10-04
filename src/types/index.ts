export interface PatientRecord {
  patient_id?: string;
  [key: string]: any;
}

export interface ColumnDetail {
  name: string;
  type: 'numeric' | 'categorical';
  dtype: string;
  missingCount: number;
  uniqueCount: number;
  sampleValues: string[];
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
}

export interface DatasetSummary {
  totalRows: number;
  totalColumns: number;
  numericColumns: string[];
  categoricalColumns: string[];
  columns: ColumnDetail[];
  preview: Record<string, any>[];
  missingSummary: Record<string, number>;
}

export interface NetworkNode {
  id: string;
  label: string;
  category: 'Risk Factor' | 'Physiological Marker' | 'Symptom / Clinical Sign' | 'Target Condition' | 'Predictor Feature';
  isTarget: boolean;
  parents: string[];
  children: string[];
  inDegree: number;
  outDegree: number;
  states: string[];
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface CPTData {
  variable: string;
  evidence: string[];
  values: number[] | number[][] | number[][][];
  state_names: Record<string, string[]>;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  targetVariable: string;
  cpts: Record<string, CPTData>;
}

export interface ClassMetrics {
  className: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelMetrics {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  perClassReport?: ClassMetrics[];
}

export interface EvaluationResults {
  testSampleSize: number;
  trainSampleSize: number;
  classes: string[];
  bayesianNetwork: ModelMetrics;
  baseline: ModelMetrics;
  evaluationNotes: string;
}

export interface InferenceResult {
  targetVariable: string;
  evidenceSupplied: Record<string, string>;
  priorProbabilities: Record<string, number>;
  posteriorProbabilities: Record<string, number>;
  mostProbableClass: string;
  confidence: number;
  deltas: Record<string, number>;
  timestamp?: string;
  disclaimer: string;
}

export interface AnalysisHistoryItem extends InferenceResult {
  id: string;
  patientName?: string;
  notes?: string;
}
