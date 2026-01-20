# Refactorización de URLs de Uploads - Eliminación de /api/uploads

## Objetivo
Eliminar el prefijo `/api` de todas las rutas de subidas y archivos estáticos. Las imágenes, fotos de perfil y otros activos ahora se acceden directamente vía `/uploads/...` en lugar de `/api/uploads/...`.

## Cambios Realizados

### 1. Configuración de Ambiente
**Archivos modificados:**
- `src/app/environments/environment.ts`
- `src/app/environments/environment.prod.ts`

**Cambios:**
- Agregado `uploadsPath: '/uploads'` a la configuración de environment
- Creada función helper `getAssetUrl(path: string, token?: string)` que construye URLs de assets correctamente
- La función utiliza `environment.assetsBaseUrl` como base (sin `/api`)

**Nuevo helper:**
```typescript
export function getAssetUrl(path: string, token?: string): string {
  const url = `${environment.assetsBaseUrl}${path}`;
  return token ? `${url}?token=${token}` : url;
}
```

### 2. Templates HTML
**Archivos modificados:**
- `src/app/components/perfil/perfil.component.html` (2 cambios)
- `src/app/components/menu/menu.component.html` (4 cambios)

**Cambios:**
- Reemplazadas todas las referencias hardcodeadas `'http://localhost:3000' + profilePhotoUrl()`
- Reemplazadas por llamadas a `getAssetUrl(profilePhotoUrl())`
- Conserva el soporte para tokens en query string automáticamente

**Líneas modificadas:**
- `perfil.component.html`: líneas 19, 262
- `menu.component.html`: líneas 19, 1130, 1201, 1494

### 3. Componentes TypeScript
**Archivos modificados:**
- `src/app/components/perfil/perfil.component.ts`
- `src/app/components/menu/menu.component.ts`

**Cambios:**
- Importado el helper `getAssetUrl` desde `src/app/environments/environment`
- Expuesto como propiedad del componente: `getAssetUrl = getAssetUrl;`
- Permite que los templates usen la función directamente

### 4. Métodos Existentes (sin cambios)
Los siguientes métodos ya usan `environment.assetsBaseUrl` correctamente:
- `menu.component.ts` - `getChatImageUrl()` 
- `mis-eventos.component.ts` - `getEventChatImageUrl()`
- `mis-eventos.component.ts` - `getPhotoUrl()`

**Nota:** Estos métodos ya fueron actualizados en la refactorización anterior para usar `assetsBaseUrl` en lugar de `apiUrl`.

## Resultado Final

### URLs Correctas (Producción)
```
Perfil: https://ea2.upc.edu/uploads/profile-photos/filename.jpg
Chat:   https://ea2.upc.edu/uploads/friend-chat/filename.jpg
Evento: https://ea2.upc.edu/uploads/event-photos/filename.jpg
```

### URLs con Token (Seguridad)
```
Perfil: https://ea2.upc.edu/uploads/profile-photos/filename.jpg?token=JWT_TOKEN
Chat:   https://ea2.upc.edu/uploads/friend-chat/filename.jpg?token=JWT_TOKEN
```

### URLs Desarrollo
```
Perfil: http://localhost:3000/uploads/profile-photos/filename.jpg
Chat:   http://localhost:3000/uploads/friend-chat/filename.jpg
```

## Nginx Routing
El nginx está configurado para proxear `/uploads/` directamente al backend:
```nginx
location /uploads/ {
  proxy_pass http://backend:3000;
  proxy_http_version 1.1;
  
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  
  expires 30d;
  add_header Cache-Control "public, immutable";
}
```

## Ventajas de Este Cambio

1. **Arquitectura Limpia**: Separación clara entre rutas API (`/api/*`) y activos (`/uploads/*`)
2. **Mejor Caché**: Los activos pueden tener políticas de caché más agresivas sin afectar la API
3. **Escalabilidad**: Permite servir uploads desde un CDN o servidor separado en el futuro
4. **Mantenibilidad**: Un único helper `getAssetUrl()` centraliza la lógica de construcción de URLs
5. **Compatibilidad**: Mantiene soporte para tokens en query string para seguridad

## Verificación

Para verificar que los cambios funcionan correctamente:

1. Construir imagen Docker:
   ```bash
   docker build --no-cache -t jin03/proyecto_ea-frontend:latest .
   ```

2. Ejecutar contenedor:
   ```bash
   docker run -d --name ea2-frontend -p 80:80 jin03/proyecto_ea-frontend:latest
   ```

3. Verificar en navegador:
   - Navegar a https://ea2.upc.edu/profile
   - Inspeccionar Network tab
   - Verificar que las imágenes se cargan desde `/uploads/` (no `/api/uploads/`)

## Archivos Modificados - Resumen

| Archivo | Cambios | Tipo |
|---------|---------|------|
| `environment.ts` | Agregado `uploadsPath` y helper `getAssetUrl()` | Config |
| `environment.prod.ts` | Agregado `uploadsPath` y helper `getAssetUrl()` | Config |
| `perfil.component.ts` | Import de `getAssetUrl`, asignación a propiedad | TypeScript |
| `perfil.component.html` | 2x reemplazos de hardcoded localhost | Template |
| `menu.component.ts` | Import de `getAssetUrl`, asignación a propiedad | TypeScript |
| `menu.component.html` | 4x reemplazos de hardcoded localhost | Template |

**Total: 6 archivos modificados**

## Próximos Pasos

1. Verificar que las imágenes se cargan correctamente
2. Probar carga de nuevas imágenes de perfil
3. Verificar chat images se cargan desde `/uploads/`
4. Considerar agregar validación en el backend para URLs relativas
