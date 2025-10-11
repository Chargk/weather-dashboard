import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService, WeatherData } from '../../services/weather.service';

interface FavoriteCity {
  id: string;
  name: string;
  country: string;
  temperature: number;
  description: string;
  icon: string;
  lastUpdated: Date;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.scss']
})
export class FavoritesComponent implements OnInit {
  private weatherService = inject(WeatherService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  protected readonly isLoading = signal(false);
  protected readonly favorites = signal<FavoriteCity[]>([]);
  protected readonly refreshingCities = signal<Set<string>>(new Set());

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFavorites();
    }
  }

  private loadFavorites() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const stored = localStorage.getItem('favorite-cities');
    if (stored) {
      try {
        const favorites = JSON.parse(stored);
        this.favorites.set(favorites);
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }

  private saveFavorites() {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem('favorite-cities', JSON.stringify(this.favorites()));
  }

  protected addToFavorites(weatherData: WeatherData) {
    const favorite: FavoriteCity = {
      id: `${weatherData.city}-${weatherData.country}`,
      name: weatherData.city,
      country: weatherData.country,
      temperature: weatherData.temperature,
      description: weatherData.description,
      icon: weatherData.icon,
      lastUpdated: new Date()
    };

    const currentFavorites = this.favorites();
    const exists = currentFavorites.find(fav => fav.id === favorite.id);
    
    if (exists) {
      this.snackBar.open('City is already in favorites!', 'Close', {
        duration: 2000
      });
      return;
    }

    const updatedFavorites = [...currentFavorites, favorite];
    this.favorites.set(updatedFavorites);
    this.saveFavorites();

    this.snackBar.open(`Added ${weatherData.city} to favorites!`, 'Close', {
      duration: 2000
    });
  }

  protected removeFromFavorites(cityId: string) {
    const currentFavorites = this.favorites();
    const city = currentFavorites.find(fav => fav.id === cityId);
    
    if (city) {
      const updatedFavorites = currentFavorites.filter(fav => fav.id !== cityId);
      this.favorites.set(updatedFavorites);
      this.saveFavorites();

      this.snackBar.open(`Removed ${city.name} from favorites`, 'Close', {
        duration: 2000
      });
    }
  }

  protected viewCity(city: FavoriteCity) {
    this.router.navigate(['/dashboard'], {
      queryParams: { city: `${city.name}, ${city.country}` }
    });
  }

  protected refreshCity(city: FavoriteCity) {
    this.refreshingCities.update(cities => new Set(cities).add(city.id));
    
    this.weatherService.getCurrentWeather(`${city.name}, ${city.country}`).subscribe({
      next: (weather) => {
        const updatedFavorites = this.favorites().map(fav => 
          fav.id === city.id 
            ? {
                ...fav,
                temperature: weather.temperature,
                description: weather.description,
                icon: weather.icon,
                lastUpdated: new Date()
              }
            : fav
        );
        this.favorites.set(updatedFavorites);
        this.saveFavorites();
        
        this.refreshingCities.update(cities => {
          const newSet = new Set(cities);
          newSet.delete(city.id);
          return newSet;
        });

        this.snackBar.open(`Updated ${city.name}`, 'Close', {
          duration: 1500
        });
      },
      error: (error) => {
        console.error('Error refreshing city:', error);
        this.refreshingCities.update(cities => {
          const newSet = new Set(cities);
          newSet.delete(city.id);
          return newSet;
        });
        
        this.snackBar.open(`Error updating ${city.name}`, 'Close', {
          duration: 2000
        });
      }
    });
  }

  protected refreshAll() {
    this.isLoading.set(true);
    const favorites = this.favorites();
    
    if (favorites.length === 0) {
      this.isLoading.set(false);
      return;
    }

    const refreshPromises = favorites.map(city => 
      this.weatherService.getCurrentWeather(`${city.name}, ${city.country}`).toPromise()
    );

    Promise.allSettled(refreshPromises).then(results => {
      const updatedFavorites = favorites.map((city, index) => {
        const result = results[index];
        if (result.status === 'fulfilled' && result.value) {
          const weather = result.value;
          return {
            ...city,
            temperature: weather.temperature,
            description: weather.description,
            icon: weather.icon,
            lastUpdated: new Date()
          };
        }
        return city;
      });

      this.favorites.set(updatedFavorites);
      this.saveFavorites();
      this.isLoading.set(false);

      this.snackBar.open('All favorites updated!', 'Close', {
        duration: 2000
      });
    });
  }

  protected getTemperatureColor(temp: number): string {
    if (temp < 0) return '#2196F3';
    if (temp < 10) return '#03A9F4';
    if (temp < 20) return '#4CAF50';
    if (temp < 30) return '#FF9800';
    return '#F44336';
  }

  protected formatLastUpdated(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}