import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EventoService } from '../../services/evento.service';
import { Evento } from '../../models/evento.model';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invitaciones.component.html',
  styleUrls: ['./invitaciones.component.css']
})
export class InvitacionesComponent implements OnInit {
  invitaciones: Evento[] = [];
  loading = false;
  error = '';
  procesando: { [key: string]: boolean } = {};

  constructor(
    private eventoService: EventoService,
    private router: Router
  ) {}

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
        this.error = 'Error al cargar las invitaciones';
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
        // Eliminar la invitación de la lista
        this.invitaciones = this.invitaciones.filter(e => e._id !== eventId);
        this.procesando[eventId] = false;
      },
      error: (err) => {
        console.error('Error aceptando invitación:', err);
        alert('Error al aceptar la invitación');
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
        // Eliminar la invitación de la lista
        this.invitaciones = this.invitaciones.filter(e => e._id !== eventId);
        this.procesando[eventId] = false;
      },
      error: (err) => {
        console.error('Error rechazando invitación:', err);
        alert('Error al rechazar la invitación');
        this.procesando[eventId] = false;
      }
    });
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'Fecha no especificada';
    
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'Fecha inválida';

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return d.toLocaleDateString('es-ES', opciones);
  }

  getNombreCreador(evento: Evento): string {
    if (!evento.creador) return 'Desconocido';
    
    if (typeof evento.creador === 'string') {
      return evento.creador;
    }
    
    return evento.creador.username || 'Desconocido';
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
}