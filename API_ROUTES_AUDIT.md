# Auditoría de Rutas API - Frontend vs Backend

## 📋 Rutas usadas por el Frontend Angular

### Auth Service
```
POST    /api/user/auth/login
POST    /api/user/auth/google
POST    /api/user/auth/create-admin
POST    /api/user/refresh
POST    /api/user/auth/google/check
GET     /api/auth/:endpoint (dynamic)
POST    /api/user/auth/:endpoint (dynamic)
```

### User Service (`/api/user/*`)
```
GET     /api/user?page=X&limit=X&q=X
GET     /api/user/visibleusers?page=X&limit=X&q=X
GET     /api/user/:id
GET     /api/user/:userId/events
GET     /api/user/detail/:userId              ⚠️ CRITICAL - Retorna 404 en producción
PUT     /api/user/:id (actualizar usuario)
PATCH   /api/user/:id/delete-with-password
PUT     /api/user/:id/self
POST    /api/user/:userId/profile-photo (upload)
GET     /api/user/:userId/profile-photo
POST    /api/user/usuarios/forgot-password/check
POST    /api/user/usuarios/reset-password/direct
PATCH   /api/user/:id/disable
PUT     /api/user/:userId/addEvent
POST    /api/user/check-email
POST    /api/user/check-username
PUT     /api/user/:id/rol
POST    /api/user/:userId/heartbeat
PUT     /api/user/:userId/online                ⚠️ CRITICAL - Retorna 404 en producción
PUT     /api/user/:userId/offline
GET     /api/user/:id/friends?page=X&limit=X&q=X
POST    /api/user/friend-request
POST    /api/user/friend-accept
POST    /api/user/friend-reject
POST    /api/user/info/unblock
GET     /api/user/:userId/blocked
POST    /api/user/:userId/chat/:friendId/image
GET     /api/user/:userId/chat/:friendId/image
DELETE  /api/user/:userId/chat/:messageId
GET     /api/user/friend-requests/:userId
GET     /api/user/requests/sent/:userId
GET     /api/user/:userId/online
```

### Evento Service (`/api/event/*`)
```
GET     /api/event?page=X&limit=X
GET     /api/event/upcoming?page=X&limit=X
GET     /api/event/:id
GET     /api/event/by-bounds?north=X&south=X&east=X&west=X&page=X&limit=X
POST    /api/event (crear evento)
POST    /api/event (actualización desde panel)
PUT     /api/event/:id (actualizar evento)
DELETE  /api/event/:id
POST    /api/event/:id/join
POST    /api/event/:id/leave
DELETE  /api/event/:id/waitlist
GET     /api/event/:id/waitlist/position
GET     /api/event/user/my-events
POST    /api/event/check-name
GET     /api/event/search?search=X&dateFrom=X&dateTo=X&categoria=X&page=X&limit=X
POST    /api/event/:id/invite
POST    /api/event/:id/accept-invitation
POST    /api/event/:id/reject-invitation
GET     /api/event/invitations/pending
DELETE  /api/event/:id/remove-invite/:userId
GET     /api/event/visible
GET     /api/event/calendar?dateFrom=X&dateTo=X
GET     /api/event/recommended?page=X&limit=X
POST    /api/event/:id/photos (upload)
GET     /api/event/:id/photos
DELETE  /api/event/:id/photos/:photoId
GET     /api/event/:id/photo/:filename
POST    /api/event/:id/chat-image (upload)
GET     /api/event/:id/chat/:imageId
DELETE  /api/event/:id/chat/:messageId
```

### Notificaciones Service (`/api/notificaciones/*`)
```
GET     /api/notificaciones/:userId?limit=X
GET     /api/notificaciones/:userId/unread
GET     /api/notificaciones/:userId/unread/count
POST    /api/notificaciones/:userId/mark-as-read
POST    /api/notificaciones/:userId/mark-all-read
POST    /api/notificaciones/:userId/mark-related
DELETE  /api/notificaciones/:id
```

### Ratings Service (`/api/ratings/*`)
```
POST    /api/ratings/event/:eventoId
GET     /api/ratings/event/:eventoId/my-rating
GET     /api/ratings/event/:eventoId
GET     /api/ratings/:id
PUT     /api/ratings/:id
DELETE  /api/ratings/:id
```

### AI Service (`/api/ai/*`)
```
POST    /api/ai/search
```

### Gamificación Service (`/api/gamificacion/*`)
```
GET     /api/gamificacion/mi-progreso
GET     /api/gamificacion/insignias
```

### Socket.io (WebSocket)
```
wss://ea2.upc.edu/socket.io/  -> proxeado a ws://backend:3000/socket.io
```

### Uploads
```
GET     /uploads/profile-photos/:filename
GET     /uploads/event-photos/:filename
GET     /uploads/:path/*
```

---

## 🔴 Rutas que retornan 404 (CRÍTICAS)

| Ruta | Método | Servicio | Uso | Solución |
|------|--------|----------|-----|----------|
| `/api/user/detail/:userId` | GET | user.service.ts | getUserDetail() | ¿Existe en backend? ¿Alias de `/api/user/:id`? |
| `/api/user/:userId/online` | PUT | user.service.ts | setOnline() | ¿Existe en backend? |

---

## 📝 Notas

1. **Verificar en backend**: ¿Estos endpoints existen exactamente como se definen?
2. **Posibles soluciones**:
   - Opción A: Crear aliases/rutas en el backend para que coincidan
   - Opción B: Actualizar el frontend para usar las rutas reales del backend
3. **URLs relativas**: El backend debe devolver URLs relativas (`/uploads/...` en lugar de `http://localhost:3000/uploads/...`)
4. **Docker network**: Asegurar que `http://backend:3000` es accesible desde el contenedor frontend

---

## ✅ Checklist Final

- [ ] Verificar GET `/api/user/detail/:id` en backend
- [ ] Verificar PUT `/api/user/:id/online` en backend
- [ ] Verificar que backend devuelve URLs relativas en respuestas
- [ ] Confirmar que nginx proxea `/uploads` al backend
- [ ] Probar WebSocket: `wss://ea2.upc.edu/socket.io`
- [ ] Probar imágenes de perfil: `GET /uploads/profile-photos/filename`
