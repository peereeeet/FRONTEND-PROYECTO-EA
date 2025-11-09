import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventoComponent } from '../evento/evento.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { EventoService } from '../../services/evento.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { Evento } from '../../models/evento.model';
import { User } from '../../models/user.model';

describe('EventoComponent', () => {
  let component: EventoComponent;
  let fixture: ComponentFixture<EventoComponent>;
  let mockEventoService: jasmine.SpyObj<EventoService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  // ========== DATOS DE PRUEBA ==========
  const mockUsers: User[] = [
    {
      _id: '1',
      username: 'user1',
      gmail: 'user1@test.com',
      birthday: new Date(),
      eventos: []
    } as User,
    {
      _id: '2',
      username: 'user2',
      gmail: 'user2@test.com',
      birthday: new Date(),
      eventos: []
    } as User
  ];

  const mockEventos: Evento[] = [
    {
      _id: '101',
      name: 'Evento Test 1',
      schedule: ['2024-12-25 14:30'],
      address: 'Calle Test 123',
      participantes: ['1'],
      creador: '1' as any,
      avgRating: 4.5,
      ratingsCount: 10
    },
    {
      _id: '102',
      name: 'Evento Test 2',
      schedule: ['2024-12-26 16:00'],
      address: 'Avenida Prueba 456',
      participantes: ['2'],
      creador: '2' as any,
      avgRating: 3.8,
      ratingsCount: 5
    }
  ];

  beforeEach(async () => {
    // ========== CREAR MOCKS DE SERVICIOS ==========
    mockEventoService = jasmine.createSpyObj('EventoService', [
      'getEventos',
      'getEventoById',
      'addEvento',
      'updateEvento',
      'deleteEvento',
      'checkEventNameExists'
    ]);
    
    mockUserService = jasmine.createSpyObj('UserService', [
      'getUsers',
      'getUserById'
    ]);
    
    mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    // ========== CONFIGURAR RESPUESTAS POR DEFECTO ==========
    mockEventoService.getEventos.and.returnValue(of({
      data: mockEventos,
      page: 1,
      totalPages: 1,
      totalItems: 2
    }));

    mockEventoService.checkEventNameExists.and.returnValue(of({
      exists: false,
      message: 'El título está disponible'
    }));

    mockUserService.getUsers.and.returnValue(of({
      data: mockUsers,
      page: 1,
      totalPages: 1,
      totalItems: 2
    }));

    mockAuthService.getCurrentUser.and.returnValue({
      _id: '1',
      username: 'admin',
      gmail: 'admin@test.com',
      birthday: new Date(),
      rol: 'admin'
    } as any);

    await TestBed.configureTestingModule({
      declarations: [
        EventoComponent
      ],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ],
      providers: [
        { provide: EventoService, useValue: mockEventoService },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ========== TESTS DE INICIALIZACIÓN ==========
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load eventos on init', () => {
    expect(mockEventoService.getEventos).toHaveBeenCalled();
    expect(component.eventos.length).toBe(2);
  });

  it('should load users on init', () => {
    expect(mockUserService.getUsers).toHaveBeenCalled();
    expect(component.users.length).toBe(2);
  });

  it('should initialize with empty newEvent', () => {
    expect(component.newEvent.name).toBe('');
    expect(component.newEvent.schedule).toEqual([]);
    expect(component.newEvent.participantes).toEqual([]);
  });

  // ========== TESTS DE PAGINACIÓN ==========

  it('should go to next page', () => {
    component.page = 1;
    component.totalPagesBackend = 3;
    
    component.nextBackendPage();
    
    expect(component.page).toBe(2);
  });

  it('should not go beyond last page', () => {
    component.page = 3;
    component.totalPagesBackend = 3;
    
    component.nextBackendPage();
    
    expect(component.page).toBe(3);
  });

  it('should go to previous page', () => {
    component.page = 2;
    
    component.prevBackendPage();
    
    expect(component.page).toBe(1);
  });

  it('should not go below page 1', () => {
    component.page = 1;
    
    component.prevBackendPage();
    
    expect(component.page).toBe(1);
  });

  // ========== TESTS DE HORARIO ==========

  it('should set schedule correctly', () => {
    component.dateStr = '2024-12-25';
    component.timeStr = '14:30';
    
    component.setSchedule();
    
    expect(component.newEvent.schedule).toEqual(['2024-12-25 14:30']);
    expect(component.errorMessage).toBe('');
  });

  it('should show error if date missing', () => {
    component.dateStr = '';
    component.timeStr = '14:30';
    
    component.setSchedule();
    
    expect(component.errorMessage).toBe('Selecciona fecha y hora.');
  });

  it('should show error if time missing', () => {
    component.dateStr = '2024-12-25';
    component.timeStr = '';
    
    component.setSchedule();
    
    expect(component.errorMessage).toBe('Selecciona fecha y hora.');
  });

  it('should clear schedule', () => {
    component.newEvent.schedule = ['2024-12-25 14:30'];
    component.dateStr = '2024-12-25';
    component.timeStr = '14:30';
    
    component.clearSchedule();
    
    expect(component.newEvent.schedule).toEqual([]);
    expect(component.dateStr).toBe('');
    expect(component.timeStr).toBe('');
  });

  // ========== TESTS DE PARTICIPANTES ==========

  it('should add participant', () => {
    component.availableUsers = [...mockUsers];
    component.selectedUsers = [];
    
    component.addParticipant(mockUsers[0]);
    
    expect(component.selectedUsers.length).toBe(1);
    expect(component.selectedUsers[0]._id).toBe('1');
    expect(component.availableUsers.length).toBe(1);
  });

  it('should remove participant', () => {
    component.selectedUsers = [mockUsers[0]];
    component.availableUsers = [mockUsers[1]];
    
    component.removeParticipant(mockUsers[0]);
    
    expect(component.selectedUsers.length).toBe(0);
    expect(component.availableUsers.length).toBe(2);
  });

  it('should sync participant IDs when adding', () => {
    component.selectedUsers = [];
    
    component.addParticipant(mockUsers[0]);
    
    expect(component.newEvent.participantes).toContain('1');
  });

  // ========== TESTS DE VALIDACIÓN ==========

  it('should show error if name is empty', () => {
    component.newEvent.name = '';
    component.newEvent.schedule = ['2024-12-25 14:30'];
    component.newEvent.address = 'Test Address';
    
    component.onSubmit();
    
    expect(component.errorMessage).toBe('El título del evento es obligatorio.');
  });

  it('should show error if schedule is empty', () => {
    component.newEvent.name = 'Test Event';
    component.newEvent.schedule = [];
    component.newEvent.address = 'Test Address';
    
    component.onSubmit();
    
    expect(component.errorMessage).toBe('Selecciona el horario del evento.');
  });

  it('should show error if address is empty', () => {
    component.newEvent.name = 'Test Event';
    component.newEvent.schedule = ['2024-12-25 14:30'];
    component.newEvent.address = '';
    
    component.onSubmit();
    
    expect(component.errorMessage).toBe('Selecciona la dirección del evento.');
  });

  // ========== TESTS DE CREACIÓN DE EVENTO ==========

  it('should create evento successfully', () => {
    component.newEvent = {
      name: 'Nuevo Evento',
      schedule: ['2024-12-25 14:30'],
      address: 'Calle Nueva 789',
      participantes: ['1']
    };

    mockEventoService.addEvento.and.returnValue(of({
      _id: '103',
      name: 'Nuevo Evento',
      schedule: ['2024-12-25 14:30'],
      address: 'Calle Nueva 789',
      participantes: ['1'],
      creador: '1' as any
    }));

    component.onSubmit();

    expect(mockEventoService.checkEventNameExists).toHaveBeenCalledWith('Nuevo Evento');
  });

  it('should show error if event name exists', () => {
    component.newEvent = {
      name: 'Evento Existente',
      schedule: ['2024-12-25 14:30'],
      address: 'Calle Test',
      participantes: []
    };

    mockEventoService.checkEventNameExists.and.returnValue(of({
      exists: true,
      message: 'Ya existe un evento con este título'
    }));

    component.onSubmit();

    expect(component.errorMessage).toBe('⚠️ Ya existe un evento con este título.');
  });

  // ========== TESTS DE MODAL ELIMINAR ==========

  it('should open delete modal', () => {
    component.openDeleteModal(0);
    
  expect(component.showDeleteModal).toBe(true);
  expect((component as any).pendingDeleteIndex).toBe(0);
  });

  it('should close delete modal', () => {
  component.showDeleteModal = true;
  (component as any).pendingDeleteIndex = 0;
    
    component.closeDeleteModal();
    
  expect(component.showDeleteModal).toBe(false);
  expect((component as any).pendingDeleteIndex).toBeNull();
  });

  it('should delete evento', () => {
  component.eventos = [...mockEventos];
  (component as any).pendingDeleteIndex = 0;
    
    mockEventoService.deleteEvento.and.returnValue(of(undefined as any));
    
    component.confirmarEliminar();
    
    expect(mockEventoService.deleteEvento).toHaveBeenCalledWith('101');
  });

  // ========== TESTS DE MODAL EDICIÓN ==========

  it('should open edit modal and load evento', () => {
    mockEventoService.getEventoById.and.returnValue(of(mockEventos[0]));
    
    component.openEditModal(0);
    
    expect(component.showEditModal).toBe(true);
    expect(mockEventoService.getEventoById).toHaveBeenCalledWith('101');
  });

  it('should close edit modal', () => {
    component.showEditModal = true;
    component.editEvent = mockEventos[0];
    
    component.closeEditModal();
    
    expect(component.showEditModal).toBe(false);
    expect(component.editEvent.name).toBe('');
  });

  it('should set edit schedule correctly', () => {
    component.editDateStr = '2024-12-25';
    component.editTimeStr = '14:30';
    
    component.setEditSchedule();
    
    expect(component.editEvent.schedule).toEqual(['2024-12-25 14:30']);
  });

  it('should update evento', () => {
    component.editEvent = {
      _id: '101',
      name: 'Evento Actualizado',
      schedule: ['2024-12-25 14:30'],
      address: 'Nueva Dirección',
      participantes: ['1']
    };
    (component as any).pendingEditIndex = 0;

    mockEventoService.updateEvento.and.returnValue(of(component.editEvent));

    component.onEditSubmit();

    expect(mockEventoService.updateEvento).toHaveBeenCalled();
  });

  // ========== TESTS DE FORMATO ==========

  it('should format schedule text correctly', () => {
    const evento: Evento = {
      _id: '1',
      name: 'Test',
      schedule: ['2024-12-25 14:30'],
      participantes: []
    };
    
    const formatted = component.getScheduleText(evento);
    
    expect(formatted).toBe('25-12-2024 14:30');
  });

  it('should return "-" for empty schedule', () => {
    const evento: Evento = {
      _id: '1',
      name: 'Test',
      schedule: [],
      participantes: []
    };
    
    const formatted = component.getScheduleText(evento);
    
    expect(formatted).toBe('-');
  });

  it('should get event address', () => {
    const address = component.getEventAddress(mockEventos[0]);
    expect(address).toBe('Calle Test 123');
  });

  it('should return "-" for missing address', () => {
    const eventoSinDireccion = { ...mockEventos[0], address: undefined };
    const address = component.getEventAddress(eventoSinDireccion);
    expect(address).toBe('-');
  });

  // ========== TESTS DE PARTICIPANTES (VISUALIZACIÓN) ==========

  it('should get participants names', () => {
    component.users = mockUsers;
    
    const names = component.getParticipantsNames(mockEventos[0]);
    
    expect(names).toContain('user1');
  });

  it('should return "-" for empty participants', () => {
    const eventoSinParticipantes = { ...mockEventos[0], participantes: [] };
    
    const names = component.getParticipantsNames(eventoSinParticipantes);
    
    expect(names).toBe('-');
  });

  it('should get user name by id', () => {
    component.users = mockUsers;
    
    const name = component.getUserNameById('1');
    
    expect(name).toBe('user1');
  });

  it('should return id if user not found', () => {
    component.users = mockUsers;
    
    const name = component.getUserNameById('999');
    
    expect(name).toBe('999');
  });

  // ========== TESTS DE PAGINACIÓN DE PARTICIPANTES ==========

  it('should calculate available total pages correctly', () => {
    component.availableUsers = mockUsers;
    component.availablePageSize = 1;
    
    expect(component.availableTotalPages).toBe(2);
  });

  it('should calculate selected total pages correctly', () => {
    component.selectedUsers = mockUsers;
    component.selectedPageSize = 1;
    
    expect(component.selectedTotalPages).toBe(2);
  });

  it('should get correct available page items', () => {
    component.availableUsers = mockUsers;
    component.availablePage = 1;
    component.availablePageSize = 1;
    
    const items = component.availablePageItems;
    
    expect(items.length).toBe(1);
    expect(items[0]._id).toBe('1');
  });

  it('should navigate available pages', () => {
    component.availablePage = 1;
    
    component.availableNextPage();
    
    expect(component.availablePage).toBe(2);
    
    component.availablePrevPage();
    
    expect(component.availablePage).toBe(1);
  });

  // ========== TESTS DE MANEJO DE ERRORES ==========

  it('should handle error when loading eventos fails', () => {
    mockEventoService.getEventos.and.returnValue(
      throwError(() => new Error('Network error'))
    );
    
    component['loadEventos']();
    
    // El componente debe manejar el error sin crashear
    expect(component).toBeTruthy();
  });

  it('should handle error when creating evento fails', () => {
    component.newEvent = {
      name: 'Test Event',
      schedule: ['2024-12-25 14:30'],
      address: 'Test Address',
      participantes: []
    };

    mockEventoService.checkEventNameExists.and.returnValue(of({ exists: false }));
    mockEventoService.addEvento.and.returnValue(
      throwError(() => ({ error: { message: 'Server error' } }))
    );

    component.onSubmit();

    expect(component.errorMessage).toBe('Error al crear el evento. Revisa los datos.');
  });

  // ========== TESTS DE ÍNDICE (INDEX HELPER) ==========

  it('should return correct index', () => {
  const index = (component as any).idx(5);
    expect(index).toBe(5);
  });
});