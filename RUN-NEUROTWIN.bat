@echo off
setlocal
title NeuroTwin One-Command Launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20 or newer is required.
  echo Install Node.js 20+ and reopen this launcher.
  pause
  exit /b 1
)

for /f %%v in ('node -p "Number(process.versions.node.split('.')[0])"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo ERROR: Node.js 20 or newer is required. Current major: %NODE_MAJOR%
  pause
  exit /b 1
)

call npm run dev:all
if errorlevel 1 (
  echo.
  echo NeuroTwin stopped because startup reported an error.
  pause
)
endlocal
