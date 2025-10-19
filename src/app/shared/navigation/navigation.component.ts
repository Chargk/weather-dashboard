import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../material.module';
import { WeatherService } from '../../services/weather.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {
  private weatherService = inject(WeatherService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private notificationService = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);

  protected readonly searchControl = new FormControl('');
  protected readonly filteredCities$: Observable<string[]>;
  protected readonly searchHistory = signal<string[]>([]);

  constructor() {
    this.filteredCities$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query && query.length > 2) {
          return this.weatherService.searchCities(query).pipe(
            map(cities => cities.map(city => `${city.name}, ${city.country}`)),
            map(cities => cities.slice(0, 5))
          );
        }
        return [];
      })
    );
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadSearchHistory();
    }
  }

  private loadSearchHistory() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('search-history');
      if (stored) {
        try {
          const history = JSON.parse(stored);
          this.searchHistory.set(history);
        } catch (error) {
          console.error('Error loading search history:', error);
        }
      }
    }
  }

  private saveSearchHistory() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('search-history', JSON.stringify(this.searchHistory()));
    }
  }

  protected onCitySelected(city: string) {
    if (city) {
      this.addToSearchHistory(city);
      this.router.navigate(['/dashboard'], { 
        queryParams: { city: city } 
      });
      this.searchControl.setValue('');
      
      this.snackBar.open(`Searching weather for ${city}...`, 'Close', {
        duration: 2000
      });
    }
  }

  private addToSearchHistory(city: string) {
    const currentHistory = this.searchHistory();
    // Видаляємо якщо вже є, щоб додати на початок
    const filteredHistory = currentHistory.filter(h => h !== city);
    // Додаємо на початок і обмежуємо до 10 елементів
    const updatedHistory = [city, ...filteredHistory].slice(0, 10);
    this.searchHistory.set(updatedHistory);
    this.saveSearchHistory();
  }

  protected clearSearchHistory() {
    this.searchHistory.set([]);
    this.saveSearchHistory();
    this.snackBar.open('Search history cleared', 'Close', {
      duration: 2000
    });
  }

  protected async useCurrentLocation() {
    this.snackBar.open('Getting your location...', 'Close', {
      duration: 2000
    });

    try {
      const coords = await this.weatherService.getCurrentLocation();
      this.weatherService.getWeatherByCoords(coords.lat, coords.lon).subscribe({
        next: (weather) => {
          const cityString = `${weather.city}, ${weather.country}`;
          this.addToSearchHistory(cityString);
          this.router.navigate(['/dashboard'], { 
            queryParams: { city: cityString } 
          });
          
          this.notificationService.showLocationFoundNotification(weather.city);
          
          this.snackBar.open(`Location found: ${weather.city}`, 'Close', {
            duration: 2000
          });
        },
        error: (error) => {
          console.error('Error getting location weather:', error);
          this.snackBar.open('Error getting weather for your location.', 'Close', {
            duration: 3000
          });
        }
      });
    } catch (error) {
      console.error('Error getting location:', error);
      this.snackBar.open('Unable to get your location. Please enable location services.', 'Close', {
        duration: 3000
      });
    }
  }
}