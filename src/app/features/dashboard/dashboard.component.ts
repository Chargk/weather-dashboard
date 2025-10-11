import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/material.module';

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  description: string;
  icon: string;
  visibility: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  protected readonly isLoading = signal(true);
  protected readonly currentWeather = signal<WeatherData | null>(null);
  protected readonly forecast = signal<any[]>([]);

  ngOnInit() {
    // Simulate loading
    setTimeout(() => {
      this.loadWeatherData();
    }, 1500);
  }

  private loadWeatherData() {
    // Mock data for demonstration
    const mockWeather: WeatherData = {
      city: 'Kyiv',
      country: 'Ukraine',
      temperature: 22,
      feelsLike: 25,
      humidity: 65,
      pressure: 1013,
      windSpeed: 12,
      windDirection: 'NW',
      description: 'Partly Cloudy',
      icon: 'wb_cloudy',
      visibility: 10,
      uvIndex: 6,
      sunrise: '06:30',
      sunset: '19:45'
    };

    const mockForecast = [
      { day: 'Tomorrow', high: 24, low: 16, icon: 'wb_sunny', description: 'Sunny' },
      { day: 'Wednesday', high: 26, low: 18, icon: 'wb_cloudy', description: 'Cloudy' },
      { day: 'Thursday', high: 23, low: 15, icon: 'grain', description: 'Rainy' },
      { day: 'Friday', high: 25, low: 17, icon: 'wb_sunny', description: 'Sunny' },
      { day: 'Saturday', high: 27, low: 19, icon: 'wb_cloudy', description: 'Partly Cloudy' }
    ];

    this.currentWeather.set(mockWeather);
    this.forecast.set(mockForecast);
    this.isLoading.set(false);
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