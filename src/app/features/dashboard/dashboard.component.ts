import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService, WeatherData, ForecastData } from '../../services/weather.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private weatherService = inject(WeatherService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  protected readonly isLoading = signal(true);
  protected readonly currentWeather = signal<WeatherData | null>(null);
  protected readonly forecast = signal<ForecastData[]>([]);
  protected readonly currentCity = signal('Kyiv');

  ngOnInit() {
    // Check if city is provided in query params
    this.route.queryParams.subscribe(params => {
      if (params['city']) {
        this.loadWeatherData(params['city']);
      } else {
        this.loadWeatherData(this.currentCity());
      }
    });
  }

  protected loadWeatherData(city: string) {
    this.isLoading.set(true);
    
    // Load current weather
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (weather) => {
        this.currentWeather.set(weather);
        this.currentCity.set(city);
        this.isLoading.set(false);
        
        // Show success message
        this.snackBar.open(`Weather data loaded for ${weather.city}`, 'Close', {
          duration: 2000
        });
      },
      error: (error) => {
        console.error('Error loading weather:', error);
        this.snackBar.open('Error loading weather data. Please try again.', 'Close', {
          duration: 3000
        });
        this.isLoading.set(false);
      }
    });

    // Load forecast
    this.weatherService.getForecast(city).subscribe({
      next: (forecast) => {
        this.forecast.set(forecast);
      },
      error: (error) => {
        console.error('Error loading forecast:', error);
        this.snackBar.open('Error loading forecast data.', 'Close', {
          duration: 2000
        });
      }
    });
  }

  protected useCurrentLocation() {
    this.isLoading.set(true);
    
    this.weatherService.getCurrentLocation()
      .then(coords => {
        this.weatherService.getWeatherByCoords(coords.lat, coords.lon).subscribe({
          next: (weather) => {
            this.currentWeather.set(weather);
            this.currentCity.set(`${weather.city}, ${weather.country}`);
            this.isLoading.set(false);
            
            this.snackBar.open(`Location found: ${weather.city}`, 'Close', {
              duration: 2000
            });
            
            // Also load forecast for this location
            this.weatherService.getForecast(`${weather.city}, ${weather.country}`).subscribe({
              next: (forecast) => {
                this.forecast.set(forecast);
              }
            });
          },
          error: (error) => {
            console.error('Error loading weather by location:', error);
            this.snackBar.open('Error getting your location weather.', 'Close', {
              duration: 3000
            });
            this.isLoading.set(false);
          }
        });
      })
      .catch(error => {
        console.error('Error getting location:', error);
        this.snackBar.open('Unable to get your location. Please enable location services.', 'Close', {
          duration: 3000
        });
        this.isLoading.set(false);
      });
  }

  protected refreshWeather() {
    this.loadWeatherData(this.currentCity());
  }

  protected addToFavorites() {
    // TODO: Implement favorites functionality
    this.snackBar.open('Added to favorites!', 'Close', {
      duration: 2000
    });
  }

  protected shareWeather() {
    if (navigator.share && this.currentWeather()) {
      navigator.share({
        title: `Weather in ${this.currentWeather()!.city}`,
        text: `Current temperature: ${this.currentWeather()!.temperature}°C, ${this.currentWeather()!.description}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      const text = `Weather in ${this.currentWeather()!.city}: ${this.currentWeather()!.temperature}°C, ${this.currentWeather()!.description}`;
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('Weather info copied to clipboard!', 'Close', {
          duration: 2000
        });
      });
    }
  }

  protected getTemperatureColor(temp: number): string {
    if (temp < 0) return '#2196F3';
    if (temp < 10) return '#03A9F4';
    if (temp < 20) return '#4CAF50';
    if (temp < 30) return '#FF9800';
    return '#F44336';
  }

  protected getWindDirectionIcon(direction: string): string {
    const directions: { [key: string]: string } = {
      'N': 'keyboard_arrow_up',
      'NE': 'keyboard_arrow_up',
      'E': 'keyboard_arrow_right',
      'SE': 'keyboard_arrow_down',
      'S': 'keyboard_arrow_down',
      'SW': 'keyboard_arrow_down',
      'W': 'keyboard_arrow_left',
      'NW': 'keyboard_arrow_up'
    };
    return directions[direction] || 'navigation';
  }
}