@echo off
setlocal
title NeuroTwin Launcher
cd /d "%~dp0"

echo.
echo ==========================================
echo          NeuroTwin - Local Launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js 20 or newer, then reopen this file.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available in PATH.
  pause
  exit /b 1
)

for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo ERROR: NeuroTwin requires Node.js 20 or newer.
  echo Current Node.js major version: %NODE_MAJOR%
  pause
  exit /b 1
)

echo Checking MongoDB on localhost:27017...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$svc = Get-Service -Name 'MongoDB' -ErrorAction SilentlyContinue; if ($svc -and $svc.Status -ne 'Running') { Start-Service -Name 'MongoDB' -ErrorAction SilentlyContinue }; if (-not (Test-NetConnection 127.0.0.1 -Port 27017 -InformationLevel Quiet)) { exit 1 }"
if errorlevel 1 (
  echo.
  echo ERROR: MongoDB is not reachable on localhost:27017.
  echo Start the local MongoDB service or run mongod, then retry.
  pause
  exit /b 1
)

if not exist "node_modules\concurrently" (
  echo Installing project dependencies for the first run...
  call npm run install:all
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "server\.env" (
  if exist ".env.example" (
    copy ".env.example" "server\.env" >nul
    echo Created server\.env from .env.example
  ) else (
    echo ERROR: .env.example is missing.
    pause
    exit /b 1
  )
)

echo.
echo Starting NeuroTwin API and frontend...
start "NeuroTwin Dev Servers" cmd /k "cd /d ""%~dp0"" && npm run dev"
echo Waiting for Vite to start...
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo NeuroTwin is starting.
echo Frontend: http://localhost:5173
echo API health: http://localhost:5000/api/health
echo.
echo Keep the server window open while using NeuroTwin.
pause
endlocal
