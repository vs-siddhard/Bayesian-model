"""
Model Evaluation Module for Bayesian Medical Analysis
Evaluates Bayesian Network on held-out test data and compares against a baseline classifier.
"""

from typing import Dict, List, Any
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import OrdinalEncoder


class BayesianModelEvaluator:
    def __init__(self, bayesian_engine, target_column: str, feature_columns: List[str]):
        self.engine = bayesian_engine
        self.target_column = target_column
        self.feature_columns = feature_columns

    def evaluate_on_test_set(self, test_df: pd.DataFrame, train_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs posterior inference for all held-out test samples and compares against baseline.
        """
        if test_df.empty:
            raise ValueError("Test set is empty.")

        y_true = test_df[self.target_column].astype(str).tolist()
        unique_classes = sorted(list(set(y_true + train_df[self.target_column].astype(str).tolist())))

        # 1. Evaluate Bayesian Network Predictions
        y_pred_bn = []
        for _, row in test_df.iterrows():
            evidence = {f: str(row[f]) for f in self.feature_columns if f in row}
            inference_res = self.engine.infer(evidence)
            y_pred_bn.append(inference_res["mostProbableClass"])

        # Compute BN metrics
        acc_bn = float(accuracy_score(y_true, y_pred_bn))
        p_bn, r_bn, f1_bn, _ = precision_recall_fscore_support(
            y_true, y_pred_bn, average="weighted", zero_division=0
        )
        cm_bn = confusion_matrix(y_true, y_pred_bn, labels=unique_classes).tolist()

        # Detailed per-class metrics
        class_prec, class_rec, class_f1, class_supp = precision_recall_fscore_support(
            y_true, y_pred_bn, labels=unique_classes, zero_division=0
        )
        per_class_report = []
        for i, cls_name in enumerate(unique_classes):
            per_class_report.append({
                "className": cls_name,
                "precision": round(float(class_prec[i]), 4),
                "recall": round(float(class_rec[i]), 4),
                "f1": round(float(class_f1[i]), 4),
                "support": int(class_supp[i]),
            })

        # 2. Baseline Classifier (Decision Tree on same train/test split)
        enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
        X_train_enc = enc.fit_transform(train_df[self.feature_columns].astype(str))
        y_train = train_df[self.target_column].astype(str)

        baseline_clf = DecisionTreeClassifier(max_depth=4, random_state=42)
        baseline_clf.fit(X_train_enc, y_train)

        X_test_enc = enc.transform(test_df[self.feature_columns].astype(str))
        y_pred_base = baseline_clf.predict(X_test_enc)

        acc_base = float(accuracy_score(y_true, y_pred_base))
        p_base, r_base, f1_base, _ = precision_recall_fscore_support(
            y_true, y_pred_base, average="weighted", zero_division=0
        )
        cm_base = confusion_matrix(y_true, y_pred_base, labels=unique_classes).tolist()

        return {
            "testSampleSize": len(test_df),
            "trainSampleSize": len(train_df),
            "classes": unique_classes,
            "bayesianNetwork": {
                "name": "Bayesian Network (pgmpy Variable Elimination)",
                "accuracy": round(acc_bn, 4),
                "precision": round(float(p_bn), 4),
                "recall": round(float(r_bn), 4),
                "f1Score": round(float(f1_bn), 4),
                "confusionMatrix": cm_bn,
                "perClassReport": per_class_report,
            },
            "baseline": {
                "name": "Baseline Model (Decision Tree, max_depth=4)",
                "accuracy": round(acc_base, 4),
                "precision": round(float(p_base), 4),
                "recall": round(float(r_base), 4),
                "f1Score": round(float(f1_base), 4),
                "confusionMatrix": cm_base,
            },
            "evaluationNotes": (
                "Evaluation performed on held-out test split (reproducible seed=42). "
                "The Bayesian Network outputs exact posterior distribution P(Target|Evidence) "
                "and selects argmax for classification metrics. Baseline represents a standard discriminative tree."
            ),
        }
