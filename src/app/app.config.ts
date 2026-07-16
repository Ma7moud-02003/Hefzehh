import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),provideHttpClient(),
    provideRouter(routes), provideFirebaseApp(() => initializeApp({ apiKey: "AIzaSyD9QIF0g6s07k26lTqf3VDAKyTPAaUZC9I",
  authDomain: "quran-e321e.firebaseapp.com",
  projectId: "quran-e321e",
  storageBucket: "quran-e321e.firebasestorage.app",
  messagingSenderId: "823855900292",
  appId: "1:823855900292:web:77d2d5e11a1b6ed1af44d1",
  measurementId: "G-71P3SECYFV"})), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())
  ]
};
