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
  eventosCreados: Evento[] = [];
  eventosInscritos: Evento[] = [];
  loading = false;
  errorMessage = '';
  showDeleteModal = false;
  eventoToDelete: Evento | null = null;
  showLeaveModal = false;
  eventoToLeave: Evento | null = null;
  currentUserId: string = '';

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.loadMisEventos();
  }

  loadMisEventos(): void {
    this.loading = true;
    this.eventoService.getMisEventos().subscribe({
      next: (res) => {
        this.eventosCreados = res.eventosCreados.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) ? e.schedule : [e.schedule as any]
        }));
        this.eventosInscritos = res.eventosInscritos.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) ? e.schedule : [e.schedule as any]
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

  openDeleteModal(evento: Evento): void {
    this.eventoToDelete = evento;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.eventoToDelete = null;
  }

  confirmarEliminar(): void {
    if (!this.eventoToDelete?._id) return;
    
    this.eventoService.deleteEvento(this.eventoToDelete._id).subscribe({
      next: () => {
        this.loadMisEventos();
        this.closeDeleteModal();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al eliminar evento';
        this.closeDeleteModal();
      }
    });
  }

  openLeaveModal(evento: Evento): void {
    this.eventoToLeave = evento;
    this.showLeaveModal = true;
  }

  closeLeaveModal(): void {
    this.showLeaveModal = false;
    this.eventoToLeave = null;
  }

  confirmarSalir(): void {
    if (!this.eventoToLeave?._id) return;
    
    this.eventoService.leaveEvento(this.eventoToLeave._id).subscribe({
      next: () => {
        this.loadMisEventos();
        this.closeLeaveModal();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al salir del evento';
        this.closeLeaveModal();
      }
    });
  }

  getScheduleText(e: Evento): string {
    if (Array.isArray(e.schedule) && e.schedule.length) {
      return this.formatSchedule(e.schedule[0]);
    }
    return '-';
  }

  formatSchedule(s: string): string {
    if (!s) return '-';
    const sep = s.includes('T') ? 'T' : ' ';
    const [d, t = ''] = s.split(sep);
    const [y, m, d2] = d.split('-');
    const hhmm = t.slice(0, 5);
    if (y && m && d2) return `${d2}-${m}-${y}${hhmm ? ' ' + hhmm : ''}`;
    return s;
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

  goBack(): void {
    this.router.navigate(['/menu']);
  }

  getCreadorName(evento: Evento): string {
    if (typeof evento.creador === 'object' && evento.creador) {
      return evento.creador.username;
    }
    return 'Desconocido';
  }
}