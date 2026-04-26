@echo off
setlocal EnableExtensions

set "ML_DIR=%~dp0"
set "ROOT_DIR=%ML_DIR%.."
set "ROOT_START_SCRIPT=%ROOT_DIR%\start_all.bat"

if not exist "%ROOT_START_SCRIPT%" (
  echo [ERROR] Khong tim thay file: %ROOT_START_SCRIPT%
  echo Hay dam bao ban dang chay file trong du an NCKH-Refractor.
  pause
  exit /b 1
)

echo Running all services from: %ROOT_START_SCRIPT%
call "%ROOT_START_SCRIPT%"
