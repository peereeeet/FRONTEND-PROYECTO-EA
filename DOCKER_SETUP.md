# Configuración de Dockerización - Frontend Angular

## Resumen de Cambios Realizados

### 1. Environment Configuration (`src/app/environments/environment.ts`)
✅ **Estado**: Actualizado para producción en UPC
- `production: true` - Habilita modo producción
- `apiUrl: '/api'` - Usa ruta relativa para proxy de nginx
- `socketUrl: 'https://ea2-api.upc.edu'` - URL de producción para WebSocket
- `googleClientId` - Mantiene el valor actual

### 2. Servicios Actualizados
✅ **Todos los servicios usan `environment` variables**:

| Servicio | Cambio | Ubicación |
|----------|--------|-----------|
| auth.service.ts | Importa environment, usa `environment.apiUrl` | src/app/services/ |
| user.service.ts | Importa environment, usa `environment.apiUrl + '/user'` | src/app/services/ |
| evento.service.ts | Importa environment, usa `environment.apiUrl + '/event'` | src/app/services/ |
| ai.service.ts | Importa environment, usa `environment.apiUrl + '/ai'` | src/app/services/ |
| valoracion.service.ts | Importa environment, usa `environment.apiUrl + '/ratings'` | src/app/services/ |
| socket.service.ts | Importa environment, usa `environment.socketUrl` | src/app/services/ |
| gamificacion.service.ts | Importa environment, usa `environment.apiUrl + '/gamificacion'` | src/app/services/ |
| notificacion.service.ts | Importa environment, usa `environment.apiUrl + '/notificaciones'` | src/app/services/ |

### 3. Configuración de Nginx (`nginx.conf`)
✅ **Archivos creados**

Características:
- ✅ Puerto de escucha: 80
- ✅ Root directory: `/usr/share/nginx/html`
- ✅ SPA routing con `try_files` para index.html
- ✅ Proxy `/api` → `http://backend:3000` con headers completos
- ✅ Proxy `/socket.io` → `http://backend:3000` con soporte WebSocket (Upgrade/Connection)
- ✅ Headers de seguridad: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- ✅ Gzip compression habilitada
- ✅ Cache control para assets estáticos (30 días)

### 4. Dockerfile Multi-stage (`Dockerfile`)
✅ **Archivos creados**

Estructura:
- **Stage 1 (Builder)**: 
  - Base: `node:20-alpine`
  - Instala dependencias con `npm ci`
  - Compila con `npm run build --configuration production`
  
- **Stage 2 (Production)**:
  - Base: `nginx:alpine`
  - Copia config nginx personalizada
  - Copia output build: `dist/ea2/browser` → `/usr/share/nginx/html`
  - EXPOSE 80
  - CMD: `nginx -g "daemon off;"`

### 5. .dockerignore (``.dockerignore`)
✅ **Archivos creados**

Excluye:
- node_modules, dist, .angular, .git
- .env y archivos de configuración local
- Logs, IDE files, documentación
- Archivos de configuración de desarrollo

### 6. Angular Configuration (`angular.json`)
✅ **Actualizado**

- `outputPath: "dist/ea2/browser"` - Coincide con Dockerfile
- Configuración de producción con:
  - Budget warnings: 3MB (initial), 5MB (max)
  - Output hashing: all
  - Optimización completa

## Cómo Construir y Ejecutar

### Construir la imagen Docker:
```bash
docker build -t ea2-frontend:latest .
```

### Ejecutar el contenedor:
```bash
docker run -d \
  --name ea2-frontend \
  --network ea2-network \
  -p 80:80 \
  ea2-frontend:latest
```

### Con Docker Compose (ejemplo):
```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ea2-frontend
    ports:
      - "80:80"
    networks:
      - ea2-network
    depends_on:
      - backend

  backend:
    image: ea2-backend:latest
    container_name: ea2-backend
    expose:
      - "3000"
    networks:
      - ea2-network

networks:
  ea2-network:
    driver: bridge
```

## URLs de Acceso
- **Frontend**: `http://ea2-api.upc.edu/` o `http://localhost/`
- **API**: Proxied en `/api` (internamente va a `http://backend:3000`)
- **WebSocket**: Proxied en `/socket.io` (internamente va a `http://backend:3000`)

## Notas Importantes

1. **URLs Relativas en Producción**: El `apiUrl: '/api'` permite que nginx haga proxy transparente
2. **WebSocket Upgrade**: La configuración de nginx incluye los headers necesarios para mantener conexiones WebSocket
3. **SPA Routing**: El `try_files` redirige todas las rutas no-archivo a `index.html` para que Angular Router maneje la navegación
4. **Build Optimization**: 
   - Stage multi-build reduce el tamaño de la imagen final
   - Solo nginx y la build compilada van a producción
   - Node.js y dependencias dev no se incluyen en la imagen final

## Variables de Ambiente
No necesita variables de ambiente adicionales en Docker. La configuración está compilada en el build con `--configuration production`.

Si necesita cambiar URLs en producción, puede:
1. Crear un environment.prod.ts diferente
2. Usar un servicio para cargar configuración desde un archivo en tiempo de ejecución
3. Usar nginx rewrite rules

## Testing Local
Para probar la build de producción localmente antes de dockerizar:
```bash
npm run build -- --configuration production
npx http-server dist/ea2/browser -p 4200
```
