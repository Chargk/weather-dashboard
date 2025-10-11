import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService, WeatherData, ForecastData } from '../../services/weather.service';

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastComponent implements OnInit {
  private weatherService = inject(WeatherService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  protected readonly isLoading = signal(true);
  protected readonly currentWeather = signal<WeatherData | null>(null);
  protected readonly forecast = signal<ForecastData[]>([]);
  protected readonly currentCity = signal('Kyiv');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const city = params['city'] || this.currentCity();
      this.loadForecastData(city);
    });
  }

  private loadForecastData(city: string) {
    this.isLoading.set(true);
    
    // Load current weather
    this.weatherService.getCurrentWeather(city).subscribe({
      next: (weather) => {
        this.currentWeather.set(weather);
        this.currentCity.set(city);
      },
      error: (error) => {
        console.error('Error loading current weather:', error);
        this.snackBar.open('Error loading current weather', 'Close', {
          duration: 3000
        });
      }
    });

    // Load forecast
    this.weatherService.getForecast(city).subscribe({
      next: (forecast) => {
        this.forecast.set(forecast);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading forecast:', error);
        this.snackBar.open('Error loading forecast data', 'Close', {
          duration: 3000
        });
        this.isLoading.set(false);
      }
    });
  }

  protected getTemperatureColor(temp: number): string {
    if (temp < 0) return '#2196F3';
    if (temp < 10) return '#03A9F4';
    if (temp < 20) return '#4CAF50';
    if (temp < 30) return '#FF9800';
    return '#F44336';
  }

  protected getMaxTemp(): number {
    const forecast = this.forecast();
    if (forecast.length === 0) return 0;
    return Math.max(...forecast.map(day => day.high));
  }

  protected getMinTemp(): number {
    const forecast = this.forecast();
    if (forecast.length === 0) return 0;
    return Math.min(...forecast.map(day => day.low));
  }
}