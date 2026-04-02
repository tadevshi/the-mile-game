# 🎉 EventHub - Interactive Event Platform

> **Creá experiencias memorables con quizzes interactivos, carteleras de fotos y cajas secretas. Todo en un solo lugar, fácil de compartir.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.23-00ADD8?logo=go)](https://go.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)

---

## 📋 Tabla de Contenidos

- [Overview](#-overview)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [API Endpoints](#-api-endpoints)
- [Contribución](#-contribución)
- [Documentación](#-documentación)

---

## 🎯 Overview

**EventHub** es una plataforma de eventos interactivos diseñada para cualquier celebración. Creá eventos únicos con quizzes personalizados, carteleras de fotos colaborativas y cajas secretas para sorpresas.

### **Características Principales**

✅ **Eventos Múltiples** - Creá y administrá múltiples eventos desde un solo dashboard  
✅ **Quiz Interactivo** - Preguntas personalizadas sobre el cumpleañero/a (o el tema que elijas)  
✅ **Theme Marketplace** - 6 temas pre-diseñados + personalización completa  
✅ **Cartelera de Corcho** - Postcards con fotos y mensajes pineados en un corcho digital  
✅ **Caja Secreta** - Postcards sorpresa de familiares que no pueden asistir  
✅ **Ranking en Vivo** - Leaderboard con podio para los top 3  
✅ **Animaciones** - Framer Motion para transiciones suaves  
✅ **Responsive Design** - Mobile-first, optimizado para smartphones  
✅ **Real-time Updates** - WebSockets para ranking y postcards en vivo  
✅ **3D Medals** - Monedas giratorias React Three Fiber en el podio  
✅ **Error Boundaries** - Manejo de errores global e inline  
✅ **Legacy Redirects** - URLs legacy redireccionan automáticamente  

---

## 🛠 Stack Tecnológico

### **Frontend**

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool / Dev server |
| React Router | 7.x | Navegación SPA |
| Tailwind CSS | 4.x | Estilos utility-first |
| Framer Motion | 12.x | Animaciones 2D + transiciones |
| React Three Fiber | 9.x | 3D declarativo (Three.js) |
| Drei | 10.x | Helpers para R3F |
| Zustand | 5.x | Estado global |
| Axios | 1.x | HTTP client |
| canvas-confetti | 1.x | Efectos de celebración |
| lottie-react | 2.x | Animaciones Lottie |

### **Backend**

| Tecnología | Propósito |
|------------|-----------|
| Go 1.23 | API REST + WebSockets |
| Gin | HTTP framework |
| gorilla/websocket | WebSocket hub con auto-reconnect |
| PostgreSQL 15 | Base de datos relacional |
| Docker | Containerización |

### **Testing**

- ✅ **Go testing** - `normalizer_test.go` + `scorer_test.go` (100% coverage)
- ✅ **Playwright** - 35/38 passing (3 correctly skipped), config in `playwright.config.ts`
- ✅ **Vitest** - Unit tests frontend implementados

---

## 🏗 Arquitectura

### **Patrón: Feature-Based con Capas Internas**

```
┌─────────────────────────────────────────────────┐
│              Frontend (React)                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Pages → Hooks → Services → API Client   │   │
│  │   ↓       ↓                              │   │
│  │ Components ← Store (Zustand)            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
               ↕ HTTP/REST    ↕ WebSocket (/ws)
┌─────────────────────────────────────────────────┐
│              Backend (Go + Gin)                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Handlers → Services → Repository        │   │
│  │      ↓                    ↓              │   │
│  │  WS Hub               PostgreSQL         │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### **Docker Services**

```yaml
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │   Backend    │      │  PostgreSQL  │
│   (Nginx)    │──────│   (Go API)   │──────│     (DB)     │
│  Port: 8081  │ HTTP │  Port: 8080  │ SQL  │  Port: 5432  │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                    Docker Network
                    (milegame-network)
```

---

## 🚀 Instalación

### **Prerequisitos**

- **Docker** >= 20.10
- **Docker Compose** >= 1.29
- **Git**

### **1. Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/the-mile-game.git
cd the-mile-game
```

### **2. Configurar variables de entorno**

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores (opcional, los defaults funcionan)
nano .env
```

**Variables importantes:**

```env
# Puertos
FRONTEND_PORT=8081      # Puerto del frontend
BACKEND_PORT=8080       # Puerto interno del backend
POSTGRES_PORT=5432      # Puerto interno de PostgreSQL

# Base de datos
DB_USER=user
DB_PASSWORD=password
DB_NAME=milegame

# CORS (agregar dominios de producción aquí)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081

# Secret Box
# El token se genera por evento desde el panel admin (no hace falta env global)

# Feature flags (habilitar funcionalidades)
VITE_ENABLE_CORKBOARD=true
VITE_ENABLE_SECRET_BOX=true
```

### **3. Levantar los servicios**

```bash
# Build y start de todos los servicios
docker-compose up -d --build

# Verificar que están corriendo
docker-compose ps
```

**Output esperado:**

```
    Name                  Command                State           Ports
-------------------------------------------------------------------------
milegame-db    postgres                         Up (healthy)   5432/tcp
milegame-api   ./main                           Up (healthy)   8080/tcp
milegame-web   nginx                            Up (healthy)   0.0.0.0:8081->80/tcp
```

### **4. Acceder a la aplicación**

🌐 **Frontend**: [http://localhost:8081](http://localhost:8081)

---

## 🎁 Secret Box — Guía Operacional

La **Secret Box** permite que familiares o amigos que no pueden asistir envíen fotos y mensajes secretos para el homenajeado. Se guardan ocultos y se revelan con una animación durante la celebración.

### **Paso 1 — Habilitar la feature antes de la fiesta**

Editá el `.env` para habilitar la feature si hace falta:

```env
VITE_ENABLE_SECRET_BOX=true                 # Habilitar la feature
```

Rebuild necesario si cambiás `VITE_ENABLE_SECRET_BOX` (está bakeado en el bundle):

```bash
docker-compose up -d --build
```

### **Paso 2 — Generar el link a compartir desde el panel admin**

El token ya no viene de una env global. Se genera por evento desde el panel admin y el link compartible tiene este formato:

```
http://<HOST>/e/<EVENT_SLUG>/secret-box?token=<TOKEN_GENERADO>
```

**Ejemplos:**

| Entorno | URL |
|---------|-----|
| Local | `http://localhost:8081/e/mi-evento/secret-box?token=abc123` |
| Red local (fiesta) | `http://192.168.100.82:8081/e/mi-evento/secret-box?token=abc123` |
| Producción | `https://midominio.com/e/mi-evento/secret-box?token=abc123` |

> ⚠️ **El token en la URL debe coincidir exactamente con el token generado para ese evento desde el panel admin.**

### **Paso 3 — Compartir el link**

Enviá el link por **WhatsApp, email o cualquier canal** a las personas que no pueden asistir. Cada persona:

1. Abre el link en su celular
2. Sube una foto y escribe un mensaje para el homenajeado
3. Ve una confirmación de envío exitoso

No necesitan registrarse ni haber jugado el quiz.

### **Paso 4 — Revisar las postales desde el admin**

El panel de admin te muestra cuántas postales secretas fueron enviadas y un preview de cada una:

El acceso admin ahora usa login con JWT y ownership del evento; ya no usa passphrase por query param.

### **Paso 5 — Revelar la Secret Box durante la fiesta**

Cuando llegue el momento emotivo, desde el panel admin:

1. Verificá el contador: **"N postales secretas listas"**
2. Presioná **"REVELAR SECRET BOX"**
3. Confirmá la acción (es **irreversible** — one-shot)
4. En **todos los dispositivos** conectados al corkboard aparece la animación:
   - 🎁 Caja de regalos aparece al centro
   - La caja se abre y las postales "vuelan" hacia el corcho
   - Confetti al final
   - La primera postal se abre automáticamente en modal

> **💡 Tip**: Antes de revelar, asegurate de que la pantalla principal (TV o proyector de la fiesta) esté mostrando el Corkboard (`/corkboard`).

### **Troubleshooting — Secret Box**

**El link dice "Token inválido":**
- Verificá que `VITE_ENABLE_SECRET_BOX=true` en el `.env` y que hiciste rebuild
- Verificá que el token en la URL coincide exactamente con el token generado para ese evento (case-sensitive, sin espacios)

**La ruta `/secret-box` no existe (404):**
- La feature está deshabilitada. Verificá `VITE_ENABLE_SECRET_BOX=true` y rebuild del frontend

**El admin dice "No autorizado":**
- Verificá que estás logueado como owner del evento

**Resetear estado del reveal (para volver a ejecutar la animación):**

```bash
docker exec -it milegame-db psql -U user -d milegame -c \
  "UPDATE postcards SET revealed_at = NULL WHERE is_secret = TRUE;"
```

Marca todas las postales secretas como "no reveladas". El admin puede volver a presionar "REVELAR SECRET BOX" desde el panel y la animación se dispara de nuevo en todos los dispositivos conectados.

---

## 💻 Uso

### **Modo Producción (Docker)**

```bash
# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend

# Detener servicios
docker-compose down

# Detener Y eliminar volúmenes (resetea DB)
docker-compose down -v
```

### **Modo Desarrollo (Local)**

#### **Frontend**

```bash
cd frontend

# Instalar dependencias
npm install

# Dev server con hot-reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

Accede a: [http://localhost:5173](http://localhost:5173)

#### **Backend**

```bash
cd backend

# Instalar dependencias
go mod download

# Configurar env local
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=user
export DB_PASSWORD=password
export DB_NAME=milegame
export GIN_MODE=debug
export CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Correr servidor
go run cmd/api/main.go

# Build
go build -o bin/server cmd/api/main.go
./bin/server
```

**⚠️ Nota**: Para desarrollo local del backend, necesitás tener PostgreSQL corriendo (podés usar solo `docker-compose up postgres`).

---

## 🧪 Testing

### **Backend (Go)**

```bash
cd backend

# Correr todos los tests
go test ./...

# Tests con coverage
go test -cover ./...

# Coverage detallado
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

**Tests existentes:**
- ✅ `normalizer_test.go` - 100% coverage
- ✅ `scorer_test.go` - 100% coverage

### **Frontend (Futuro)**

```bash
cd frontend

# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npx playwright test

# Coverage
npm run test:coverage
```

---

## 🌍 Deployment

### **Producción con Docker Compose**

1. **Configurar `.env` para producción:**

```env
# Cambiar a modo release
GIN_MODE=release

# Agregar dominio de producción
CORS_ALLOWED_ORIGINS=https://milejuego.com,https://www.milejuego.com

# Usar contraseñas seguras
DB_PASSWORD=TuContraseñaSuperSegura123!
```

2. **Build y deploy:**

```bash
docker-compose -f docker-compose.yml up -d --build
```

3. **Configurar reverse proxy (Nginx/Caddy)**

Ejemplo Nginx:

```nginx
server {
    listen 80;
    server_name milejuego.com;

    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **Producción en Cloud (AWS, DigitalOcean, etc.)**

- Usar **Docker Compose** o **Kubernetes**
- Configurar **PostgreSQL managed** (RDS, Managed DB)
- Usar **S3/CDN** para assets estáticos
- Configurar **HTTPS** con Let's Encrypt

---

## 📁 Estructura del Proyecto

```
the-mile-game/
├── frontend/                 # React Application
│   ├── src/
│   │   ├── features/
│   │   │   ├── landing/         # Landing page (EventHub branding)
│   │   │   │   ├── pages/
│   │   │   │   │   └── LandingPage.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── HeroSection.tsx
│   │   │   │   │   ├── FeaturesGrid.tsx
│   │   │   │   │   └── EventCodeForm.tsx
│   │   │   │   └── store/
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── dashboard/        # User dashboard
│   │   │   │   ├── pages/
│   │   │   │   │   └── DashboardPage.tsx
│   │   │   │   └── components/
│   │   │   │       └── EventCard.tsx
│   │   │   ├── event-wizard/    # 3-step event creation
│   │   │   │   ├── pages/
│   │   │   │   │   └── EventWizardPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── Step1_BasicInfo.tsx
│   │   │   │       ├── Step2_Features.tsx
│   │   │   │       └── Step3_Theme.tsx
│   │   │   ├── event-admin/     # Event admin panel
│   │   │   │   ├── pages/
│   │   │   │   │   └── EventAdminPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── ConfigTab.tsx
│   │   │   │       ├── QuestionsTab.tsx
│   │   │   │       ├── ThemeTab.tsx
│   │   │   │       └── StatsTab.tsx
│   │   │   ├── event-public/    # Public event pages /e/:slug
│   │   │   │   ├── pages/
│   │   │   │   ├── EventLandingPage.tsx
│   │   │   │   └── EventLayout.tsx
│   │   │   ├── quiz/            # Legacy quiz feature
│   │   │   ├── ranking/         # Legacy ranking feature
│   │   │   ├── postcards/        # Corkboard + Secret Box
│   │   │   └── admin/           # Legacy admin pages
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── Button, EmptyState, LoadingSkeleton
│   │   │   │   ├── WizardStepper, FeatureCard
│   │   │   │   └── ThemeToggle, LegacyRedirect
│   │   │   ├── 3d/              # MedalCanvas, Coin3D
│   │   │   ├── hooks/
│   │   │   ├── store/           # themeStore, websocketStore
│   │   │   └── lib/              # api.ts, featureFlags.ts
│   │   └── styles/
│   ├── tests/
│   ├── playwright.config.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/                  # Go API
│   ├── cmd/api/main.go       # Entry point
│   ├── internal/
│   │   ├── handlers/         # HTTP handlers
│   │   ├── models/           # Data models
│   │   ├── repository/       # player_repository, quiz_repository,
│   │   │                     # postcard_repository, db
│   │   ├── services/         # normalizer, scorer (+tests 100% cov)
│   │   └── websocket/        # hub.go (gorilla, ping/pong, broadcast)
│   ├── migrations/           # 001_initial_schema.up.sql, 002_postcards.up.sql, ...
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── docker-compose.yml        # Docker orchestration (3 services)
├── .env / .env.example       # Environment config
├── run-tests.sh              # Backend test runner
├── AGENTS.md                 # Architecture docs (para IA y colaboradores)
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### **Base URL**: `http://localhost:8081/api` (Docker) o `http://localhost:8080/api` (Dev)

#### **Authentication**

```http
POST   /api/auth/register     # Registro de usuario
POST   /api/auth/login        # Inicio de sesión
POST   /api/auth/refresh      # Refrescar token
GET    /api/auth/me           # Usuario actual
POST   /api/auth/logout       # Cerrar sesión
```

#### **Events**

```http
GET    /api/events            # Listar eventos del usuario (auth requerida)
POST   /api/events            # Crear evento (auth requerida)
GET    /api/events/:id        # Obtener evento por ID (auth requerida)
PUT    /api/events/:id        # Actualizar evento (auth requerida)
DELETE /api/events/:id       # Eliminar evento (auth requerida)
GET    /api/events/slug/:slug # Obtener evento por slug (público)
```

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Cumpleaños de Ana",
    "slug": "cumple-ana-2026",
    "date": "2026-04-15",
    "features": {
      "quiz": true,
      "corkboard": true,
      "secret_box": false
    }
  }'
```

**Response:**

```json
{
  "id": "c79c5d54-8bb4-4f1c-abf3-0d2c38635e69",
  "slug": "cumple-ana-2026",
  "name": "Cumpleaños de Ana",
  "features": {
    "quiz": true,
    "corkboard": true,
    "secret_box": false
  },
  "is_active": true,
  "created_at": "2026-03-20T02:40:36Z"
}
```

#### **Themes**

```http
GET    /api/themes/presets    # Listar temas pre-diseñados (público)
GET    /api/events/:id/theme  # Obtener tema del evento
PUT    /api/events/:id/theme # Actualizar tema del evento
```

**Example Request:**

```bash
curl http://localhost:8081/api/themes/presets
```

**Response:**

```json
{
  "presets": [
    {
      "name": "princess",
      "primaryColor": "#EC4899",
      "secondaryColor": "#FBCFE8",
      "displayFont": "Great Vibes",
      "backgroundStyle": "watercolor"
    },
    {
      "name": "elegant",
      "primaryColor": "#8B5CF6",
      "displayFont": "Playfair Display",
      "backgroundStyle": "minimal"
    }
  ]
}
```

#### **Players**

```http
POST   /api/players          # Crear jugador
GET    /api/players/:id      # Obtener jugador por ID
GET    /api/events/:id/players # Listar jugadores de un evento
```

#### **Quiz**

```http
POST   /api/quiz/submit      # Enviar respuestas
GET    /api/quiz/answers/:playerId # Obtener respuestas
```

#### **Ranking**

```http
GET    /api/events/:id/ranking # Obtener ranking del evento
```

#### **Postcards**

```http
POST   /api/postcards         # Crear postal (multipart: image + message)
GET    /api/postcards         # Listar postales (públicas)
GET    /api/events/:id/postcards # Listar postcards de un evento
```

#### **Secret Box**

```http
POST   /api/postcards/secret  # Crear postal secreta (header: X-Secret-Token)
GET    /api/admin/secret-box  # Listar postcards secretas (header: X-Admin-Key)
POST   /api/admin/reveal     # Revelar Secret Box (header: X-Admin-Key)
GET    /api/admin/status      # Estado de la Secret Box (header: X-Admin-Key)
```

#### **WebSocket**

```http
GET    /ws                   # WebSocket para ranking, postcards y secret box real-time
```

El servidor emite mensajes `ranking_update`, `postcard_new` y `secret_box_reveal`. Incluye ping/pong keepalive.

#### **Health Check**

```http
GET    /health              # Health check (NO /api prefix)
```

```bash
curl http://localhost:8081/health
# {"status":"ok","websocket_clients":0}
```

---

## 🤝 Contribución

### **Proceso de Desarrollo**

1. **Fork** el repositorio
2. **Crear branch** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. **Push** al branch (`git push origin feature/nueva-funcionalidad`)
5. **Abrir Pull Request**

### **Conventional Commits**

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva funcionalidad
fix: corrección de bug
docs: documentación
style: formato, estilos
refactor: refactorización
test: tests
chore: tareas de mantenimiento
```

### **Roadmap**

#### **Completado**

- ✅ **EventHub Platform** — Refactor completo de The Mile Game a plataforma multi-evento
- ✅ **Landing Page** — Nueva página con branding EventHub
- ✅ **Event Wizard** — Creación de eventos en 3 pasos (Info → Features → Tema)
- ✅ **Dashboard** — Grid de eventos con feature badges
- ✅ **Admin Panel** — Tabs (Config, Questions, Theme, Stats)
- ✅ **Theme Marketplace** — 6 temas pre-diseñados + personalización
- ✅ **Event-scoped routes** — `/e/:slug/*` para páginas públicas
- ✅ **Legacy redirects** — URLs legacy redireccionan automáticamente
- ✅ Setup Vite + React 19 + TypeScript + Tailwind 4
- ✅ Backend Go + Gin + PostgreSQL + Docker Compose
- ✅ Quiz completo con scoring server-side
- ✅ Ranking en tiempo real con WebSockets
- ✅ 3D medals con React Three Fiber
- ✅ Animaciones Framer Motion
- ✅ Cartelera de Corcho (postcards real-time)
- ✅ Secret Box — Postcards sorpresa con animación de caja de regalos
- ✅ Playwright E2E + Vitest unit tests
- ✅ Feature flags runtime

#### **En Desarrollo**

- 🔜 **Video de celebración** — Para el ganador
- 🔜 **Lottie animations** — Decorativas

#### **Pendiente**
- [ ] Soporte de video en postcards (V2)
- [ ] Sistema de juegos múltiples (arquitectura lista)
- [ ] Analytics dashboard
- [ ] Social sharing

---

## 📝 Licencia

Este proyecto es para uso personal en celebraciones. Contactar al autor para uso comercial.

---

## 👤 Autor

Desarrollado para el cumpleaños de Mile ✨

---

## 🐛 Troubleshooting

### **Error: "Cannot connect to backend"**

```bash
# Verificar que los servicios están corriendo
docker ps | grep milegame

# Ver logs del backend
docker logs milegame-api

# Verificar health check
curl http://localhost:8080/health
```

### **Error: "CORS policy blocked"**

Verificá que el origen del frontend esté en `CORS_ALLOWED_ORIGINS` en `.env`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```

Luego rebuild el backend:

```bash
docker build -t the-mile-game_backend ./backend
docker stop milegame-api
docker rm milegame-api
docker run -d --name milegame-api --network the-mile-game_milegame-network -p 8080:8080 the-mile-game_backend
```

### **Error: "Database connection refused"**

```bash
# Verificar que postgres está healthy
docker ps | grep milegame-db

# Ver logs de postgres
docker logs milegame-db

# Verificar que el API está en la misma red
docker network inspect the-mile-game_milegame-network
```

### **Limpiar base de datos (reset de datos)**

```bash
# Borrar todos los datos
docker exec -it milegame-db psql -U user -d milegame -c \
  "TRUNCATE TABLE events, users, quiz_questions, quiz_answers, postcards, players, refresh_tokens RESTART IDENTITY CASCADE;"
```

### **Frontend no actualiza cambios**

```bash
# Rebuild frontend
cd frontend && npm run build
docker cp ./dist/. milegame-web:/usr/share/nginx/html/
```

---

## 📖 Documentación

Para documentación detallada, consulta la carpeta [`docs/`](./docs/):

### Guías de Usuario
- [Theme System](./docs/guides/THEME_SYSTEM.md) - Personalización de temas visuales
- [Database Migrations](./docs/guides/MIGRATIONS.md) - Cómo ejecutar y crear migraciones

### Referencia API
- [API Overview](./docs/api/README.md) - Documentación completa de endpoints
- [Themes API](./docs/api/THEMES.md) - Endpoints de personalización de temas

### Arquitectura
- [AGENTS.md](./AGENTS.md) - Convenciones de código y estructura del proyecto

---

## 📚 Recursos

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion/)
- [Go Gin Framework](https://gin-gonic.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**¡Que empiece el juego!** 🎮🎉
