import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../material.module';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  protected readonly isDarkMode = signal(false);

  protected toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
    // There will be theme switching logic
  }
}