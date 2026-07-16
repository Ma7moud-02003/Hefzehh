import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { sheikhs, surahs } from '../../constants/quran.constants';
import { PlaneInterface } from '../../models/plane';
import { Plane } from '../../services/plane';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plane',
  imports: [CommonModule],
  templateUrl: './plane.html',
  styleUrl: './plane.scss',
})
export class UserPlane {
  private _plane = inject(Plane);
  rout = inject(Router)
  sheikhs = signal(sheikhs);
  suar = signal(surahs);

  plane = signal<PlaneInterface>({
    sheikhId: "ar.alafasy",        
    surahNumber: 2,              
    startAyah: 5,                
    dailyAyahs: 5,              
    currentAyah: 1,               
    completed: false             
  })

  step = signal<number>(0);
  selectShekh(sh: any) {

    this.plane().sheikhId = sh.audioEdition;
    this.step.set(1);
  }

  selectSurah(surah: any) {
    this.plane().surahNumber = surah.number;
    this.step.set(2)

  }
  dailyAyas = signal<number[]>([3, 5, 7, 10]);
  selectDailyAyahs(num: number) {
    this.plane().dailyAyahs = num;
    console.log(this.plane());
  }


  // Angular fire section
  showLoading = signal<boolean>(false);
  showAlert = signal(false);
setUserPlane() {
  this.showLoading.set(true);
  this._plane.savePlane(this.plane()).then((res) => {
    
    this.showLoading.set(false);
    console.log('saved' + res);

    // إظهار التنبيه المخصص الذي صنعناه في الـ HTML
    this.showAlert.set(true);

  }).catch((err) => {
    this.showLoading.set(false);
    console.log(err);
  })
}

// 3. دالة للانتقال بعد إغلاق التنبيه
closeAlertAndNavigate() {
  this.showAlert.set(false);
  this.rout.navigate(['/home']);
}
}
