import { Component, OnInit, OnDestroy, signal, inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService } from '../../services/weather.service';

// Leaflet imports
import * as L from 'leaflet';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface CityMarker {
  name: string;
  lat: number;
  lng: number;
  temperature?: number;
  description?: string;
  icon?: string;
}

@Component({
  selector: 'app-weather-map',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './weather-map.component.html',
  styleUrls: ['./weather-map.component.scss']
})
export class WeatherMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private weatherService = inject(WeatherService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  protected readonly isLoading = signal(false);
  protected readonly cities = signal<CityMarker[]>([]);

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeMap();
      this.loadCities();
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeMap() {
    // Initialize map centered on Europe
    this.map = L.map(this.mapContainer.nativeElement).setView([50.0, 10.0], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Add click handler for map
    this.map.on('click', (e) => {
      this.onMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  private loadCities() {
    this.isLoading.set(true);
    
    // Load cities from different sources
    const defaultCities = [
      { name: 'London', lat: 51.5074, lng: -0.1278 },
      { name: 'Paris', lat: 48.8566, lng: 2.3522 },
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
      { name: 'New York', lat: 40.7128, lng: -74.0060 },
      { name: 'Sydney', lat: -33.8688, lng: 151.2093 }
    ];

    // Load favorites from localStorage
    const favorites = this.loadFavorites();
    
    // Combine all cities
    const allCities = [...defaultCities, ...favorites];
    this.cities.set(allCities);

    // Add markers to map
    this.addMarkersToMap(allCities);
    
    this.isLoading.set(false);
  }

  private loadFavorites(): CityMarker[] {
    if (typeof localStorage !== 'undefined') {
      const favorites = localStorage.getItem('favoriteCities');
      if (favorites) {
        return JSON.parse(favorites);
      }
    }
    return [];
  }

  private addMarkersToMap(cities: CityMarker[]) {
    // Clear existing markers
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    cities.forEach(city => {
      // Create custom icon
      const icon = L.divIcon({
        html: `
          <div class="weather-marker">
            <div class="marker-content">
              <div class="city-name">${city.name}</div>
              ${city.temperature ? `<div class="temperature">${city.temperature}°C</div>` : ''}
            </div>
          </div>
        `,
        className: 'custom-marker',
        iconSize: [80, 40],
        iconAnchor: [40, 20]
      });

      // Create marker
      const marker = L.marker([city.lat, city.lng], { icon })
        .addTo(this.map!)
        .on('click', () => this.onCityClick(city));

      this.markers.push(marker);
    });
  }

  private onCityClick(city: CityMarker) {
    // Navigate to dashboard with selected city
    this.router.navigate(['/dashboard'], { 
      queryParams: { city: city.name } 
    });
  }

  private onMapClick(lat: number, lng: number) {
    console.log('Map clicked at coordinates:', lat, lng);
    
    // Show loading message
    this.snackBar.open('Getting weather for this location...', 'Close', {
      duration: 2000
    });

    // Get weather for clicked coordinates
    this.weatherService.getWeatherByCoords(lat, lng).subscribe({
      next: (weather) => {
        console.log('Weather service returned:', weather);
        
        // Use the weather data directly, don't try to get city name
        this.router.navigate(['/dashboard'], { 
          queryParams: { 
            lat: lat.toString(),
            lon: lng.toString()
          } 
        });
        
        this.snackBar.open(`Weather loaded for ${weather.city}`, 'Close', {
          duration: 2000
        });
      },
      error: (error) => {
        console.error('Error getting weather for coordinates:', error);
        this.snackBar.open('Unable to get weather for this location', 'Close', {
          duration: 3000
        });
      }
    });
  }

  protected refreshMap() {
    this.loadCities();
  }

  protected getWeatherIcon(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('clear') || desc.includes('sunny')) {
      return 'wb_sunny';
    } else if (desc.includes('cloud')) {
      return 'cloud';
    } else if (desc.includes('rain')) {
      return 'grain';
    } else if (desc.includes('snow')) {
      return 'ac_unit';
    } else if (desc.includes('storm') || desc.includes('thunder')) {
      return 'thunderstorm';
    } else if (desc.includes('fog') || desc.includes('mist')) {
      return 'foggy';
    } else if (desc.includes('wind')) {
      return 'air';
    } else {
      return 'wb_cloudy';
    }
  }
}
