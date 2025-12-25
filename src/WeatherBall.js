import * as THREE from '../node_modules/three/build/three.module.js';

/**
 * WeatherBall class - represents a single ball in the pit
 * All balls share the same weather-influenced properties
 */
export class WeatherBall {
  constructor(scene, weatherData, noteIndex, pitBounds, audioEngine) {
    this.scene = scene;
    this.weatherData = weatherData;
    this.noteIndex = noteIndex; // 0-24, determines which note this ball plays
    this.pitBounds = pitBounds;
    this.audioEngine = audioEngine;
    
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
   * Color based on temperature and weather conditions
   * Hot temps = warm palette (reds, oranges, yellows)
   * Cold temps = cool palette (blues, purples, cyans)
   * Each ball gets a varied color from the palette
   */
  calculateColor() {
    const { temp, condition } = this.weatherData;
    
    let hue, saturation, lightness;
    
    // Determine if temperature is hot or cold
    // Cold: < 50°F, Moderate: 50-75°F, Hot: > 75°F
    if (temp < 50) {
      // COLD PALETTE - Blues, purples, cyans
      const coldHues = [180, 200, 220, 240, 260, 280]; // Cyan to blue to purple
      hue = coldHues[Math.floor(Math.random() * coldHues.length)];
      hue += (Math.random() - 0.5) * 15; // Add variation
      saturation = 60 + Math.random() * 30;
      lightness = 45 + Math.random() * 25;
      
      // Snow makes it lighter
      if (condition === 'Snow') {
        saturation -= 20;
        lightness += 15;
      }
    } else if (temp > 75) {
      // HOT PALETTE - Reds, oranges, yellows
      const hotHues = [0, 15, 30, 45, 60]; // Red to orange to yellow
      hue = hotHues[Math.floor(Math.random() * hotHues.length)];
      hue += (Math.random() - 0.5) * 10; // Add variation
      saturation = 70 + Math.random() * 30;
      lightness = 50 + Math.random() * 20;
      
      // Clear skies make it more vibrant
      if (condition === 'Clear') {
        saturation += 10;
        lightness += 10;
      }
    } else {
      // MODERATE PALETTE - Greens, teals, warm colors
      const moderateHues = [80, 100, 120, 160, 40]; // Yellow-green to teal
      hue = moderateHues[Math.floor(Math.random() * moderateHues.length)];
      hue += (Math.random() - 0.5) * 20; // More variation
      saturation = 50 + Math.random() * 40;
      lightness = 45 + Math.random() * 25;
    }
    
    // Rain makes colors slightly darker and more saturated
    if (condition === 'Rain' || condition === 'Drizzle') {
      saturation += 10;
      lightness -= 10;
    }
    
    // Cloudy conditions desaturate slightly
    if (condition === 'Clouds') {
      saturation -= 15;
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
    
    // Normalize temp (0°F to 110°F range)
    const normalizedTemp = Math.max(0, Math.min(110, temp));
    const tempFactor = normalizedTemp / 110; // 0 to 1
    
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
      shininess: 100,
      emissive: this.color,
      emissiveIntensity: 0.3,
      specular: 0xffffff
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
    const isOnGround = this.position.y - this.size < 0;
    if (isOnGround) {
      // Capture velocity before modifying it to detect bounce
      const wasMovingDown = this.velocity.y < 0;
      const bounceVelocity = Math.abs(this.velocity.y);
      
      this.position.y = this.size;
      this.velocity.y *= -restitution;
      
      // Play sound on ground bounce (only if ball was moving downward)
      if (wasMovingDown && this.audioEngine && bounceVelocity > 0.1) {
        this.audioEngine.playNote(
          this.noteIndex,
          this.weatherData.isMajorScale,
          bounceVelocity,
          0.2 // Shorter duration for ground bounces
        );
      }
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
