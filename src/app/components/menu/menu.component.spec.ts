import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuComponent } from './menu.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { EventoService } from '../../services/evento.service';
import { of } from 'rxjs';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockEventoService: jasmine.SpyObj<EventoService>;

  beforeEach(async () => {
    // Crear mocks de los servicios
    mockUserService = jasmine.createSpyObj('UserService', [
      'listFriends',
      'heartbeat',
      'getUsers',
      'getFriendRequests',
      'getSentRequests',
      'onFriendsChanged'
    ]);
    
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser'], {
      currentUser$: of({
        _id: '123',
        username: 'testuser',
        gmail: 'test@test.com',
        birthday: new Date(),
        rol: 'usuario'
      } as any)
    });
    
    mockEventoService = jasmine.createSpyObj('EventoService', ['getMisEventos']);
    
    // Configurar respuestas por defecto
    mockUserService.listFriends.and.returnValue(of({
      data: [],
      page: 1,
      totalPages: 1,
      totalItems: 0
    }));
    
    mockUserService.heartbeat.and.returnValue(of({ ok: true, online: true }));
    
    mockUserService.onFriendsChanged.and.returnValue(of(undefined));
    
    mockEventoService.getMisEventos.and.returnValue(of({
      eventosCreados: [],
      eventosInscritos: []
    }));

    await TestBed.configureTestingModule({
      imports: [
        MenuComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: EventoService, useValue: mockEventoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize event stats', () => {
    const stats = component.eventStats();
    expect(stats).toBeDefined();
    expect(stats.eventosCreados).toBe(0);
    expect(stats.eventosInscritos).toBe(0);
    expect(stats.proximosEventos).toEqual([]);
  });

  it('should load friends on init', () => {
    expect(mockUserService.listFriends).toHaveBeenCalled();
  });

  it('should load event statistics on init', () => {
    expect(mockEventoService.getMisEventos).toHaveBeenCalled();
  });

  it('should have navigation methods defined', () => {
    expect(component.goToExplorarEventos).toBeDefined();
    expect(component.goToMisEventos).toBeDefined();
    expect(component.goToPerfil).toBeDefined();
  });

  it('should format dates correctly', () => {
    const testDate = new Date('2024-12-25T14:30:00');
    const formatted = component.formatearFecha(testDate);
    expect(formatted).toContain('diciembre');
    expect(formatted).toContain('25');
    expect(formatted).toContain('2024');
  });

  it('should format time correctly', () => {
    const testDate = new Date('2024-12-25T14:30:00');
    const formatted = component.formatearHora(testDate);
    expect(formatted).toContain('14');
    expect(formatted).toContain('30');
  });
});