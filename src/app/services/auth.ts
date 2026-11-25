import { inject, Injectable, signal } from '@angular/core';
import { createUserWithEmailAndPassword, Auth, signInWithEmailAndPassword, signOut, user } from '@angular/fire/auth';
import { RegisterInterface } from '../models/register';
import { collection, collectionData, doc, Firestore, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class Authenication {
  uid = signal<string>('');

  constructor() {
    this.$user.subscribe((res) => {
      this.uid.set(res?.uid || '');
    });
  }

  auth = inject(Auth);
  router = inject(Router);
  firestore = inject(Firestore);
  $user = user(this.auth);

  async register(email: string, password: string) {
    return await createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login(email: string, password: string) {
    return await signInWithEmailAndPassword(this.auth, email, password);
  }

  async storeUserAfterRegister(user: RegisterInterface, uid: string) {
    console.log(uid);

    const { password, ...restData } = user;
    const docRef = doc(this.firestore, `users/${uid}`);
    await setDoc(docRef, {
      ...restData,
    });
  }

  async logOut() {
    await signOut(this.auth);
    this.router.navigate(['/login']);

    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith('hifz:')) {
        localStorage.removeItem(key);
      }
    }

    localStorage.removeItem('currentSurah');
    localStorage.removeItem('tafseer');
  }
}
