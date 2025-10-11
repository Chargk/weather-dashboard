import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, debounceTime, distinctUntilChanged, switchMap, startWith, map } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../material.module';
import { WeatherService } from '../../services/weather.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterOutlet],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  private weatherService = inject(WeatherService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  protected readonly isDarkMode = signal(false);
  protected readonly searchControl = new FormControl('');
  protected readonly filteredCities$: Observable<string[]>;

  constructor() {
    this.filteredCities$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query && query.length > 2) {
          return this.weatherService.searchCities(query).pipe(
            map(cities => cities.map(city => `${city.name}, ${city.country}`)),
            map(cities => cities.slice(0, 5)) // Limit to 5 results
          );
        }
        return [];
      })
    );
  }

  protected toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  protected onCitySelected(city: string) {
    if (city) {
      this.router.navigate(['/dashboard'], { 
        queryParams: { city: city } 
      });
      this.searchControl.setValue('');
      
      this.snackBar.open(`Searching weather for ${city}...`, 'Close', {
        duration: 2000
      });
    }
  }

  protected useCurrentLocation() {
    this.snackBar.open('Getting your location...', 'Close', {
      duration: 2000
    });

    this.weatherService.getCurrentLocation()
      .then(coords => {
        this.weatherService.getWeatherByCoords(coords.lat, coords.lon).subscribe({
          next: (weather) => {
            this.router.navigate(['/dashboard'], { 
              queryParams: { city: `${weather.city}, ${weather.country}` } 
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