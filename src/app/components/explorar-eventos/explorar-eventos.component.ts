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

  private readonly timeZone = 'Europe/Madrid';

  private fromISOtoInputs(iso?: any): { dateStr: string; timeStr: string } {
    if (!iso) return { dateStr: '', timeStr: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear(), mm = pad(d.getMonth() + 1), dd = pad(d.getDate());
    const hh = pad(d.getHours()), mi = pad(d.getMinutes());
    return { dateStr: `${yyyy}-${mm}-${dd}`, timeStr: `${hh}:${mi}` };
  }

  private formatSchedule(iso?: any): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    const { dateStr } = this.fromISOtoInputs(iso);
    const savedAtMidnight =
      d.getUTCHours() === 0 && d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 &&
      (new Date(`${dateStr}T00:00:00Z`).toISOString() === new Date(iso).toISOString());

    const base = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      timeZone: this.timeZone,
    }).format(d).replace('.', '');

    if (savedAtMidnight) return `${base} · todo el día`;

    const hm = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: this.timeZone,
    }).format(d);

    return `${base} · ${hm}`;
  }

  getScheduleText = (ev: any) => this.formatSchedule(ev?.schedule);

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