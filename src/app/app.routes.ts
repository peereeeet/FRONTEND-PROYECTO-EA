import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { UsuarisComponent } from './components/usuaris/usuaris.component';
import { EventoComponent } from './components/evento/evento.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegistrarComponent } from './components/registrar/registrar.component';
import { MenuComponent } from './components/menu/menu.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { MisEventosComponent } from './components/mis-eventos/mis-eventos.component';
import { CrearEventosComponent } from './components/crear-eventos/crear-eventos.component';
import { InvitacionesComponent } from './components/invitaciones/invitaciones.component';
import { CalendarioComponent } from './components/calendario/calendario.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },
  { path: 'registrar', component: RegistrarComponent },
  { 
    path: '', 
    redirectTo: 'registrar', 
    pathMatch: 'full' 
  },
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'usuaris', 
    component: UsuarisComponent,
    canActivate: [authGuard] 
  },
  { 
    path: 'evento', 
    component: EventoComponent,
    canActivate: [authGuard] 
  },
  { path: 'menu', 
    component: MenuComponent, 
    canActivate: [authGuard] 
  },
  { path: 'perfil', 
    component: PerfilComponent, 
    canActivate: [authGuard] 
  },
    {
    path: 'mis-eventos',
    component: MisEventosComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'invitaciones', 
    component: InvitacionesComponent, 
    canActivate: [authGuard] 
  },
  { path: 'crear-evento',
    component: CrearEventosComponent,
    canActivate: [authGuard] },
  { 
    path: 'calendario', 
    component: CalendarioComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }