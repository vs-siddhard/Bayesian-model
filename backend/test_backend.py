"""
Automated Verification & Test Script for Bayesian Network Backend
Runs verification tests across data processing, DAG validity, CPT estimation,
Variable Elimination posterior inference, held-out evaluation, and Flask endpoints.

Usage:
    python backend/test_backend.py
"""

import sys
import os
import unittest
import numpy as np
import pandas as pd

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_processor import MedicalDataProcessor
from bayesian_model import MedicalBayesianNetwork
from evaluation import BayesianModelEvaluator
from report_generator import MedicalReportGenerator
from app import app


class TestMedicalBayesianBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample_path = os.path.join(os.path.dirname(__file__), "sample_data.csv")
        cls.processor = MedicalDataProcessor()
        cls.df = cls.processor.load_csv_file(cls.sample_path)
        cls.target_col = "heart_disease_risk"
        cls.feature_cols = [
            "age",
            "smoking",
            "physical_activity",
            "hypertension",
            "cholesterol",
            "chest_pain",
            "shortness_of_breath",
            "fatigue",
            "resting_ecg",
        ]

    def test_01_dataset_loading_and_summary(self):
        """Test dataset loading and column statistics."""
        summary = self.processor.get_dataset_summary()
        self.assertGreater(summary["totalRows"], 0, "Dataset should have rows")
        self.assertGreaterEqual(summary["totalColumns"], 10, "Dataset should have all clinical features")
        self.assertIn("heart_disease_risk", [c["name"] for c in summary["columns"]])
        print("✓ Test 1 Passed: Dataset loading and statistical summary validated.")

    def test_02_preprocessing_and_discretization(self):
        """Test data cleaning, numerical discretization, and train/test split."""
        train_df, test_df = self.processor.preprocess_for_bayesian(
            self.target_col, self.feature_cols, test_size=0.2, random_state=42
        )
        self.assertFalse(train_df.empty, "Train split should not be empty")
        self.assertFalse(test_df.empty, "Test split should not be empty")
        self.assertEqual(len(train_df) + len(test_df), len(self.df), "Split row counts must equal total")
        # Check no missing values remain
        self.assertEqual(train_df.isnull().sum().sum(), 0, "Train set must have 0 null values")
        self.assertEqual(test_df.isnull().sum().sum(), 0, "Test set must have 0 null values")
        print("✓ Test 2 Passed: Preprocessing, discretization, and train/test split validated.")

    def test_03_dag_construction_and_acyclicity(self):
        """Test Bayesian DAG construction and verify graph is acyclic."""
        bn = MedicalBayesianNetwork()
        all_vars = self.feature_cols + [self.target_col]
        edges = bn.construct_dag(all_vars, self.target_col)
        self.assertGreater(len(edges), 0, "DAG should contain edges")

        # NetworkX verification
        import networkx as nx
        G = nx.DiGraph(edges)
        self.assertTrue(nx.is_directed_acyclic_graph(G), "Bayesian graph must be strictly acyclic (DAG)")
        print(f"✓ Test 3 Passed: DAG construction verified ({len(edges)} directed edges, acyclic).")

    def test_04_parameter_estimation_and_cpts(self):
        """Test CPT estimation using BayesianEstimator with Dirichlet prior."""
        bn = MedicalBayesianNetwork()
        all_vars = self.feature_cols + [self.target_col]
        bn.construct_dag(all_vars, self.target_col)
        train_df, _ = self.processor.preprocess_for_bayesian(self.target_col, self.feature_cols)
        bn.fit(train_df, estimator_type="BayesianEstimator")

        self.assertIsNotNone(bn.model, "pgmpy model should be instantiated")
        self.assertIsNotNone(bn.inference_engine, "VariableElimination engine should be initialized")

        # Validate check_model axioms
        is_valid = bn.model.check_model()
        self.assertTrue(is_valid, "pgmpy check_model() must evaluate to True")

        # Verify CPT tables
        cpts = bn.cpts
        self.assertIn(self.target_col, cpts, "Target variable must have a CPT")
        print("✓ Test 4 Passed: Parameter estimation (CPTs) and pgmpy model validity confirmed.")

    def test_05_variable_elimination_posterior_inference(self):
        """Test exact posterior calculation P(Target | Evidence) and probability sum."""
        bn = MedicalBayesianNetwork()
        all_vars = self.feature_cols + [self.target_col]
        bn.construct_dag(all_vars, self.target_col)
        train_df, _ = self.processor.preprocess_for_bayesian(self.target_col, self.feature_cols)
        bn.fit(train_df)

        evidence = {
            "age": "High",
            "smoking": "Yes",
            "hypertension": "High",
            "chest_pain": "Typical_Angina",
        }
        res = bn.infer(evidence)
        self.assertIn("posteriorProbabilities", res)
        self.assertIn("mostProbableClass", res)

        # Probabilities must sum to 1.0 within floating point precision
        prob_sum = sum(res["posteriorProbabilities"].values())
        self.assertAlmostEqual(prob_sum, 1.0, places=3, msg="Posterior probabilities must sum to 1.0")
        print(f"✓ Test 5 Passed: Posterior inference verified (Predicted: {res['mostProbableClass']}, Confidence: {res['confidence']:.2%}).")

    def test_06_model_evaluation_held_out(self):
        """Test model evaluation on held-out test data and baseline comparison."""
        bn = MedicalBayesianNetwork()
        all_vars = self.feature_cols + [self.target_col]
        bn.construct_dag(all_vars, self.target_col)
        train_df, test_df = self.processor.preprocess_for_bayesian(self.target_col, self.feature_cols)
        bn.fit(train_df)

        evaluator = BayesianModelEvaluator(bn, self.target_col, self.feature_cols)
        eval_res = evaluator.evaluate_on_test_set(test_df, train_df)

        self.assertIn("bayesianNetwork", eval_res)
        self.assertIn("baseline", eval_res)
        self.assertGreater(eval_res["bayesianNetwork"]["accuracy"], 0.5, "Accuracy should exceed random chance")
        self.assertEqual(len(eval_res["bayesianNetwork"]["confusionMatrix"]), len(eval_res["classes"]))
        print(f"✓ Test 6 Passed: Model evaluation on held-out test set verified (BN Acc: {eval_res['bayesianNetwork']['accuracy']:.2%}, Baseline: {eval_res['baseline']['accuracy']:.2%}).")

    def test_07_flask_rest_api_endpoints(self):
        """Test Flask REST API routes using Flask test client."""
        client = app.test_client()

        # 1. Health check
        res = client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")

        # 2. Dataset summary
        res = client.get("/api/dataset/summary")
        self.assertEqual(res.status_code, 200)

        # 3. Model network graph
        res = client.get("/api/model/network")
        self.assertEqual(res.status_code, 200)
        net_data = res.get_json()
        self.assertIn("nodes", net_data)
        self.assertIn("edges", net_data)

        # 4. Posterior inference endpoint
        res = client.post(
            "/api/analyze",
            json={"evidence": {"age": "High", "smoking": "Yes", "hypertension": "High"}},
        )
        self.assertEqual(res.status_code, 200)
        inf_data = res.get_json()
        self.assertIn("posteriorProbabilities", inf_data)

        # 5. Report generation endpoint
        res = client.get("/api/report?format=json")
        self.assertEqual(res.status_code, 200)
        res_html = client.get("/api/report?format=html")
        self.assertEqual(res_html.status_code, 200)
        self.assertIn("Bayesian Network for Intelligent Medical Analysis", res_html.data.decode("utf-8"))

        print("✓ Test 7 Passed: All Flask REST API endpoints verified successfully.")


if __name__ == "__main__":
    print("\n=======================================================")
    print("  RUNNING BAYESIAN NETWORK MEDICAL BACKEND TEST SUITE")
    print("=======================================================\n")
    unittest.main()
