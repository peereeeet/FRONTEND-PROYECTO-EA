import { Component, OnInit, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, TranslateModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;
  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;
  
  constructor(
    private userService: UserService,
    private eventoService: EventoService,
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
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
    });

    this.eventoService.getEventos().subscribe({
      next: (res) => {
        const totalEvents = res.totalItems ?? res.data.length;
        this.animateCounter('eventCount', totalEvents);
      },
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

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }

  onLogout(): void {
    this.authService.logout(); 
    this.router.navigate(['login']);
  }
}