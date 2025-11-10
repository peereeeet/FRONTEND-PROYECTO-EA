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
  eventos: Evento[] = [];
  loading = false;
  errorMessage = '';
  currentUserId: string = '';
  userRole: string = '';
  
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
    const user = this.authService.getCurrentUser();
    this.currentUserId = user?._id || '';
    this.userRole = user?.rol || 'usuario';
  
    this.loadEventos();
  }

  loadEventos(): void {
    this.loading = true;
    this.errorMessage = '';

    this.eventoService.getEventos(this.page, this.pageSize).subscribe({
      next: (res) => {
        this.eventos = res.data.map(e => ({
          ...e,
          schedule: Array.isArray(e.schedule) 
            ? e.schedule 
            : [e.schedule as any],
          
          participantes: Array.isArray((e as any).participantes)
            ? (e as any).participantes
            : ((e as any).participants || [])
        }));

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

  joinEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.joinEvento(evento._id).subscribe({
      next: (updatedEvento) => {
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
        this.errorMessage = err.error?.message || 'Error al unirse al evento';
        console.error(err);
      }
    });
  }

  leaveEvento(evento: Evento): void {
    if (!evento._id) return;

    this.eventoService.leaveEvento(evento._id).subscribe({
      next: (updatedEvento) => {
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

  isUserInEvento(evento: Evento): boolean {
    if (!this.currentUserId || !evento.participantes) return false;
    return evento.participantes.includes(this.currentUserId);
  }

  isUserCreator(evento: Evento): boolean {
    if (!this.currentUserId || !evento.creador) return false;
    if (typeof evento.creador === 'object') {
      return evento.creador._id === this.currentUserId;
    }
    return evento.creador === this.currentUserId;
  }

  isAdmin(): boolean {
    return this.userRole === 'admin';
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
    
    if (y && m && d2) {
      return `${d2}-${m}-${y}${hhmm ? ' ' + hhmm : ''}`;
    }
    return s;
  }

  getCreadorName(evento: Evento): string {
    if (typeof evento.creador === 'object' && evento.creador) {
      return evento.creador.username;
    }
    return 'Desconocido';
  }

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

  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }
}