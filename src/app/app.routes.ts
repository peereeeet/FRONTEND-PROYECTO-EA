import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { UsuarisComponent } from './components/usuaris/usuaris.component';
import { EventoComponent } from './components/evento/evento.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { RegistrarComponent } from './components/registrar/registrar.component';
import { ValoracionComponent } from './components/valoracion/valoracion';

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
  { path: 'events/:id/ratings',
    component: ValoracionComponent 
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