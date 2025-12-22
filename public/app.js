import { WeatherPit } from '../src/WeatherPit.js';

/**
 * Main application logic
 */
class App {
  constructor() {
    this.weatherPit = null;
    this.currentWeatherData = null;
    
    // DOM elements
    this.locationInput = document.getElementById('location-input');
    this.fetchWeatherBtn = document.getElementById('fetch-weather-btn');
    this.startBtn = document.getElementById('start-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.weatherInfo = document.getElementById('weather-info');
    this.statusDiv = document.getElementById('status');
    this.loadingDiv = document.getElementById('loading');
    this.pitContainer = document.getElementById('pit-container');
    this.volumeSlider = document.getElementById('volume-slider');
    this.volumeValue = document.getElementById('volume-value');
    
    this.init();
  }
  
  init() {
    // Event listeners
    this.fetchWeatherBtn.addEventListener('click', () => this.fetchWeather());
    this.startBtn.addEventListener('click', () => this.startPit());
    this.stopBtn.addEventListener('click', () => this.stopPit());
    this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e));
    
    // Allow Enter key in location input
    this.locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.fetchWeather();
      }
    });
  }
  
  async fetchWeather() {
    const location = this.locationInput.value.trim();
    
    if (!location) {
      this.showStatus('Please enter a location', 'error');
      return;
    }
    
    this.showLoading(true);
    this.showStatus('Fetching weather data...', 'success');
    this.fetchWeatherBtn.disabled = true;
    
    try {
      // Call our backend API
      const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const weatherData = await response.json();
      this.currentWeatherData = weatherData;
      
      // Display weather info
      this.displayWeatherInfo(weatherData);
      this.showStatus(`Weather data loaded for ${weatherData.location}!`, 'success');
      
      // Enable start button
      this.startBtn.disabled = false;
      
      // If pit is already running, update it
      if (this.weatherPit && this.weatherPit.isRunning) {
        this.weatherPit.updateWeather(weatherData);
      }
      
    } catch (error) {
      console.error('Error fetching weather:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
      this.fetchWeatherBtn.disabled = false;
    }
  }
  
  displayWeatherInfo(data) {
    this.weatherInfo.innerHTML = `
      <div class="weather-stat">
        <strong>Location:</strong> ${data.location}, ${data.country}
      </div>
      <div class="weather-stat">
        <strong>Condition:</strong> ${data.description}
      </div>
      <div class="weather-stat">
        <strong>Temperature:</strong> ${data.temp.toFixed(1)}°C
      </div>
      <div class="weather-stat">
        <strong>Humidity:</strong> ${data.humidity}%
      </div>
      <div class="weather-stat">
        <strong>Wind:</strong> ${data.windSpeed.toFixed(1)} m/s
      </div>
      <div class="weather-stat">
        <strong>Pressure:</strong> ${data.pressure} hPa
      </div>
      <div class="weather-stat">
        <strong>Precipitation:</strong> ${data.precipitation.toFixed(1)} mm
      </div>
      <div class="weather-stat">
        <strong>Cloud Cover:</strong> ${data.cloudCover}%
      </div>
      <div class="weather-stat">
        <strong>Scale:</strong> ${data.isMajorScale ? 'Major (Bright)' : 'Minor (Moody)'}
      </div>
    `;
    this.weatherInfo.classList.remove('hidden');
  }
  
  startPit() {
    if (!this.currentWeatherData) {
      this.showStatus('Please fetch weather data first', 'error');
      return;
    }
    
    // Create or restart pit
    if (!this.weatherPit) {
      this.weatherPit = new WeatherPit(this.pitContainer, this.currentWeatherData);
    }
    
    this.weatherPit.start();
    
    // Update button states
    this.startBtn.disabled = true;
    this.stopBtn.disabled = false;
    
    this.showStatus('Weather Pit is running! Listen to the weather...', 'success');
  }
  
  stopPit() {
    if (this.weatherPit) {
      this.weatherPit.stop();
    }
    
    // Update button states
    this.startBtn.disabled = false;
    this.stopBtn.disabled = true;
    
    this.showStatus('Weather Pit stopped', 'success');
  }
  
  updateVolume(event) {
    const volume = event.target.value / 100;
    this.volumeValue.textContent = `${event.target.value}%`;
    
    if (this.weatherPit && this.weatherPit.audioEngine) {
      this.weatherPit.audioEngine.setVolume(volume);
    }
  }
  
  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.classList.remove('hidden');
  }
  
  showLoading(show) {
    if (show) {
      this.loadingDiv.classList.remove('hidden');
    } else {
      this.loadingDiv.classList.add('hidden');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
