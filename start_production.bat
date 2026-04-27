@echo off
setlocal EnableExtensions
title NCKH Smart Farming - Production Mode
color 0B

set "ROOT_DIR=%~dp0"

echo ==========================================
echo   NCKH Smart Farming - Production Start
echo ==========================================
echo.

:: ---- 1. Docker Desktop ---------------------------------------------------
echo [1/6] Checking Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" 2>nul
    if errorlevel 1 (
        echo [WARN] Docker Desktop not found at default path. Please start Docker manually.
    ) else (
        echo Waiting for Docker daemon to start up to 60s...
        set "DOCKER_OK="
        for /L %%i in (1,1,12) do (
            if not defined DOCKER_OK (
                timeout /t 5 /nobreak >nul
                docker info >nul 2>&1
                if not errorlevel 1 set "DOCKER_OK=1"
            )
        )
        if not defined DOCKER_OK (
            echo [WARN] Docker daemon did not start in time. PostgreSQL may not work.
        ) else (
            echo Docker daemon is ready.
        )
    )
) else (
    echo Docker daemon is already running.
)
echo.

:: ---- 2. PostgreSQL (Docker Compose) --------------------------------------
echo [2/6] Starting PostgreSQL...
set "POSTGRES_ID="
for /f "usebackq delims=" %%I in (`docker ps -q -f name=nckh_postgres 2^>nul`) do set "POSTGRES_ID=%%I"
if not defined POSTGRES_ID (
    pushd "%ROOT_DIR%"
    docker compose up -d
    if errorlevel 1 (
        echo [WARN] Failed to start PostgreSQL container.
    ) else (
        echo PostgreSQL started. Waiting 5s for init...
        timeout /t 5 /nobreak >nul
    )
    popd
) else (
    echo PostgreSQL is already running.
)
echo.

:: ---- 3. ML Server (Flask) ------------------------------------------------
echo [3/6] Starting ML Server (Flask - port 8080)...
where python >nul 2>&1
if errorlevel 1 (
    echo [WARN] Python not found. ML server not started.
) else (
    start "ML Server" cmd /k "cd /d %ROOT_DIR%ml && python app.py"
    timeout /t 3 /nobreak >nul
    echo ML Server starting...
)
echo.

:: ---- 4. Backend Server (Node.js) -----------------------------------------
echo [4/6] Starting Backend Server (Express - port 3001)...
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARN] npm not found. Backend server not started.
) else (
    start "Backend Server" cmd /k "cd /d %ROOT_DIR%server && npm run dev"
    timeout /t 4 /nobreak >nul
    echo Backend starting...
)
echo.

:: ---- 5. Frontend (Vite) --------------------------------------------------
echo [5/6] Starting Frontend (Vite - port 5173)...
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARN] npm not found. Frontend not started.
) else (
    start "Frontend" cmd /k "cd /d %ROOT_DIR%client && npm run dev"
    timeout /t 3 /nobreak >nul
    echo Frontend starting...
)
echo.

:: ---- 6. Cloudflare Tunnel ------------------------------------------------
echo [6/6] Starting Cloudflare Tunnel...
where cloudflared >nul 2>&1
if errorlevel 1 (
    echo [WARN] cloudflared not found in PATH.
    echo        Install it first: winget install Cloudflare.cloudflared
    echo        Then create tunnel: cloudflared tunnel create smartfarm
) else (
    start "Cloudflare Tunnel" cmd /k "cloudflared tunnel run smartfarm"
    echo Cloudflare Tunnel starting...
)
echo.

echo ==========================================
echo   All services started (production mode)
echo ==========================================
echo.
echo   Frontend:    http://localhost:5173
echo   Backend:     http://localhost:3001
echo   ML Server:   http://localhost:8080
echo   PostgreSQL:  localhost:5432
echo   Tunnel:      cloudflared tunnel run smartfarm
echo.
echo   Login: admin / admin123
echo.
echo   Press any key to close this window...
pause >nul
