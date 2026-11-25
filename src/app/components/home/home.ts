import { surah } from './../../models/surah';
import { sheikhs, surahs } from './../../constants/quran.constants';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HomeService } from '../../services/home';
import { UserData } from '../../models/userdata';
import { Subscription } from 'rxjs';
import { Ayah } from '../../models/surah';
import { CommonModule } from '@angular/common';
import { Authenication } from '../../services/auth';
import { apis } from '../../environments/apis.env';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'], // صححت هنا
})
export class Home implements OnInit, OnDestroy {
  // ── Injected services ────────────────────────────────────────────
  home = inject(HomeService);
  auth = inject(Authenication);
  private router = inject(Router);
  private subs = new Subscription();

  // ── Core data ────────────────────────────────────────────────────
  userData = signal<UserData>({} as UserData);
  surah = signal<surah>({} as surah);
  ayat = signal<Ayah[]>([]);
  dailyAyat = signal<Ayah[]>([]);
  dailyTafseer = signal<any[]>([]);
  tafseerofAyahs = signal<any[]>([]);

  // ── UI state ─────────────────────────────────────────────────────
  hideAyat = signal<boolean>(false);
  darkMode = signal<boolean>(false);
  alertMessage = signal<string>('');
  showAlert = signal<boolean>(false);
  showTafseer = signal<boolean>(false);

  state = signal({
    inPrevious: false,
    inCurrent: false,
  });

  currentAudio: HTMLAudioElement | null = null;
  audios = signal<string[]>([]);
  play = signal<boolean>(false);
  currentReadingAyahIndex = signal<number>(-1);
  currentIndex = signal<number>(0);

  ayaIndex = signal<number>(-1);

  surahProgressPercent = computed(() => {
    const total = this.surah()?.numberOfAyahs;
    const { currentAyah } = this.UserData;
    if (!total || !currentAyah) return 0;
    return Math.min(100, Math.round((currentAyah / total) * 100));
  });

  /** "من الآية 12 إلى 17" style label for today's portion. */
  dailyRangeLabel = computed(() => {
    const { currentAyah, dailyAyahs } = this.UserData;
    if (!currentAyah || !dailyAyahs) return '';
    const end = currentAyah + dailyAyahs - 1;
    return currentAyah === end
      ? `الآية ${currentAyah}`
      : `من الآية ${currentAyah} إلى ${end}`;
  });

  /** Convenience flag so the template doesn't need to reach into two signals. */
  hasDailyAyat = computed(() => this.dailyAyat().length > 0);

  ngOnInit(): void {
    this.getUserData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.currentAudio) this.currentAudio.pause();
  }

  // ── Visibility toggles ───────────────────────────────────────────

  hiddenAyat() {
    this.hideAyat.set(!this.hideAyat());
  }

  getShowAlert(message: string) {
    this.alertMessage.set(message);
    this.showAlert.set(true);
    setTimeout(() => this.showAlert.set(false), 6000);
  }

  getShowTafseer() {
    this.showTafseer.update((value) => !value);

    if (this.showTafseer()) {
      setTimeout(() => {
        document.getElementById('tafseer-section')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }

  // ── Data loading ─────────────────────────────────────────────────

  private cacheKey(type: 'surah' | 'tafseer'): string | null {
    const uid = this.auth.uid();
    return uid ? `hifz:${uid}:${type}` : null;
  }

  private readCache<T>(key: string | null): T | null {
    if (!key) return null;

    const cachedValue = localStorage.getItem(key);
    if (!cachedValue) return null;

    try {
      return JSON.parse(cachedValue) as T;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  getUserData() {
    this.subs.add(
      this.home.getUserData().subscribe({
        next: (data) => {
          this.userData.set(data);

          if (!data?.plane) {
            this.router.navigate(['/plane']);
            return;
          }

          const cachedSurah = this.readCache<any>(this.cacheKey('surah'));
          const cachedTafseer = this.readCache<any[]>(this.cacheKey('tafseer'));

          if (cachedSurah && Array.isArray(cachedSurah.ayahs) && cachedSurah.ayahs.length > 0) {
            this.surah.set(cachedSurah);
            this.ayat.set(cachedSurah.ayahs);
            this.getDailyAyat();
          } else {
            this.getCurrentSurah(this.UserData.surahNumber);
          }

          if (Array.isArray(cachedTafseer) && cachedTafseer.length > 0) {
            this.tafseerofAyahs.set(cachedTafseer);
            this.getDailyTafseer();
          } else {
            this.getTafseerOfSurah(this.UserData.surahNumber);
          }
        },
      })
    );
  }

  getCurrentSurah(cSurah: number) {
    const cacheKey = this.cacheKey('surah');
    this.subs.add(
      this.home.getCurrentSurah(cSurah).subscribe((res) => {
        this.surah.set(res.data);
        this.ayat.set(this.surah().ayahs);
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(res.data));
        this.getDailyAyat();
      })
    );
  }

  getTafseerOfSurah(surahNum: number) {
    const cacheKey = this.cacheKey('tafseer');
    this.subs.add(
      this.home.getSurahTafseer(surahNum).subscribe((res) => {
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(res.data.ayahs));
        this.tafseerofAyahs.set(res.data.ayahs);
        this.getDailyTafseer();
      })
    );
  }

  getDailyTafseer() {
    const { currentAyah, dailyAyahs } = this.UserData;
    const ayahs = this.tafseerofAyahs();
    this.dailyTafseer.set(ayahs.slice(currentAyah - 1, currentAyah - 1 + dailyAyahs));
  }

  getDailyAyat() {
    const { currentAyah, dailyAyahs } = this.UserData;
    this.dailyAyat.set(this.ayat().slice(currentAyah - 1, currentAyah - 1 + dailyAyahs));
    this.state.update((state) => ({ ...state, inCurrent: true, inPrevious: false }));
    this.collectAudios();
  }

  completed() {
    if (this.currentAudio) this.stopPlaying();

    this.currentIndex.set(0);
    this.currentReadingAyahIndex.set(-1);
    this.play.set(false);

    const ayat = this.ayat();
    const plane = { ...this.userData().plane };
    const { currentAyah, dailyAyahs } = this.UserData;

    if (ayat.length === 0 || dailyAyahs < 1) {
      this.getShowAlert('لا توجد آيات لإتمام الحفظ');
      return;
    }

    const nextIndex = currentAyah + dailyAyahs - 1;

    if (nextIndex >= ayat.length) {
      // الانتقال للسورة التالية
      plane.currentAyah = 1;
      plane.surahNumber++;

      if (plane.surahNumber > 114) {
        plane.surahNumber = 1;
      }

      // تحديث الـ signal محليًا
      this.userData.update((user) => ({
        ...user,
        plane: {
          ...user.plane,
          currentAyah: 1,
          surahNumber: plane.surahNumber,
        },
      }));

      // حفظ البيانات
      this.home.updatePlaneData(plane);

      // تحميل السورة الجديدة
      this.getCurrentSurah(plane.surahNumber);
      this.getTafseerOfSurah(plane.surahNumber);

      this.getShowAlert(
        'تهانينا 🎉 لقد أكملت حفظ سورة كاملة! الحفظ نور للقلب ورفعة للمرء عند الله، فاحرص على الاستمرار 💫📖'
      );
    } else {
      const newCurrentAyah = currentAyah + dailyAyahs;

      // تحديث الـ signal
      this.userData.update((user) => ({
        ...user,
        plane: {
          ...user.plane,
          currentAyah: newCurrentAyah,
        },
      }));

      // تحديث البيانات المعروضة
      this.dailyAyat.set(ayat.slice(newCurrentAyah - 1, newCurrentAyah - 1 + dailyAyahs));

      this.state.update((state) => ({
        ...state,
        inCurrent: true,
        inPrevious: false,
      }));

      this.collectAudios();

      // حفظ في Firebase
      plane.currentAyah = newCurrentAyah;
      this.home.updatePlaneData(plane);

      this.getShowAlert(
        'مبروك! 🎉 أتممت حفظ حصتك اليومية. أحب الأعمال إلى الله ما دام مستمرًا عليها ✨📖'
      );
    }
  }

  // ── Audio ────────────────────────────────────────────────────────

  private getAudioUrl(ayahNumber: number): string {
    const savedSheikh = sheikhs.find((sheikh) => sheikh.audioEdition === this.userData()?.plane?.sheikhId);
    const audioEdition = savedSheikh?.audioEdition ?? 'ar.alafasy';
    const quality = savedSheikh?.qulity ?? 128;
    return `${apis.audioApi}/${quality}/${audioEdition}/${ayahNumber}.mp3`;
  }

  collectAudios() {
    this.audios.set(this.dailyAyat().map((ayah) => this.getAudioUrl(ayah.number)));
  }

  playAllAyahs() {
    const audios = this.dailyAyat().map((ayah) => this.getAudioUrl(ayah.number));
    this.audios.set(audios);
    this.currentReadingAyahIndex.set(this.currentIndex());

    if (this.currentIndex() >= audios.length) {
      this.play.set(false);
      this.currentReadingAyahIndex.set(-1);
      this.currentIndex.set(0);
      return;
    }

    this.currentAudio = new Audio(audios[this.currentIndex()]);
    this.play.set(true);
    this.currentAudio.play().catch((error) => {
      console.warn(`Audio failed for ayah index ${this.currentIndex()}:`, error);
      this.currentIndex.update((index) => index + 1);
      this.playAllAyahs();
    });
    this.currentAudio.onended = () => {
      this.currentIndex.update((index) => index + 1);
      this.playAllAyahs();
    };
  }

  playSingleAyah(ayahNumber: number, i: number) {
    const audioUrl = this.getAudioUrl(ayahNumber);
    if (this.currentAudio) this.stopPlaying();
    this.playAudio(audioUrl, i);
  }

  playAudio(audioUrl: string, i: number) {
    this.currentReadingAyahIndex.set(i);
    this.currentAudio = new Audio(audioUrl);
    this.currentAudio.play().catch((error) => {
      console.warn(`Audio failed for ayah index ${i}:`, error);
    });
  }

  stopPlaying() {
    if (this.currentAudio) {
      this.currentReadingAyahIndex.set(-1);
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.play.set(false);
    }
  }

  getPreviousDay() {
    if (this.currentAudio) this.stopPlaying();
    const previousAya = this.UserData.currentAyah - this.UserData.dailyAyahs;
    if (previousAya < 1) {
      this.getShowAlert('لا يوجد آيات سابقة');
      return;
    }
    const newDailyAyat = this.ayat().slice(previousAya - 1, previousAya - 1 + this.UserData.dailyAyahs);
    this.dailyAyat.set(newDailyAyat);
    this.dailyTafseer.set(
      this.tafseerofAyahs().slice(previousAya - 1, previousAya - 1 + this.UserData.dailyAyahs)
    );
    this.state.update((state) => ({ ...state, inCurrent: false, inPrevious: false }));
    this.collectAudios();
  }

  getCurrentDay() {
    if (this.currentAudio) this.stopPlaying();
    this.getDailyAyat();
    this.getDailyTafseer();
  }

  get UserData() {
    const plane = this.userData()?.plane;
    return {
      surahNumber: plane?.surahNumber ?? 1,
      currentAyah: plane?.currentAyah ?? 1,
      dailyAyahs: plane?.dailyAyahs ?? 5,
    };
  }

  logout() {
    if (this.currentAudio) this.stopPlaying();
    this.auth.logOut();
  }
}
