import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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
    const textos = {
      crearEvento: '¡Has creado un evento!',
      unirseEvento: '¡Te has unido a un evento!',
      hacerAmigo: '¡Has hecho un nuevo amigo!',
      dejarValoracion: '¡Has dejado una valoración!'
    };
    return textos[accion];
  }
}