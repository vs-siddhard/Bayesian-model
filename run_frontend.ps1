# ==============================================================================
# PowerShell Script to Launch React Frontend
# ==============================================================================
# Usage:
#   .\run_frontend.ps1
# ==============================================================================

Write-Host ">>> Initializing React Vite Frontend for Bayesian Medical Analysis..." -ForegroundColor Cyan

# 1. Check Node installation
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "Node.js was not found in PATH. Please install Node.js (v18+) from nodejs.org"
    exit 1
}

# 2. Check dependencies
if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# 3. Launch Vite
Write-Host "Launching Vite development server on port 3000..." -ForegroundColor Green
Write-Host "Open in browser: http://localhost:3000" -ForegroundColor Green
npm run dev
