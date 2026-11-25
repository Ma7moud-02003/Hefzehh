import { inject, Injectable, signal } from '@angular/core';
import { apis } from '../environments/apis.env';
import { Auth, user } from '@angular/fire/auth';
import { Authenication } from './auth';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { UserData } from '../models/userdata';
import { HttpClient } from '@angular/common/http';
import { catchError, from, Observable, of, switchMap } from 'rxjs';
import { PlaneInterface } from '../models/plane';
import { UserPlane } from '../components/plane/plane';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  firestore = inject(Firestore);
  auth = inject(Authenication);
  http = inject(HttpClient);

  uid = signal<string>('');

  constructor() {}

  apis = signal(apis);
  userData = signal<UserData>({} as UserData);

  getUserData(): Observable<any> {
    return this.auth.$user.pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of(null); // أو throwError
        }

        const docRef = doc(this.firestore, `users/${user.uid}`);
        return docData(docRef);
      })
    );
  }

  getCurrentSurah(surahNumber: number): Observable<any> {
    return this.http.get(`${apis.surahApi}/${surahNumber}`);
  }

  updatePlaneData(plane: PlaneInterface) {
    const uid = this.auth.uid();
    const docRef = doc(this.firestore, `users/${uid}`);
    return setDoc(docRef, { plane }, { merge: true });
  }

  getSurahTafseer(surahNumber: number): Observable<any> {
    return this.http.get(`${apis.TafseerApi}/${surahNumber}/${apis.tafseerEdition}`);
  }
}
