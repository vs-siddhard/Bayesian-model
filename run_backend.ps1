# ==============================================================================
# PowerShell Script to Launch Python Flask Bayesian Network Backend
# ==============================================================================
# Usage:
#   .\run_backend.ps1
# ==============================================================================

Write-Host ">>> Initializing Python Environment for Bayesian Medical Analysis..." -ForegroundColor Cyan

# 1. Check Python installation
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    $pythonCmd = Get-Command python3 -ErrorAction SilentlyContinue
}

if (-not $pythonCmd) {
    Write-Error "Python was not found in PATH. Please install Python 3.10, 3.11, or 3.12 from python.org"
    exit 1
}

Write-Host "Using Python: $($pythonCmd.Source)" -ForegroundColor Green

# 2. Check or create virtual environment
if (-not (Test-Path ".\venv")) {
    Write-Host "Creating Python virtual environment in .\venv..." -ForegroundColor Yellow
    python -m venv venv
}

# 3. Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# 4. Install / verify dependencies
Write-Host "Verifying backend dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r backend\requirements.txt

# 5. Run automated test suite
Write-Host "`n>>> Running automated verification test suite..." -ForegroundColor Cyan
python backend\test_backend.py

# 6. Start Flask server
Write-Host "`n>>> Starting Flask REST API server on port 5000..." -ForegroundColor Green
Write-Host "API will be available at: http://localhost:5000" -ForegroundColor Green
Write-Host "Press Ctrl+C to terminate server.`n" -ForegroundColor DarkGray
python backend\app.py
