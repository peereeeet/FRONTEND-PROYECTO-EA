import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type EditDTO = { username: string; gmail: string; birthday: string; password?: string };

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  private auth = inject(AuthService);
  private router = inject(Router);

  me = signal<User | null>(null);
  eventos = signal<any[]>([]);
  loading = signal(true);
  error = signal('');

  private sub?: Subscription;
  private hbSub?: Subscription;

  showPassword = false;
  realPassword = '';

  checkingUsername = signal(false);
  usernameTaken    = signal(false);

  deleteOpen = signal<boolean>(false);
  deleting = signal<boolean>(false);
  deleteError = signal<string | null>(null);
  deletePasswordValue = '';
  deletePassword: string = '';

  checkingEmail = signal(false);
  emailTaken    = signal(false);

  currentLang: 'es' | 'en' | 'cat' | 'fr' =
  (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  constructor(private translate: TranslateService) {
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  private isValidEmail(v: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  editOpen = signal(false);
  saving   = signal(false);
  saveError = signal('');
  edit = signal<EditDTO>({ username: '', gmail: '', birthday: '' });

  private getId(u: any): string {
    return String(u?._id ?? u?.id ?? '');
  }

  ngOnInit(): void {
    this.sub = this.auth.currentUser$.subscribe(u => {
      if (!u) {
        this.router.navigate(['/login']);
        return;
      }

      const isOnline = (u as any).online ?? (u as any).isOnline ?? false;
      this.me.set({ ...(u as any), isOnline });

      const myId = this.getId(u);
      if (!myId) { this.loading.set(false); return; }

      this.loading.set(true);
      this.error.set('');

      this.userService.getUserById(myId).subscribe({
        next: (usr) => {
          const merged = { ...(this.me() as any), ...(usr as any) };
          merged.isOnline = (merged.online ?? merged.isOnline ?? false);
          this.me.set(merged);
          this.edit.set({
            username: merged.username ?? '',
            gmail: merged.gmail ?? '',
            birthday: merged.birthday ? new Date(merged.birthday).toISOString().slice(0,10) : '',
            password: ''
          });
        },
        error: () => {
        }
      });

      this.userService.getUserEvents(myId).subscribe({
        next: (r: any) => {
          const raw =
            Array.isArray(r) ? r
            : (r?.data ?? r?.events ?? r?.items ?? []);

          const list = (raw as any[]).map(ev => ({
            title: ev.name ?? ev.titulo ?? ev.title ?? ev.nombre ?? '—',
            date: ev.schedule ?? ev.fecha ?? ev.date ?? ev.startDate ?? null,
            location: ev.address ?? ev.lugar ?? ev.location ?? ev.site ?? '',
          }));

          this.eventos.set(list);
          this.loading.set(false);
        },
        error: (e) => {
          this.eventos.set([]);
          this.error.set(e?.error?.message || 'No se pudieron cargar tus eventos');
          this.loading.set(false);
        }
      });

      this.userService.heartbeat(myId).subscribe({
        next: (hb: any) => {
          const cur = this.me();
          if (cur) this.me.set({ ...cur, isOnline: !!(hb?.online ?? hb?.isOnline) });
        },
        error: () => {}
      });

      this.hbSub?.unsubscribe();
      this.hbSub = interval(60000)
        .pipe(switchMap(() => this.userService.heartbeat(myId)))
        .subscribe({
          next: (hb: any) => {
            const cur = this.me();
            if (cur) this.me.set({ ...cur, isOnline: !!(hb?.online ?? hb?.isOnline) });
          },
          error: () => {}
        });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.hbSub?.unsubscribe();
  }

  maskedPassword(): string {
    return '•'.repeat(10);
  }

  formatDate(d: any): string {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return isNaN(+date) ? String(d) : date.toLocaleDateString();
    } catch { return String(d); }
  }

  openEdit(): void {
    const u = this.me();
    const username = (u?.username ?? '').toString();
    const gmail = (u?.gmail ?? '').toString();

    let birthday = '';
    if (u?.birthday) {
      const d = new Date(u.birthday as any);
      if (!Number.isNaN(+d)) {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        birthday = `${d.getFullYear()}-${m}-${day}`;
      }
    }

    this.edit.set({ username, gmail, birthday });
    this.usernameTaken.set(false);
    this.emailTaken.set(false);
    this.checkingUsername.set(false);
    this.checkingEmail.set(false);
    this.saveError.set('');
    this.editOpen.set(true);
  }
  closeEdit() { this.editOpen.set(false); }

  saveEdit(): void {
    const u = this.me();
    const e = this.edit();
    if (!u || !e) return;

    const uname = (e.username || '').trim();
    const mail  = (e.gmail || '').trim();
    if (uname.length < 3) {
      this.saveError.set('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (!this.isValidEmail(mail)) {
      this.saveError.set('El correo no tiene un formato válido.');
      return;
    }
    if (this.usernameTaken() || this.emailTaken() || this.checkingUsername() || this.checkingEmail()) {
      return;
    }

    const id = String((u as any)._id ?? (u as any).id ?? '');
    if (!id) return;

    const patch: Partial<User & { password?: string }> = {
      username: uname || u.username,
      gmail:    mail  || u.gmail,
      birthday: (e.birthday as any) ?? (u.birthday as any)
    };
    if (e.password && e.password.trim() !== '') {
      patch.password = e.password.trim();
    }

    this.saving.set(true);
    this.saveError.set('');

    this.userService.updateMe(id, patch).subscribe({
      next: (resp) => {
        const merged = { ...(this.me() as any), ...(resp.user as any) };
        this.me.set(merged);
        this.saving.set(false);
        this.editOpen.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.status === 409
          ? (err?.error?.error || 'Usuario o correo ya en uso')
          : (err?.error?.error || 'No se pudo guardar los cambios');
        this.saveError.set(msg);
      }
    });
  }

  birthForInput(): string {
    return this.edit().birthday || '';
  }

  onBirthInput(val: string): void {
    const safe = this.clampToTodayYYYYMMDD(val || '');
    this.edit.update(e => ({ ...e, birthday: safe }));
  }

  todayISO(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private clampToTodayYYYYMMDD(v: string): string {
    if (!v) return '';
    const sel = new Date(v);
    const today = new Date(this.todayISO());
    if (isNaN(+sel)) return '';
    return sel > today ? this.todayISO() : v;
  }

  checkUsername(): void {
    const me = this.me();
    const e  = this.edit();
    if (!me) return;

    const value = (e.username || '').trim();
    this.usernameTaken.set(false);

    if (value.length < 3) return;

    this.checkingUsername.set(true);
    this.userService.checkUsernameExists(value, this.getId(me)).subscribe({
      next: (res) => {
        this.usernameTaken.set(!!res.exists);
        this.checkingUsername.set(false);
      },
      error: () => {
        this.checkingUsername.set(false);
      }
    });
  }

  checkEmail(): void {
    const me = this.me();
    const e  = this.edit();
    if (!me) return;

    const value = (e.gmail || '').trim();
    this.emailTaken.set(false);

    if (!this.isValidEmail(value)) return;

    this.checkingEmail.set(true);
    this.userService.checkEmailExists(value, this.getId(me)).subscribe({
      next: (res) => {
        this.emailTaken.set(!!res.exists);
        this.checkingEmail.set(false);
      },
      error: () => {
        this.checkingEmail.set(false);
      }
    });
  }

  openDelete(): void {
    this.deletePassword = '';
    this.deleteError.set('');
    this.deleting.set(false);
    this.deleteOpen.set(true);
  }

  closeDelete(): void {
    this.deleteOpen.set(false);
    this.deletePassword = '';
  }

  confirmDelete(): void {
    const u = this.me();
    const id = u?._id ?? '';
    if (!u || !id) {
      this.deleteError.set('No se encontró el usuario actual.');
      return;
    }
    if (!this.deletePassword || this.deletePassword.length < 7) {
      this.deleteError.set('Introduce tu contraseña (mínimo 7 caracteres).');
      return;
    }

    this.deleting.set(true);
    this.deleteError.set('');
    this.userService.deleteAccountWithPassword(id, this.deletePassword).subscribe({
      next: () => {
        try { this.auth.logout(); } catch {}
        this.deleting.set(false);
        this.deleteOpen.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.deleting.set(false);
        const msg = err?.status === 401 || err?.status === 403
          ? 'Contraseña incorrecta.'
          : (err?.error?.message || 'No se pudo eliminar la cuenta.');
        this.deleteError.set(msg);
      }
    });
  }

  changeLanguage(lang: 'es' | 'en') {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }
}
