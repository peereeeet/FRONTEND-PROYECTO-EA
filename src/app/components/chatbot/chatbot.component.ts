import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService, AiSearchResponse } from '../../services/ai.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ChatbotStateService } from '../../services/chatbot-state.service';

export interface ChatMessage {
  text: string;
  isBot: boolean;
  timestamp: Date;
  relatedEvents?: any[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  messages: ChatMessage[] = [];
  userInput: string = '';
  isLoading: boolean = false;
  isChatOpen: boolean = false;
  userId: string | null = null;

  // Sugerencias de preguntas rápidas
  quickQuestions: string[] = [
    '¿Qué eventos hay este fin de semana?',
    'Eventos de deportes en Barcelona',
    '¿Eventos de música disponibles?',
    'Eventos gratuitos cerca de mí'
  ];

  constructor(
    private aiService: AiService,
    private authService: AuthService,
    private router: Router,
    private chatbotStateService: ChatbotStateService
  ) {}

  ngOnInit(): void {
    // Obtener el userId si está autenticado
    const user = this.authService.getCurrentUser();
    this.userId = user?._id || null;

    // Mensaje de bienvenida
    this.messages.push({
      text: '¡Hola! Soy tu asistente de eventos. ¿En qué puedo ayudarte hoy?',
      isBot: true,
      timestamp: new Date()
    });

    // Suscribirse al estado del chat desde el servicio
    this.chatbotStateService.chatOpen$.subscribe(isOpen => {
      this.isChatOpen = isOpen;
      if (isOpen) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
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

    // Agregar mensaje del usuario
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

    // Llamar al servicio de IA
    this.aiService.searchEventsWithAi(query, this.userId || undefined).subscribe({
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
        console.error('Error al consultar IA:', error);
        const errorMessage: ChatMessage = {
          text: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
          isBot: true,
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  useQuickQuestion(question: string): void {
    this.userInput = question;
    this.sendMessage();
  }

  viewEvent(eventId: string): void {
    this.isChatOpen = false;
    this.router.navigate(['/evento', eventId]);
  }

  clearChat(): void {
    this.messages = [{
      text: '¡Hola! Soy tu asistente de eventos. ¿En qué puedo ayudarte hoy?',
      isBot: true,
      timestamp: new Date()
    }];
  }

  private scrollToBottom(): void {
    try {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = 
          this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}