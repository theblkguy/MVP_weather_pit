import * as THREE from '../node_modules/three/build/three.module.js';

/**
 * WeatherBall class - represents a single ball in the pit
 * All balls share the same weather-influenced properties
 */
export class WeatherBall {
  constructor(scene, weatherData, noteIndex, pitBounds) {
    this.scene = scene;
    this.weatherData = weatherData;
    this.noteIndex = noteIndex; // 0-24, determines which note this ball plays
    this.pitBounds = pitBounds;
    
    // Physics properties
    this.position = new THREE.Vector3(
      Math.random() * pitBounds.width - pitBounds.width / 2,
      pitBounds.height + Math.random() * 5, // Spawn above pit
      Math.random() * pitBounds.depth - pitBounds.depth / 2
    );
    
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * -1, // Initial downward velocity
      (Math.random() - 0.5) * 2
    );
    
    // Weather-influenced properties
    this.size = this.calculateSize();
    this.mass = this.calculateMass();
    this.color = this.calculateColor();
    this.baseSpeed = this.calculateBaseSpeed();
    this.decayRate = this.calculateDecayRate();
    
    // Lifecycle
    this.life = 1.0; // 1.0 = fully alive, 0.0 = dead
    this.age = 0;
    
    // Create mesh
    this.createMesh();
  }
  
  /**
   * Size based on humidity
   * Higher humidity = bigger balls
   */
  calculateSize() {
    const humidity = this.weatherData.humidity;
    const minSize = 0.3;
    const maxSize = 1.5;
    return minSize + (humidity / 100) * (maxSize - minSize);
  }
  
  /**
   * Mass based on pressure
   * Higher pressure = denser/heavier balls
   */
  calculateMass() {
    const pressure = this.weatherData.pressure;
    // Standard pressure is ~1013 hPa
    const normalizedPressure = pressure / 1013;
    return normalizedPressure * (this.size ** 3); // Mass increases with volume
  }
  
  /**
   * Color based on cloud cover and conditions
   * Clear = bright warm colors
   * Cloudy/gloomy = cool dark colors
   */
  calculateColor() {
    const { cloudCover, condition, temp } = this.weatherData;
    
    let hue, saturation, lightness;
    
    if (condition === 'Clear') {
      // Warm colors (yellow to orange)
      hue = 40 + (temp / 40) * 20; // 40-60° hue (yellow-orange range)
      saturation = 80 + Math.random() * 20;
      lightness = 50 + Math.random() * 20;
    } else if (condition === 'Rain' || condition === 'Drizzle') {
      // Cool blues
      hue = 200 + Math.random() * 40;
      saturation = 50 + Math.random() * 30;
      lightness = 30 + Math.random() * 30;
    } else if (condition === 'Snow') {
      // White/light blue
      hue = 200;
      saturation = 20 + Math.random() * 30;
      lightness = 70 + Math.random() * 20;
    } else if (condition === 'Clouds') {
      // Grays to blues based on cloud cover
      hue = 210 + Math.random() * 30;
      saturation = 20 + (cloudCover / 100) * 40;
      lightness = 40 - (cloudCover / 100) * 20;
    } else {
      // Default varied colors
      hue = Math.random() * 360;
      saturation = 60 + Math.random() * 40;
      lightness = 40 + Math.random() * 30;
    }
    
    return new THREE.Color(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  /**
   * Base speed influenced by temperature
   * Hotter = faster
   */
  calculateBaseSpeed() {
    const temp = this.weatherData.temp;
    const minSpeed = 1.0;
    const maxSpeed = 3.0;
    
    // Normalize temp (-20°C to 40°C range)
    const normalizedTemp = Math.max(-20, Math.min(40, temp));
    const tempFactor = (normalizedTemp + 20) / 60; // 0 to 1
    
    return minSpeed + tempFactor * (maxSpeed - minSpeed);
  }
  
  /**
   * Decay rate based on precipitation
   * More precipitation = faster decay (balls wash away)
   */
  calculateDecayRate() {
    const { precipitation } = this.weatherData;
    const baseDecay = 0.001; // Very slow natural decay
    const precipDecay = precipitation * 0.01; // More rain = faster decay
    
    return baseDecay + precipDecay;
  }
  
  /**
   * Create the Three.js mesh
   */
  createMesh() {
    const geometry = new THREE.SphereGeometry(this.size, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: this.color,
      transparent: true,
      opacity: 1.0,
      shininess: 80,
      emissive: this.color,
      emissiveIntensity: 0.2
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Store reference to this ball in the mesh
    this.mesh.userData.ball = this;
    
    this.scene.add(this.mesh);
  }
  
  /**
   * Apply wind force to velocity
   */
  applyWind(deltaTime) {
    const { windSpeed } = this.weatherData;
    // Wind adds a horizontal force
    const windForce = windSpeed * 0.1 * deltaTime;
    this.velocity.x += (Math.random() - 0.5) * windForce;
    this.velocity.z += (Math.random() - 0.5) * windForce;
  }
  
  /**
   * Apply gravity (modified by precipitation type)
   */
  applyGravity(deltaTime) {
    const { precipitationType } = this.weatherData;
    
    let gravity = 9.8; // Base gravity
    
    if (precipitationType === 'rain') {
      gravity *= 1.5; // Rain makes balls heavier/fall faster
    } else if (precipitationType === 'snow') {
      gravity *= 0.5; // Snow makes balls floaty
    }
    
    this.velocity.y -= gravity * deltaTime;
  }
  
  /**
   * Update ball physics and lifecycle
   */
  update(deltaTime) {
    // Apply forces
    this.applyWind(deltaTime);
    this.applyGravity(deltaTime);
    
    // Apply velocity with speed multiplier
    this.position.x += this.velocity.x * this.baseSpeed * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * this.baseSpeed * deltaTime;
    
    // Boundary collisions (walls of the pit)
    this.checkBoundaries();
    
    // Update lifecycle
    this.age += deltaTime;
    this.life -= this.decayRate * deltaTime;
    this.life = Math.max(0, this.life); // Clamp to 0
    
    // Update mesh
    this.mesh.position.copy(this.position);
    this.mesh.material.opacity = this.life;
    
    // Scale down as it decays
    const scale = 0.5 + (this.life * 0.5); // Scale from 0.5 to 1.0
    this.mesh.scale.set(scale, scale, scale);
  }
  
  /**
   * Handle collisions with pit boundaries
   */
  checkBoundaries() {
    const halfWidth = this.pitBounds.width / 2;
    const halfDepth = this.pitBounds.depth / 2;
    const restitution = 0.8; // Bounciness
    
    // Floor
    if (this.position.y - this.size < 0) {
      this.position.y = this.size;
      this.velocity.y *= -restitution;
    }
    
    // Walls
    if (this.position.x - this.size < -halfWidth) {
      this.position.x = -halfWidth + this.size;
      this.velocity.x *= -restitution;
    }
    if (this.position.x + this.size > halfWidth) {
      this.position.x = halfWidth - this.size;
      this.velocity.x *= -restitution;
    }
    
    if (this.position.z - this.size < -halfDepth) {
      this.position.z = -halfDepth + this.size;
      this.velocity.z *= -restitution;
    }
    if (this.position.z + this.size > halfDepth) {
      this.position.z = halfDepth - this.size;
      this.velocity.z *= -restitution;
    }
  }
  
  /**
   * Check if this ball is still alive
   */
  isAlive() {
    return this.life > 0;
  }
  
  /**
   * Remove from scene
   */
  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
