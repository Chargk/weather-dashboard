import { Component, OnInit, signal, inject, PLATFORM_ID, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '../../shared/material.module';
import { WeatherService, WeatherData, ForecastData } from '../../services/weather.service';
import { ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// Register Chart.js components
import { Chart } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [CommonModule, MaterialModule, BaseChartDirective],
  templateUrl: './forecast.component.html',
  styleUrls: ['./forecast.component.scss']
})
export class ForecastComponent implements OnInit, AfterViewInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private weatherService = inject(WeatherService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  protected readonly isLoading = signal(false);
  protected readonly currentWeather = signal<WeatherData | null>(null);
  protected readonly forecast = signal<ForecastData[]>([]);

  // Chart configuration
  protected chartData: ChartData = {
    labels: [],
    datasets: [{
      label: 'Temperature',
      data: [],
      borderColor: '#667eea',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#667eea',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8
    }]
  };

  protected readonly chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear',
        grid: {
          color: 'rgba(102, 126, 234, 0.1)'
        }
      }
    }
  };

  protected readonly chartType: ChartType = 'line';

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadForecastData();
    }
  }

  ngAfterViewInit() {
    // Chart is now available
  }

  private loadForecastData() {
    this.isLoading.set(true);
    
    this.route.queryParams.subscribe(params => {
      const city = params['city'] || 'London';
      
      this.weatherService.getCurrentWeather(city).subscribe({
        next: (weather) => {
          this.currentWeather.set(weather);
        },
        error: (error) => {
          console.error('Error loading current weather:', error);
          this.snackBar.open('Error loading current weather', 'Close', {
            duration: 3000
          });
        }
      });

      this.weatherService.getForecast(city).subscribe({
        next: (forecast) => {
          this.forecast.set(forecast);
          this.updateChartData(forecast);
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
    });
  }

  private updateChartData(forecast: ForecastData[]) {
    console.log('Updating chart data:', forecast);
    
    // Map day names to proper day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const labels = forecast.map((day, index) => {
      if (day.day === 'Today') {
        return 'Today';
      } else {
        // For all other days (including Tomorrow), use the actual day name
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + index);
        return dayNames[targetDate.getDay()];
      }
    });
    
    const data = forecast.map(day => day.high);
    
    // Update existing chart data object
    this.chartData.labels = labels;
    this.chartData.datasets[0].data = data;
    
    // Force chart update after view is initialized
    setTimeout(() => {
      if (this.chart) {
        this.chart.update();
      }
    }, 100);
    
    console.log('Chart data updated:', this.chartData);
    console.log('Labels:', labels);
    console.log('Data:', data);
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
    return forecast.length > 0 ? Math.max(...forecast.map(day => day.high)) : 0;
  }

  protected getMinTemp(): number {
    const forecast = this.forecast();
    return forecast.length > 0 ? Math.min(...forecast.map(day => day.low)) : 0;
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