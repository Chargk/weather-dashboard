import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

export interface WeatherData {
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
  coord: {
    lat: number;
    lon: number;
  };
}

export interface ForecastData {
  date: string;
  day: string;
  high: number;
  low: number;
  icon: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly BASE_URL = 'https://api.open-meteo.com/v1';
  private readonly GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1';
  
  private currentWeatherSubject = new BehaviorSubject<WeatherData | null>(null);
  public currentWeather$ = this.currentWeatherSubject.asObservable();
  
  private forecastSubject = new BehaviorSubject<ForecastData[]>([]);
  public forecast$ = this.forecastSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCurrentWeather(city: string): Observable<WeatherData> {
    return this.getCoordinates(city).pipe(
      switchMap((coords: { latitude: any; longitude: any; }) => {
        const params = new HttpParams()
          .set('latitude', coords.latitude.toString())
          .set('longitude', coords.longitude.toString())
          .set('current_weather', 'true')
          .set('hourly', 'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index')
          .set('daily', 'sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code')
          .set('timezone', 'auto');

        return this.http.get(`${this.BASE_URL}/forecast`, { params }).pipe(
          map((response: any) => this.transformWeatherData(response, city, coords))
        );
      }),
      catchError(error => {
        console.error('Error fetching weather data:', error);
        throw error;
      })
    );
  }

  getWeatherByCoords(lat: number, lon: number): Observable<WeatherData> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('current_weather', 'true')
      .set('hourly', 'temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,visibility,uv_index')
      .set('daily', 'sunrise,sunset,temperature_2m_max,temperature_2m_min,weather_code')
      .set('timezone', 'auto');

    return this.http.get(`${this.BASE_URL}/forecast`, { params }).pipe(
      map((response: any) => this.transformWeatherData(response, '', { latitude: lat, longitude: lon })),
      catchError(error => {
        console.error('Error fetching weather data by coordinates:', error);
        throw error;
      })
    );
  }

  getForecast(city: string): Observable<ForecastData[]> {
    return this.getCoordinates(city).pipe(
      switchMap((coords: { latitude: { toString: () => string | number | boolean; }; longitude: { toString: () => string | number | boolean; }; }) => {
        const params = new HttpParams()
          .set('latitude', coords.latitude.toString())
          .set('longitude', coords.longitude.toString())
          .set('daily', 'temperature_2m_max,temperature_2m_min,weather_code')
          .set('timezone', 'auto')
          .set('forecast_days', '5');

        return this.http.get(`${this.BASE_URL}/forecast`, { params }).pipe(
          map((response: any) => this.transformForecastData(response))
        );
      }),
      catchError(error => {
        console.error('Error fetching forecast data:', error);
        throw error;
      })
    );
  }

  searchCities(query: string): Observable<any[]> {
    const params = new HttpParams()
      .set('name', query)
      .set('count', '5')
      .set('language', 'en')
      .set('format', 'json');

    return this.http.get(`${this.GEOCODING_URL}/search`, { params }).pipe(
      map((response: any) => response.results || []),
      catchError(error => {
        console.error('Error searching cities:', error);
        throw error;
      })
    );
  }

  getCurrentLocation(): Promise<{lat: number, lon: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          reject(error.message);
        }
      );
    });
  }

  private getCoordinates(city: string): Observable<{latitude: number, longitude: number}> {
    const params = new HttpParams()
      .set('name', city)
      .set('count', '1')
      .set('language', 'en')
      .set('format', 'json');

    return this.http.get(`${this.GEOCODING_URL}/search`, { params }).pipe(
      map((response: any) => {
        if (response.results && response.results.length > 0) {
          return {
            latitude: response.results[0].latitude,
            longitude: response.results[0].longitude
          };
        }
        throw new Error('City not found');
      }),
      catchError(error => {
        console.error('Error getting coordinates:', error);
        throw error;
      })
    );
  }

  private transformWeatherData(data: any, cityName: string, coords: {latitude: number, longitude: number}): WeatherData {
    const current = data.current_weather;
    const hourly = data.hourly;
    const daily = data.daily;
    
    // Get current hour index
    const currentTime = new Date(current.time);
    const currentHour = currentTime.getHours();
    const hourIndex = data.hourly.time.findIndex((time: string) => 
      new Date(time).getHours() === currentHour
    );

    return {
      city: cityName || 'Current Location',
      country: '', // Open-Meteo doesn't provide country info easily
      temperature: Math.round(current.temperature),
      feelsLike: Math.round(current.temperature), // Approximation
      humidity: Math.round(hourly.relative_humidity_2m[hourIndex] || 0),
      pressure: Math.round(hourly.pressure_msl[hourIndex] || 0),
      windSpeed: Math.round(hourly.wind_speed_10m[hourIndex] || 0),
      windDirection: this.getWindDirection(current.winddirection),
      description: this.getWeatherDescription(current.weathercode),
      icon: this.getWeatherIcon(current.weathercode),
      visibility: Math.round((hourly.visibility[hourIndex] || 10000) / 1000), // Convert to km
      uvIndex: Math.round(hourly.uv_index[hourIndex] || 0),
      sunrise: this.formatTime(daily.sunrise[0]),
      sunset: this.formatTime(daily.sunset[0]),
      coord: {
        lat: coords.latitude,
        lon: coords.longitude
      }
    };
  }

  private transformForecastData(data: any): ForecastData[] {
    const forecast: ForecastData[] = [];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(data.daily.time[i]);
      const weatherCode = data.daily.weather_code[i];
      
      forecast.push({
        date: data.daily.time[i],
        day: this.getDayName(date),
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        icon: this.getWeatherIcon(weatherCode),
        description: this.getWeatherDescription(weatherCode)
      });
    }

    return forecast;
  }

  private getWindDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  private getWeatherIcon(weatherCode: number): string {
    // WMO Weather interpretation codes (WW)
    const iconMap: { [key: number]: string } = {
      0: 'wb_sunny',        // Clear sky
      1: 'wb_sunny',        // Mainly clear
      2: 'wb_cloudy',       // Partly cloudy
      3: 'cloud',           // Overcast
      45: 'foggy',          // Fog
      48: 'foggy',          // Depositing rime fog
      51: 'grain',          // Light drizzle
      53: 'grain',          // Moderate drizzle
      55: 'grain',          // Dense drizzle
      61: 'grain',          // Slight rain
      63: 'grain',          // Moderate rain
      65: 'grain',          // Heavy rain
      71: 'ac_unit',        // Slight snow fall
      73: 'ac_unit',        // Moderate snow fall
      75: 'ac_unit',        // Heavy snow fall
      77: 'ac_unit',        // Snow grains
      80: 'grain',          // Slight rain showers
      81: 'grain',          // Moderate rain showers
      82: 'grain',          // Violent rain showers
      85: 'ac_unit',        // Slight snow showers
      86: 'ac_unit',        // Heavy snow showers
      95: 'thunderstorm',   // Thunderstorm
      96: 'thunderstorm',   // Thunderstorm with slight hail
      99: 'thunderstorm'    // Thunderstorm with heavy hail
    };
    return iconMap[weatherCode] || 'wb_cloudy';
  }

  private getWeatherDescription(weatherCode: number): string {
    const descriptions: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return descriptions[weatherCode] || 'Unknown';
  }

  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  private getDayName(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
  }
}