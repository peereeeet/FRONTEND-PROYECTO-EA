import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

export interface RewardData {
  puntosGanados: number;
  accion: 'crearEvento' | 'unirseEvento' | 'hacerAmigo' | 'dejarValoracion';
  insigniasDesbloqueadas: any[];
  nivelAnterior: string;
  nivelNuevo: string;
  subisteDeNivel: boolean;
}

@Injectable({ providedIn: 'root' })
export class RewardNotificationService {
  private rewardSubject = new BehaviorSubject<RewardData | null>(null);
  
  constructor(private translate: TranslateService) {
    if (!this.translate.currentLang) {
      this.translate.use(this.translate.defaultLang || 'es');
    }
  }
  
  get reward$(): Observable<RewardData | null> {
    return this.rewardSubject.asObservable();
  }
  
  showReward(data: RewardData) {
    this.rewardSubject.next(data);
  }
  
  clearReward() {
    this.rewardSubject.next(null);
  }
  
  getPuntosAccion(accion: 'crearEvento' | 'unirseEvento' | 'hacerAmigo' | 'dejarValoracion'): number {
    const puntos = {
      crearEvento: 50,
      unirseEvento: 10,
      hacerAmigo: 5,
      dejarValoracion: 15
    };
    return puntos[accion];
  }
  
  getTextoAccion(accion: 'crearEvento' | 'unirseEvento' | 'hacerAmigo' | 'dejarValoracion'): string {
    const keys = {
      crearEvento: 'GAMIFICATION.ACTION_CREATE_EVENT',
      unirseEvento: 'GAMIFICATION.ACTION_JOIN_EVENT',
      hacerAmigo: 'GAMIFICATION.ACTION_MAKE_FRIEND',
      dejarValoracion: 'GAMIFICATION.ACTION_LEAVE_RATING'
    };
    
    const key = keys[accion];
    const translation = this.translate.instant(key);
    
    if (translation === key) {
      console.warn(`Translation not found for key: ${key}`);
      const fallbacks = {
        crearEvento: '¡Evento creado con éxito!',
        unirseEvento: '¡Te uniste al evento!',
        hacerAmigo: '¡Nuevo amigo agregado!',
        dejarValoracion: '¡Valoración dejada con éxito!'
      };
      return fallbacks[accion];
    }
    
    return translation;
  }
}