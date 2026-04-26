@echo off
setlocal EnableExtensions
title NCKH Smart Farming - Start All Services
color 0A

set "ROOT_DIR=%~dp0"
set "HAS_DOCKER="
set "HAS_PYTHON="
set "HAS_NPM="
set "COMPOSE_CMD="

call :checkCommand docker HAS_DOCKER "Docker CLI"
call :checkCommand python HAS_PYTHON "Python"
call :checkCommand npm HAS_NPM "npm"

echo ==========================================
echo   NCKH Smart Farming - Starting Services
echo ==========================================
echo.

:: Check if Docker PostgreSQL is running
echo [1/4] Checking PostgreSQL (Docker)...
if not defined HAS_DOCKER (
    echo [WARN] Docker CLI not found. Skip PostgreSQL startup.
) else (
    docker info >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Docker daemon is not running. Skip PostgreSQL startup.
    ) else (
        docker compose version >nul 2>&1
        if not errorlevel 1 set "COMPOSE_CMD=docker compose"

        if not defined COMPOSE_CMD (
            docker-compose version >nul 2>&1
            if not errorlevel 1 set "COMPOSE_CMD=docker-compose"
        )

        if not defined COMPOSE_CMD (
            echo [WARN] Docker Compose not found. Skip PostgreSQL startup.
        ) else (
            set "POSTGRES_ID="
            for /f "usebackq delims=" %%I in (`docker ps -q -f name=nckh_postgres`) do set "POSTGRES_ID=%%I"

            if not defined POSTGRES_ID (
                echo Starting PostgreSQL container using %COMPOSE_CMD% ...
                pushd "%ROOT_DIR%"
                %COMPOSE_CMD% up -d
                if errorlevel 1 (
                    echo [WARN] Failed to start PostgreSQL container.
                ) else (
                    echo PostgreSQL started.
                    timeout /t 3 >nul
                )
                popd
            ) else (
                echo PostgreSQL is already running.
            )
        )
    )
)
echo.

:: Start ML Server (Flask)
echo [2/4] Starting ML Server (Flask - port 8080)...
if defined HAS_PYTHON (
    start "ML Server" cmd /k "cd /d %ROOT_DIR%ml && python app.py"
    timeout /t 2 >nul
) else (
    echo [WARN] Python not found. ML server not started.
)
echo.

:: Start Backend (Node.js Express)
echo [3/4] Starting Backend Server (Express - port 3001)...
if defined HAS_NPM (
    start "Backend Server" cmd /k "cd /d %ROOT_DIR%server && npm run dev"
    timeout /t 3 >nul
) else (
    echo [WARN] npm not found. Backend server not started.
)
echo.

:: Start Frontend (Vite React)
echo [4/4] Starting Frontend (Vite - port 5173)...
if defined HAS_NPM (
    start "Frontend" cmd /k "cd /d %ROOT_DIR%client && npm run dev"
) else (
    echo [WARN] npm not found. Frontend not started.
)
echo.

echo ==========================================
echo   All services started!
echo ==========================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3001
echo   ML Server: http://localhost:8080
echo   PostgreSQL: localhost:5432
echo.
echo   Login: admin / admin123
echo.
echo   Press any key to close this window...
pause >nul
goto :eof

:checkCommand
where %~1 >nul 2>&1
if errorlevel 1 (
    echo [WARN] %~3 is not available in PATH.
) else (
    set "%~2=1"
)
exit /b 0
