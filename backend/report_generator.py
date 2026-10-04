"""
Academic Case Study Report Generator
Generates comprehensive clinical AI/ML reports in HTML and JSON format.
"""

from typing import Dict, Any
from datetime import datetime


class MedicalReportGenerator:
    def __init__(self, metadata: Dict[str, Any], evaluation: Dict[str, Any], sample_inference: Dict[str, Any]):
        self.metadata = metadata
        self.evaluation = evaluation
        self.sample_inference = sample_inference
        self.generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    def generate_html_report(self) -> str:
        """Renders self-contained, publication-ready academic report."""
        eval_bn = self.evaluation.get("bayesianNetwork", {})
        eval_base = self.evaluation.get("baseline", {})
        classes = self.evaluation.get("classes", [])
        sample_post = self.sample_inference.get("posteriorProbabilities", {})

        cm_rows = ""
        cm_data = eval_bn.get("confusionMatrix", [])
        if cm_data and len(cm_data) == len(classes):
            for i, row in enumerate(cm_data):
                cm_rows += f"<tr><td class='font-bold'>{classes[i]}</td>"
                for val in row:
                    cm_rows += f"<td>{val}</td>"
                cm_rows += "</tr>"

        sample_prob_rows = ""
        for cls, prob in sample_post.items():
            sample_prob_rows += f"<tr><td>{cls}</td><td class='font-mono font-bold'>{(prob * 100):.2f}%</td></tr>"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bayesian Network for Intelligent Medical Analysis - Academic Case Study</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 40px auto; padding: 0 20px; }}
    h1 {{ color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }}
    h2 {{ color: #0369a1; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }}
    h3 {{ color: #0284c7; }}
    .badge {{ display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }}
    .meta-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }}
    table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }}
    th {{ background: #f1f5f9; font-weight: 600; }}
    .font-mono {{ font-family: monospace; }}
    .font-bold {{ font-weight: bold; }}
    .equation {{ background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px; margin: 16px 0; font-family: monospace; font-size: 15px; }}
    .alert {{ background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; font-size: 13px; color: #78350f; }}
  </style>
</head>
<body>
  <h1>Bayesian Network for Intelligent Medical Analysis</h1>
  <p><strong>Undergraduate Artificial Intelligence & Machine Learning Case Study Report</strong></p>
  <div class="meta-box">
    <div><strong>Generated At:</strong> {self.generated_at}</div>
    <div><strong>Methodology:</strong> Probabilistic Graphical Model (DAG) with Exact Variable Elimination</div>
    <div><strong>Target Variable:</strong> {self.metadata.get('targetVariable', 'N/A')}</div>
    <div><strong>Total Analyzed Dataset Records:</strong> {self.metadata.get('totalRows', 'N/A')}</div>
    <div><strong>Train/Test Ratio:</strong> {self.evaluation.get('trainSampleSize', 0)} train / {self.evaluation.get('testSampleSize', 0)} test</div>
  </div>

  <h2>1. Problem Statement & Educational Objective</h2>
  <p>
    Clinical diagnosis inherently deals with reasoning under deep uncertainty. Symptoms such as chest discomfort or fatigue may arise from multiple overlapping etiologies. Deterministic rules fail to capture biological variance and incomplete patient histories. This case study demonstrates how a Directed Acyclic Graph (DAG) grounded in Bayes' theorem computes calibrated posterior belief distributions over candidate conditions rather than arbitrary black-box classifications.
  </p>

  <h2>2. Theoretical Foundation: Bayes' Theorem & Graphical Models</h2>
  <p>
    In Bayesian networks, the joint probability distribution over all variables is factorized into a product of local conditional distributions using the chain rule and conditional independence assertions:
  </p>
  <div class="equation">
    P(X_1, X_2, ..., X_n) = &prod; P(X_i | Parents(X_i))
  </div>
  <p>
    Posterior updating given observed patient evidence <em>E</em> for hypothesis <em>H</em> is computed via Bayes' rule:
  </p>
  <div class="equation">
    P(H | E) = [ P(E | H) &times; P(H) ] / P(E)
  </div>

  <h2>3. Dataset Preprocessing & Discretization</h2>
  <p>
    The dataset was ingested, checked for missing values, and partitioned into demographic risk factors, intermediate physiological vitals, and manifesting symptoms. Continuous numerical measurements were discretized into clinically interpretable ordinal intervals to facilitate exact discrete CPT estimation.
  </p>

  <h2>4. Model Performance & Comparative Benchmark</h2>
  <table>
    <thead>
      <tr>
        <th>Model Architecture</th>
        <th>Accuracy</th>
        <th>Precision (Weighted)</th>
        <th>Recall (Weighted)</th>
        <th>F1-Score</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Bayesian Network (Variable Elimination)</strong></td>
        <td class="font-mono">{eval_bn.get('accuracy', 0):.4f}</td>
        <td class="font-mono">{eval_bn.get('precision', 0):.4f}</td>
        <td class="font-mono">{eval_bn.get('recall', 0):.4f}</td>
        <td class="font-mono">{eval_bn.get('f1Score', 0):.4f}</td>
      </tr>
      <tr>
        <td>Baseline Model (Decision Tree, depth=4)</td>
        <td class="font-mono">{eval_base.get('accuracy', 0):.4f}</td>
        <td class="font-mono">{eval_base.get('precision', 0):.4f}</td>
        <td class="font-mono">{eval_base.get('recall', 0):.4f}</td>
        <td class="font-mono">{eval_base.get('f1Score', 0):.4f}</td>
      </tr>
    </tbody>
  </table>

  <h3>Confusion Matrix (Bayesian Network)</h3>
  <table>
    <thead>
      <tr>
        <th>True \\ Predicted</th>
        {"".join(f"<th>{c}</th>" for c in classes)}
      </tr>
    </thead>
    <tbody>
      {cm_rows}
    </tbody>
  </table>

  <h2>5. Sample Patient Posterior Inference</h2>
  <p>Sample patient evidence applied to trained network:</p>
  <table>
    <thead>
      <tr>
        <th>Target Class</th>
        <th>Calculated Posterior Probability P(Target | Evidence)</th>
      </tr>
    </thead>
    <tbody>
      {sample_prob_rows}
    </tbody>
  </table>

  <h2>6. Limitations & Ethical Considerations</h2>
  <div class="alert">
    <strong>DISCLAIMER:</strong> This application is an educational decision-support model built for academic demonstration. It is not an FDA-cleared diagnostic device, nor should it be utilized for direct patient diagnosis or acute clinical triage. Unmeasured confounders, data collection bias, and sample size constraints limit real-world generalizability.
  </div>

  <h2>7. Conclusion</h2>
  <p>
    The Bayesian Network successfully captured bidirectional probabilistic reasoning: predictive (causal flow from risk factors to disease) and diagnostic (evidential flow from observed symptoms back to disease state), offering high transparency and explainability essential for responsible medical AI.
  </p>
</body>
</html>"""
        return html

    def generate_json_report(self) -> Dict[str, Any]:
        """Returns structured JSON summary for machine consumption."""
        return {
            "title": "Bayesian Network for Intelligent Medical Analysis",
            "generatedAt": self.generated_at,
            "metadata": self.metadata,
            "evaluation": self.evaluation,
            "sampleInference": self.sample_inference,
            "disclaimer": "Educational Decision-Support Prototype. Not for clinical diagnostic use.",
        }
