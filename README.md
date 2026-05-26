# ⚽ TikTok World Cup Battle 🏆

**TikTok World Cup Battle** es una aplicación web interactiva full-stack en tiempo real diseñada específicamente para ser utilizada como fuente de navegador (Browser Source) dentro de **OBS Studio** durante transmisiones en vivo de **TikTok Live**.

La aplicación crea una batalla futbolística interactiva en la que dos selecciones nacionales se enfrentan en la cancha. Los espectadores impulsan el balón hacia la portería contraria enviando regalos específicos de TikTok, likes, compartidos o siguiendo la cuenta. ¡El equipo que llega a la portería rival anota un gol y el partido continúa!

---

## 🛠️ Arquitectura Tecnológica

La aplicación se divide de forma estricta en dos módulos para optimizar el rendimiento de CPU y asegurar un renderizado constante a **60 FPS** en OBS:

```
[TikTok Live chat / API] ────> (Node.js Backend & SQLite) <──── (Admin Control Panel)
                                       │
                                       ▼ (Sincronización WebSockets / Socket.io)
                               (React & Phaser.js OBS Overlay)
```

- **Backend**: Node.js, Express, Socket.io y persistencia en base de datos SQLite. Incorpora un simulador interno y un puerto seguro para la conexión con el chat de TikTok.
- **Frontend**: React, TypeScript, Phaser 3 (motor gráfico optimizado para renderizar la cancha, sombras y jugadores por hardware) y TailwindCSS para el diseño de marcadores.
- **Sonido**: Motor sintético incorporado que utiliza la **Web Audio API** del navegador para silbatos, rebotes y fuegos artificiales autónomos sin depender de archivos de audio externos propensos a fallos.

---

## 📋 Guía 1: Instalación de Dependencias en Ubuntu

Sigue estos comandos paso a paso para configurar tu entorno en un servidor local o servidor de desarrollo con **Ubuntu 20.04 / 22.04 / 24.04 LTS**:

### 1. Actualizar el sistema e instalar herramientas básicas
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential sqlite3
```

### 2. Instalar Node.js LTS (Versión 20.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verifica las versiones instaladas:
```bash
node -v  # Debe ser v20.x o superior
npm -v   # Debe ser v10.x o superior
```

### 3. Descargar y preparar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO> tiktok-world-cup
cd tiktok-world-cup
```

### 4. Instalar y Compilar el Backend
```bash
cd backend
npm install
npm run build
```

### 5. Instalar y Compilar el Frontend
```bash
cd ../frontend
npm install
npm run build
```

---

## 🚀 Guía 2: Despliegue en un Servidor VPS de Producción

Para desplegar la aplicación de manera profesional en un VPS (ej. DigitalOcean, Linode, AWS) para que sea accesible públicamente y soporte conexiones seguras SSL, sigue esta guía:

### 1. Administrar el proceso con PM2 (Mantiene el backend corriendo 24/7)
Instala PM2 de manera global:
```bash
sudo npm install -g pm2
```
Inicia el servidor backend en producción desde la carpeta `backend/`:
```bash
cd ~/tiktok-world-cup/backend
pm2 start dist/index.js --name "tiktok-soccer-backend"
pm2 save
pm2 startup
```

### 2. Instalar y Configurar Nginx como Proxy Inverso
Instala Nginx:
```bash
sudo apt install -y nginx
```
Crea una configuración para tu dominio en `/etc/nginx/sites-available/battle.tudominio.com`:
```nginx
server {
    listen 80;
    server_name battle.tudominio.com;

    # Frontend estático compilado
    location / {
        root /home/ubuntu/tiktok-world-cup/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSockets de Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
Habilita el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/battle.tudominio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Configurar Certificado de Seguridad SSL gratuito (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d battle.tudominio.com
```
¡Listo! Tu aplicación estará sirviendo bajo `https://battle.tudominio.com` de forma segura.

---

## 📺 Guía 3: Configuración en OBS Studio (Open Broadcaster Software)

Para agregar el marcador y juego a tu transmisión en vivo, sigue estos pasos:

1. Abre **OBS Studio** en tu computadora de streaming.
2. En la sección **Fuentes (Sources)**, haz clic en el botón **+** y selecciona **Navegador (Browser)**.
3. Asígnale el nombre `TikTok Soccer Battle Overlay`.
4. En el campo **URL**, ingresa la dirección del overlay:
   - En local: `http://localhost:5173/overlay`
   - En producción: `https://battle.tudominio.com/overlay`
5. Configura los parámetros de tamaño estrictamente para una resolución nítida:
   - **Ancho (Width)**: `1920`
   - **Alto (Height)**: `1080`
6. Configura los FPS a **60** (esto asegura que el balón ruede y los jugadores corran a máxima fluidez por hardware).
7. Selecciona **"Controlar audio por OBS"** si deseas ajustar el silbato del árbitro y los cánticos del estadio mediante el mezclador de volumen nativo de OBS.
8. Deja los campos de CSS personalizados vacíos, ya que la aplicación incluye un fondo transparente por defecto.
9. Haz clic en **Aceptar**.

---

## 📱 Guía 4: Vinculación e Integración con TikTok Live

Para que el juego responda a tus espectadores reales, realiza las siguientes acciones durante tu directo:

1. **Inicia tu transmisión en TikTok** desde tu móvil o utilizando TikTok Live Studio/OBS.
2. Abre la **Consola de Control** en un navegador de tu PC:
   - URL: `http://localhost:5173/admin` (o tu dominio de producción `/admin`).
   - Contraseña por defecto: `admin123` (se puede cambiar en la base de datos).
3. En la sección **TikTok Live Connector**, ingresa tu nombre de usuario de TikTok (sin el carácter `@`) y haz clic en **Conectar Live**.
4. El sistema buscará tu directo en tiempo real y mostrará el estado **"Conectando..."** y luego **"Conectado como @tu_usuario"**.
5. **Configura el Texto de Pantalla**: Coloca un texto flotante en tu transmisión con OBS que indique las reglas a tu audiencia:
   - 🔴 **ARGENTINA** (Equipo Local): Se apoya regalando **Rosas 🌹**, **Sombreros 🎩** o **Leones 🦁**.
   - 🟡 **BRASIL** (Equipo Visitante): Se apoya regalando **TikToks ⚡**, **Perfumes 🧪** o **Universos 🌌**.
6. A medida que tu chat envíe dichos regalos, verás el balón deslizarse de forma fluida hacia la portería rival, acumulando diamantes y actualizando el marcador automáticamente en la pantalla de OBS.

---

## 🎮 Guía 5: Mecánica del Juego y Equivalencia de Diamantes

- **Dinámica Principal**: Hay un único balón que inicia en el centro. Las donaciones empujan el balón. Cada regalo suma su valor respectivo en diamantes hacia el progreso de un equipo.
- **Goles**: Si la distancia al arco es de `200` diamantes, cuando el balón alcance +200 de progreso se marcará gol para el equipo Local, y en -200 para el Visitante.
- **Celebración**: Al anotar, se silba dos veces, la pantalla tiembla, se lanzan confetis tridimensionales y fuegos artificiales de colores por 4.5 segundos antes de reiniciar el balón al centro manteniendo el marcador.
- **MVP del Partido**: Al completar el límite (ej. primer equipo en 3 goles), la pantalla cambia para mostrar una gloriosa carta dorada estilo FIFA Ultimate Team con el nombre, avatar y diamantes aportados por el usuario que más apoyó al equipo ganador.

### Tabla de Regalos Predeterminada (Modificable desde el panel `/admin`):
- **Rosa**: 1 Diamante (Empuja al Local 🌹)
- **TikTok**: 1 Diamante (Empuja al Visitante ⚡)
- **Perfume**: 20 Diamantes (Empuja al Visitante 🧪)
- **Sombrero**: 99 Diamantes (Empuja al Local 🎩)
- **León**: 29,999 Diamantes (Empuja al Local 🦁)
- **Universo**: 34,999 Diamantes (Empuja al Visitante 🌌)
# Tiktok-World-Cup-Battle
