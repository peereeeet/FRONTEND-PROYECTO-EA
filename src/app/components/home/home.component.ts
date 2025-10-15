import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { EventoService } from '../../services/evento.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  
  constructor(
    private userService: UserService,
    private eventoService: EventoService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        const totalUsers = res.totalItems ?? res.data.length;
        this.animateCounter('userCount', totalUsers);
      },
      error: (err) => console.error('Error al contar usuarios:', err)
    });

    this.eventoService.getEventos().subscribe({
      next: (res) => {
        const totalEvents = res.totalItems ?? res.data.length;
        this.animateCounter('eventCount', totalEvents);
      },
      error: (err) => console.error('Error al contar eventos:', err)
    });
  }

  animateCounter(elementId: string, target: number): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    let current = 0;
    const increment = target / 50; 
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current).toString();
    }, 30);
  }
}