import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

interface Rating {
  userName: string;
  rating: number;
  comment: string;
  date: Date;
}

@Component({
  selector: 'app-valoracion',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './valoracion.html',
  styleUrls: ['./valoracion.css']
})
export class ValoracionComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);
  
  theme = this.themeService.theme;

  eventId: string = '';
  eventName: string = 'Evento de Ejemplo';
  loading = true;
  submitting = false;

  userRating = 0;
  userComment = '';

  ratings: Rating[] = [];
  averageRating = 0;
  totalRatings = 0;

  currentLang: 'es' | 'en' = 'es';
  showLangMenu = false;

  constructor() {
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id') || '';
    this.loadRatings();
  }

  loadRatings(): void {
    // Simular carga de valoraciones
    setTimeout(() => {
      this.ratings = [
        {
          userName: 'María García',
          rating: 5,
          comment: '¡Increíble evento! Todo estuvo perfectamente organizado.',
          date: new Date('2024-11-15')
        },
        {
          userName: 'Carlos López',
          rating: 4,
          comment: 'Muy buena experiencia, aunque podría mejorar la comida.',
          date: new Date('2024-11-14')
        },
        {
          userName: 'Ana Martínez',
          rating: 5,
          comment: 'Excelente ambiente y personas muy agradables.',
          date: new Date('2024-11-13')
        }
      ];

      this.calculateStats();
      this.loading = false;
    }, 1000);
  }

  calculateStats(): void {
    if (this.ratings.length === 0) {
      this.averageRating = 0;
      this.totalRatings = 0;
      return;
    }

    const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
    this.averageRating = sum / this.ratings.length;
    this.totalRatings = this.ratings.length;
  }

  setRating(rating: number): void {
    this.userRating = rating;
  }

  submitRating(): void {
    if (this.userRating === 0) return;

    this.submitting = true;

    // Simular envío al servidor
    setTimeout(() => {
      const newRating: Rating = {
        userName: 'Tú',
        rating: this.userRating,
        comment: this.userComment,
        date: new Date()
      };

      this.ratings.unshift(newRating);
      this.calculateStats();

      // Reset form
      this.userRating = 0;
      this.userComment = '';
      this.submitting = false;

      alert('¡Valoración enviada con éxito!');
    }, 1000);
  }

  getStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '☆';
    
    const remaining = 5 - Math.ceil(rating);
    stars += '☆'.repeat(remaining);
    
    return stars;
  }

  goBack(): void {
    this.router.navigate(['/mis-eventos']);
  }

  changeLanguage(lang: 'es' | 'en') {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleLangMenu() {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en') {
    this.changeLanguage(lang);
    this.showLangMenu = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}