import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificacionService } from '../../services/notificacion.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { Notificacion } from '../../models/notificacion.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private notificacionService = inject(NotificacionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private socketService = inject(SocketService);

  notificaciones = signal<Notificacion[]>([]);
  loading = signal(false);
  showPanel = signal(false);
  unreadCount = signal(0);
  
  hasNotificaciones = computed(() => this.notificaciones().length > 0);
  unreadNotificaciones = computed(() => 
    this.notificaciones().filter(n => !n.read)
  );

  ngOnInit() {
    console.log('🔔 NotificacionesComponent inicializado');
    this.loadNotificaciones();
    this.subscribeToUnreadCount();
    this.subscribeToNewNotificaciones();
    this.listenToSocketNotificaciones();
    this.requestNotificationPermission();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadNotificaciones() {
    const user = this.auth.getCurrentUser();
    if (!user?._id) {
      console.warn('⚠️ No hay usuario autenticado');
      return;
    }

    console.log('📥 Cargando notificaciones para usuario:', user._id);
    this.loading.set(true);
    this.notificacionService.getUserNotificaciones(user._id, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.ok) {
            console.log('✅ Notificaciones cargadas:', response.data.length);
            this.notificaciones.set(response.data);
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('❌ Error cargando notificaciones:', error);
          this.loading.set(false);
        }
      });
  }

  private subscribeToUnreadCount() {
    this.notificacionService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('🔢 Contador de no leídas actualizado:', count);
        this.unreadCount.set(count);
      });

    const user = this.auth.getCurrentUser();
    if (user?._id) {
      this.notificacionService.getUnreadCount(user._id).subscribe();
    }
  }

  private subscribeToNewNotificaciones() {
    this.notificacionService.notificaciones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notificaciones => {
        this.notificaciones.set(notificaciones);
      });
  }

  private listenToSocketNotificaciones() {
    const user = this.auth.getCurrentUser();
    if (!user?._id) {
      console.warn('⚠️ No se puede escuchar notificaciones sin usuario autenticado');
      return;
    }

    console.log('👂 Escuchando evento notification:new para usuario:', user._id);
    this.socketService.on('notification:new')
      .pipe(takeUntil(this.destroy$))
      .subscribe((notificacion: any) => {
        console.log('🔔 Nueva notificación recibida:', notificacion);
        
        const notif: Notificacion = {
          _id: notificacion._id,
          userId: notificacion.userId || user._id,
          type: notificacion.type,
          title: notificacion.title,
          message: notificacion.message,
          relatedUserId: notificacion.relatedUserId,
          relatedEventId: notificacion.relatedEventId,
          relatedUsername: notificacion.relatedUsername,
          relatedEventName: notificacion.relatedEventName,
          read: notificacion.read || false,
          createdAt: notificacion.createdAt || new Date().toISOString(),
          actionUrl: notificacion.actionUrl
        };
        
        this.notificacionService.addNotificacion(notif);
        this.showToastNotification(notif);
        
        this.playNotificationSound();
      });
  }

  private showToastNotification(notificacion: Notificacion) {
    console.log('📬 Mostrando notificación:', notificacion.title);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(notificacion.title, {
        body: notificacion.message,
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        tag: notificacion._id,
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        if (notificacion.actionUrl) {
          this.router.navigate([notificacion.actionUrl]);
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => console.log('No se pudo reproducir sonido:', err));
    } catch (err) {
      console.log('Error reproduciendo sonido:', err);
    }
  }

  togglePanel() {
    this.showPanel.update(v => !v);
  }

  closePanel() {
    this.showPanel.set(false);
  }

  onNotificacionClick(notificacion: Notificacion) {
    console.log('👆 Click en notificación:', notificacion.title);
    
    if (!notificacion.read) {
      this.notificacionService.markAsRead(notificacion._id).subscribe({
        next: () => console.log('✅ Notificación marcada como leída'),
        error: (err) => console.error('❌ Error marcando como leída:', err)
      });
    }

    if (notificacion.actionUrl) {
      this.router.navigate([notificacion.actionUrl]);
      this.closePanel();
    }
  }

  markAllAsRead() {
    const user = this.auth.getCurrentUser();
    if (!user?._id) return;

    console.log('✅ Marcando todas como leídas');
    this.notificacionService.markAllAsRead(user._id).subscribe({
      next: () => console.log('✅ Todas marcadas como leídas'),
      error: (err) => console.error('❌ Error:', err)
    });
  }

  deleteNotificacion(notificacion: Notificacion, event: Event) {
    event.stopPropagation();
    console.log('🗑️ Eliminando notificación:', notificacion.title);
    
    this.notificacionService.deleteNotificacion(notificacion._id).subscribe({
      next: () => console.log('✅ Notificación eliminada'),
      error: (err) => console.error('❌ Error eliminando:', err)
    });
  }

  getNotificacionIcon(type: Notificacion['type']): string {
    const icons = {
      friend_request: '👋',
      friend_accepted: '🤝',
      event_join: '🎉',
      event_reminder: '⏰',
      new_message: '💬'
    };
    return icons[type] || '🔔';
  }

  getNotificacionColor(type: Notificacion['type']): string {
    const colors = {
      friend_request: 'blue',
      friend_accepted: 'green',
      event_join: 'purple',
      event_reminder: 'orange',
      new_message: 'pink'
    };
    return colors[type] || 'gray';
  }

  getRelativeTime(date: string): string {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return notifDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Permiso de notificaciones:', permission);
      });
    }
  }
}