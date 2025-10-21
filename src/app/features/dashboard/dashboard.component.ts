import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService, WeatherData, ForecastData } from '../../services/weather.service';
import { FavoritesComponent } from '../favorites/favorites.component';

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
        // Check if it's "Current Location" - if so, use the current location method
        if (params['city'].includes('Current Location')) {
          this.useCurrentLocation();
        } else {
          this.loadWeatherData(params['city']);
        }
      } else {
        // Only load default city if current city is not "Current Location"
        const currentCity = this.currentCity();
        if (currentCity !== 'Current Location' && !currentCity.includes('Current Location')) {
          this.loadWeatherData(currentCity);
        }
        // If current city is "Current Location", don't load anything here
        // The user needs to click "Use Current Location" button
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
        // Load current weather
        this.weatherService.getWeatherByCoords(coords.lat, coords.lon).subscribe({
          next: (weather) => {
            this.currentWeather.set(weather);
            // For current location, just use the city name without country
            if (weather.city === 'Current Location') {
              this.currentCity.set('Current Location');
            } else {
              this.currentCity.set(`${weather.city}, ${weather.country}`);
            }
            this.isLoading.set(false);
          },
          error: (error) => {
            console.error('Error loading weather:', error);
            this.snackBar.open('Error loading weather data. Please try again.', 'Close', {
              duration: 3000
            });
            this.isLoading.set(false);
          }
        });
  
        // Load forecast data for current location
        this.weatherService.getForecastByCoords(coords.lat, coords.lon).subscribe({
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
    const weather = this.currentWeather();
    if (weather && weather.coord) {
      // If we have coordinates (from current location), use them
      this.weatherService.getWeatherByCoords(weather.coord.lat, weather.coord.lon).subscribe({
        next: (weatherData) => {
          this.currentWeather.set(weatherData);
          this.currentCity.set(`${weatherData.city}, ${weatherData.country}`);
          
          // Also refresh forecast
          this.weatherService.getForecastByCoords(weather.coord.lat, weather.coord.lon).subscribe({
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
        },
        error: (error) => {
          console.error('Error loading weather:', error);
          this.snackBar.open('Error loading weather data. Please try again.', 'Close', {
            duration: 3000
          });
        }
      });
    } else {
      // Fallback to city name if no coordinates
      this.loadWeatherData(this.currentCity());
    }
  }

  protected addToFavorites() {
    const weather = this.currentWeather();
    if (!weather) return;

    // Check if already in favorites
    const favorites = this.getFavorites();
    const exists = favorites.find(fav => fav.id === `${weather.city}-${weather.country}`);
    
    if (exists) {
      this.snackBar.open('City is already in favorites!', 'Close', {
        duration: 2000
      });
      return;
    }

    // Add to favorites
    const favorite = {
      id: `${weather.city}-${weather.country}`,
      name: weather.city,
      country: weather.country,
      temperature: weather.temperature,
      description: weather.description,
      icon: weather.icon,
      lastUpdated: new Date()
    };

    const updatedFavorites = [...favorites, favorite];
    localStorage.setItem('favorite-cities', JSON.stringify(updatedFavorites));

    this.snackBar.open(`Added ${weather.city} to favorites!`, 'Close', {
      duration: 2000
    });
  }

  protected shareWeather() {
    const weather = this.currentWeather();
    if (!weather) return;

    if (navigator.share) {
      navigator.share({
        title: `Weather in ${weather.city}`,
        text: `Current temperature: ${weather.temperature}°C, ${weather.description}`,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      const text = `Weather in ${weather.city}: ${weather.temperature}°C, ${weather.description}`;
      navigator.clipboard.writeText(text).then(() => {
        this.snackBar.open('Weather info copied to clipboard!', 'Close', {
          duration: 2000
        });
      });
    }
  }

  private getFavorites(): any[] {
    try {
      const stored = localStorage.getItem('favorite-cities');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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