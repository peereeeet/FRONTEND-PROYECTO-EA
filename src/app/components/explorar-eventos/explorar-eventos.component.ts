import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Evento } from '../../models/evento.model';

@Component({
  selector: 'app-explorar-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './explorar-eventos.component.html',
  styleUrls: ['./explorar-eventos.component.css']
})
export class ExplorarEventosComponent implements OnInit {
  // ============ ESTADO DEL COMPONENTE ============
  eventos: Evento[] = [];
  loading = false;
  errorMessage = '';
  currentUserId: string = '';
  userRole: string = '';
  
  // ============ PAGINACIÓN ============
  page = 1;
  pageSize = 6;
  totalPages = 1;
  totalItems = 0;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 📌 PASO 1: Obtener datos del usuario actual desde AuthService
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.userRole = user?.rol || 'usuario';
    
    // 📌 PASO 2: Cargar eventos al inicializar
    this.loadEventos();
  }

  // ============ CARGA DE EVENTOS ============
  /**
   * Carga la lista paginada de eventos desde el backend
   * Normaliza la estructura de datos para asegurar consistencia
   */
  loadEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getEventos(this.page, this.pageSize).subscribe({
      next: (res) => {
        // 🔄 Normalización de datos del backend
        // Algunos campos vienen como string/array, aquí los unificamos
        this.eventos = res.data.map(e => ({
          ...e,
          // Asegurar que schedule siempre sea array
          schedule: Array.isArray(e.schedule) 
            ? e.schedule 
            : [e.schedule as any],
          
          // Asegurar que participantes siempre sea array de strings
          participantes: Array.isArray((e as any).participantes)
            ? (e as any).participantes
            : ((e as any).participants || [])
        }));

        // Actualizar datos de paginación
        this.totalPages = res.totalPages;
        this.totalItems = res.totalItems;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar eventos';
        this.loading = false;
        console.error(err);
      }
    });
  }

  // ============ NAVEGACIÓN DE PÁGINAS ============
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadEventos();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadEventos();
    }
  }

  // ============ UNIRSE A UN EVENTO ============
  /**
   * Permite al usuario inscribirse en un evento
   * @param evento - El evento al que desea unirse
   */
  joinEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.joinEvento(evento._id).subscribe({
      next: (updatedEvento) => {
        // ✅ Actualizar el evento en la lista local
        const index = this.eventos.findIndex(e => e._id === evento._id);
        if (index !== -1) {
          // Normalizar datos del evento actualizado
          this.eventos[index] = {
            ...updatedEvento,
            schedule: Array.isArray(updatedEvento.schedule)
              ? updatedEvento.schedule
              : [updatedEvento.schedule as any],
            participantes: Array.isArray((updatedEvento as any).participantes)
              ? (updatedEvento as any).participantes
              : ((updatedEvento as any).participants || [])
          };
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al unirse al evento';
        console.error(err);
      }
    });
  }

  // ============ SALIR DE UN EVENTO ============
  /**
   * Permite al usuario desinscribirse de un evento
   * @param evento - El evento del que desea salir
   */
  leaveEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.leaveEvento(evento._id).subscribe({
      next: (updatedEvento) => {
        // ✅ Actualizar el evento en la lista local
        const index = this.eventos.findIndex(e => e._id === evento._id);
        if (index !== -1) {
          this.eventos[index] = {
            ...updatedEvento,
            schedule: Array.isArray(updatedEvento.schedule)
              ? updatedEvento.schedule
              : [updatedEvento.schedule as any],
            participantes: Array.isArray((updatedEvento as any).participantes)
              ? (updatedEvento as any).participantes
              : ((updatedEvento as any).participants || [])
          };
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al salir del evento';
        console.error(err);
      }
    });
  }

  // ============ VERIFICACIONES DE ESTADO ============
  /**
   * Verifica si el usuario actual está inscrito en un evento
   */
  isUserInEvento(evento: Evento): boolean {
    if (!this.currentUserId || !evento.participantes) return false;
    return evento.participantes.includes(this.currentUserId);
  }

  /**
   * Verifica si el usuario actual es el creador del evento
   */
  isUserCreator(evento: Evento): boolean {
    if (!this.currentUserId || !evento.creador) return false;
    
    // El creador puede venir como objeto o string
    if (typeof evento.creador === 'object') {
      return evento.creador._id === this.currentUserId;
    }
    return evento.creador === this.currentUserId;
  }

  /**
   * Verifica si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  // ============ FORMATO DE DATOS ============
  /**
   * Formatea la fecha del horario para mostrar en UI
   */
  getScheduleText(e: Evento): string {
    if (Array.isArray(e.schedule) && e.schedule.length) {
      return this.formatSchedule(e.schedule[0]);
    }
    return '-';
  }

  /**
   * Formatea una fecha de formato ISO/backend a formato legible
   * Ejemplo: "2024-12-25 14:30" → "25-12-2024 14:30"
   */
  formatSchedule(s: string): string {
    if (!s) return '-';
    
    const sep = s.includes('T') ? 'T' : ' ';
    const [d, t = ''] = s.split(sep);
    const [y, m, d2] = d.split('-');
    const hhmm = t.slice(0, 5);
    
    if (y && m && d2) {
      return `${d2}-${m}-${y}${hhmm ? ' ' + hhmm : ''}`;
    }
    return s;
  }

  /**
   * Obtiene el nombre del creador del evento
   */
  getCreadorName(evento: Evento): string {
    if (typeof evento.creador === 'object' && evento.creador) {
      return evento.creador.username;
    }
    return 'Desconocido';
  }

  // ============ NAVEGACIÓN ============
  goBack(): void {
    this.router.navigate(['/menu']);
  }

  goToRatings(evento: Evento): void {
    if (!evento._id) return;
    this.router.navigate(['/events', evento._id, 'ratings'], {
      state: { 
        eventoName: evento.name,
        avgRating: evento.avgRating,
        ratingsCount: evento.ratingsCount
      }
    });
  }
}