import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';

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

  protected readonly temperatureUnit = new FormControl('celsius');
  protected readonly windUnit = new FormControl('kmh');
  protected readonly pressureUnit = new FormControl('hpa');
  protected readonly isDarkMode = signal(false);
  protected readonly notifications = signal(true);
  protected readonly autoRefresh = signal(true);
  protected readonly refreshInterval = new FormControl(15);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSettings();
    }
  }

  private loadSettings() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Load temperature unit
    const tempUnit = localStorage.getItem('temperature-unit') || 'celsius';
    this.temperatureUnit.setValue(tempUnit);

    // Load wind unit
    const windUnit = localStorage.getItem('wind-unit') || 'kmh';
    this.windUnit.setValue(windUnit);

    // Load pressure unit
    const pressureUnit = localStorage.getItem('pressure-unit') || 'hpa';
    this.pressureUnit.setValue(pressureUnit);

    // Load dark mode
    const darkMode = localStorage.getItem('dark-mode') === 'true';
    this.isDarkMode.set(darkMode);

    // Load notifications
    const notifications = localStorage.getItem('notifications') !== 'false';
    this.notifications.set(notifications);

    // Load auto refresh
    const autoRefresh = localStorage.getItem('auto-refresh') !== 'false';
    this.autoRefresh.set(autoRefresh);

    // Load refresh interval
    const interval = parseInt(localStorage.getItem('refresh-interval') || '15');
    this.refreshInterval.setValue(interval);
  }

  protected saveSettings() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    localStorage.setItem('temperature-unit', this.temperatureUnit.value || 'celsius');
    localStorage.setItem('wind-unit', this.windUnit.value || 'kmh');
    localStorage.setItem('pressure-unit', this.pressureUnit.value || 'hpa');
    localStorage.setItem('dark-mode', this.isDarkMode().toString());
    localStorage.setItem('notifications', this.notifications().toString());
    localStorage.setItem('auto-refresh', this.autoRefresh().toString());
    localStorage.setItem('refresh-interval', this.refreshInterval.value?.toString() || '15');

    this.snackBar.open('Settings saved successfully!', 'Close', {
      duration: 2000
    });
  }

  protected toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
  }

  protected toggleNotifications() {
    this.notifications.set(!this.notifications());
  }

  protected toggleAutoRefresh() {
    this.autoRefresh.set(!this.autoRefresh());
  }

  protected resetToDefaults() {
    this.temperatureUnit.setValue('celsius');
    this.windUnit.setValue('kmh');
    this.pressureUnit.setValue('hpa');
    this.isDarkMode.set(false);
    this.notifications.set(true);
    this.autoRefresh.set(true);
    this.refreshInterval.setValue(15);

    this.snackBar.open('Settings reset to defaults', 'Close', {
      duration: 2000
    });
  }
}