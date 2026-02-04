# 🎉 The Mile Game - Birthday Quiz Platform

> **Una plataforma interactiva de quiz para cumpleaños donde los invitados compiten en un ranking en tiempo real.**

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

---

## 🎯 Overview

**The Mile Game** es un quiz interactivo diseñado para eventos y celebraciones. Los invitados responden preguntas sobre el cumpleañero/a y compiten en un ranking en tiempo real.

### **Características Principales**

✅ **Quiz Interactivo** - 13 preguntas (favoritos + preferencias + descripción)  
✅ **Ranking en Vivo** - Leaderboard con podio para los top 3  
✅ **Animaciones** - Framer Motion para transiciones suaves  
✅ **Confetti** - Celebraciones visuales según el puntaje  
✅ **Responsive Design** - Mobile-first, optimizado para smartphones  
✅ **Real-time Updates** - Polling cada 30s (WebSockets próximamente)  

---

## 🛠 Stack Tecnológico

### **Frontend**

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.x | Framework UI |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool / Dev server |
| Tailwind CSS | 4.x | Estilos utility-first |
| Framer Motion | 11.x | Animaciones 2D |
| Zustand | 4.x | Estado global |
| Axios | 1.x | HTTP client |
| canvas-confetti | 1.x | Efectos de celebración |

### **Backend**

| Tecnología | Propósito |
|------------|-----------|
| Go 1.23 | API REST |
| Gin | HTTP framework |
| PostgreSQL 15 | Base de datos relacional |
| Docker | Containerización |

### **Testing** (Futuro)

- **Vitest** - Unit tests frontend
- **Playwright** - E2E tests
- **Go testing** - Backend tests (scorer, normalizer ya testeados al 100%)

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
                       ↕ HTTP/REST
┌─────────────────────────────────────────────────┐
│              Backend (Go)                       │
│  ┌─────────────────────────────────────────┐   │
│  │ Handlers → Services → Repository        │   │
│  │                           ↓              │   │
│  │                      PostgreSQL          │   │
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

# Unit tests
npm run test

# E2E tests
npm run test:e2e

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
│   │   ├── app/              # App setup (router, providers)
│   │   ├── features/         # Features (quiz, ranking)
│   │   │   ├── quiz/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── pages/
│   │   │   │   ├── services/
│   │   │   │   ├── store/
│   │   │   │   └── types/
│   │   │   └── ranking/
│   │   │       └── ...
│   │   ├── shared/           # Shared code
│   │   │   ├── components/   # UI components
│   │   │   ├── lib/          # API client, utils
│   │   │   └── types/
│   │   └── styles/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/                  # Go API
│   ├── cmd/
│   │   └── api/
│   │       └── main.go       # Entry point
│   ├── internal/
│   │   ├── handlers/         # HTTP handlers
│   │   ├── models/           # Data models
│   │   ├── repository/       # Database layer
│   │   └── services/         # Business logic
│   │       ├── normalizer.go
│   │       ├── scorer.go
│   │       └── *_test.go
│   ├── migrations/           # SQL migrations
│   ├── Dockerfile
│   ├── go.mod
│   └── go.sum
│
├── docker-compose.yml        # Docker orchestration
├── .env.example              # Environment template
├── AGENTS.md                 # Architecture docs
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### **Base URL**: `http://localhost:8081/api` (Docker) o `http://localhost:8080/api` (Dev)

#### **Players**

```http
POST   /api/players          # Crear jugador
GET    /api/players/:id      # Obtener jugador por ID
GET    /api/players          # Listar todos los jugadores
```

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/players \
  -H "Content-Type: application/json" \
  -d '{"name": "Juan", "avatar": "👤"}'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Juan",
  "avatar": "👤",
  "score": 0,
  "created_at": "2026-02-04T10:00:00Z"
}
```

#### **Quiz**

```http
POST   /api/quiz/submit                # Enviar respuestas
GET    /api/quiz/answers/:playerId     # Obtener respuestas
```

**Example Request:**

```bash
curl -X POST http://localhost:8081/api/quiz/submit \
  -H "Content-Type: application/json" \
  -H "X-Player-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "favorites": {
      "cantante": "Taylor Swift",
      "flor": "Rosa",
      "bebida": "Café"
    },
    "preferences": {
      "cafe_te": "cafe",
      "playa_montana": "playa"
    },
    "description": "Una persona increíble"
  }'
```

**Response:**

```json
{
  "score": 8,
  "message": "Quiz submitted successfully"
}
```

#### **Ranking**

```http
GET    /api/ranking          # Obtener ranking completo
```

**Example Request:**

```bash
curl http://localhost:8081/api/ranking
```

**Response:**

```json
[
  {
    "position": 1,
    "player": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Juan",
      "avatar": "👤",
      "score": 12,
      "created_at": "2026-02-04T10:00:00Z"
    }
  },
  {
    "position": 2,
    "player": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "María",
      "avatar": "👸",
      "score": 10,
      "created_at": "2026-02-04T10:05:00Z"
    }
  }
]
```

#### **Health Check**

```http
GET    /health               # Health check (NO /api prefix)
```

```bash
curl http://localhost:8081/health
# {"status":"ok"}
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

#### **Fase 3: Polish** (En progreso)

- [ ] WebSockets para ranking real-time
- [ ] Animaciones 3D con React Three Fiber (monedas giratorias)
- [ ] Video de celebración para ganador
- [ ] Tests con Vitest y Playwright

#### **Futuro**

- [ ] Sistema de juegos múltiples (no solo quiz)
- [ ] Admin panel para crear quizzes personalizados
- [ ] Compartir resultados en redes sociales
- [ ] PWA (Progressive Web App)

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
docker-compose ps

# Ver logs del backend
docker-compose logs backend

# Verificar health check
curl http://localhost:8081/health
```

### **Error: "CORS policy blocked"**

Verificá que el origen del frontend esté en `CORS_ALLOWED_ORIGINS` en `.env`:

```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081
```

Luego rebuild el backend:

```bash
docker-compose up -d --build backend
```

### **Error: "Database connection refused"**

```bash
# Verificar que postgres está healthy
docker-compose ps postgres

# Ver logs de postgres
docker-compose logs postgres

# Recrear volumen si es necesario (ESTO BORRA DATOS)
docker-compose down -v
docker-compose up -d
```

### **Frontend no actualiza cambios**

```bash
# Rebuild frontend
docker-compose up -d --build frontend

# O en dev local, hard refresh
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

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
