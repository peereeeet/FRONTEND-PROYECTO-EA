import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoService } from '../../services/evento.service';
import { Evento } from '../../models/evento.model';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Evento[];
}

import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  currentDate = signal(new Date());
  events = signal<Evento[]>([]);
  loading = signal(false);
  
  // Para el modal de detalles
  selectedEvent = signal<Evento | null>(null);

  // Días de la semana para el encabezado
  weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Mockup creation state
  showCreateModal = signal(false);
  createDate = signal<Date | null>(null);
  newEventMock = {
    name: '',
    time: '18:00',
    category: '',
    address: ''
  };

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router
  ) {
    // Re-cargar eventos cuando cambia el mes (effect se ejecuta auto cuando cambia currentDate)
    effect(() => {
      this.loadEventsForMonth(this.currentDate());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goBack() {
    this.router.navigate(['/menu']);
  }

  // Computed: Genera la cuadrícula del calendario basado en currentDate
  calendarGrid = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Ajustar para que la semana empiece en Lunes (0 = Domingo en JS, pero queremos 0 = Lunes)
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Si es domingo (0), volverlo 6

    const days: CalendarDay[] = [];

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDayOfWeek; i++) {
      const dayNum = prevMonthLastDay - startingDayOfWeek + 1 + i;
      const date = new Date(year, month - 1, dayNum);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isSameDate(date, new Date()),
        events: this.getEventsForDate(date)
      });
    }

    // Días del mes actual
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        days.push({
            date,
            isCurrentMonth: true,
            isToday: this.isSameDate(date, new Date()),
            events: this.getEventsForDate(date)
        });
    }

    // Días del mes siguiente para completar la cuadrícula (42 celdas para cubrir 6 semanas max)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
            date,
            isCurrentMonth: false,
            isToday: this.isSameDate(date, new Date()),
            events: this.getEventsForDate(date)
        });
    }

    return days;
  });

  get currentMonthName(): string {
    return this.currentDate().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  nextMonth() {
    const d = this.currentDate();
    this.currentDate.set(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  goToToday() {
    this.currentDate.set(new Date());
  }

  loadEventsForMonth(date: Date) {
    this.loading.set(true);
    
    // Calcular rango para la búsqueda (del 1 al último del mes)
    // Nota: Aunque visualmente mostramos días del mes anterior/siguiente, 
    // por simplicidad cargaremos eventos del mes principal primero.
    // Una mejora sería cargar desde el primer día visible de la grilla hasta el último.
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Format dates as YYYY-MM-DD for the backend
    // Month is 0-indexed in JS, so we need +1. Pad with 0.
    const startMonth = (month + 1).toString().padStart(2, '0');
    const startDay = '01';
    const start = `${year}-${startMonth}-${startDay}`;

    const lastDayDate = new Date(year, month + 1, 0); // Last day of month
    const endMonth = (lastDayDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay = lastDayDate.getDate().toString().padStart(2, '0');
    const end = `${lastDayDate.getFullYear()}-${endMonth}-${endDay}`;

    console.log('Fetching calendar events:', { start, end });

    // Use the dedicated calendar endpoint
    this.eventoService.getCalendarEvents(start, end).subscribe({
      next: (events) => {
        console.log('Calendar events received:', events);
        this.events.set(events || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando eventos para calendario', err);
        if (err.error) {
          console.error('Detalles del error (Backend):', err.error);
        }
        if (err.status === 400) {
           console.warn('Posible problema: El backend puede estar intentando leer "calendar" como un ID de evento si la ruta no está definida antes de /:id, o los parámetros de fecha son inválidos.');
        }
        this.loading.set(false);
      }
    });
  }

  isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  getEventsForDate(date: Date): Evento[] {
    return this.events().filter(ev => {
      if (!ev.schedule) return false;
      const rawDate = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
      const evDate = new Date(rawDate);
      
      const match = this.isSameDate(evDate, date);
      // Uncomment to debug specific date matching
      // if (match) console.log(`Event ${ev.name} matches date ${date}`);
      
      return match;
    });
  }

  getEventTime(ev: Evento): string {
    if (!ev.schedule) return '';
    const raw = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
    const date = new Date(raw);
    return date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  isParticipating(evento: Evento): boolean {
    const user = this.authService.getCurrentUser();
    if (!user?._id || !evento.participantes) return false;
    return (evento.participantes as any[]).some(p => 
      typeof p === 'string' ? p === user._id : p?._id === user._id
    );
  }

  openEventDetails(evento: Evento) {
    this.selectedEvent.set(evento);
  }

  closeModal() {
    this.selectedEvent.set(null);
  }

  openCreateModal(date: Date): void {
    console.log('Opening create modal for date:', date);
    this.createDate.set(date);
    this.showCreateModal.set(true);
    this.newEventMock = {
      name: '',
      time: '18:00',
      category: '',
      address: ''
    };
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createDate.set(null);
  }

  saveEventMock(): void {
    console.log('Mock Event Created:', {
      date: this.createDate(),
      ...this.newEventMock
    });
    this.closeCreateModal();
    // In a real implementation, this would call the service
    // For now, it stays as a visual mockup as requested
  }
}
