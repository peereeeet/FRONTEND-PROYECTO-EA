import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Evento } from '../../models/evento.model';

@Component({
  selector: 'app-mis-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mis-eventos.component.html',
  styleUrls: ['./mis-eventos.component.css']
})
export class MisEventosComponent implements OnInit {
  // ============ ESTADO DEL COMPONENTE ============
  eventosCreados: Evento[] = [];      // Eventos que el usuario creó
  eventosInscritos: Evento[] = [];    // Eventos donde está inscrito
  loading = false;                     // Indicador de carga
  errorMessage = '';                   // Mensajes de error
  currentUserId: string = '';          // ID del usuario actual

  // ============ MODALES ============
  showDeleteModal = false;             // Mostrar modal de eliminar
  eventoToDelete: Evento | null = null; // Evento a eliminar
  showLeaveModal = false;              // Mostrar modal de salir
  eventoToLeave: Evento | null = null; // Evento del que salir

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 📌 Obtener ID del usuario actual
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    
    // 📌 Cargar eventos del usuario
    this.loadMisEventos();
  }

  // ============ CARGA DE DATOS ============
  /**
   * Carga los eventos creados e inscritos del usuario
   * Normaliza las estructuras de datos del backend
   */
  loadMisEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getMisEventos().subscribe({
      next: (res) => {
        // 🔄 Normalizar eventos creados
        this.eventosCreados = res.eventosCreados.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) 
            ? e.schedule 
            : [e.schedule as any]
        }));

        // 🔄 Normalizar eventos inscritos
        this.eventosInscritos = res.eventosInscritos.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) 
            ? e.schedule 
            : [e.schedule as any]
        }));

        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = 'Error al cargar eventos';
        console.error(err);
        this.loading = false;
      }
    });
  }

  // ============ MODALES - ELIMINAR EVENTO ============
  /**
   * Abre el modal de confirmación para eliminar un evento
   * Solo disponible para eventos creados por el usuario
   */
  openDeleteModal(evento: Evento): void {
    this.eventoToDelete = evento;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.eventoToDelete = null;
  }

  /**
   * Elimina el evento y actualiza la lista
   * Solo el creador puede eliminar sus eventos
   */
  confirmarEliminar(): void {
    if (!this.eventoToDelete?._id) return;
    
    this.eventoService.deleteEvento(this.eventoToDelete._id).subscribe({
      next: () => {
        // ✅ Recargar la lista completa
        this.loadMisEventos();
        this.closeDeleteModal();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al eliminar evento';
        this.closeDeleteModal();
      }
    });
  }

  // ============ MODALES - SALIR DE EVENTO ============
  /**
   * Abre el modal de confirmación para salir de un evento
   * Solo disponible para eventos donde el usuario está inscrito
   */
  openLeaveModal(evento: Evento): void {
    this.eventoToLeave = evento;
    this.showLeaveModal = true;
  }

  closeLeaveModal(): void {
    this.showLeaveModal = false;
    this.eventoToLeave = null;
  }

  /**
   * Desinscribe al usuario del evento
   */
  confirmarSalir(): void {
    if (!this.eventoToLeave?._id) return;
    
    this.eventoService.leaveEvento(this.eventoToLeave._id).subscribe({
      next: () => {
        // ✅ Recargar la lista completa
        this.loadMisEventos();
        this.closeLeaveModal();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al salir del evento';
        this.closeLeaveModal();
      }
    });
  }

  // ============ FORMATO DE DATOS ============
  /**
   * Obtiene el texto formateado del horario del evento
   */
  getScheduleText(e: Evento): string {
    if (Array.isArray(e.schedule) && e.schedule.length) {
      return this.formatSchedule(e.schedule[0]);
    }
    return '-';
  }

  /**
   * Formatea una fecha del formato backend al formato de visualización
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
   * 🆕 Obtiene el nombre del creador del evento
   * Maneja tanto objetos como strings
   */
  getCreadorName(evento: Evento): string {
    // Si el creador es un objeto poblado (con populate)
    if (typeof evento.creador === 'object' && evento.creador) {
      return evento.creador.username;
    }
    
    // Si es solo un ID (string)
    if (typeof evento.creador === 'string') {
      // Verificar si es el usuario actual
      if (evento.creador === this.currentUserId) {
        return 'Tú';
      }
      return 'Desconocido';
    }
    
    return 'Desconocido';
  }

  // ============ NAVEGACIÓN ============
  /**
   * Navega a la página de valoraciones del evento
   */
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

  /**
   * Vuelve al menú principal
   */
  goBack(): void {
    this.router.navigate(['/menu']);
  }
}