@echo off
title TESDA NTC Registration System

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%" || (echo Project folder not found & pause & exit /b 1)

set "PORT=3001"
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJECT_DIR%backend\.env") do (
  if /i "%%A"=="PORT" set "PORT=%%B"
)

echo ===============================
echo Building frontend (Vite build)
echo ===============================
cd frontend || (echo Frontend folder not found & pause & exit /b 1)
call npm run build || (echo Frontend build failed & pause & exit /b 1)

echo ===============================
echo Starting backend server...
echo ===============================
cd ..\backend || (echo Backend folder not found & pause & exit /b 1)
start /min node src/index.js

echo ===============================
echo Waiting for server to be ready...
echo ===============================
timeout /t 5 >nul

start http://localhost:%PORT%
exit