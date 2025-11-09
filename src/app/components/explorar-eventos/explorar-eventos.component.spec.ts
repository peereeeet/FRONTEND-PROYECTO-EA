import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExplorarEventosComponent } from './explorar-eventos.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventoService } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';

describe('ExplorarEventosComponent', () => {
  let component: ExplorarEventosComponent;
  let fixture: ComponentFixture<ExplorarEventosComponent>;
  let mockEventoService: jasmine.SpyObj<EventoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    // Crear mocks de los servicios
    mockEventoService = jasmine.createSpyObj('EventoService', [
      'getEventos',
      'joinEvento',
      'leaveEvento'
    ]);
    
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    
    // Configurar respuestas por defecto
    mockEventoService.getEventos.and.returnValue(of({
      data: [],
      page: 1,
      totalPages: 1,
      totalItems: 0
    }));
    
    mockAuthService.getCurrentUser.and.returnValue({
      _id: '123',
      username: 'testuser',
      gmail: 'test@test.com',
      birthday: new Date(),
      rol: 'usuario'
    } as any);

    await TestBed.configureTestingModule({
      imports: [
        ExplorarEventosComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: EventoService, useValue: mockEventoService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorarEventosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load eventos on init', () => {
    expect(mockEventoService.getEventos).toHaveBeenCalled();
  });

  it('should get current user on init', () => {
    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should initialize with empty eventos array', () => {
    expect(component.eventos).toEqual([]);
  });

  it('should have pagination properties initialized', () => {
    expect(component.page).toBe(1);
    expect(component.pageSize).toBe(6);
  });
});