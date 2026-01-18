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
        <div class="header-icon-wrapper">
          <span class="header-icon">✨</span>
        </div>
        <h3>{{ 'INTERESTS.TITLE' | translate }}</h3>
        <p class="interest-subtitle">{{ 'INTERESTS.SUBTITLE' | translate }}</p>
      </div>

      <!-- Buscador -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input"
          [(ngModel)]="searchTerm"
          placeholder="Buscar intereses..."
          (input)="onSearchChange()">
        <button 
          *ngIf="searchTerm" 
          class="clear-search"
          (click)="clearSearch()">×</button>
      </div>

      <!-- Grid de categorías -->
      <div class="categories-grid">
        <div 
          *ngFor="let category of filteredCategories"
          class="category-card"
          [class.expanded]="expandedCategory === category.name"
          [class.has-selection]="getCategoryCount(category) > 0">
          
          <div class="category-header" (click)="toggleCategory(category.name)">
            <span class="category-icon">{{ category.icon }}</span>
            <div class="category-info">
              <span class="category-name">{{ 'INTERESTS.CATEGORIES.' + category.name | translate }}</span>
              <span class="category-subtitle">{{ category.subcategories.length }} opciones</span>
            </div>
            <div class="category-actions">
              <span class="category-count" *ngIf="getCategoryCount(category) > 0">
                {{ getCategoryCount(category) }}
              </span>
              <span class="expand-arrow" [class.expanded]="expandedCategory === category.name">▼</span>
            </div>
          </div>

          <div class="subcategories" *ngIf="expandedCategory === category.name">
            <div class="subcategories-grid">
              <label 
                *ngFor="let sub of getFilteredSubcategories(category)"
                class="subcategory-item"
                [class.selected]="isSelected(sub)">
                <input
                  type="checkbox"
                  [checked]="isSelected(sub)"
                  (change)="toggleInterest(sub)"
                  (click)="$event.stopPropagation()" />
                <span class="subcategory-content">
                  <span class="subcategory-name">{{ sub }}</span>
                  <span class="check-icon" *ngIf="isSelected(sub)">✓</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Intereses seleccionados -->
      <div class="selected-interests" *ngIf="selectedInterests.length > 0">
        <div class="selected-header">
          <span class="selected-icon">🎯</span>
          <p class="selected-title">Tus intereses seleccionados</p>
          <span class="selected-badge">{{ selectedInterests.length }}</span>
        </div>
        <div class="interest-tags">
          <span 
            *ngFor="let interest of selectedInterests"
            class="interest-tag">
            {{ interest }}
            <button 
              type="button"
              class="remove-tag"
              (click)="removeInterest(interest)"
              title="Eliminar">×</button>
          </span>
        </div>
        <button 
          type="button"
          class="clear-all-btn"
          (click)="clearAllInterests()">
          <span>🗑️</span>
          Limpiar todo
        </button>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="searchTerm && filteredCategories.length === 0">
        <span class="empty-icon">🔍</span>
        <p class="empty-text">No se encontraron resultados</p>
        <button class="empty-btn" (click)="clearSearch()">Limpiar búsqueda</button>
      </div>
    </div>
  `,
  styles: [`
    .interest-selector {
      width: 100%;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .interest-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .header-icon-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      margin-bottom: 12px;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .header-icon {
      font-size: 2rem;
    }

    .interest-header h3 {
      margin: 0 0 8px;
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .interest-subtitle {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-secondary, #6b7280);
      font-weight: 500;
    }

    .search-box {
      position: relative;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      background: var(--surface-elev, #f8fafc);
      border: 2px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 12px 16px;
      transition: all 0.3s ease;
    }

    .search-box:focus-within {
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
      background: var(--surface, #ffffff);
    }

    .search-icon {
      font-size: 1.2rem;
      margin-right: 12px;
      opacity: 0.6;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 0.95rem;
      color: var(--text-primary, #0f172a);
      font-weight: 500;
    }

    .clear-search {
      background: none;
      border: none;
      color: var(--text-secondary, #9ca3af);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0 4px;
      transition: all 0.2s ease;
    }

    .clear-search:hover {
      color: var(--text-primary, #0f172a);
      transform: scale(1.2);
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .category-card {
      background: var(--surface-elev, #f8fafc);
      border: 2px solid var(--border, #e2e8f0);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .category-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
    }

    .category-card.expanded {
      border-color: #667eea;
      background: var(--surface, #ffffff);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
    }

    .category-card.has-selection {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(5, 150, 105, 0.02));
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      cursor: pointer;
      user-select: none;
    }

    .category-icon {
      font-size: 2rem;
      min-width: 40px;
      text-align: center;
    }

    .category-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .category-name {
      font-weight: 700;
      font-size: 1rem;
      color: var(--text-primary, #0f172a);
    }

    .category-subtitle {
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);
      font-weight: 500;
    }

    .category-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .category-count {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .expand-arrow {
      font-size: 0.7rem;
      color: var(--text-secondary, #9ca3af);
      transition: transform 0.3s ease;
    }

    .expand-arrow.expanded {
      transform: rotate(180deg);
    }

    .subcategories {
      padding: 0 16px 16px 16px;
      border-top: 1px solid var(--border, #e2e8f0);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from { opacity: 0; max-height: 0; }
      to { opacity: 1; max-height: 500px; }
    }

    .subcategories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
      padding: 12px 0;
    }

    .subcategory-item {
      display: flex;
      cursor: pointer;
      border-radius: 10px;
      border: 2px solid var(--border, #e2e8f0);
      background: var(--surface-elev, #f8fafc);
      transition: all 0.2s ease;
      overflow: hidden;
    }

    .subcategory-item:hover {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.05);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .subcategory-item.selected {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .subcategory-item input[type="checkbox"] {
      display: none;
    }

    .subcategory-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      width: 100%;
    }

    .subcategory-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary, #0f172a);
    }

    .subcategory-item.selected .subcategory-name {
      color: white;
    }

    .check-icon {
      color: white;
      font-weight: 900;
      font-size: 1rem;
      animation: checkPop 0.3s ease-out;
    }

    @keyframes checkPop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .selected-interests {
      margin-top: 24px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.02));
      border-radius: 16px;
      border: 2px solid #667eea;
    }

    .selected-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .selected-icon {
      font-size: 1.5rem;
    }

    .selected-title {
      margin: 0;
      font-weight: 700;
      font-size: 1rem;
      color: var(--text-primary, #0f172a);
      flex: 1;
    }

    .selected-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 0.85rem;
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .interest-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }

    .interest-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
      transition: all 0.2s ease;
      animation: tagAppear 0.3s ease-out;
    }

    @keyframes tagAppear {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }

    .interest-tag:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
    }

    .remove-tag {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 1.3rem;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .remove-tag:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.2) rotate(90deg);
    }

    .clear-all-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 2px solid #ef4444;
      border-radius: 12px;
      color: #dc2626;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .clear-all-btn:hover {
      background: #ef4444;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-icon {
      font-size: 3rem;
      opacity: 0.3;
      display: block;
      margin-bottom: 16px;
    }

    .empty-text {
      color: var(--text-secondary, #9ca3af);
      font-size: 0.95rem;
      margin: 0 0 16px;
    }

    .empty-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .empty-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
    }

    @media (max-width: 700px) {
      .categories-grid {
        grid-template-columns: 1fr;
      }

      .subcategories-grid {
        grid-template-columns: 1fr;
      }
    }

    [data-theme="dark"] .category-card {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.3);
    }

    [data-theme="dark"] .category-card:hover,
    [data-theme="dark"] .category-card.expanded {
      background: rgba(15, 23, 42, 0.8);
    }

    [data-theme="dark"] .subcategory-item {
      background: rgba(15, 23, 42, 0.4);
      border-color: rgba(148, 163, 184, 0.3);
    }

    [data-theme="dark"] .search-box {
      background: rgba(15, 23, 42, 0.6);
      border-color: rgba(148, 163, 184, 0.3);
    }
  `]
})
export class InterestSelectorComponent implements OnInit {
  @Input() selectedInterests: string[] = [];
  @Output() selectedInterestsChange = new EventEmitter<string[]>();

  expandedCategory: string | null = null;
  searchTerm: string = '';
  filteredCategories: InterestCategory[] = [];

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
    this.filteredCategories = [...this.categories];
  }

  onSearchChange(): void {
    if (!this.searchTerm.trim()) {
      this.filteredCategories = [...this.categories];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredCategories = this.categories
      .map(cat => ({
        ...cat,
        subcategories: cat.subcategories.filter(sub => 
          sub.toLowerCase().includes(term)
        )
      }))
      .filter(cat => cat.subcategories.length > 0);
  }

  getFilteredSubcategories(category: InterestCategory): string[] {
    return category.subcategories;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredCategories = [...this.categories];
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

  clearAllInterests(): void {
    this.selectedInterests = [];
    this.selectedInterestsChange.emit(this.selectedInterests);
  }

  getCategoryCount(category: InterestCategory): number {
    return category.subcategories.filter(sub => this.isSelected(sub)).length;
  }
}