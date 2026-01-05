import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventoService } from '../../services/evento.service';
import { Evento } from '../../models/evento.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { NotificacionesComponent } from '../notificaciones/notificaciones.component';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [CommonModule, TranslateModule, NotificacionesComponent],
  templateUrl: './invitaciones.component.html',
  styleUrls: ['./invitaciones.component.css']
})
export class InvitacionesComponent implements OnInit {
  invitaciones: Evento[] = [];
  loading = false;
  error = '';
  procesando: { [key: string]: boolean } = {};

  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  constructor(
    private eventoService: EventoService,
    private router: Router,
    private translate: TranslateService
  ) {
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en' | 'cat' | 'fr') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    this.cargarInvitaciones();
  }

  cargarInvitaciones(): void {
    this.loading = true;
    this.error = '';

    this.eventoService.getPendingInvitations().subscribe({
      next: (response) => {
        this.invitaciones = response.invitaciones || [];
        this.loading = false;
      },
      error: (err) => {
        this.translate.get('INVITATIONS.ERROR_LOADING').subscribe((text: string) => {
          this.error = text || 'Error al cargar las invitaciones';
        });
        this.loading = false;
        console.error('Error cargando invitaciones:', err);
      }
    });
  }

  aceptarInvitacion(evento: Evento): void {
    const eventId = evento._id;
    if (!eventId || this.procesando[eventId]) return;

    this.procesando[eventId] = true;

    this.eventoService.acceptInvitation(eventId).subscribe({
      next: () => {
        this.invitaciones = this.invitaciones.filter(e => e._id !== eventId);
        this.procesando[eventId] = false;
      },
      error: (err) => {
        console.error('Error aceptando invitación:', err);
        this.translate.get('INVITATIONS.ERROR_ACCEPT').subscribe((text: string) => {
          alert(text || 'Error al aceptar la invitación');
        });
        this.procesando[eventId] = false;
      }
    });
  }

  rechazarInvitacion(evento: Evento): void {
    const eventId = evento._id;
    if (!eventId || this.procesando[eventId]) return;

    this.procesando[eventId] = true;

    this.eventoService.rejectInvitation(eventId).subscribe({
      next: () => {
        this.invitaciones = this.invitaciones.filter(e => e._id !== eventId);
        this.procesando[eventId] = false;
      },
      error: (err) => {
        console.error('Error rechazando invitación:', err);
        this.translate.get('INVITATIONS.ERROR_REJECT').subscribe((text: string) => {
          alert(text || 'Error al rechazar la invitación');
        });
        this.procesando[eventId] = false;
      }
    });
  }

  formatearFecha(fecha: any): string {
    if (!fecha) {
      return this.translate.instant('INVITATIONS.DATE_NOT_SPECIFIED') || 'Fecha no especificada';
    }
    
    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return this.translate.instant('INVITATIONS.DATE_INVALID') || 'Fecha inválida';
    }

    const locale = this.currentLang === 'cat' ? 'ca-ES' : 
                   this.currentLang === 'fr' ? 'fr-FR' : 
                   this.currentLang === 'en' ? 'en-US' : 'es-ES';

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return d.toLocaleDateString(locale, opciones);
  }

  getNombreCreador(evento: Evento): string {
    if (!evento.creador) {
      return this.translate.instant('INVITATIONS.UNKNOWN') || 'Desconocido';
    }
    
    if (typeof evento.creador === 'string') {
      return evento.creador;
    }
    
    return evento.creador.username || this.translate.instant('INVITATIONS.UNKNOWN') || 'Desconocido';
  }

  estaProcesando(evento: Evento): boolean {
    return evento._id ? !!this.procesando[evento._id] : false;
  }

  volverAlMenu(): void {
    this.router.navigate(['/menu']);
  }

  irAEventos(): void {
    this.router.navigate(['/mis-eventos']);
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}