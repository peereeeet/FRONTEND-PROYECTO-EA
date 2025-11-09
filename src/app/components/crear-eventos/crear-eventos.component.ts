import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { Evento } from '../../models/evento.model';

type NewEventDTO = {
  name: string;
  schedule: string;          // << siempre string (evitamos undefined)
  address?: string;
  participants: string[];    // guardamos ids
};

@Component({
  selector: 'app-crear-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-eventos.component.html',
  styleUrls: ['./crear-eventos.component.css']
})
export class CrearEventosComponent implements OnInit {
  // Services / router
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private eventoService = inject(EventoService);
  private router = inject(Router);

  // Estado UI
  formSubmitted = false;
  saving = false;
  errorMessage = '';

  // Modelo del formulario
  newEvent: NewEventDTO = {
    name: '',
    schedule: '',          // << inicia vacío pero string
    address: '',
    participants: []
  };

  // Campos de fecha/hora independientes para construir schedule
  dateStr = '';
  timeStr = '';

  // Listas de usuarios para seleccionar participantes
  allUsers: User[] = [];
  me: User | null = null;

  selectedUsers: User[] = [];
  availableUsers: User[] = [];

  // Paginación disponibles
  availablePage = 1;
  availablePageSize = 8;
  get availableTotalPages(): number {
    return Math.max(1, Math.ceil(this.availableUsers.length / this.availablePageSize));
  }
  get availablePageItems(): User[] {
    const start = (this.availablePage - 1) * this.availablePageSize;
    return this.availableUsers.slice(start, start + this.availablePageSize);
  }

  // Paginación seleccionados
  selectedPage = 1;
  selectedPageSize = 8;
  get selectedTotalPages(): number {
    return Math.max(1, Math.ceil(this.selectedUsers.length / this.selectedPageSize));
  }
  get selectedPageItems(): User[] {
    const start = (this.selectedPage - 1) * this.selectedPageSize;
    return this.selectedUsers.slice(start, start + this.selectedPageSize);
  }

  ngOnInit(): void {
    // Cogemos usuario logueado
    this.auth.currentUser$.subscribe(u => {
      if (!u) {
        this.router.navigate(['/login']);
        return;
      }
      this.me = u as User;
      // Cargar usuarios para seleccionar
      this.loadUsers();
    });
  }

  private loadUsers(): void {
    // Traemos una página amplia para poder seleccionar (ajusta si necesitas server-side)
    this.userService.getUsers(1, 200, '').subscribe({
      next: (page) => {
        // Excluimos a uno mismo por defecto
        this.allUsers = (page?.data ?? []).filter(u => u._id !== this.me?._id);
        this.recomputeLists();
      },
      error: () => {
        this.allUsers = [];
        this.recomputeLists();
      }
    });
  }

  private recomputeLists(): void {
    const selectedIds = new Set(this.selectedUsers.map(u => u._id!));
    this.availableUsers = this.allUsers.filter(u => !selectedIds.has(u._id!));
    // Corrige páginas por si el total cambió
    this.availablePage = Math.min(this.availablePage, this.availableTotalPages);
    this.selectedPage = Math.min(this.selectedPage, this.selectedTotalPages);
  }

  // ====== Participantes ======
  addParticipant(u: User): void {
    if (!u?._id) return;
    // Si no está, lo añadimos
    if (!this.selectedUsers.find(x => x._id === u._id)) {
      this.selectedUsers.push(u);
      this.newEvent.participants.push(u._id);
      this.recomputeLists();
    }
  }

  removeParticipant(u: User): void {
    if (!u?._id) return;
    this.selectedUsers = this.selectedUsers.filter(x => x._id !== u._id);
    this.newEvent.participants = this.newEvent.participants.filter(id => id !== u._id);
    this.recomputeLists();
  }

  // ====== Paginación ======
  availablePrevPage(): void { if (this.availablePage > 1) this.availablePage--; }
  availableNextPage(): void { if (this.availablePage < this.availableTotalPages) this.availablePage++; }

  selectedPrevPage(): void { if (this.selectedPage > 1) this.selectedPage--; }
  selectedNextPage(): void { if (this.selectedPage < this.selectedTotalPages) this.selectedPage++; }

  // ====== Horario ======
  private composeISOFromDateTime(d: string, t: string): string {
    if (!d && !t) return '';
    // Si solo hay fecha, usamos 00:00; si solo hay hora, usamos hoy (poco común)
    const date = d || new Date().toISOString().slice(0,10);
    const time = t || '00:00';
    // Construye ISO local sin timezone, el backend puede normalizar
    return `${date}T${time}`;
  }

  setSchedule(): void {
    const iso = this.composeISOFromDateTime(this.dateStr, this.timeStr);
    this.newEvent.schedule = iso; // << string garantizado
  }

  clearSchedule(): void {
    this.newEvent.schedule = '';
    this.dateStr = '';
    this.timeStr = '';
  }

  getScheduleText(e: { schedule: string }): string {
    if (!e?.schedule) return 'Sin horario establecido';
    try {
      const d = new Date(e.schedule);
      // Si el parse falla, devolvemos el literal
      if (isNaN(+d)) return e.schedule;
      return d.toLocaleString();
    } catch {
      return e.schedule;
    }
  }

  // ====== Guardar ======
  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';

    // Validaciones mínimas
    if (!this.newEvent.name || this.newEvent.name.trim().length < 3) {
      this.errorMessage = 'El título es obligatorio (mínimo 3 caracteres).';
      return;
    }

    // Si el usuario ha rellenado fecha/hora pero no pulsó "Establecer horario", lo componemos
    if (!this.newEvent.schedule && (this.dateStr || this.timeStr)) {
      this.newEvent.schedule = this.composeISOFromDateTime(this.dateStr, this.timeStr);
    }

    // Aseguramos que schedule sea string (aunque sea cadena vacía)
    if (typeof this.newEvent.schedule !== 'string') {
      this.newEvent.schedule = String(this.newEvent.schedule ?? '');
    }

    // Montamos el objeto compatible con Evento (schedule: string | string[])
    const payload: Evento = {
      name: this.newEvent.name.trim(),
      schedule: this.newEvent.schedule,   // << ya es string garantizado
      address: this.newEvent.address?.trim() || '',
      participants: this.newEvent.participants.slice() // ids
    } as Evento;

    this.saving = true;
    this.eventoService.addEvento(payload).subscribe({
      next: () => {
        this.saving = false;
        // Redirigimos a la lista o al menú, como prefieras
        this.router.navigate(['/menu']);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message || err?.message || 'No se pudo crear el evento.';
      }
    });
  }

  // ====== Navegación ======
  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }
}
