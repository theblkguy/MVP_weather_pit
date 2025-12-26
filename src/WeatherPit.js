import * as THREE from '../node_modules/three/build/three.module.js';
import { WeatherBall } from './WeatherBall.js';
import { AudioEngine } from './AudioEngine.js';

/**
 * WeatherPit - Main class managing the 3D scene, physics, and audio
 */
export class WeatherPit {
  constructor(container, weatherData) {
    this.container = container;
    this.weatherData = weatherData;
    
    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Pit dimensions - expanded space for balls to bounce around
    this.pitBounds = {
      width: 120,
      height: 80,
      depth: 120
    };
    
    // Ball management
    this.balls = [];
    this.maxBalls = 50; // Maximum number of balls
    this.spawnTimer = 0;
    this.spawnInterval = this.calculateSpawnInterval();
    
    // Audio
    this.audioEngine = new AudioEngine();
    
    // Animation
    this.animationId = null;
    this.clock = new THREE.Clock();
    this.isRunning = false;
    
    this.init();
  }
  
  /**
   * Initialize Three.js scene
   */
  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 80, 200);
    
    // Camera - position to view the expanded pit
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 100, 180);
    this.camera.lookAt(0, 30, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    // Lights
    this.setupLights();
    
    // Create the pit structure
    this.createPit();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Initialize audio
    this.audioEngine.init();
  }
  
  /**
   * Setup lighting
   */
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(60, 120, 60);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 250;
    mainLight.shadow.camera.left = -180;
    mainLight.shadow.camera.right = 180;
    mainLight.shadow.camera.top = 180;
    mainLight.shadow.camera.bottom = -180;
    this.scene.add(mainLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-60, 60, -60);
    this.scene.add(fillLight);
    
    // Point light for dramatic effect
    const pointLight = new THREE.PointLight(0xffffff, 0.6, 250);
    pointLight.position.set(0, 70, 0);
    this.scene.add(pointLight);
  }
  
  /**
   * Create the pit structure (floor and walls)
   */
  createPit() {
    const wallThickness = 0.5;
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    // Floor
    const floorGeometry = new THREE.BoxGeometry(
      this.pitBounds.width,
      wallThickness,
      this.pitBounds.depth
    );
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.position.y = -wallThickness / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    
    // Back wall
    const backWallGeometry = new THREE.BoxGeometry(
      this.pitBounds.width,
      this.pitBounds.height,
      wallThickness
    );
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, this.pitBounds.height / 2, -this.pitBounds.depth / 2);
    this.scene.add(backWall);
    
    // Left wall
    const sideWallGeometry = new THREE.BoxGeometry(
      wallThickness,
      this.pitBounds.height,
      this.pitBounds.depth
    );
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-this.pitBounds.width / 2, this.pitBounds.height / 2, 0);
    this.scene.add(leftWall);
    
    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(this.pitBounds.width / 2, this.pitBounds.height / 2, 0);
    this.scene.add(rightWall);
    
    // Grid helper (optional - for debugging)
    // const gridHelper = new THREE.GridHelper(this.pitBounds.width, 20);
    // this.scene.add(gridHelper);
  }
  
  /**
   * Calculate spawn interval based on precipitation
   * More precipitation = faster spawning
   */
  calculateSpawnInterval() {
    const { precipitation } = this.weatherData;
    const baseInterval = 2.0; // Spawn every 2 seconds base
    const minInterval = 0.3; // Minimum time between spawns
    
    // More precipitation = shorter interval
    const interval = Math.max(minInterval, baseInterval - (precipitation * 0.1));
    return interval;
  }
  
  /**
   * Calculate how many balls to spawn per spawn event based on weather
   */
  calculateBallsPerSpawn() {
    const { precipitation, cloudCover } = this.weatherData;
    
    // Base spawn: 3 balls
    let ballsPerSpawn = 3;
    
    // More precipitation = more balls (up to +3 more)
    ballsPerSpawn += Math.floor(Math.min(precipitation * 10, 3));
    
    // More cloud cover = slightly more balls (up to +1 more)
    ballsPerSpawn += Math.floor(cloudCover / 60);
    
    // Cap between 3 and 7 balls per spawn
    return Math.max(3, Math.min(7, ballsPerSpawn));
  }
  
  /**
   * Spawn multiple balls at once
   */
  spawnBall() {
    const ballsPerSpawn = this.calculateBallsPerSpawn();
    
    for (let i = 0; i < ballsPerSpawn; i++) {
      if (this.balls.length >= this.maxBalls) return;
      
      const noteIndex = this.balls.length % 25; // Cycle through 0-24
      const ball = new WeatherBall(this.scene, this.weatherData, noteIndex, this.pitBounds, this.audioEngine);
      this.balls.push(ball);
    }
  }
  
  /**
   * Check collisions between balls
   */
  checkCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball1 = this.balls[i];
        const ball2 = this.balls[j];
        
        const distance = ball1.position.distanceTo(ball2.position);
        const minDistance = ball1.size + ball2.size;
        
        if (distance < minDistance) {
          this.handleCollision(ball1, ball2);
        }
      }
    }
  }
  
  /**
   * Handle collision between two balls
   */
  handleCollision(ball1, ball2) {
    // Calculate collision normal
    const normal = new THREE.Vector3()
      .subVectors(ball2.position, ball1.position)
      .normalize();
    
    // Calculate relative velocity
    const relativeVelocity = new THREE.Vector3()
      .subVectors(ball1.velocity, ball2.velocity);
    
    const velocityAlongNormal = relativeVelocity.dot(normal);
    
    // Don't resolve if balls are moving apart
    if (velocityAlongNormal > 0) return;
    
    // Calculate restitution (bounciness)
    const restitution = 0.8;
    
    // Calculate impulse scalar
    const impulse = -(1 + restitution) * velocityAlongNormal;
    const totalMass = ball1.mass + ball2.mass;
    const impulseScalar = impulse / totalMass;
    
    // Apply impulse to velocities
    const impulseVector = normal.multiplyScalar(impulseScalar);
    ball1.velocity.add(impulseVector.clone().multiplyScalar(ball2.mass));
    ball2.velocity.sub(impulseVector.clone().multiplyScalar(ball1.mass));
    
    // Separate balls to prevent overlap
    const overlap = (ball1.size + ball2.size - ball1.position.distanceTo(ball2.position)) / 2;
    const separation = normal.multiplyScalar(overlap);
    ball1.position.sub(separation);
    ball2.position.add(separation);
    
    // Play sound for collisions - use the other ball's note (exchange notes)
    const collisionVelocity = Math.abs(velocityAlongNormal);
    this.audioEngine.playNote(ball2.noteIndex, this.weatherData.isMajorScale, collisionVelocity, 0.3);
    
    // Small delay for the second note to create harmony
    setTimeout(() => {
      this.audioEngine.playNote(ball1.noteIndex, this.weatherData.isMajorScale, collisionVelocity * 0.8, 0.3);
    }, 20);
  }
  
  /**
   * Update simulation
   */
  update() {
    const deltaTime = this.clock.getDelta();
    
    // Spawn new balls based on precipitation
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnBall();
      this.spawnTimer = 0;
    }
    
    // Update all balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      ball.update(deltaTime);
      
      // Remove dead balls
      if (!ball.isAlive()) {
        ball.destroy();
        this.balls.splice(i, 1);
      }
    }
    
    // Check collisions
    this.checkCollisions();
  }
  
  /**
   * Render the scene
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    this.update();
    this.render();
  }
  
  /**
   * Start the simulation
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.audioEngine.init(); // Ensure audio is initialized
    this.animate();
  }
  
  /**
   * Stop the simulation
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audioEngine.stopAll();
  }
  
  /**
   * Handle window resize
   */
  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  /**
   * Update weather data and reset simulation
   */
  updateWeather(newWeatherData) {
    this.weatherData = newWeatherData;
    this.spawnInterval = this.calculateSpawnInterval();
    
    // Clear existing balls
    this.balls.forEach(ball => ball.destroy());
    this.balls = [];
    this.spawnTimer = 0;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    this.balls.forEach(ball => ball.destroy());
    this.audioEngine.destroy();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
