import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoService } from '../../services/evento.service';
import { Evento, CATEGORIAS_EVENTO, EventoCategoria } from '../../models/evento.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { GeocodingService, GeocodingResult, AddressValidation } from '../../services/geocoding.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Evento[];
}

import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

type NewEventDTO = {
  name: string;
  schedule: string;
  address?: string;
  participants: string[];
  lat?: number | null;
  lng?: number | null;
  categoria?: string;
  maxParticipantes?: number | null;
};

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css']
})
export class CalendarioComponent implements OnInit {
  private themeService = inject(ThemeService);
  private translateService = inject(TranslateService);
  private geocodingService = inject(GeocodingService);
  theme = this.themeService.theme;

  currentDate = signal(new Date());
  events = signal<Evento[]>([]);
  loading = signal(false);
  
  selectedEvent = signal<Evento | null>(null);

  weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  showCreateModal = signal(false);
  createDate = signal<Date | null>(null);
  
  newEvent: NewEventDTO = {
    name: '',
    schedule: '',
    address: '',
    participants: [],
    lat: null,
    lng: null,
    categoria: '',
    maxParticipantes: null
  };

  timeStr = '18:00';
  formSubmitted = false;
  saving = false;
  errorMessage = '';

  addressSuggestions: GeocodingResult[] = [];
  showAddressSuggestions = false;
  searchingAddress = false;
  addressValidation: AddressValidation | null = null;
  private addressSearchSubject = new Subject<string>();

  categoriaSearch = '';
  showCategoriaDropdown = false;
  categoriasDisponibles = CATEGORIAS_EVENTO;

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  me: any = null;

  constructor(
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      this.loadEventsForMonth(this.currentDate());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    const savedLang = localStorage.getItem('lang') as 'es' | 'en' | 'cat' | 'fr';
    if (savedLang) {
      this.currentLang = savedLang;
      this.translateService.use(savedLang);
    }

    this.me = this.authService.getCurrentUser();
    this.addressSearchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(query => {
          this.searchingAddress = true;
          return this.geocodingService.searchAddress(query);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchingAddress = false;
          this.addressSuggestions = results;
          this.showAddressSuggestions = results.length > 0;
        },
        error: (err) => {
          console.error('Error searching address:', err);
          this.searchingAddress = false;
          this.addressSuggestions = [];
        }
      });
  }

  get categoriasFiltradas(): EventoCategoria[] {
    if (!this.categoriaSearch || this.categoriaSearch.trim() === '') {
      return this.categoriasDisponibles;
    }
    const search = this.categoriaSearch.toLowerCase().trim();
    return this.categoriasDisponibles.filter(cat => 
      cat.toLowerCase().includes(search)
    );
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleLangMenu() {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr') {
    this.currentLang = lang;
    this.translateService.use(lang);
    localStorage.setItem('lang', lang);
    this.showLangMenu = false;
  }

  goBack() {
    this.router.navigate(['/menu']);
  }

  goToCrearEvento() {
    this.router.navigate(['/crear-eventos']);
  }

  goToMisEventos() {
    this.router.navigate(['/mis-eventos']);
  }

  getEventFullDateTime(ev: Evento): string {
    if (!ev.schedule) return '';
    const raw = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
    const date = new Date(raw);
    return date.toLocaleString('es-ES', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calendarGrid = computed(() => {
    const year = this.currentDate().getFullYear();
    const month = this.currentDate().getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: CalendarDay[] = [];

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

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i);
        days.push({
            date,
            isCurrentMonth: true,
            isToday: this.isSameDate(date, new Date()),
            events: this.getEventsForDate(date)
        });
    }

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
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const startMonth = (month + 1).toString().padStart(2, '0');
    const startDay = '01';
    const start = `${year}-${startMonth}-${startDay}`;

    const lastDayDate = new Date(year, month + 1, 0);
    const endMonth = (lastDayDate.getMonth() + 1).toString().padStart(2, '0');
    const endDay = lastDayDate.getDate().toString().padStart(2, '0');
    const end = `${lastDayDate.getFullYear()}-${endMonth}-${endDay}`;

    console.log('Fetching calendar events:', { start, end });

    this.eventoService.getCalendarEvents(start, end).subscribe({
      next: (events) => {
        console.log('Calendar events received:', events);
        this.events.set(events || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando eventos para calendario', err);
        this.loading.set(false);
      }
    });
  }

  isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  isFutureDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate >= today;
  }

  getEventsForDate(date: Date): Evento[] {
    return this.events().filter(ev => {
      if (!ev.schedule) return false;
      const rawDate = Array.isArray(ev.schedule) ? ev.schedule[0] : ev.schedule;
      const evDate = new Date(rawDate);
      
      const match = this.isSameDate(evDate, date);
      
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
    if (!this.isFutureDate(date)) {
      console.log('Cannot create event in the past:', date);
      return;
    }

    console.log('Opening create modal for date:', date);
    this.createDate.set(date);
    this.showCreateModal.set(true);
    
    this.newEvent = {
      name: '',
      schedule: '',
      address: '',
      participants: [],
      lat: null,
      lng: null,
      categoria: '',
      maxParticipantes: null
    };
    this.timeStr = '18:00';
    this.categoriaSearch = '';
    this.formSubmitted = false;
    this.errorMessage = '';
    this.addressValidation = null;
    this.addressSuggestions = [];
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createDate.set(null);
    this.formSubmitted = false;
    this.errorMessage = '';
  }

  onAddressInput(event: any): void {
    const value = event.target.value;
    
    if (!value || value.trim().length < 3) {
      this.addressValidation = null;
      this.addressSuggestions = [];
      this.showAddressSuggestions = false;
      return;
    }

    this.addressSearchSubject.next(value);
  }

  onAddressFocus(): void {
    if (this.addressSuggestions.length > 0) {
      this.showAddressSuggestions = true;
    }
  }

  onAddressBlur(): void {
    setTimeout(() => {
      this.showAddressSuggestions = false;
    }, 200);
  }

  selectAddressSuggestion(suggestion: GeocodingResult): void {
    const formattedAddress = this.formatSuggestionAddress(suggestion);
    this.newEvent.address = formattedAddress;
    
    this.newEvent.lat = parseFloat(suggestion.lat);
    this.newEvent.lng = parseFloat(suggestion.lon);
    
    this.validateAddress(suggestion);
    
    this.showAddressSuggestions = false;
    this.addressSuggestions = [];
  }

  formatSuggestionAddress(suggestion: GeocodingResult): string {
    const addr = suggestion.address;
    const parts: string[] = [];

    if (addr.road) {
      if (addr.house_number) {
        parts.push(`${addr.road}, ${addr.house_number}`);
      } else {
        parts.push(addr.road);
      }
    }
    
    if (addr.postcode) {
      parts.push(addr.postcode);
    }
    
    const locality = addr.city || addr.town || addr.village || addr.municipality;
    if (locality) {
      parts.push(locality);
    }
    
    if (addr.country) {
      parts.push(addr.country);
    }

    return parts.join(', ');
  }

  private validateAddress(result: GeocodingResult): void {
    const addr = result.address;
    const missingComponents: string[] = [];

    const hasStreet = !!(addr.road);
    const hasNumber = !!(addr.house_number);
    const hasPostalCode = !!(addr.postcode);
    const hasCity = !!(addr.city || addr.town || addr.village || addr.municipality);
    const hasCountry = !!(addr.country);

    if (!hasStreet) missingComponents.push('Calle/Avenida');
    if (!hasNumber) missingComponents.push('Número');
    if (!hasPostalCode) missingComponents.push('Código postal');
    if (!hasCity) missingComponents.push('Ciudad/Localidad');
    if (!hasCountry) missingComponents.push('País');

    let completeness = 0;
    if (hasStreet) completeness += 20;
    if (hasNumber) completeness += 20;
    if (hasPostalCode) completeness += 20;
    if (hasCity) completeness += 20;
    if (hasCountry) completeness += 20;

    const warnings: string[] = [];
    if (result.type === 'road' && !hasNumber) {
      warnings.push('Se detectó una calle pero falta el número específico');
    }

    this.addressValidation = {
      isValid: completeness >= 80,
      hasStreet,
      hasNumber,
      hasPostalCode,
      hasCity,
      hasCountry,
      completeness,
      missingComponents,
      warnings,
      formattedAddress: result.display_name
    };
  }

  selectCategoria(cat: EventoCategoria): void {
    this.newEvent.categoria = cat;
    this.categoriaSearch = cat;
    this.showCategoriaDropdown = false;
  }

  onCategoriaInputFocus(): void {
    this.showCategoriaDropdown = true;
  }

  onCategoriaInputBlur(): void {
    setTimeout(() => {
      this.showCategoriaDropdown = false;
    }, 200);
  }

  onCategoriaSearchChange(): void {
    this.showCategoriaDropdown = true;
  }

  onSubmitEvent(): void {
    this.formSubmitted = true;
    this.errorMessage = '';

    if (!this.newEvent.name || this.newEvent.name.trim().length < 3) {
      this.errorMessage = 'El título es obligatorio (mínimo 3 caracteres).';
      return;
    }

    if (!this.newEvent.address || this.newEvent.address.trim().length < 5) {
      this.errorMessage = 'La dirección es obligatoria (mínimo 5 caracteres).';
      return;
    }

    if (!this.newEvent.categoria) {
      this.errorMessage = 'Selecciona una categoría.';
      return;
    }

    const date = this.createDate();
    if (!date) {
      this.errorMessage = 'No se ha seleccionado una fecha.';
      return;
    }

    const dateStr = this.formatDateToInput(date);
    const iso = this.composeISOFromDateTime(dateStr, this.timeStr);
    this.newEvent.schedule = iso;

    if (this.me?._id && !this.newEvent.participants.includes(this.me._id)) {
      this.newEvent.participants.push(this.me._id);
    }

    const payload: any = {
      ...this.newEvent,
      maxParticipantes: this.newEvent.maxParticipantes
    };

    this.saving = true;

    this.eventoService.createEventoFromPanel(payload).subscribe({
      next: (response: any) => {
        console.log('Evento creado con éxito', response);
        this.saving = false;
        this.closeCreateModal();
        this.loadEventsForMonth(this.currentDate());
      },
      error: (err) => {
        console.error('Error al crear el evento', err);
        this.errorMessage = err?.error?.message || 'Error al crear el evento.';
        this.saving = false;
      }
    });
  }

  private composeISOFromDateTime(dateStr: string, timeStr: string): string {
    if (!dateStr && !timeStr) return '';
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const time = timeStr || '00:00';
    return `${date}T${time}`;
  }

  private formatDateToInput(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}