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

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl:'./home.html',
  styleUrls: ['./home.scss'], // صححت هنا
})
export class Home implements OnInit, OnDestroy {

 // ── Injected services ────────────────────────────────────────────
  home = inject(HomeService);
  auth = inject(Authenication);
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
  this.showTafseer.update(value => !value);

  if (this.showTafseer()) {
    setTimeout(() => {
      document
        .getElementById('tafseer-section')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    }, 100);
  }
}
  // ── Data loading ─────────────────────────────────────────────────
 
  getUserData() {
    this.subs.add(
      this.home.getUserData().subscribe({
        next: (data) => {
          this.userData.set(data);
          const surahData = localStorage.getItem('currentSurah');
          const tafseerData = localStorage.getItem('tafseer');
 
          if (surahData && tafseerData) {
            this.surah.set(JSON.parse(surahData));
            this.ayat.set(this.surah().ayahs);
            this.tafseerofAyahs.set(JSON.parse(tafseerData));
            this.getDailyAyat();
            this.getDailyTafseer();
          } else {
            this.getCurrentSurah(this.userData().plane.surahNumber);
            this.getTafseerOfSurah(this.userData().plane.surahNumber);
          }
        },
      })
    );
  }
 
  getCurrentSurah(cSurah: number) {
    this.subs.add(
      this.home.getCurrentSurah(cSurah).subscribe((res) => {
        this.surah.set(res.data);
        this.ayat.set(this.surah().ayahs);
        localStorage.setItem('currentSurah', JSON.stringify(res.data));
        this.getDailyAyat();
      })
    );
  }
 
  getTafseerOfSurah(surahNum: number) {
    this.subs.add(
      this.home.getSurahTafseer(surahNum).subscribe((res) => {
        localStorage.setItem('tafseer', JSON.stringify(res.data.ayahs));
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

  const plane = { ...this.userData().plane };
  const { currentAyah, dailyAyahs } = this.UserData;

  const surahData = JSON.parse(localStorage.getItem('currentSurah') || '{}');
  const ayat = surahData.ayahs;
  const nextIndex = currentAyah + dailyAyahs - 1;

  // تصفير حالة التشغيل
  this.currentIndex.set(0);
  this.currentReadingAyahIndex.set(-1);
  this.play.set(false);

  if (nextIndex >= ayat.length) {

    // الانتقال للسورة التالية
    plane.currentAyah = 1;
    plane.surahNumber++;

    if (plane.surahNumber > 114) {
      plane.surahNumber = 1;
    }

    // تحديث الـ signal محليًا
    this.userData.update(user => ({
      ...user,
      plane: {
        ...user.plane,
        currentAyah: 1,
        surahNumber: plane.surahNumber
      }
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
    this.userData.update(user => ({
      ...user,
      plane: {
        ...user.plane,
        currentAyah: newCurrentAyah
      }
    }));

    // تحديث البيانات المعروضة
    this.dailyAyat.set(
      ayat.slice(newCurrentAyah - 1, newCurrentAyah - 1 + dailyAyahs)
    );

    this.state.update(state => ({
      ...state,
      inCurrent: true,
      inPrevious: false
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
 
  collectAudios() {
    this.audios.set([]);
    const ayahs = this.dailyAyat();
    ayahs.forEach((ayah) => {
      const sheikh = sheikhs.find((s) => s.audioEdition == this.userData().plane.sheikhId);
      const audioUrl = `${apis.audioApi}/${sheikh?.qulity}/${this.userData().plane.sheikhId}/${ayah.number}.mp3`;
      this.audios.update((audios) => [...audios, audioUrl]);
    });
  }
 
  playAllAyahs() {
    const audios = this.audios();
    this.currentReadingAyahIndex.set(this.currentIndex());
    if (this.currentIndex() >= audios.length) {
      this.play.set(false);
      this.currentReadingAyahIndex.set(-1);
      this.currentIndex.set(0);
      return;
    }
    this.currentAudio = new Audio(this.audios()[this.currentIndex()]);
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
    const sheikh = sheikhs.find((s) => s.audioEdition == this.userData().plane.sheikhId);
    const audioUrl = `${apis.audioApi}/${sheikh?.qulity}/${this.userData().plane.sheikhId}/${ayahNumber}.mp3`;
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
    this.state.update((state) => ({ ...state, inCurrent: false, inPrevious: false }));
    this.collectAudios();
  }
 
  get UserData() {
    const currentAyah = this.userData().plane.currentAyah;
    const dailyAyahs = this.userData().plane.dailyAyahs;
    return { currentAyah, dailyAyahs };
  }
 
  logout() {
    if (this.currentAudio) this.stopPlaying();
    this.auth.logOut();
  }
  }