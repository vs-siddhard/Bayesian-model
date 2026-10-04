"""
Flask REST API Server for Bayesian Network Medical Analysis
Exposes endpoints for dataset ingestion, Bayesian model training,
network graph inspection, probabilistic inference, model evaluation, and reporting.
"""

import os
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

from data_processor import MedicalDataProcessor
from bayesian_model import MedicalBayesianNetwork
from evaluation import BayesianModelEvaluator
from report_generator import MedicalReportGenerator

app = Flask(__name__)
# Enable CORS for frontend Vite development server
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Global in-memory state
processor = MedicalDataProcessor()
bayesian_engine = MedicalBayesianNetwork()
evaluator = None
cached_evaluation = None
last_sample_inference = None

# Auto-load sample dataset on startup
DEFAULT_SAMPLE_PATH = os.path.join(os.path.dirname(__file__), "sample_data.csv")


def initialize_default_model():
    global evaluator, cached_evaluation, last_sample_inference
    try:
        if os.path.exists(DEFAULT_SAMPLE_PATH):
            processor.load_csv_file(DEFAULT_SAMPLE_PATH)
            # Default target & features
            target_col = "heart_disease_risk"
            feature_cols = [
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
            train_df, test_df = processor.preprocess_for_bayesian(target_col, feature_cols)
            bayesian_engine.construct_dag(feature_cols + [target_col], target_col)
            bayesian_engine.fit(train_df)

            evaluator = BayesianModelEvaluator(bayesian_engine, target_col, feature_cols)
            cached_evaluation = evaluator.evaluate_on_test_set(test_df, train_df)

            # Pre-compute a sample inference for report
            sample_evidence = {
                "age": "High",
                "smoking": "Yes",
                "hypertension": "High",
                "chest_pain": "Typical_Angina",
            }
            last_sample_inference = bayesian_engine.infer(sample_evidence)
            print("[INFO] Default sample medical Bayesian Network successfully trained and ready.")
    except Exception as e:
        print(f"[WARN] Could not auto-initialize default model: {e}")


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "engine": "pgmpy-bayesian-network",
        "datasetLoaded": processor.df_raw is not None,
        "modelTrained": bayesian_engine.model is not None,
    })


@app.route("/api/dataset/upload", methods=["POST"])
def upload_dataset():
    """Uploads and parses a CSV dataset."""
    try:
        if "file" in request.files:
            file = request.files["file"]
            if file.filename == "":
                return jsonify({"error": "No file selected."}), 400
            content = file.read().decode("utf-8")
            processor.load_csv_from_string_or_buffer(content)
        elif request.is_json and "csvContent" in request.json:
            content = request.json["csvContent"]
            processor.load_csv_from_string_or_buffer(content)
        else:
            return jsonify({"error": "No file or csvContent provided in request."}), 400

        summary = processor.get_dataset_summary()
        return jsonify({
            "message": "Dataset successfully uploaded and validated.",
            "summary": summary,
        })
    except Exception as e:
        return jsonify({"error": f"Failed to parse dataset: {str(e)}"}), 400


@app.route("/api/dataset/summary", methods=["GET"])
def get_dataset_summary():
    """Returns dataset metadata, preview, and column distributions."""
    try:
        if processor.df_raw is None:
            initialize_default_model()
        summary = processor.get_dataset_summary()
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/model/train", methods=["POST"])
def train_model():
    """Trains the Bayesian Network on selected target and input features."""
    global evaluator, cached_evaluation
    try:
        data = request.get_json() or {}
        target_column = data.get("targetColumn")
        feature_columns = data.get("featureColumns", [])
        test_size = float(data.get("testSize", 0.2))

        if not target_column:
            return jsonify({"error": "Target column is required."}), 400
        if not feature_columns or len(feature_columns) < 2:
            return jsonify({"error": "At least 2 feature columns are required to construct a Bayesian network."}), 400

        train_df, test_df = processor.preprocess_for_bayesian(
            target_column=target_column,
            feature_columns=feature_columns,
            test_size=test_size,
        )

        all_vars = feature_columns + ([target_column] if target_column not in feature_columns else [])
        bayesian_engine.construct_dag(all_vars, target_column)
        bayesian_engine.fit(train_df)

        evaluator = BayesianModelEvaluator(bayesian_engine, target_column, feature_columns)
        cached_evaluation = evaluator.evaluate_on_test_set(test_df, train_df)

        network_data = bayesian_engine.get_network_graph_data()

        return jsonify({
            "message": "Bayesian Network successfully trained and parameters estimated.",
            "targetVariable": target_column,
            "featureVariables": feature_columns,
            "trainingRecords": len(train_df),
            "testingRecords": len(test_df),
            "network": network_data,
            "evaluationSummary": {
                "accuracy": cached_evaluation["bayesianNetwork"]["accuracy"],
                "f1Score": cached_evaluation["bayesianNetwork"]["f1Score"],
            },
        })
    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500


@app.route("/api/model/network", methods=["GET"])
def get_network():
    """Returns the DAG topology, node attributes, parents/children, and CPTs."""
    try:
        if bayesian_engine.model is None:
            initialize_default_model()
        data = bayesian_engine.get_network_graph_data()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/model/evaluation", methods=["GET"])
def get_evaluation():
    """Returns held-out test evaluation metrics and baseline comparison."""
    global cached_evaluation
    try:
        if cached_evaluation is None:
            initialize_default_model()
        return jsonify(cached_evaluation)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/analyze", methods=["POST"])
def analyze_patient():
    """Calculates posterior probability distribution given supplied evidence."""
    global last_sample_inference
    try:
        if bayesian_engine.model is None:
            initialize_default_model()

        data = request.get_json() or {}
        evidence = data.get("evidence", {})

        if not isinstance(evidence, dict):
            return jsonify({"error": "Evidence must be an object of {variable: state}."}), 400

        result = bayesian_engine.infer(evidence)
        last_sample_inference = result
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Inference error: {str(e)}"}), 400


@app.route("/api/report", methods=["GET"])
def generate_report():
    """Generates and returns the academic case study report."""
    try:
        format_type = request.args.get("format", "json").lower()
        if cached_evaluation is None:
            initialize_default_model()

        summary = processor.get_dataset_summary()
        metadata = {
            "targetVariable": bayesian_engine.target_variable,
            "totalRows": summary["totalRows"],
            "features": bayesian_engine.variables,
        }

        sample = last_sample_inference or {
            "posteriorProbabilities": {"Low": 0.15, "Moderate": 0.25, "High": 0.60},
            "mostProbableClass": "High",
        }

        generator = MedicalReportGenerator(metadata, cached_evaluation, sample)

        if format_type == "html":
            html_content = generator.generate_html_report()
            response = make_response(html_content)
            response.headers["Content-Type"] = "text/html; charset=utf-8"
            return response
        else:
            return jsonify(generator.generate_json_report())
    except Exception as e:
        return jsonify({"error": f"Report generation failed: {str(e)}"}), 500


if __name__ == "__main__":
    initialize_default_model()
    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
