"""
Model Evaluation Module for Bayesian Medical Analysis
Evaluates Bayesian Network on held-out test data and compares against a baseline classifier.

Self-contained with pure-Python/NumPy fallback so it runs smoothly on lightweight
serverless platforms (like Vercel) without requiring massive scipy/scikit-learn bundles.
"""

from typing import Dict, List, Any
import numpy as np
import pandas as pd

HAS_SKLEARN = False
try:
    from sklearn.metrics import (
        accuracy_score,
        precision_recall_fscore_support,
        confusion_matrix,
    )
    from sklearn.tree import DecisionTreeClassifier
    from sklearn.preprocessing import OrdinalEncoder
    HAS_SKLEARN = True
except Exception:
    HAS_SKLEARN = False


def _compute_metrics_native(y_true: List[str], y_pred: List[str], classes: List[str]):
    n = len(y_true)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0, [[0]*len(classes) for _ in classes], []

    # Accuracy
    acc = sum(1 for t, p in zip(y_true, y_pred) if t == p) / n

    # Confusion matrix
    class_to_idx = {c: i for i, c in enumerate(classes)}
    cm = [[0] * len(classes) for _ in classes]
    for t, p in zip(y_true, y_pred):
        if t in class_to_idx and p in class_to_idx:
            cm[class_to_idx[t]][class_to_idx[p]] += 1

    per_class = []
    weighted_p = 0.0
    weighted_r = 0.0
    weighted_f1 = 0.0

    for i, c in enumerate(classes):
        tp = cm[i][i]
        fp = sum(cm[row][i] for row in range(len(classes)) if row != i)
        fn = sum(cm[i][col] for col in range(len(classes)) if col != i)
        supp = sum(cm[i])

        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        per_class.append({
            "className": c,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "support": int(supp),
        })

        weight = supp / n
        weighted_p += prec * weight
        weighted_r += rec * weight
        weighted_f1 += f1 * weight

    return acc, weighted_p, weighted_r, weighted_f1, cm, per_class


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

        if HAS_SKLEARN:
            try:
                acc_bn = float(accuracy_score(y_true, y_pred_bn))
                p_bn, r_bn, f1_bn, _ = precision_recall_fscore_support(
                    y_true, y_pred_bn, average="weighted", zero_division=0
                )
                cm_bn = confusion_matrix(y_true, y_pred_bn, labels=unique_classes).tolist()
                class_prec, class_rec, class_f1, class_supp = precision_recall_fscore_support(
                    y_true, y_pred_bn, labels=unique_classes, zero_division=0
                )
                per_class_report = [
                    {
                        "className": cls_name,
                        "precision": round(float(class_prec[i]), 4),
                        "recall": round(float(class_rec[i]), 4),
                        "f1": round(float(class_f1[i]), 4),
                        "support": int(class_supp[i]),
                    }
                    for i, cls_name in enumerate(unique_classes)
                ]

                # Baseline: DecisionTreeClassifier
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
                        "name": "Bayesian Network (Variable Elimination)",
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
                        "The Bayesian Network outputs exact posterior distribution P(Target|Evidence)."
                    ),
                }
            except Exception:
                pass

        # Native metric computation without scikit-learn
        acc_bn, p_bn, r_bn, f1_bn, cm_bn, per_class_report = _compute_metrics_native(
            y_true, y_pred_bn, unique_classes
        )

        # Baseline: Most frequent class predictor / majority voting
        majority_class = train_df[self.target_column].mode().iloc[0] if not train_df.empty else unique_classes[0]
        y_pred_base = [str(majority_class)] * len(y_true)
        acc_base, p_base, r_base, f1_base, cm_base, _ = _compute_metrics_native(
            y_true, y_pred_base, unique_classes
        )

        return {
            "testSampleSize": len(test_df),
            "trainSampleSize": len(train_df),
            "classes": unique_classes,
            "bayesianNetwork": {
                "name": "Bayesian Network (Variable Elimination)",
                "accuracy": round(acc_bn, 4),
                "precision": round(float(p_bn), 4),
                "recall": round(float(r_bn), 4),
                "f1Score": round(float(f1_bn), 4),
                "confusionMatrix": cm_bn,
                "perClassReport": per_class_report,
            },
            "baseline": {
                "name": "Baseline Model (Majority Class Classifier)",
                "accuracy": round(acc_base, 4),
                "precision": round(float(p_base), 4),
                "recall": round(float(r_base), 4),
                "f1Score": round(float(f1_base), 4),
                "confusionMatrix": cm_base,
            },
            "evaluationNotes": (
                "Evaluation performed on held-out test split (reproducible seed=42). "
                "The Bayesian Network outputs exact posterior distribution P(Target|Evidence)."
            ),
        }
