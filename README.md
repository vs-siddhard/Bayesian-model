# Bayesian Network for Intelligent Medical Analysis
**Undergraduate AI & Machine Learning Case Study Prototype**

An interactive, scientifically rigorous decision-support and probabilistic reasoning web application for preliminary medical dataset analysis. Powered by Directed Acyclic Graphs (DAG), Conditional Probability Tables (CPT), and exact Variable Elimination inference.

> **Clinical Disclaimer:** This application is strictly an educational decision-support prototype developed for academic AI/ML case studies. It does not provide medical diagnoses or replace licensed clinical judgment.

---

## 1. System Architecture & Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Interactive SVG/Canvas Graph Visualizer.
- **Backend:** Python 3.10 / 3.11 / 3.12, Flask, Flask-CORS, `pgmpy` (Probabilistic Graphical Models in Python), `pandas`, `scikit-learn`, `networkx`, `numpy`.
- **Hybrid Support:** The web application features an **integrated browser Bayesian engine** for immediate zero-config demonstration and also seamlessly connects to the Python Flask REST API server (`http://localhost:5000`).

---

## 2. Local Setup & Execution Guide (Windows PowerShell & Linux/macOS)

### Step 1: Clone or Navigate to the Project Root
```powershell
cd medical-ai-analysis
```

### Step 2: Set Up Python Virtual Environment
**Windows PowerShell:**
```powershell
# Create virtual environment with Python 3.10, 3.11, or 3.12
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```
*(If PowerShell restricts execution scripts, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

**Linux / macOS Bash:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Backend Dependencies
```powershell
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step 4: Launch the Flask REST API Server
```powershell
python backend/app.py
```
The Flask backend will initialize with `backend/sample_data.csv` and run on `http://localhost:5000`.

### Step 5: Start the React Frontend Application
In a separate terminal window:
```powershell
# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```

### Step 6: Open the Application
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 3. Step-by-Step Demonstration Scenario

1. **Dashboard Overview:**
   - Review total analysed records (120 initial records), feature count, target classes (`Low`, `Moderate`, `High`), and model accuracy.
   - Inspect the disease risk distribution chart and the Bayesian Network topological preview.

2. **Dataset Explorer:**
   - Inspect data preview table, data types, missing value analysis, and categorical frequencies.
   - Test uploading a custom CSV file or using the included `medical_examination.csv`.

3. **Bayesian Network Visualizer:**
   - Inspect the interactive Directed Acyclic Graph (DAG).
   - Drag nodes to explore causal pathways (Risk Factors $\rightarrow$ Physiological Vitals $\rightarrow$ Target Condition $\rightarrow$ Manifesting Symptoms).
   - Click on any node (e.g., `heart_disease_risk` or `chest_pain`) to inspect its exact Conditional Probability Table (CPT).

4. **Patient Analysis (Posterior Inference):**
   - Enter patient evidence:
     - Age: `Senior (>60)`
     - Smoking: `Yes`
     - Hypertension: `High`
     - Resting ECG: `ST_T_Abnormality`
     - Chest Pain: `Typical_Angina`
   - Click **Run Bayesian Inference**.
   - Observe how the network applies Bayes' rule:
     $$P(H \mid E) = \frac{P(E \mid H) P(H)}{P(E)}$$
   - View computed posterior probabilities, prior baseline delta, and explainability breakdown.

5. **Model Evaluation:**
   - Examine evaluation metrics on the held-out test split (Accuracy, Precision, Recall, F1-Score).
   - Review the Confusion Matrix and comparative benchmark against a standard Decision Tree baseline classifier.

6. **Academic Reports & Export:**
   - View the formatted Case Study Report.
   - Download as a standalone HTML document or export metrics and predictions as JSON/CSV.

---

## 4. Backend REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status & engine verification |
| `POST` | `/api/dataset/upload` | Upload and validate custom CSV dataset |
| `GET` | `/api/dataset/summary` | Return dataset metadata, distributions, and sample rows |
| `POST` | `/api/model/train` | Train Bayesian DAG & estimate CPT distributions |
| `GET` | `/api/model/network` | Return nodes, directed edges, and CPT tables |
| `GET` | `/api/model/evaluation` | Return held-out test metrics & baseline comparison |
| `POST` | `/api/analyze` | Perform posterior probabilistic inference for patient evidence |
| `GET` | `/api/report` | Export formatted academic report in JSON or HTML |

---

## 5. Troubleshooting & Compatibility

- **Python Version:** Recommended Python 3.10, 3.11, or 3.12. If encountering NumPy compile errors on Python 3.13, ensure `numpy<2.0.0` is installed.
- **Port Conflict:** If port 5000 is occupied (e.g. by macOS AirPlay), run `set FLASK_PORT=5001` (Windows) or `export FLASK_PORT=5001` (Linux/macOS) and update the API base URL in the web dashboard header.
- **Zero-Config Browser Mode:** If running in an environment without Python, the application automatically engages its high-precision integrated TypeScript Bayesian Network engine with full Variable Elimination and CPT calculations!

---

## 6. Vercel Multi-Service Cloud Deployment

The repository includes a `vercel.json` configured for multi-service deployment:
- **`app` service (Root `.`)**: Deploys the React 19 + TypeScript frontend built with Vite.
- **`backend` service (`/backend`)**: Deploys the Python Flask REST API backend with `pgmpy` and `scikit-learn`.
- **Rewrites**: All `/api/(.*)` requests are routed automatically to the `backend` service, while all other routes are handled by the Vite SPA frontend.

