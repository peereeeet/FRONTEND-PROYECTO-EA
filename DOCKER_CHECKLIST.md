# 🐳 Preparación Frontend para Dockerización - Checklist de Implementación

## ✅ Completado: Configuración de Producción

### 📋 Archivos de Configuración

#### 1. **environment.ts** - Actualizado ✅
```typescript
export const environment = {
  production: true,
  apiUrl: '/api',                                    // Proxy relativo para nginx
  socketUrl: 'https://ea2-api.upc.edu',             // URL producción WebSocket
  googleClientId: '584395491868-...'                // Mantiene original
};
```

#### 2. **nginx.conf** - Creado ✅
```
- Server: 0.0.0.0:80
- Root: /usr/share/nginx/html
- SPA routing: try_files → /index.html
- /api proxy → http://backend:3000
- /socket.io proxy → http://backend:3000 (WebSocket ready)
- Security headers: X-Frame-Options, X-Content-Type-Options, etc.
- Gzip: ON
- Cache: 30 días para assets estáticos
```

#### 3. **Dockerfile** - Creado ✅
```dockerfile
# Stage 1: Builder
FROM node:20-alpine
- npm ci
- npm run build --configuration production

# Stage 2: Production  
FROM nginx:alpine
- Copia nginx.conf personalizado
- Copia dist/ea2/browser → /usr/share/nginx/html
- EXPOSE 80
- CMD: nginx -g "daemon off;"
```

#### 4. **.dockerignore** - Creado ✅
```
node_modules, dist, .angular, .git, .env, logs, IDE files, docs
```

#### 5. **angular.json** - Actualizado ✅
```json
"outputPath": "dist/ea2/browser"
```

---

## 🔧 Servicios Actualizados (8 servicios)

| # | Servicio | Import | URL Base | Status |
|---|----------|--------|----------|--------|
| 1 | `auth.service.ts` | ✅ environment | `environment.apiUrl` | ✅ |
| 2 | `user.service.ts` | ✅ environment | `environment.apiUrl + '/user'` | ✅ |
| 3 | `evento.service.ts` | ✅ environment | `environment.apiUrl + '/event'` | ✅ |
| 4 | `ai.service.ts` | ✅ environment | `environment.apiUrl + '/ai'` | ✅ |
| 5 | `valoracion.service.ts` | ✅ environment | `environment.apiUrl + '/ratings'` | ✅ |
| 6 | `socket.service.ts` | ✅ environment | `environment.socketUrl` | ✅ |
| 7 | `gamificacion.service.ts` | ✅ environment | `environment.apiUrl + '/gamificacion'` | ✅ |
| 8 | `notificacion.service.ts` | ✅ environment | `environment.apiUrl + '/notificaciones'` | ✅ |

**Nota**: Servicios especiales no incluidos (Nominatim OpenStreetMap - API externa)

---

## 🚀 Flujo de Arquitectura

```
┌─────────────────────────────────────────────┐
│  Cliente (Navegador)                         │
│  http://ea2-api.upc.edu                      │
└────────────────────┬────────────────────────┘
                     │
                ┌────▼────┐
                │  Nginx   │ (puerto 80)
                │ Alpine   │
                ├──────────┤
                │ Router:  │
                │ / → SPA  │
                │ /api →   │
                │ /socket→ │
                └────┬──┬──┘
                     │  │
        ┌────────────┘  └──────────────────┐
        │                                   │
    ┌───▼────────────────┐      ┌──────────▼──────┐
    │  Backend Service   │      │   WebSocket     │
    │  (Node.js:3000)    │      │   (Socket.io)   │
    │                    │      │                 │
    │ - Auth             │      │ Real-time       │
    │ - Events           │      │ notifications   │
    │ - Users            │      │                 │
    │ - Gamification     │      │                 │
    └────────────────────┘      └─────────────────┘
```

---

## 📦 Tamaño Estimado de Imagen

```
Stage 1 (node:20-alpine):      ~200MB (no incluida en imagen final)
Stage 2 (nginx:alpine):        ~50MB
+ Build compilado:             ~5-10MB
────────────────────────────────────────
Total imagen final:            ~55-60MB

Sin multi-stage sería:         ~250-300MB ❌
Ahorro: 75-80% de tamaño       ✅
```

---

## 🧪 Comandos de Build y Ejecución

### Build
```bash
docker build -t ea2-frontend:latest .
```

### Run Individual
```bash
docker run -d \
  --name ea2-frontend \
  --network ea2-network \
  -p 80:80 \
  ea2-frontend:latest
```

### Con Docker Compose
```bash
docker-compose up -d
```

---

## ✨ Características de Configuración

### Seguridad ✅
- ✅ Headers de seguridad (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
- ✅ No expone archivos ocultos (deny location ~ /\.)
- ✅ HTTPS en URLs externas (socketUrl)

### Rendimiento ✅
- ✅ Gzip compression habilitada
- ✅ Cache de 30 días para assets estáticos
- ✅ Output hashing en build (prev cachebust)
- ✅ Multi-stage build (imagen optimizada)

### Routing ✅
- ✅ SPA routing con try_files
- ✅ Proxy /api con headers X-Forwarded
- ✅ WebSocket proxy /socket.io con Upgrade headers

### Desarrollo ✅
- ✅ Environment variables configurable
- ✅ Separación dev/prod en angular.json
- ✅ Fácil cambio de URLs sin recompilación (si se implementa carga dinámica)

---

## 📝 Archivos Creados/Modificados

| Archivo | Tipo | Acción | Status |
|---------|------|--------|--------|
| `src/app/environments/environment.ts` | Config | MODIFICADO | ✅ |
| `src/app/services/*.service.ts` | Code | MODIFICADO (8 archivos) | ✅ |
| `nginx.conf` | Config | CREADO | ✅ |
| `Dockerfile` | Deploy | CREADO | ✅ |
| `.dockerignore` | Deploy | CREADO | ✅ |
| `angular.json` | Config | MODIFICADO | ✅ |
| `DOCKER_SETUP.md` | Docs | CREADO | ✅ |

---

## 🔍 Próximos Pasos Recomendados

1. **Testing Local**
   ```bash
   npm run build -- --configuration production
   npx http-server dist/ea2/browser -p 4200
   ```

2. **Build de Imagen**
   ```bash
   docker build -t ea2-frontend:latest .
   ```

3. **Testing en Contenedor**
   ```bash
   docker run -d -p 8080:80 ea2-frontend:latest
   # Visitar http://localhost:8080
   ```

4. **Integración con Backend**
   - Asegurar que backend está en el mismo docker-network
   - Usar `http://backend:3000` como hostname para servicios internos

5. **Despliegue UPC**
   - Usar registry privado si aplica
   - Configurar certificado SSL en nginx (si no está en proxy frontal)
   - Validar URLs de producción (ea2-api.upc.edu)

---

## ⚠️ Verificaciones Importante

- [ ] Backend accesible en http://backend:3000 dentro de Docker network
- [ ] Google OAuth configurado para dominios UPC
- [ ] Certificados SSL en lugar frontal (nginx o proxy frontal)
- [ ] Variables de ambiente backend configuradas correctamente
- [ ] Logs de nginx accesibles para debugging

---

**Fecha de Implementación**: Enero 19, 2026  
**Versión Angular**: 18.2.0  
**Node.js en Build**: 20-alpine  
**Nginx en Producción**: alpine
