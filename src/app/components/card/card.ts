import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Authenication } from '../../services/auth';
import { Subscription } from 'rxjs';
import { Crad } from '../../services/card';
import { Router } from "@angular/router";
import { CommonModule } from '@angular/common';
import { Plane } from '../../services/plane';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card implements OnDestroy, OnInit {
  ngOnInit(): void {
    this.getAyahForReading();
  }

loading=signal<boolean>(false)

  private subs = new Subscription();
  //injection auth service
  auth = inject(Authenication);
  //injection card service
  _card = inject(Crad)
  //injection plnve service
  _plane = inject(Plane)
  //injection rout service
  rout = inject(Router)
  ayah = signal<any>({});



  getAyahForReading() {
    this.subs.add(
      this._card.getAyah().subscribe({
        next: (res) => {
          console.log(res);
          this.ayah.set(res);

        }
      })
    )
  }

  routTo() {
    this.loading.set(true)
    this.subs.add(this._plane.isUserHasPlane().subscribe((res: any) => {
      if (res.plane) {
        this.rout.navigate(['/home']);
      } else
        this.rout.navigate(['/plane']);
    })
    )
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
