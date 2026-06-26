@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
  echo Solicitando permisos de administrador...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File "scripts\fix-postgres-password.ps1"
pause
