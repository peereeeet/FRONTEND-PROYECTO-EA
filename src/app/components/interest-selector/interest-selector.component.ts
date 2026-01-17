import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface InterestCategory {
  name: string;
  icon: string;
  subcategories: string[];
}

@Component({
  selector: 'app-interest-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="interest-selector">
      <div class="interest-header">
        <h3>{{ 'INTERESTS.TITLE' | translate }}</h3>
        <p class="interest-subtitle">{{ 'INTERESTS.SUBTITLE' | translate }}</p>
      </div>

      <div class="categories-grid">
        <div 
          *ngFor="let category of categories"
          class="category-card"
          [class.expanded]="expandedCategory === category.name"
          (click)="toggleCategory(category.name)">
          <div class="category-header">
            <span class="category-icon">{{ category.icon }}</span>
            <span class="category-name">{{ 'INTERESTS.CATEGORIES.' + category.name | translate }}</span>
            <span class="category-count" *ngIf="getCategoryCount(category) > 0">
              {{ getCategoryCount(category) }}
            </span>
          </div>

          <div class="subcategories" *ngIf="expandedCategory === category.name">
            <label 
              *ngFor="let sub of category.subcategories"
              class="subcategory-item"
              [class.selected]="isSelected(sub)">
              <input
                type="checkbox"
                [checked]="isSelected(sub)"
                (change)="toggleInterest(sub)"
                (click)="$event.stopPropagation()" />
              <span class="subcategory-name">{{ sub }}</span>
              <span class="check-icon" *ngIf="isSelected(sub)">✓</span>
            </label>
          </div>
        </div>
      </div>

      <div class="selected-interests" *ngIf="selectedInterests.length > 0">
        <p class="selected-title">{{ 'INTERESTS.SELECTED' | translate }} ({{ selectedInterests.length }})</p>
        <div class="interest-tags">
          <span 
            *ngFor="let interest of selectedInterests"
            class="interest-tag">
            {{ interest }}
            <button 
              type="button"
              class="remove-tag"
              (click)="removeInterest(interest)">×</button>
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interest-selector {
      width: 100%;
    }

    .interest-header {
      text-align: center;
      margin-bottom: 20px;
    }

    .interest-header h3 {
      margin: 0 0 8px;
      font-size: 1.3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #38bdf8, #1d4ed8);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .interest-subtitle {
      margin: 0;
      font-size: 0.85rem;
      color: var(--text-secondary, #6b7280);
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .category-card {
      background: var(--surface-elev, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-card:hover {
      border-color: var(--accent-blue, #1d4ed8);
      box-shadow: 0 4px 12px rgba(29, 78, 216, 0.15);
      transform: translateY(-2px);
    }

    .category-card.expanded {
      border-color: var(--accent-blue, #1d4ed8);
      background: var(--surface, #ffffff);
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .category-icon {
      font-size: 1.5rem;
    }

    .category-name {
      flex: 1;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary, #0f172a);
    }

    .category-count {
      background: linear-gradient(135deg, #38bdf8, #1d4ed8);
      color: white;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .subcategories {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border, #e2e8f0);
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 300px;
      overflow-y: auto;
    }

    .subcategory-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      background: var(--surface-elev, #f8fafc);
    }

    .subcategory-item:hover {
      background: rgba(29, 78, 216, 0.08);
    }

    .subcategory-item.selected {
      background: rgba(29, 78, 216, 0.12);
      border: 1px solid var(--accent-blue, #1d4ed8);
    }

    .subcategory-item input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
    }

    .subcategory-name {
      flex: 1;
      font-size: 0.85rem;
      color: var(--text-primary, #0f172a);
    }

    .check-icon {
      color: var(--accent-blue, #1d4ed8);
      font-weight: 900;
      font-size: 1rem;
    }

    .selected-interests {
      margin-top: 20px;
      padding: 16px;
      background: var(--surface-elev, #f8fafc);
      border-radius: 12px;
      border: 1px solid var(--border, #e2e8f0);
    }

    .selected-title {
      margin: 0 0 12px;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary, #0f172a);
    }

    .interest-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .interest-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #38bdf8, #1d4ed8);
      color: white;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .remove-tag {
      background: none;
      border: none;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: transform 0.15s ease;
    }

    .remove-tag:hover {
      transform: scale(1.2);
    }

    @media (max-width: 700px) {
      .categories-grid {
        grid-template-columns: 1fr;
      }
    }

    [data-theme="dark"] .category-card {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.3);
    }

    [data-theme="dark"] .category-card:hover {
      background: rgba(15, 23, 42, 0.8);
    }

    [data-theme="dark"] .subcategory-item {
      background: rgba(15, 23, 42, 0.4);
    }

    [data-theme="dark"] .selected-interests {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.3);
    }
  `]
})
export class InterestSelectorComponent implements OnInit {
  @Input() selectedInterests: string[] = [];
  @Output() selectedInterestsChange = new EventEmitter<string[]>();

  expandedCategory: string | null = null;

  categories: InterestCategory[] = [
    {
      name: 'SPORTS',
      icon: '⚽',
      subcategories: [
        'Fútbol', 'Baloncesto', 'Tenis', 'Pádel', 'Running', 'Ciclismo',
        'Natación', 'Yoga', 'Gimnasio', 'Senderismo', 'Escalada', 'Artes Marciales'
      ]
    },
    {
      name: 'MUSIC',
      icon: '🎵',
      subcategories: [
        'Concierto Rock', 'Concierto Pop', 'Concierto Clásica', 'Jazz', 'Electrónica',
        'Hip Hop', 'Karaoke', 'Discoteca', 'Festival Musical'
      ]
    },
    {
      name: 'CULTURE',
      icon: '🎨',
      subcategories: [
        'Exposición Arte', 'Teatro', 'Cine', 'Museo', 'Literatura', 'Fotografía',
        'Pintura', 'Escultura', 'Danza', 'Ópera'
      ]
    },
    {
      name: 'FOOD',
      icon: '🍽️',
      subcategories: [
        'Restaurante', 'Tapas', 'Cocina Internacional', 'Vinos', 'Cerveza Artesanal',
        'Repostería', 'Brunch', 'Food Truck'
      ]
    },
    {
      name: 'SOCIAL',
      icon: '🎉',
      subcategories: [
        'Fiesta Privada', 'Fiesta Temática', 'Cumpleaños', 'Boda', 'Despedida',
        'After Work', 'Networking', 'Speed Dating'
      ]
    },
    {
      name: 'LEARNING',
      icon: '📚',
      subcategories: [
        'Taller', 'Curso', 'Conferencia', 'Seminario', 'Workshop', 'Idiomas', 'Masterclass'
      ]
    },
    {
      name: 'TECH',
      icon: '💻',
      subcategories: [
        'Hackathon', 'Meetup Tech', 'Gaming', 'eSports', 'Programación',
        'Inteligencia Artificial', 'Blockchain', 'Startups'
      ]
    },
    {
      name: 'WELLNESS',
      icon: '🧘',
      subcategories: [
        'Meditación', 'Spa', 'Wellness', 'Mindfulness', 'Salud Mental'
      ]
    },
    {
      name: 'VOLUNTEER',
      icon: '❤️',
      subcategories: [
        'Voluntariado Ambiental', 'Voluntariado Social', 'Donación de Sangre',
        'Rescate Animal', 'Limpieza Playas', 'Banco de Alimentos'
      ]
    },
    {
      name: 'NATURE',
      icon: '🏕️',
      subcategories: [
        'Camping', 'Montañismo', 'Playa', 'Barbacoa', 'Picnic', 'Observación Aves', 'Safari'
      ]
    },
    {
      name: 'GAMES',
      icon: '🎲',
      subcategories: [
        'Juegos de Mesa', 'Ajedrez', 'Poker', 'Escape Room', 'Paintball', 'Laser Tag', 'Bolos'
      ]
    },
    {
      name: 'FAMILY',
      icon: '👨‍👩‍👧‍👦',
      subcategories: [
        'Evento Familiar', 'Parque Infantil', 'Teatro Infantil', 'Animación Infantil', 'Taller Niños'
      ]
    },
    {
      name: 'OTHER',
      icon: '🌟',
      subcategories: [
        'Mercadillo', 'Feria', 'Turismo', 'Excursión', 'Compras', 'Otros'
      ]
    }
  ];

  ngOnInit(): void {
    if (!this.selectedInterests) {
      this.selectedInterests = [];
    }
  }

  toggleCategory(categoryName: string): void {
    this.expandedCategory = this.expandedCategory === categoryName ? null : categoryName;
  }

  isSelected(interest: string): boolean {
    return this.selectedInterests.includes(interest);
  }

  toggleInterest(interest: string): void {
    const index = this.selectedInterests.indexOf(interest);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
    } else {
      this.selectedInterests.push(interest);
    }
    this.selectedInterestsChange.emit(this.selectedInterests);
  }

  removeInterest(interest: string): void {
    const index = this.selectedInterests.indexOf(interest);
    if (index > -1) {
      this.selectedInterests.splice(index, 1);
      this.selectedInterestsChange.emit(this.selectedInterests);
    }
  }

  getCategoryCount(category: InterestCategory): number {
    return category.subcategories.filter(sub => this.isSelected(sub)).length;
  }
}