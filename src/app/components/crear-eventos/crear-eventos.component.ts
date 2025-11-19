import { Component, inject, OnInit } from '@angular/core';
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
  schedule: string;
  address?: string;
  participants: string[];
  lat?: number | null; // 🆕
  lng?: number | null; // 🆕
};

@Component({
  selector: 'app-crear-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-eventos.component.html',
  styleUrls: ['./crear-eventos.component.css'],
})
export class CrearEventosComponent implements OnInit {
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private eventoService = inject(EventoService);
  private router = inject(Router);

  formSubmitted = false;
  saving = false;
  errorMessage = '';

  newEvent: NewEventDTO = {
    name: '',
    schedule: '',
    address: '',
    participants: [],
    lat: null,
    lng: null,
  };

  dateStr = '';
  timeStr = '';

  // 🆕 strings para los inputs de lat/lng
  latStr = '';
  lngStr = '';

  allUsers: User[] = [];
  me: User | null = null;

  selectedUsers: User[] = [];
  availableUsers: User[] = [];

  availablePage = 1;
  availablePageSize = 8;
  get availableTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.availableUsers.length / this.availablePageSize)
    );
  }
  get availablePageItems(): User[] {
    const start = (this.availablePage - 1) * this.availablePageSize;
    return this.availableUsers.slice(start, start + this.availablePageSize);
  }

  selectedPage = 1;
  selectedPageSize = 8;
  get selectedTotalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.selectedUsers.length / this.selectedPageSize)
    );
  }
  get selectedPageItems(): User[] {
    const start = (this.selectedPage - 1) * this.selectedPageSize;
    return this.selectedUsers.slice(start, start + this.selectedPageSize);
  }

  ngOnInit(): void {
    this.auth.currentUser$.subscribe((u) => {
      if (!u) {
        this.router.navigate(['/login']);
        return;
      }
      this.me = u as User;
      this.loadUsers();
    });
  }

  private loadUsers(): void {
    this.userService.getUsers(1, 200, '').subscribe({
      next: (page) => {
        this.allUsers = (page?.data ?? []).filter(
          (u) => u._id !== this.me?._id
        );
        this.recomputeLists();
      },
      error: () => {
        this.allUsers = [];
        this.recomputeLists();
      },
    });
  }

  private recomputeLists(): void {
    const selectedIds = new Set(this.selectedUsers.map((u) => u._id!));
    this.availableUsers = this.allUsers.filter((u) => !selectedIds.has(u._id!));
    this.availablePage = Math.min(this.availablePage, this.availableTotalPages);
    this.selectedPage = Math.min(this.selectedPage, this.selectedTotalPages);
  }

  addParticipant(u: User): void {
    if (!u?._id) return;
    if (!this.selectedUsers.find((x) => x._id === u._id)) {
      this.selectedUsers.push(u);
      this.newEvent.participants.push(u._id);
      this.recomputeLists();
    }
  }

  removeParticipant(u: User): void {
    if (!u?._id) return;
    this.selectedUsers = this.selectedUsers.filter((x) => x._id !== u._id);
    this.newEvent.participants = this.newEvent.participants.filter(
      (id) => id !== u._id
    );
    this.recomputeLists();
  }

  availablePrevPage(): void {
    if (this.availablePage > 1) this.availablePage--;
  }
  availableNextPage(): void {
    if (this.availablePage < this.availableTotalPages) this.availablePage++;
  }

  selectedPrevPage(): void {
    if (this.selectedPage > 1) this.selectedPage--;
  }
  selectedNextPage(): void {
    if (this.selectedPage < this.selectedTotalPages) this.selectedPage++;
  }

  private composeISOFromDateTime(d: string, t: string): string {
    if (!d && !t) return '';
    const date = d || new Date().toISOString().slice(0, 10);
    const time = t || '00:00';
    return `${date}T${time}`;
  }

  private readonly timeZone = 'Europe/Madrid';

  private toISO(dateStr?: string, timeStr?: string): string | null {
    if (!dateStr) return null;
    const t = timeStr && timeStr.trim() ? timeStr.trim() : '00:00';
    const local = new Date(`${dateStr}T${t}:00`);
    if (isNaN(local.getTime())) return null;
    return local.toISOString();
  }

  private fromISOtoInputs(iso?: any): { dateStr: string; timeStr: string } {
    if (!iso) return { dateStr: '', timeStr: '' };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' };
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return { dateStr: `${yyyy}-${mm}-${dd}`, timeStr: `${hh}:${mi}` };
  }

  formatSchedule(iso?: any): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';

    const noTime =
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      d.getUTCMilliseconds() === 0 &&
      new Date(
        `${this.fromISOtoInputs(iso).dateStr}T00:00:00Z`
      ).toISOString() === new Date(iso).toISOString();

    const base = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: this.timeZone,
    }).format(d);

    if (noTime) {
      return `${base.replace('.', '')} · todo el día`;
    }

    const hm = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: this.timeZone,
    }).format(d);

    return `${base.replace('.', '')} · ${hm}`;
  }

  setSchedule() {
    const iso = this.toISO(this.dateStr, this.timeStr);
    if (!iso) {
      this.errorMessage = 'Selecciona al menos la fecha válida.';
      return;
    }
    this.newEvent.schedule = iso;
    this.errorMessage = '';
  }

  clearSchedule() {
    this.newEvent.schedule = '';
  }

  getScheduleText = (ev: any) => this.formatSchedule(ev?.schedule);

  onSubmit(): void {
    this.formSubmitted = true;
    this.errorMessage = '';

    if (!this.newEvent.name || this.newEvent.name.trim().length < 3) {
      this.errorMessage = 'El título es obligatorio (mínimo 3 caracteres).';
      return;
    }

    if (!this.newEvent.schedule && (this.dateStr || this.timeStr)) {
      this.newEvent.schedule = this.composeISOFromDateTime(
        this.dateStr,
        this.timeStr
      );
    }

    if (typeof this.newEvent.schedule !== 'string') {
      this.newEvent.schedule = String(this.newEvent.schedule ?? '');
    }

    if (this.me?._id && !this.newEvent.participants.includes(this.me._id)) {
      this.newEvent.participants.push(this.me._id);
    }

    // 🆕 parsear lat/lng si el usuario las ha puesto
    let lat: number | undefined;
    let lng: number | undefined;

    if (this.latStr && this.latStr.trim() !== '') {
      const parsed = parseFloat(this.latStr);
      if (!Number.isNaN(parsed)) lat = parsed;
    }

    if (this.lngStr && this.lngStr.trim() !== '') {
      const parsed = parseFloat(this.lngStr);
      if (!Number.isNaN(parsed)) lng = parsed;
    }

    const payload: Evento = {
      name: this.newEvent.name.trim(),
      schedule: this.newEvent.schedule,
      address: this.newEvent.address?.trim() || '',
      participantes: this.newEvent.participants.slice(),
      lat,
      lng,
    } as any as Evento;

    this.saving = true;
    this.eventoService.addEvento(payload).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/menu']);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'No se pudo crear el evento.';
      },
    });
  }

  goBackToMenu(): void {
    this.router.navigate(['/menu']);
  }
}
