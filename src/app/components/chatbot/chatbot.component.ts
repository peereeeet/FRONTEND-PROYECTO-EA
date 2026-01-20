import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, AiSearchResponse } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { Router, NavigationEnd } from '@angular/router';
import { ChatbotStateService } from '../../services/chatbot-state.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { EventoService } from '../../services/evento.service';
import { Evento } from '../../models/evento.model';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
  relatedEvents?: any[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  private themeService = inject(ThemeService);
  private translateService = inject(TranslateService);
  private eventoService = inject(EventoService);
  private destroy$ = new Subject<void>();
  
  theme = this.themeService.theme;
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isChatOpen: boolean = false;
  userId: string | null = null;

  shouldShowChatbot: boolean = true;

  selectedEvent: Evento | null = null;
  showEventModal: boolean = false;
  isLoadingEvent: boolean = false;
  
  quickQuestions: string[] = [];

  constructor(
    private aiService: AiService,
    private authService: AuthService,
    private router: Router,
    private chatbotStateService: ChatbotStateService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.userId = user?._id || null;

    this.checkCurrentRoute(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: any) => {
      this.checkCurrentRoute(event.urlAfterRedirects || event.url);
      
      if (this.isChatOpen) {
        this.isChatOpen = false;
        this.chatbotStateService.closeChat();
      }
    });

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadQuickQuestions();
        if (this.messages.length === 1 && this.messages[0].isBot) {
          this.translateService.get('CHATBOT.WELCOME_MESSAGE').subscribe(text => {
            this.messages[0].text = text;
          });
        }
      });

    this.loadInitialMessages();

    this.chatbotStateService.chatOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        this.isChatOpen = isOpen;
        if (isOpen) {
          setTimeout(() => this.scrollToBottom(), 100);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkCurrentRoute(url: string): void {
    const hiddenRoutes = ['/login', '/registrar'];
    this.shouldShowChatbot = !hiddenRoutes.some(route => url.startsWith(route));
  }

  private loadInitialMessages(): void {
    this.loadQuickQuestions();
    
    setTimeout(() => {
      this.translateService.get('CHATBOT.WELCOME_MESSAGE').subscribe(text => {
        if (this.messages.length === 0) {
          this.messages.push({
            text: text,
            isBot: true,
            timestamp: new Date()
          });
        }
      });
    }, 100);
  }

  private loadQuickQuestions(): void {
    this.translateService.get([
      'CHATBOT.QUICK_Q1',
      'CHATBOT.QUICK_Q2',
      'CHATBOT.QUICK_Q3',
      'CHATBOT.QUICK_Q4'
    ]).subscribe(translations => {
      this.quickQuestions = [
        translations['CHATBOT.QUICK_Q1'],
        translations['CHATBOT.QUICK_Q2'],
        translations['CHATBOT.QUICK_Q3'],
        translations['CHATBOT.QUICK_Q4']
      ];
    });
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }
    const userMessage: ChatMessage = {
      text: this.userInput,
      isBot: false,
      timestamp: new Date()
    };
    this.messages.push(userMessage);

    const query = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    setTimeout(() => this.scrollToBottom(), 100);

    const currentLang = this.translateService.currentLang || this.translateService.defaultLang || 'es';

    this.aiService.searchEventsWithAi(query, this.userId || undefined, currentLang).subscribe({
      next: (response: AiSearchResponse) => {
        const botMessage: ChatMessage = {
          text: response.answer,
          isBot: true,
          timestamp: new Date(),
          relatedEvents: response.data && response.data.length > 0 ? response.data : undefined
        };
        this.messages.push(botMessage);
        this.isLoading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        this.translateService.get('CHATBOT.ERROR_MESSAGE').subscribe(text => {
          const errorMessage: ChatMessage = {
            text: text,
            isBot: true,
            timestamp: new Date()
          };
          this.messages.push(errorMessage);
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 100);
        });
      }
    });
  }

  useQuickQuestion(question: string): void {
    this.userInput = question;
    this.sendMessage();
  }

  viewEvent(eventId: string): void {
    this.isLoadingEvent = true;
    this.showEventModal = true;

    this.eventoService.getEventoById(eventId).subscribe({
      next: (evento) => {
        this.selectedEvent = evento;
        this.isLoadingEvent = false;
      },
      error: (err) => {
        this.isLoadingEvent = false;
        this.showEventModal = false;
      }
    });
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  isUserInEvent(): boolean {
    if (!this.selectedEvent || !this.userId) return false;
    
    return (this.selectedEvent.participantes || []).some((p: any) => 
      typeof p === 'string' ? p === this.userId : p._id === this.userId
    );
  }

  isUserCreator(): boolean {
    if (!this.selectedEvent || !this.userId) return false;
    
    const creador = this.selectedEvent.creador;
    if (typeof creador === 'string') {
      return creador === this.userId;
    }
    return creador?._id === this.userId;
  }

  isEventFull(): boolean {
    if (!this.selectedEvent || !this.selectedEvent.maxParticipantes) return false;
    
    const participantesCount = (this.selectedEvent.participantes || []).length;
    return participantesCount >= this.selectedEvent.maxParticipantes;
  }

  isUserInWaitlist(): boolean {
    if (!this.selectedEvent || !this.userId) return false;
    
    return (this.selectedEvent.listaEspera || []).some((p: any) => 
      typeof p === 'string' ? p === this.userId : p._id === this.userId
    );
  }

  getCreadorUsername(creador: any): string {
    if (!creador) return 'Usuario';
    if (typeof creador === 'string') return 'Usuario';
    return creador.username || 'Usuario';
  }

  getScheduleDate(schedule: string | string[]): string {
    if (Array.isArray(schedule)) {
      return schedule[0] || '';
    }
    return schedule;
  }

  joinEvent(): void {
    if (!this.selectedEvent?._id) return;

    this.isLoadingEvent = true;

    this.eventoService.joinEvento(this.selectedEvent._id).subscribe({
      next: (response) => {
        this.selectedEvent = response.evento;
        this.isLoadingEvent = false;
      },
      error: (err) => {
        this.isLoadingEvent = false;
        this.translateService.get('CHATBOT.MODAL.JOIN_ERROR').subscribe(msg => {
          alert(msg);
        });
      }
    });
  }

  showConfirmModal: boolean = false;
  confirmModalData: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
  } | null = null;

  openConfirmModal(title: string, message: string, confirmText: string, cancelText: string, onConfirm: () => void): void {
    this.confirmModalData = { title, message, confirmText, cancelText, onConfirm };
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmModalData = null;
  }

  confirmAction(): void {
    if (this.confirmModalData?.onConfirm) {
      this.confirmModalData.onConfirm();
    }
    this.closeConfirmModal();
  }

  leaveEvent(): void {
    if (!this.selectedEvent?._id) return;

    this.translateService.get([
      'CHATBOT.MODAL.LEAVE_CONFIRM_TITLE',
      'CHATBOT.MODAL.LEAVE_CONFIRM',
      'COMMON.CONFIRM',
      'COMMON.CANCEL'
    ]).subscribe(translations => {
      this.openConfirmModal(
        translations['CHATBOT.MODAL.LEAVE_CONFIRM_TITLE'],
        translations['CHATBOT.MODAL.LEAVE_CONFIRM'],
        translations['COMMON.CONFIRM'],
        translations['COMMON.CANCEL'],
        () => {
          this.isLoadingEvent = true;

          this.eventoService.leaveEvento(this.selectedEvent!._id!).subscribe({
            next: (response) => {
              this.selectedEvent = response.evento;
              this.isLoadingEvent = false;
            },
            error: (err) => {
              this.isLoadingEvent = false;
              this.translateService.get('CHATBOT.MODAL.LEAVE_ERROR').subscribe(msg => {
                alert(msg);
              });
            }
          });
        }
      );
    });
  }

  leaveWaitlist(): void {
    if (!this.selectedEvent?._id) return;

    this.translateService.get([
      'CHATBOT.MODAL.LEAVE_WAITLIST_CONFIRM_TITLE',
      'CHATBOT.MODAL.LEAVE_WAITLIST_CONFIRM',
      'COMMON.CONFIRM',
      'COMMON.CANCEL'
    ]).subscribe(translations => {
      this.openConfirmModal(
        translations['CHATBOT.MODAL.LEAVE_WAITLIST_CONFIRM_TITLE'],
        translations['CHATBOT.MODAL.LEAVE_WAITLIST_CONFIRM'],
        translations['COMMON.CONFIRM'],
        translations['COMMON.CANCEL'],
        () => {
          this.isLoadingEvent = true;

          this.eventoService.leaveWaitlist(this.selectedEvent!._id!).subscribe({
            next: (response) => {
              this.selectedEvent = response.evento;
              this.isLoadingEvent = false;
            },
            error: (err) => {
              this.isLoadingEvent = false;
              this.translateService.get('CHATBOT.MODAL.LEAVE_WAITLIST_ERROR').subscribe(msg => {
                alert(msg);
              });
            }
          });
        }
      );
    });
  }

  clearChat(): void {
    this.translateService.get('CHATBOT.WELCOME_MESSAGE').subscribe(text => {
      this.messages = [{
        text: text,
        isBot: true,
        timestamp: new Date()
      }];
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = 
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      return;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}