#!/bin/bash

# --- COLORES ---
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}    ⚽ TIKTOK WORLD CUP BATTLE - SERVERS LAUNCHER 🏆    ${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo -e "[*] Iniciando el entorno de ejecución en Ubuntu..."
echo ""

# Función de limpieza al interrumpir o salir
cleanup() {
    echo ""
    echo -e "${YELLOW}[*] Deteniendo servidores de forma segura...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo -e "${GREEN}[+] Servidores detenidos. ¡Hasta luego! ⚽${NC}"
    exit 0
}

# Capturar Ctrl+C y salidas del sistema
trap cleanup INT TERM EXIT

# 1. Verificar y preparar el Backend
echo -e "${YELLOW}[*] Preparando el servidor Backend...${NC}"
cd backend || exit
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[!] No se encontró la carpeta node_modules en backend. Instalando dependencias...${NC}"
    npm install
fi
echo -e "[*] Iniciando servidor Backend..."
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 2. Verificar y preparar el Frontend
echo -e "${YELLOW}[*] Preparando el servidor Frontend...${NC}"
cd frontend || exit
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[!] No se encontró la carpeta node_modules en frontend. Instalando dependencias...${NC}"
    npm install
fi
echo -e "[*] Iniciando servidor Frontend (Vite)...${NC}"
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 3. Esperar a que inicien y abrir el navegador
echo -e "${YELLOW}[*] Esperando 3 segundos a que los servidores inicien...${NC}"
sleep 3

# Intentar abrir el navegador en Linux usando xdg-open
URL="http://localhost:5173/admin"
if command -v xdg-open > /dev/null; then
    echo -e "[*] Abriendo el Panel de Administración en tu navegador..."
    xdg-open "$URL" > /dev/null 2>&1 &
else
    echo -e "${YELLOW}[!] xdg-open no está disponible. Por favor, abre manualmente: $URL${NC}"
fi

echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}    ⚽ SERVIDORES INICIADOS CON ÉXITO 🏆${NC}"
echo -e "    Puedes ver tu OBS Overlay en: http://localhost:5173/overlay"
echo -e "    Logs del backend: tail -f backend.log"
echo -e "    Logs del frontend: tail -f frontend.log"
echo -e "${GREEN}=======================================================${NC}"
echo -e "${YELLOW}>>> PRESIONA [ENTER] O [CTRL+C] EN ESTA TERMINAL PARA CERRAR AMBOS SERVIDORES <<<${NC}"
read -r
