import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);
  private notificationService = inject(NotificationService);

  protected readonly temperatureUnit = new FormControl('celsius');
  protected readonly windUnit = new FormControl('kmh');
  protected readonly pressureUnit = new FormControl('hpa');
  protected readonly notifications = signal(true);
  protected readonly autoRefresh = signal(true);
  protected readonly refreshInterval = new FormControl(15);
  protected readonly notificationsEnabled = signal(false);
  protected readonly notificationPermission = signal<NotificationPermission>('default');

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const tempUnit = localStorage.getItem('temperature-unit') || 'celsius';
    this.temperatureUnit.setValue(tempUnit);

    const windUnit = localStorage.getItem('wind-unit') || 'kmh';
    this.windUnit.setValue(windUnit);

    const pressureUnit = localStorage.getItem('pressure-unit') || 'hpa';
    this.pressureUnit.setValue(pressureUnit);

    const notifications = localStorage.getItem('notifications') !== 'false';
    this.notifications.set(notifications);

    const autoRefresh = localStorage.getItem('auto-refresh') !== 'false';
    this.autoRefresh.set(autoRefresh);

    const interval = parseInt(localStorage.getItem('refresh-interval') || '15');
    this.refreshInterval.setValue(interval);

    const notificationsEnabled = localStorage.getItem('notifications-enabled') === 'true';
    this.notificationsEnabled.set(notificationsEnabled);
    
    this.notificationPermission.set(this.notificationService.getPermissionStatus());
  }

  protected saveSettings() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    localStorage.setItem('temperature-unit', this.temperatureUnit.value || 'celsius');
    localStorage.setItem('wind-unit', this.windUnit.value || 'kmh');
    localStorage.setItem('pressure-unit', this.pressureUnit.value || 'hpa');
    localStorage.setItem('notifications', this.notifications().toString());
    localStorage.setItem('auto-refresh', this.autoRefresh().toString());
    localStorage.setItem('refresh-interval', this.refreshInterval.value?.toString() || '15');
    localStorage.setItem('notifications-enabled', this.notificationsEnabled().toString());
  }

  protected toggleNotifications() {
    if (this.notificationPermission() !== 'granted') {
      this.requestNotificationPermission();
      return;
    }
    
    this.notificationsEnabled.set(!this.notificationsEnabled());
    this.saveSettings();
  }

  protected toggleAutoRefresh() {
    this.autoRefresh.set(!this.autoRefresh());
  }

  protected resetToDefaults() {
    this.temperatureUnit.setValue('celsius');
    this.windUnit.setValue('kmh');
    this.pressureUnit.setValue('hpa');
    this.notifications.set(true);
    this.autoRefresh.set(true);
    this.refreshInterval.setValue(15);

    this.snackBar.open('Settings reset to defaults', 'Close', {
      duration: 2000
    });
  }

  protected async requestNotificationPermission() {
    const granted = await this.notificationService.requestPermission();
    this.notificationPermission.set(this.notificationService.getPermissionStatus());
    
    if (granted) {
      this.notificationsEnabled.set(true);
      this.saveSettings();
      this.snackBar.open('Notifications enabled!', 'Close', {
        duration: 2000
      });
    } else {
      this.snackBar.open('Notification permission denied', 'Close', {
        duration: 3000
      });
    }
  }
}