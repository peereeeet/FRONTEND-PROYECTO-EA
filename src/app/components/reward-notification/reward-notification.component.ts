import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RewardNotificationService, RewardData } from '../../services/reward-notification.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reward-notification',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="reward-overlay" 
         *ngIf="currentReward" 
         @fadeIn
         (click)="onBackdropClick()">
      <div class="reward-card" @slideIn (click)="$event.stopPropagation()">
        <div class="reward-header">
          <div class="reward-icon">🎉</div>
          <h2 class="reward-title">{{ 'GAMIFICATION.REWARD_UNLOCKED' | translate }}</h2>
          <button class="reward-close" (click)="closeNotification()" [attr.aria-label]="'COMMON.CLOSE' | translate">
            ×
          </button>
        </div>

        <div class="reward-body">
          <div class="reward-action">
            <p class="action-text">{{ actionText }}</p>
          </div>

          <div class="reward-section points-section">
            <div class="points-wrapper">
              <div class="points-icon">⭐</div>
              <div class="points-content">
                <p class="points-label">{{ 'GAMIFICATION.POINTS_GAINED' | translate }}</p>
                <p class="points-value">+{{ currentReward.puntosGanados }}</p>
              </div>
            </div>
          </div>

          <div class="reward-section level-section" *ngIf="currentReward.subisteDeNivel">
            <div class="level-up-animation">
              <div class="level-icon">🚀</div>
            </div>
            <p class="level-text">{{ 'GAMIFICATION.LEVEL_UP' | translate }}</p>
            <div class="level-change">
              <span class="level-old">{{ currentReward.nivelAnterior }}</span>
              <span class="level-arrow">→</span>
              <span class="level-new">{{ currentReward.nivelNuevo }}</span>
            </div>
          </div>

          <div class="reward-section badges-section" 
               *ngIf="currentReward.insigniasDesbloqueadas.length > 0">
            <p class="badges-title">{{ 'GAMIFICATION.BADGES_UNLOCKED' | translate }}</p>
            <div class="badges-grid">
              <div 
                class="badge-item" 
                *ngFor="let insignia of currentReward.insigniasDesbloqueadas"
                [title]="insignia.descripcion">
                <div class="badge-icon">{{ insignia.icono || '🏆' }}</div>
                <div class="badge-info">
                  <p class="badge-name">{{ insignia.nombre }}</p>
                  <p class="badge-points">+{{ insignia.puntos }} {{ 'GAMIFICATION.BONUS_POINTS' | translate }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="reward-footer">
          <button class="btn-primary" (click)="goToProfile()">
            {{ 'GAMIFICATION.VIEW_PROFILE_BUTTON' | translate }}
          </button>
          <button class="btn-secondary" (click)="closeNotification()">
            {{ 'GAMIFICATION.CONTINUE_BUTTON' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reward-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
    }

    .reward-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 24px;
      border: 2px solid #3b82f6;
      box-shadow: 
        0 20px 60px rgba(59, 130, 246, 0.4),
        0 0 100px rgba(59, 130, 246, 0.2);
      max-width: 480px;
      width: 100%;
      overflow: hidden;
    }

    .reward-header {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      padding: 24px;
      text-align: center;
      position: relative;
    }

    .reward-icon {
      font-size: 56px;
      margin-bottom: 12px;
      animation: bounce 1s infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-12px) scale(1.1); }
    }

    .reward-title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    .reward-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 24px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .reward-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }

    .reward-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .reward-action {
      text-align: center;
      padding: 12px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .action-text {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #60a5fa;
    }

    .reward-section {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 16px;
      padding: 16px;
    }

    .points-section {
      background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.15));
      border-color: rgba(251, 191, 36, 0.4);
    }

    .points-wrapper {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .points-icon {
      font-size: 48px;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .points-content {
      flex: 1;
    }

    .points-label {
      margin: 0 0 4px 0;
      font-size: 0.85rem;
      color: #d97706;
      font-weight: 600;
    }

    .points-value {
      margin: 0;
      font-size: 2rem;
      font-weight: 900;
      color: #fbbf24;
      text-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
    }

    .level-section {
      background: linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(139, 92, 246, 0.15));
      border-color: rgba(167, 139, 250, 0.4);
      text-align: center;
    }

    .level-up-animation {
      position: relative;
      margin-bottom: 12px;
    }

    .level-icon {
      font-size: 48px;
      animation: rocketLaunch 1.5s infinite;
    }

    @keyframes rocketLaunch {
      0%, 100% { transform: translateY(0) rotate(-10deg); }
      50% { transform: translateY(-20px) rotate(10deg); }
    }

    .level-text {
      margin: 0 0 12px 0;
      font-size: 1.2rem;
      font-weight: 800;
      color: #a78bfa;
    }

    .level-change {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 1.1rem;
    }

    .level-old {
      color: #94a3b8;
      font-weight: 600;
    }

    .level-arrow {
      color: #a78bfa;
      font-size: 1.5rem;
    }

    .level-new {
      color: #a78bfa;
      font-weight: 900;
      font-size: 1.3rem;
      text-shadow: 0 0 10px rgba(167, 139, 250, 0.5);
    }

    .badges-section {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15));
      border-color: rgba(34, 197, 94, 0.4);
    }

    .badges-title {
      margin: 0 0 12px 0;
      font-size: 1rem;
      font-weight: 800;
      color: #34d399;
      text-align: center;
    }

    .badges-grid {
      display: grid;
      gap: 12px;
    }

    .badge-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 12px;
      border: 1px solid rgba(34, 197, 94, 0.3);
      transition: all 0.2s;
    }

    .badge-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }

    .badge-icon {
      font-size: 36px;
    }

    .badge-info {
      flex: 1;
    }

    .badge-name {
      margin: 0 0 4px 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: #34d399;
    }

    .badge-points {
      margin: 0;
      font-size: 0.85rem;
      color: #6ee7b7;
    }

    .reward-footer {
      padding: 20px 24px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid rgba(59, 130, 246, 0.3);
      display: flex;
      gap: 12px;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 12px 20px;
      border-radius: 12px;
      border: none;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    .btn-secondary {
      background: rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.4);
    }

    .btn-secondary:hover {
      background: rgba(148, 163, 184, 0.3);
    }

    @media (max-width: 640px) {
      .reward-card {
        max-width: 100%;
      }

      .reward-footer {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }
    }
  `],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-50px) scale(0.9)' }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', 
          style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }))
      ])
    ])
  ]
})
export class RewardNotificationComponent implements OnInit, OnDestroy {
  currentReward: RewardData | null = null;
  actionText: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private rewardService: RewardNotificationService,
    private translate: TranslateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.rewardService.reward$
      .pipe(takeUntil(this.destroy$))
      .subscribe(reward => {
        this.currentReward = reward;
        
        if (reward) {
          this.actionText = this.rewardService.getTextoAccion(reward.accion);
          
          setTimeout(() => {
            if (this.currentReward === reward) {
              this.closeNotification();
            }
          }, 10000);
        } else {
          this.actionText = '';
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeNotification() {
    this.rewardService.clearReward();
  }

  goToProfile() {
    this.closeNotification();
    this.router.navigate(['/perfil']);
  }

  onBackdropClick() {
    this.closeNotification();
  }
}