import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const DEMO_MODE = process.env.DEMO_MODE === 'true';

/**
 * Fetch weather data for a specific location
 * @param {string} location - City name or coordinates (e.g., "London" or "51.5074,-0.1278")
 * @returns {Promise<Object>} Processed weather data
 */
export async function fetchWeather(location) {
  try {
    // Demo mode with mock data
    if (DEMO_MODE || !API_KEY) {
      console.log('Using DEMO MODE with mock weather data');
      return getMockWeatherData(location);
    }
    
    let url;
    
    // Check if location is coordinates (lat,lon format)
    if (location.includes(',')) {
      const [lat, lon] = location.split(',');
      url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
    } else {
      // Location is a city name
      url = `${BASE_URL}/weather?q=${location}&appid=${API_KEY}&units=imperial`;
    }
    
    console.log('Fetching weather from:', url.replace(API_KEY, 'API_KEY'));
    
    const response = await axios.get(url);
    const data = response.data;
    
    // Process and normalize the weather data
    return processWeatherData(data);
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // Provide more helpful error messages
      if (error.response.status === 404) {
        throw new Error(`Location "${location}" not found. Please check the spelling or try coordinates (lat,lon).`);
      } else if (error.response.status === 401) {
        throw new Error('Invalid API key. Please check your OPENWEATHER_API_KEY in .env file.');
      } else if (error.response.data && error.response.data.message) {
        throw new Error(`Weather API error: ${error.response.data.message}`);
      }
    }
    throw new Error(`Failed to fetch weather for ${location}: ${error.message}`);
  }
}

/**
 * Process raw OpenWeatherMap data into our app format
 */
function processWeatherData(data) {
  // Validate required data structure
  if (!data.main || !data.weather || !data.weather[0]) {
    throw new Error('Invalid weather data received from API');
  }
  
  const temp = data.main.temp;
  const humidity = data.main.humidity || 0;
  const windSpeed = (data.wind && data.wind.speed) || 0;
  const pressure = data.main.pressure || 1013; // Default to standard atmospheric pressure
  const cloudCover = (data.clouds && data.clouds.all) || 0;
  const condition = data.weather[0].main; // Clear, Clouds, Rain, Snow, etc.
  const description = data.weather[0].description || condition;
  
  // Calculate precipitation (OpenWeather doesn't always provide this)
  // Rain and snow volumes are in mm for last 1h or 3h
  // Convert mm to inches for display (1 mm = 0.0393701 inches)
  let precipitation = 0;
  let precipitationType = 'none';
  
  if (data.rain) {
    const precipitationMm = data.rain['1h'] || data.rain['3h'] || 0;
    precipitation = precipitationMm * 0.0393701; // Convert mm to inches
    precipitationType = 'rain';
  } else if (data.snow) {
    const precipitationMm = data.snow['1h'] || data.snow['3h'] || 0;
    precipitation = precipitationMm * 0.0393701; // Convert mm to inches
    precipitationType = 'snow';
  }
  
  // Determine if weather is "nice" (major scale) or "gloomy" (minor scale)
  const isMajorScale = determineScale(condition, cloudCover, temp);
  
  return {
    location: data.name || 'Unknown',
    country: (data.sys && data.sys.country) || 'Unknown',
    temp,
    humidity,
    windSpeed,
    pressure,
    precipitation,
    cloudCover,
    condition,
    description,
    precipitationType,
    isMajorScale,
    timestamp: new Date((data.dt || Date.now() / 1000) * 1000)
  };
}

/**
 * Determine if weather conditions warrant major (nice) or minor (gloomy) scale
 */
function determineScale(condition, cloudCover, temp) {
  // Nice weather conditions -> Major scale
  const niceConditions = ['Clear', 'Clouds'];
  const isNiceCondition = niceConditions.includes(condition);
  const isWarm = temp > 59; // Above 59°F (15°C) is considered warm
  const isMostlyClear = cloudCover < 50;
  
  // Major scale if: nice condition AND (warm OR mostly clear)
  return isNiceCondition && (isWarm || isMostlyClear);
}

/**
 * Generate mock weather data for demo purposes
 */
function getMockWeatherData(location) {
  const mockConfigs = {
    'London': {
      temp: 54, humidity: 75, windSpeed: 11.6, pressure: 1015,
      precipitation: 0.1, cloudCover: 80, condition: 'Rain', 
      description: 'light rain', precipitationType: 'rain'
    },
    'Dubai': {
      temp: 95, humidity: 45, windSpeed: 6.9, pressure: 1010,
      precipitation: 0, cloudCover: 10, condition: 'Clear',
      description: 'clear sky', precipitationType: 'none'
    },
    'Iceland': {
      temp: 28, humidity: 85, windSpeed: 19.0, pressure: 1005,
      precipitation: 0.2, cloudCover: 95, condition: 'Snow',
      description: 'light snow', precipitationType: 'snow'
    },
    'Singapore': {
      temp: 82, humidity: 90, windSpeed: 5.6, pressure: 1012,
      precipitation: 0.3, cloudCover: 70, condition: 'Rain',
      description: 'heavy rain', precipitationType: 'rain'
    },
    'default': {
      temp: 68, humidity: 60, windSpeed: 8.9, pressure: 1013,
      precipitation: 0.04, cloudCover: 50, condition: 'Clouds',
      description: 'scattered clouds', precipitationType: 'none'
    }
  };
  
  const config = mockConfigs[location] || mockConfigs['default'];
  const isMajorScale = determineScale(config.condition, config.cloudCover, config.temp);
  
  return {
    location: location,
    country: 'DEMO',
    temp: config.temp,
    humidity: config.humidity,
    windSpeed: config.windSpeed,
    pressure: config.pressure,
    precipitation: config.precipitation,
    cloudCover: config.cloudCover,
    condition: config.condition,
    description: config.description,
    precipitationType: config.precipitationType,
    isMajorScale,
    timestamp: new Date()
  };
}

export default {
  fetchWeather
};
