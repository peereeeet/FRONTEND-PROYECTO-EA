import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { UsuarisComponent } from './components/usuaris/usuaris.component';
import { EventoComponent } from './components/evento/evento.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegistrarComponent } from './components/registrar/registrar.component';
import { ValoracionComponent } from './components/valoracion/valoracion';
import { MenuComponent } from './components/menu/menu.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { MisEventosComponent } from './components/mis-eventos/mis-eventos.component';
import { ExplorarEventosComponent } from './components/explorar-eventos/explorar-eventos.component';
import { CrearEventoComponent } from './components/crear-eventos/crear-eventos.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
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
  { path: 'events/:id/ratings',
    component: ValoracionComponent 
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
    path: 'explorar-eventos',
    component: ExplorarEventosComponent,
    canActivate: [authGuard]
  },
  { path: 'crear-evento',
    component: CrearEventoComponent,
    canActivate: [authGuard] },
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