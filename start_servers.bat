@echo off
title ⚽ TIKTOK WORLD CUP BATTLE - LANZADOR 🏆
color 0A

echo =======================================================
echo     ⚽ TIKTOK WORLD CUP BATTLE - SERVERS LAUNCHER 🏆
echo =======================================================
echo.
echo [*] Iniciando el entorno de ejecucion...
echo.

:: 1. Verificar y preparar el Backend
echo [*] Preparando el servidor Backend...
cd backend
if not exist node_modules (
    echo [!] No se encontro la carpeta node_modules en backend. Instalando dependencias...
    call npm install
)
echo [*] Iniciando servidor Backend en una nueva ventana...
start "TikTok Battle - Backend" cmd /k "npm run dev"

cd ..

:: 2. Verificar y preparar el Frontend
echo [*] Preparando el servidor Frontend...
cd frontend
if not exist node_modules (
    echo [!] No se encontro la carpeta node_modules en frontend. Instalando dependencias...
    call npm install
)
echo [*] Iniciando servidor Frontend (Vite) en una nueva ventana...
start "TikTok Battle - Frontend" cmd /k "npm run dev"

cd ..

:: 3. Abrir Panel de Control
echo [*] Esperando 3 segundos a que los servidores inicien...
timeout /t 3 /nobreak > nul

echo [*] Abriendo el Panel de Administracion en tu navegador...
start http://localhost:5173/admin

echo.
echo =======================================================
echo     ⚽ SERVIDORES INICIADOS CON EXITO 🏆
echo     Puedes ver tu OBS Overlay en:
echo     http://localhost:5173/overlay
echo =======================================================
echo.
pause
