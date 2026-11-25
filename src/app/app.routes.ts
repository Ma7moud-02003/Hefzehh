import { Routes } from '@angular/router';
import { Register } from './components/auth/register/register';
import { Login } from './components/auth/login/login';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', canActivate: [authGuard], loadComponent: () => import('./components/home/home').then((m) => m.Home) },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'card', canActivate: [authGuard], loadComponent: () => import('./components/card/card').then((m) => m.Card) },
  { path: 'plane', canActivate: [authGuard], loadComponent: () => import('./components/plane/plane').then((m) => m.UserPlane) },
  { path: 'home', canActivate: [authGuard], loadComponent: () => import('./components/home/home').then((m) => m.Home) },
  { path: '**', redirectTo: '' },
];
