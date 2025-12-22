# Weather Pit 🌦️

An interactive audio-visual experience that transforms real-time weather data into a dynamic 3D simulation with generative music.

## Features

- **Real-time Weather Data**: Fetch weather from anywhere in the world using OpenWeatherMap API
- **3D Visualization**: Balls bounce and interact in a physics-enabled pit using Three.js
- **Generative Music**: Web Audio API creates pentatonic melodies based on weather conditions
- **Weather-Influenced Properties**:
  - 🌡️ **Temperature** → Ball speed (hotter = faster)
  - 💧 **Humidity** → Ball size (higher = bigger)
  - 💨 **Wind** → Directional forces
  - 🔘 **Pressure** → Ball mass/density
  - ☁️ **Cloud Cover** → Ball colors
  - 🌧️ **Precipitation** → Spawn rate, decay rate, and gravity modifier
    - More precipitation = faster spawning & decay
    - Rain = stronger gravity
    - Snow = lighter, floaty movement

- **Musical Scales**:
  - ☀️ Nice weather (sunny, warm) → **Major pentatonic** (bright, uplifting)
  - 🌧️ Gloomy weather (cloudy, cold) → **Minor pentatonic** (moody, dark)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get an OpenWeatherMap API key:**
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Get your free API key (1000 calls/day)

3. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Add your API key to `.env`:
     ```
     OPENWEATHER_API_KEY=your_api_key_here
     ```

4. **Run the application:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   - Navigate to `http://localhost:3000`

## Usage

1. Enter a city name (e.g., "London") or coordinates (e.g., "51.5074,-0.1278")
2. Click "Fetch Weather" to load weather data
3. Click "Start Pit" to begin the simulation
4. Watch the balls bounce and listen to the weather!
5. Adjust volume with the slider
6. Try different locations to hear different weather conditions

## How It Works

### Weather → Visual Mapping
- Each ball represents a note in the pentatonic scale (25 balls total)
- All balls share properties influenced by current weather conditions
- Ball collisions trigger musical notes
- Collision velocity affects note volume
- Multiple balls create harmonious, evolving soundscapes

### Lifecycle System
- Balls spawn from above the pit
- Spawn rate increases with precipitation
- Balls gradually decay (fade and shrink)
- Decay rate increases with precipitation
- Dead balls are removed and new ones spawn

### Physics
- Realistic collision detection and response
- Mass-based momentum transfer
- Boundary collisions with pit walls
- Gravity modified by precipitation type
- Wind creates directional movement

## Technologies

- **Three.js** - 3D graphics and rendering
- **Web Audio API** - Real-time audio synthesis
- **OpenWeatherMap API** - Weather data
- **Express** - Backend server
- **Node.js** - Runtime environment

## Future Ideas

- Multiple simultaneous locations (compare weather in different cities)
- Time-lapse mode (show weather changes over 24 hours)
- Custom instruments/timbres based on weather
- VR support for immersive experience
- Save and share pit snapshots
- Different pit shapes for different climates

## License

MIT

---

Created with 🎵 and ☁️
