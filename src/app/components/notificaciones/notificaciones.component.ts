import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificacionService } from '../../services/notificacion.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { Notificacion } from '../../models/notificacion.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  private translate = inject(TranslateService);

  notificaciones = signal<Notificacion[]>([]);
  loading = signal(false);
  showPanel = signal(false);
  unreadCount = signal(0);
  
  hasNotificaciones = computed(() => this.notificaciones().length > 0);
  unreadNotificaciones = computed(() => 
    this.notificaciones().filter(n => !n.read)
  );

  ngOnInit() {
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
    if (!user?._id) return;

    this.loading.set(true);
    this.notificacionService.getUserNotificaciones(user._id, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.ok) {
            this.notificaciones.set(response.data);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }

  private subscribeToUnreadCount() {
    this.notificacionService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
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
    if (!user?._id) return;

    this.socketService.on('notification:new')
      .pipe(takeUntil(this.destroy$))
      .subscribe((notificacion: any) => {
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
    if ('Notification' in window && Notification.permission === 'granted') {
      const translatedTitle = this.getTranslatedTitle(notificacion.type);
      const translatedMessage = this.getTranslatedMessage(notificacion);
      
      const notification = new Notification(translatedTitle, {
        body: translatedMessage,
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        tag: notificacion._id,
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        this.handleNotificationNavigationFromToast(notificacion);
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  }

  private playNotificationSound() {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (err) {}
  }

  togglePanel() {
    this.showPanel.update(v => !v);
  }

  closePanel() {
    this.showPanel.set(false);
  }

  onNotificacionClick(notificacion: Notificacion) {
    if (!notificacion.read) {
      this.notificacionService.markAsRead(notificacion._id).subscribe();
    }

    this.handleNotificationNavigation(notificacion);
    this.closePanel();
  }

  private handleNotificationNavigation(notificacion: Notificacion) {
    switch (notificacion.type) {
      case 'new_message':
        if (notificacion.relatedUserId) {
          this.router.navigate(['/menu'], { 
            queryParams: { openChat: notificacion.relatedUserId } 
          });
        }
        break;

      case 'friend_request':
        this.router.navigate(['/menu'], { 
          queryParams: { openRequests: 'true' } 
        });
        break;

      case 'friend_accepted':
        this.router.navigate(['/menu']);
        break;

      case 'event_invitation':
        // Navegar a la página de invitaciones
        this.router.navigate(['/invitaciones']);
        break;

      case 'event_join':
      case 'event_reminder':
      case 'event_spot_available':
        if (notificacion.actionUrl) {
          this.router.navigate([notificacion.actionUrl]);
        }
        break;

      default:
        if (notificacion.actionUrl) {
          this.router.navigate([notificacion.actionUrl]);
        }
        break;
    }
  }

  private handleNotificationNavigationFromToast(notificacion: Notificacion) {
    this.handleNotificationNavigation(notificacion);
  }

  markAllAsRead() {
    const user = this.auth.getCurrentUser();
    if (!user?._id) return;

    this.notificacionService.markAllAsRead(user._id).subscribe();
  }

  deleteAllNotificaciones() {
    const user = this.auth.getCurrentUser();
    if (!user?._id) return;

    const confirmMessage = this.translate.instant('NOTIFICATIONS.DELETE_ALL_CONFIRM');
    if (!confirm(confirmMessage)) return;

    const currentNotifs = this.notificaciones();
    currentNotifs.forEach((notif) => {
      this.notificacionService.deleteNotificacion(notif._id).subscribe();
    });
  }

  deleteNotificacion(notificacion: Notificacion, event: Event) {
    event.stopPropagation();
    this.notificacionService.deleteNotificacion(notificacion._id).subscribe();
  }

  getTranslatedTitle(type: Notificacion['type']): string {
    return this.translate.instant(`NOTIFICATIONS.TYPES.${type}`);
  }

  getTranslatedMessage(notif: Notificacion): string {
    switch (notif.type) {
      case 'friend_request':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.friend_request', {
          username: notif.relatedUsername || 'Un usuario'
        });
      
      case 'friend_accepted':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.friend_accepted', {
          username: notif.relatedUsername || 'Un usuario'
        });
      
      case 'event_join':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.event_join', {
          username: notif.relatedUsername || 'Un amigo',
          eventName: notif.relatedEventName || 'tu evento'
        });
      
      case 'event_reminder':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.event_reminder', {
          eventName: notif.relatedEventName || 'un evento'
        });
      
      case 'new_message':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.new_message', {
          username: notif.relatedUsername || 'Un usuario'
        });
      
      case 'event_spot_available':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.event_spot_available', {
          eventName: notif.relatedEventName || 'un evento'
        });
      
      case 'event_invitation':
        return this.translate.instant('NOTIFICATIONS.MESSAGES.event_invitation', {
          username: notif.relatedUsername || 'Un usuario',
          eventName: notif.relatedEventName || 'un evento'
        });
      
      default:
        return notif.message;
    }
  }

  getNotificacionIcon(type: Notificacion['type']): string {
    const icons = {
      friend_request: '👋',
      friend_accepted: '🤝',
      event_join: '🎉',
      event_reminder: '⏰',
      new_message: '💬',
      event_spot_available: '🎟️',
      event_invitation: '📧'
    };
    return icons[type] || '🔔';
  }

  getNotificacionColor(type: Notificacion['type']): string {
    const colors = {
      friend_request: 'blue',
      friend_accepted: 'green',
      event_join: 'purple',
      event_reminder: 'orange',
      new_message: 'pink',
      event_spot_available: 'yellow',
      event_invitation: 'indigo'
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

    if (diffMins < 1) return this.translate.instant('NOTIFICATIONS.NOW');
    if (diffMins < 60) return this.translate.instant('NOTIFICATIONS.MINUTES_AGO', { minutes: diffMins });
    if (diffHours < 24) return this.translate.instant('NOTIFICATIONS.HOURS_AGO', { hours: diffHours });
    if (diffDays < 7) return this.translate.instant('NOTIFICATIONS.DAYS_AGO', { days: diffDays });
    
    return notifDate.toLocaleDateString(this.translate.currentLang || 'es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}