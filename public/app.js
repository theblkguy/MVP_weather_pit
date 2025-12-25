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
    
    // ADSR controls
    this.attackSlider = document.getElementById('attack-slider');
    this.attackValue = document.getElementById('attack-value');
    this.decaySlider = document.getElementById('decay-slider');
    this.decayValue = document.getElementById('decay-value');
    this.sustainSlider = document.getElementById('sustain-slider');
    this.sustainValue = document.getElementById('sustain-value');
    this.releaseSlider = document.getElementById('release-slider');
    this.releaseValue = document.getElementById('release-value');
    
    this.init();
  }
  
  init() {
    // Event listeners
    this.fetchWeatherBtn.addEventListener('click', () => this.fetchWeather());
    this.startBtn.addEventListener('click', () => this.startPit());
    this.stopBtn.addEventListener('click', () => this.stopPit());
    this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e));
    
    // ADSR event listeners
    this.attackSlider.addEventListener('input', (e) => this.updateADSR(e));
    this.decaySlider.addEventListener('input', (e) => this.updateADSR(e));
    this.sustainSlider.addEventListener('input', (e) => this.updateADSR(e));
    this.releaseSlider.addEventListener('input', (e) => this.updateADSR(e));
    
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
        <strong>Temperature:</strong> ${data.temp.toFixed(1)}°F
      </div>
      <div class="weather-stat">
        <strong>Humidity:</strong> ${data.humidity}%
      </div>
      <div class="weather-stat">
        <strong>Wind:</strong> ${data.windSpeed.toFixed(1)} mph
      </div>
      <div class="weather-stat">
        <strong>Pressure:</strong> ${data.pressure} hPa
      </div>
      <div class="weather-stat">
        <strong>Precipitation:</strong> ${data.precipitation.toFixed(2)} in
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
    
    // Initialize ADSR values from current slider positions
    if (this.weatherPit.audioEngine) {
      this.updateADSR({ target: this.attackSlider });
    }
    
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
  
  updateADSR(event) {
    if (!this.weatherPit || !this.weatherPit.audioEngine) {
      return;
    }
    
    // Calculate ADSR values from slider positions
    // Attack: 0-100 -> 0.0-1.0 seconds (in 0.01s increments)
    const attack = this.attackSlider.value / 100;
    
    // Decay: 0-200 -> 0.0-2.0 seconds (in 0.05s increments)
    const decay = this.decaySlider.value / 100;
    
    // Sustain: 0-100 -> 0.0-1.0 (as percentage of peak volume)
    const sustain = this.sustainSlider.value / 100;
    
    // Release: 0-300 -> 0.0-3.0 seconds (in 0.05s increments)
    const release = this.releaseSlider.value / 100;
    
    // Update display values
    this.attackValue.textContent = `${attack.toFixed(2)}s`;
    this.decayValue.textContent = `${decay.toFixed(2)}s`;
    this.sustainValue.textContent = `${Math.round(sustain * 100)}%`;
    this.releaseValue.textContent = `${release.toFixed(2)}s`;
    
    // Update audio engine
    this.weatherPit.audioEngine.setADSR({
      attack,
      decay,
      sustain,
      release
    });
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
