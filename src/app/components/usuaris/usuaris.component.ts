import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, FormArray, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { MaskEmailPipe } from '../../pipes/maskEmail.pipe';
import { Evento } from '../../models/evento.model';
import { EventoService } from '../../services/evento.service';
import { Location } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-usuaris',
  templateUrl: './usuaris.component.html',
  styleUrls: ['./usuaris.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaskEmailPipe, TranslateModule]
})
export class UsuarisComponent implements OnInit {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;
  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  usuarios: User[] = [];
  desplegado: boolean[] = [];
  mostrarPassword: boolean[] = [];

  userForm!: FormGroup;
  tempInterest: string = '';

  usuarioEdicion: User | null = null;
  indiceEdicion: number | null = null;
  formSubmitted = false;
  usuarioAEliminar: User | null = null;
  errorMessage = '';
  emailExists: boolean = false;
  isCheckingEmail: boolean = false;
  isCheckingUsername = false;
  usernameExists = false;

  showDeleteModal = false;
  private pendingDeleteIndex: number | null = null;

  showUpdateModal = false;
  private pendingUpdateUser: User | null = null;
  private pendingUpdateIndex: number | null = null;

  page = 1;
  pageSize = 6;
  totalUsuarios = 0;
  totalPagesBackend = 1;

  todosEventos: Evento[] = [];
  private eventosById = new Map<string, Evento>();

  // Edit Modal State
  showEditModal = false;
  editingUser: User | null = null;
  editForm!: FormGroup;
  
  // Interest Catalog
  interestCatalog = [
    'Deportes', 'Música', 'Cultura', 'Gastronomía',
    'Tecnología', 'Naturaleza', 'Arte', 'Cine',
    'Lectura', 'Viajes', 'Fotografía', 'Juegos'
  ];

  constructor(
    private userService: UserService,
    private eventoService: EventoService,
    private location: Location,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadEventos();
    this.loadUsers();
  }

  private initForm(): void {
    this.userForm = new FormGroup({
      username: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/),
        this.restrictedUsernameValidator()
      ]),
      gmail: new FormControl('', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        this.backendEmailValidator()
      ]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(128),
        this.backendPasswordValidator()
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
      birthday: new FormControl(this.todayISO(), [
        Validators.required,
        this.backendBirthdayValidator()
      ]),
      rol: new FormControl('usuario', [Validators.required]),
      interests: new FormArray([])
    }, { validators: this.passwordMatchValidator });
  }

  get interestsFormArray(): FormArray {
    return this.userForm.get('interests') as FormArray;
  }

  addInterestFromInput(): void {
    const trimmed = this.tempInterest.trim();
    if (!trimmed) return;
    
    const currentInterests = this.interestsFormArray.value as string[];
    if (currentInterests.includes(trimmed)) {
      this.tempInterest = '';
      return;
    }
    
    this.interestsFormArray.push(new FormControl(trimmed));
    this.tempInterest = '';
  }

  removeInterest(index: number): void {
    this.interestsFormArray.removeAt(index);
  }

  // --- CUSTOM VALIDATORS (Exact Parity with Backend) ---

  private restrictedUsernameValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const restricted = ['admin', 'root', 'system', 'null', 'undefined'];
      if (control.value && restricted.includes(control.value.toLowerCase())) {
        return { restricted: true };
      }
      return null;
    };
  }

  private backendEmailValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(value)) return { format: true };

      const temporaryEmailDomains = [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
        'throwaway.email', 'temp-mail.org', 'maildrop.cc', 'getnada.com',
        'trashmail.com', 'sharklasers.com'
      ];
      const domain = value.split('@')[1]?.toLowerCase();
      if (temporaryEmailDomains.includes(domain)) return { temporary: true };

      const [localPart, domainPart] = value.split('@');
      if (localPart.length > 64) return { localTooLong: true };
      if (domainPart.length > 253) return { domainTooLong: true };
      if (/\\.\\./.test(value)) return { consecutiveDots: true };
      if (localPart.startsWith('.') || localPart.endsWith('.')) return { edgeDots: true };

      return null;
    };
  }

  private backendPasswordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const errors: any = {};
      if (!/[A-Z]/.test(value)) errors.missingUpper = true;
      if (!/[a-z]/.test(value)) errors.missingLower = true;
      if (!/[0-9]/.test(value)) errors.missingNumber = true;
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) errors.missingSpecial = true;

      const commonPasswords = [
        'password', 'password123', '12345678', 'qwerty', 'abc123',
        'monkey', '1234567890', 'letmein', 'trustno1', 'dragon',
        'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
        'bailey', 'passw0rd', 'shadow', '123456', 'admin123'
      ];
      if (commonPasswords.some(common => value.toLowerCase().includes(common))) errors.common = true;

      const sequences = ['123', 'abc', 'qwerty', 'asdf'];
      if (sequences.some(seq => value.toLowerCase().includes(seq))) errors.sequence = true;

      if (/(.)\1{2,}/.test(value)) errors.repeatChars = true;

      return Object.keys(errors).length ? errors : null;
    };
  }

  private backendBirthdayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const birthday = new Date(value);
      const today = new Date();
      if (birthday > today) return { future: true };

      const age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())
        ? age - 1
        : age;

      if (actualAge < 13) return { underAge: true };
      if (actualAge > 120) return { overAge: true };

      return null;
    };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  // --- FORM ACTIONS ---

  agregarElemento(): void {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.emailExists = false;
    this.usernameExists = false;

    if (this.userForm.invalid) return;

    const val = this.userForm.value;

    this.isCheckingEmail = true;
    this.userService.checkEmailExists(val.gmail, this.usuarioEdicion?._id).subscribe({
      next: (res) => {
        this.isCheckingEmail = false;
        if (res.exists) {
          this.emailExists = true;
          return;
        }

        this.isCheckingUsername = true;
        this.userService.checkUsernameExists(val.username, this.usuarioEdicion?._id).subscribe({
          next: (res) => {
            this.isCheckingUsername = false;
            if (res.exists) {
              this.usernameExists = true;
              return;
            }

            const birthdayDate = this.parseAsUTCDate(val.birthday);

            if (this.indiceEdicion !== null) {
              const actualizado: User = {
                ...this.usuarioEdicion,
                username: val.username,
                gmail: val.gmail,
                birthday: birthdayDate,
                rol: val.rol,
                interests: val.interests
              };
              if (val.password) actualizado.password = val.password;

              this.pendingUpdateUser = actualizado;
              this.pendingUpdateIndex = this.indiceEdicion;
              this.showUpdateModal = true;
              return;
            }

            const usuarioJSON: User = {
              username: val.username,
              gmail: val.gmail,
              password: val.password,
              birthday: birthdayDate,
              eventos: [],
              rol: val.rol,
              interests: val.interests,
              isActive: true
            };

            this.userService.addUser(usuarioJSON).subscribe(() => {
              this.loadUsers();
              this.resetFormInternal();
            });
          },
          error: () => (this.isCheckingUsername = false)
        });
      },
      error: () => {
        this.isCheckingEmail = false;
        this.errorMessage = this.translate.instant('BACKOFFICE.USERS.ERR_EMAIL_VERIFY');
      }
    });
  }

  cancelarEdicion(): void {
    this.resetFormInternal();
  }

  private resetFormInternal(): void {
    this.indiceEdicion = null;
    this.usuarioEdicion = null;
    this.formSubmitted = false;
    this.userForm.reset({
      username: '',
      gmail: '',
      password: '',
      confirmPassword: '',
      birthday: this.todayISO(),
      rol: 'usuario'
    });
    this.interestsFormArray.clear();
    
    // Restore validators (password required for create)
    this.userForm.get('password')?.setValidators([
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(128),
      this.backendPasswordValidator()
    ]);
    this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
  }

  prepararEdicion(usuario: User, index: number): void {
    this.usuarioEdicion = { ...usuario };
    this.indiceEdicion = index;
    this.desplegado = this.desplegado.map((_, i) => i === index);

    let birthdayStr = this.todayISO();
    if (usuario.birthday) {
      const d = new Date(usuario.birthday as string | Date);
      birthdayStr = this.toISODate(d);
    }

    this.userForm.patchValue({
      username: usuario.username,
      gmail: usuario.gmail,
      password: '',
      confirmPassword: '',
      birthday: birthdayStr,
      rol: usuario.rol || 'usuario'
    });

    this.interestsFormArray.clear();
    (usuario.interests || []).forEach(i => {
      this.interestsFormArray.push(new FormControl(i));
    });

    // Password optional in edit
    this.userForm.get('password')?.setValidators([
      Validators.minLength(8),
      Validators.maxLength(128),
      this.backendPasswordValidator()
    ]);
    this.userForm.get('confirmPassword')?.setValidators([]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
  }

  // --- EDIT MODAL METHODS ---

  openEditModal(usuario: User, index: number): void {
    this.editingUser = { ...usuario };
    this.showEditModal = true;

    let birthdayStr = this.todayISO();
    if (usuario.birthday) {
      const d = new Date(usuario.birthday as string | Date);
      birthdayStr = this.toISODate(d);
    }

    // Build interests FormGroup with checkboxes
    const interestsGroup: any = {};
    this.interestCatalog.forEach((interest, i) => {
      const isSelected = (usuario.interests || []).includes(interest);
      interestsGroup[`interest_${i}`] = new FormControl(isSelected);
    });

    this.editForm = new FormGroup({
      username: new FormControl(usuario.username, [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/),
        this.restrictedUsernameValidator()
      ]),
      gmail: new FormControl(usuario.gmail, [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        this.backendEmailValidator()
      ]),
      password: new FormControl('', [
        Validators.minLength(8),
        Validators.maxLength(128),
        this.backendPasswordValidator()
      ]),
      confirmPassword: new FormControl(''),
      birthday: new FormControl(birthdayStr, [
        Validators.required,
        this.backendBirthdayValidator()
      ]),
      rol: new FormControl(usuario.rol || 'usuario', [Validators.required]),
      interests: new FormGroup(interestsGroup)
    }, { validators: this.conditionalPasswordMatchValidator });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.editingUser) return;

    const val = this.editForm.value;
    
    // Extract selected interests from checkboxes
    const selectedInterests: string[] = [];
    this.interestCatalog.forEach((interest, i) => {
      if (val.interests[`interest_${i}`]) {
        selectedInterests.push(interest);
      }
    });

    const updatedUser: User = {
      ...this.editingUser,
      username: val.username,
      gmail: val.gmail,
      birthday: this.parseAsUTCDate(val.birthday),
      rol: val.rol,
      interests: selectedInterests
    };

    // Only include password if provided
    if (val.password && val.password.trim()) {
      updatedUser.password = val.password;
    }

    this.userService.updateUser(updatedUser).subscribe(() => {
      this.loadUsers();
      this.closeEditModal();
    });
  }

  private conditionalPasswordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    
    // Only validate match if password has a value
    if (pass && pass.trim()) {
      return pass === confirm ? null : { mismatch: true };
    }
    return null;
  }

  toggleDesplegable(index: number): void {
    this.desplegado[index] = !this.desplegado[index];
  }

  togglePassword(index: number): void {
    this.mostrarPassword[index] = !this.mostrarPassword[index];
  }

  openDeleteModal(index: number): void {
    this.pendingDeleteIndex = index;
    this.usuarioAEliminar = this.usuarios[index];
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.pendingDeleteIndex = null;
    this.usuarioAEliminar = null;
  }

  confirmarDisable(): void {
    if (this.pendingDeleteIndex === null) return;
    const usuario = this.usuarios[this.pendingDeleteIndex];
    if (!usuario._id) return;

    const updatedUser: User = { ...usuario, isActive: !usuario.isActive };
    this.userService.updateUser(updatedUser).subscribe(() => {
      this.loadUsers();
      this.closeDeleteModal();
    });
  }

  closeUpdateModal(): void {
    this.showUpdateModal = false;
    this.pendingUpdateUser = null;
    this.pendingUpdateIndex = null;
  }

  confirmarUpdate(): void {
    if (!this.pendingUpdateUser || this.pendingUpdateIndex === null) return;
    const userId = this.usuarios[this.pendingUpdateIndex]._id;
    if (!userId) return;

    this.userService.updateUser(this.pendingUpdateUser).subscribe(() => {
      this.loadUsers();
      this.closeUpdateModal();
      this.resetFormInternal();
    });
  }

  // --- DATA LOADING ---

  loadUsers(): void {
    this.userService.getUsers(this.page, this.pageSize).subscribe((response) => {
      this.usuarios = response.data;
      this.totalUsuarios = response.totalItems;
      this.totalPagesBackend = response.totalPages;
      this.desplegado = new Array(this.usuarios.length).fill(false);
      this.mostrarPassword = new Array(this.usuarios.length).fill(false);
    });
  }

  loadEventos(): void {
    this.eventoService.getEventos(1, 1000).subscribe((response) => {
      this.todosEventos = response.data;
      this.eventosById.clear();
      response.data.forEach((ev: Evento) => {
        if (ev._id) this.eventosById.set(ev._id, ev);
      });
    });
  }

  // --- PAGINATION ---

  get totalPages(): number {
    return this.totalPagesBackend;
  }

  get pagedUsuarios(): User[] {
    return this.usuarios;
  }

  idx(localIndex: number): number {
    return (this.page - 1) * this.pageSize + localIndex;
  }

  nextBackendPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadUsers();
    }
  }

  prevBackendPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadUsers();
    }
  }

  // --- EVENT MANAGEMENT ---

  getUserEventNames(usuario: User): string {
    if (!usuario.eventos || usuario.eventos.length === 0) {
      return this.translate.instant('BACKOFFICE.USERS.NO_EVENTS');
    }
    return usuario.eventos
      .map((ev: string | Evento) => {
        if (typeof ev === 'string') {
          return this.eventosById.get(ev)?.name || ev;
        }
        return ev.name || '';
      })
      .join(', ');
  }

  getAvailableEvents(usuario: User): Evento[] {
    const userEventIds = new Set(usuario.eventos || []);
    return this.todosEventos.filter(ev => ev._id && !userEventIds.has(ev._id));
  }

  onAddEvent(usuario: User, evento: Evento): void {
    if (!usuario._id || !evento._id) return;
    this.userService.addEventToUser(usuario._id, evento._id).subscribe(() => {
      this.loadUsers();
    });
  }

  // --- UTILITIES ---

  todayISO(): string {
    const now = new Date();
    return this.toISODate(now);
  }

  toISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseAsUTCDate(isoStr: string): Date {
    const [year, month, day] = isoStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  // --- THEME & LANGUAGE ---

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    this.showLangMenu = false;
  }

  goHome(): void {
    this.location.back();
  }
}