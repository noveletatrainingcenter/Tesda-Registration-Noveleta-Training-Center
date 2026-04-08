@echo off
title TESDA NTC Registration System
setlocal EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%" || (echo [ERROR] Project folder not found & pause & exit /b 1)

:: ── Read PORT from backend/.env ──────────────────────────────────────────────
set "PORT=3001"
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJECT_DIR%backend\.env") do (
  if /i "%%A"=="PORT" set "PORT=%%B"
)

echo.
echo  ===============================================
echo   TESDA NTC Registration System — Production
echo  ===============================================
echo.

:: ── Step 0: Clean old build ───────────────────────────────────────────────────
echo [0/3] Cleaning old build...
if exist "%PROJECT_DIR%frontend\dist" (
    rd /s /q "%PROJECT_DIR%frontend\dist"
)
echo [OK] Cleaned.
echo.

:: ── Step 1: Build frontend ────────────────────────────────────────────────────
echo [1/3] Building frontend...
cd frontend || (echo [ERROR] Frontend folder not found & pause & exit /b 1)
call npm run build
if errorlevel 1 (
  echo [ERROR] Frontend build failed.
  pause
  exit /b 1
)
echo [OK] Frontend built.
echo.

:: ── Step 2: Start backend (minimized window) ─────────────────────────────────
echo [2/3] Starting backend server on port %PORT%...
cd ..\backend || (echo [ERROR] Backend folder not found & pause & exit /b 1)
start "TESDA Backend" /min cmd /c "node src/index.js & pause"
echo [OK] Backend process launched.
echo.

:: ── Step 3: Wait for health check ────────────────────────────────────────────
echo [3/3] Waiting for server to be ready...
set /a "ATTEMPTS=0"
set /a "MAX_ATTEMPTS=40"

:HEALTH_LOOP
set /a "ATTEMPTS+=1"
if !ATTEMPTS! gtr !MAX_ATTEMPTS! (
  echo.
  echo [ERROR] Server did not respond after 40 seconds.
  echo         Check the backend window for errors.
  pause
  exit /b 1
)

curl -s -f --max-time 1 "http://localhost:%PORT%/api/health" >nul 2>&1

if errorlevel 1 (
  <nul set /p "=."
  timeout /t 1 /nobreak >nul
  goto HEALTH_LOOP
)

echo.
echo [OK] Server is ready!
echo.

:: ── Open browser ─────────────────────────────────────────────────────────────
echo  Opening TESDA system in your browser...
echo  URL: http://localhost:%PORT%
echo.
start "" "http://localhost:%PORT%"

echo  System is running. Close the backend window to stop the server.
echo  ===============================================
endlocal
exit