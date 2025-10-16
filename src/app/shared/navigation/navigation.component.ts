import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../material.module';
import { WeatherService } from '../../services/weather.service';

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
    this.loadSearchHistory();
  }

  private loadSearchHistory() {
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

  private saveSearchHistory() {
    localStorage.setItem('search-history', JSON.stringify(this.searchHistory()));
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

  protected useCurrentLocation() {
    this.snackBar.open('Getting your location...', 'Close', {
      duration: 2000
    });

    this.weatherService.getCurrentLocation()
      .then(coords => {
        this.weatherService.getWeatherByCoords(coords.lat, coords.lon).subscribe({
          next: (weather) => {
            const cityString = `${weather.city}, ${weather.country}`;
            this.addToSearchHistory(cityString);
            this.router.navigate(['/dashboard'], { 
              queryParams: { city: cityString } 
            });
            
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
      })
      .catch(error => {
        console.error('Error getting location:', error);
        this.snackBar.open('Unable to get your location. Please enable location services.', 'Close', {
          duration: 3000
        });
      });
  }
}