import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { fetchWeather } from './services/weatherService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve node_modules for ES6 imports
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Serve Three.js and other dependencies from node_modules
app.use('/three', express.static(path.join(__dirname, 'node_modules/three')));

// Serve our source files
app.use('/src', express.static(path.join(__dirname, 'src')));

// API Routes
app.get('/api/weather', async (req, res) => {
  const { location } = req.query;
  
  if (!location) {
    return res.status(400).json({ error: 'Location parameter is required' });
  }
  
  try {
    const weatherData = await fetchWeather(location);
    res.json(weatherData);
  } catch (error) {
    console.error('Error in /api/weather:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve main HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🌦️  Weather Pit server running on http://localhost:${PORT}`);
  console.log(`Make sure to set your OPENWEATHER_API_KEY in .env file`);
});
