import { Injectable, signal, effect } from '@angular/core';

// Define el tipo de tema para seguridad de tipos
export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Signal para almacenar el estado actual del tema.
  // Intentamos cargarlo desde localStorage al inicio.
  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Un efecto se ejecuta cada vez que el valor de 'theme' cambia.
    effect(() => {
      const currentTheme = this.theme();
      
      // 1. Guarda el nuevo estado en localStorage
      localStorage.setItem('theme', currentTheme);

      // 2. Aplica o quita la clase 'dark-theme' en el <body> del documento
      if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });
  }

  /**
   * Determina el tema inicial (localStorage > Preferencia del sistema > default: 'light')
   */
  private getInitialTheme(): Theme {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    }

    // Si no hay tema guardado, comprueba la preferencia del sistema operativo
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  /**
   * Alterna entre los temas 'light' y 'dark'.
   */
  toggleTheme(): void {
    this.theme.update(currentTheme => 
      currentTheme === 'light' ? 'dark' : 'light'
    );
  }
}