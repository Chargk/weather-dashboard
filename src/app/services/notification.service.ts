import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private platformId = inject(PLATFORM_ID);
  private isSupported = isPlatformBrowser(this.platformId) && 'Notification' in window;

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  showNotification(title: string, body: string, icon?: string): void {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'weather-notification',
      requireInteraction: false,
      silent: false
    });

    setTimeout(() => {
      notification.close();
    }, 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  showWeatherChangeNotification(city: string, oldWeather: any, newWeather: any): void {
    if (Notification.permission !== 'granted') {
      return;
    }

    const title = `Weather changed in ${city}`;
    const body = `${newWeather.description}, ${newWeather.temperature}°C`;
    
    this.showNotification(title, body);
  }

  showLocationFoundNotification(city: string): void {
    if (Notification.permission !== 'granted') {
      return;
    }

    const title = 'Location found';
    const body = `Weather for ${city} is now available`;
    
    this.showNotification(title, body);
  }

  isPermissionGranted(): boolean {
    return this.isSupported && Notification.permission === 'granted';
  }

  getPermissionStatus(): NotificationPermission {
    return this.isSupported ? Notification.permission : 'denied';
  }
}
