/**
 * AudioEngine - Handles all Web Audio for the Weather Pit
 * Creates pentatonic scales and triggers notes on collisions
 */
export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.isInitialized = false;
    
    // Pentatonic scale notes
    this.scales = {
      major: [0, 2, 4, 7, 9], // Major pentatonic intervals
      minor: [0, 3, 5, 7, 10]  // Minor pentatonic intervals
    };
    
    // Base frequency for C3
    this.baseFreq = 130.81;
    
    // Currently playing notes (to avoid overlapping sounds)
    this.activeNotes = new Map();
  }
  
  /**
   * Initialize Web Audio Context
   * Must be called after user interaction
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master gain for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3; // Start at 30% volume
      this.masterGain.connect(this.audioContext.destination);
      
      this.isInitialized = true;
      console.log('Audio Engine initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }
  
  /**
   * Get frequency for a specific note in the pentatonic scale
   * @param {number} noteIndex - 0-24 (5 notes × 5 balls per metric)
   * @param {boolean} isMajor - true for major scale, false for minor
   */
  getFrequency(noteIndex, isMajor = true) {
    const scale = isMajor ? this.scales.major : this.scales.minor;
    
    // Map noteIndex (0-24) to octave and scale position
    const octave = Math.floor(noteIndex / 5);
    const scalePosition = noteIndex % 5;
    
    // Get semitone offset from scale
    const semitoneOffset = scale[scalePosition];
    
    // Calculate frequency: baseFreq * 2^((octave*12 + semitoneOffset)/12)
    const totalSemitones = (octave * 12) + semitoneOffset;
    const frequency = this.baseFreq * Math.pow(2, totalSemitones / 12);
    
    return frequency;
  }
  
  /**
   * Play a note with given parameters
   * @param {number} noteIndex - Which note to play (0-24)
   * @param {boolean} isMajor - Major or minor scale
   * @param {number} velocity - Collision velocity (affects volume)
   * @param {number} duration - How long to play the note
   */
  playNote(noteIndex, isMajor, velocity = 1.0, duration = 0.5) {
    if (!this.isInitialized || !this.audioContext) {
      console.warn('Audio not initialized');
      return;
    }
    
    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const now = this.audioContext.currentTime;
    const frequency = this.getFrequency(noteIndex, isMajor);
    
    // Stop any existing note for this index
    this.stopNote(noteIndex);
    
    // Create oscillator (the sound generator)
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sine'; // Smooth, pleasant sound
    oscillator.frequency.value = frequency;
    
    // Create gain node for this note (for volume control)
    const gainNode = this.audioContext.createGain();
    
    // Calculate volume based on velocity
    const volume = Math.min(0.4, velocity * 0.1); // Cap at 0.4
    gainNode.gain.value = volume;
    
    // Create a filter for more interesting timbre
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency * 4;
    filter.Q.value = 1;
    
    // Connect: oscillator -> filter -> gain -> master -> destination
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Envelope: quick attack, sustain, then decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
    gainNode.gain.setValueAtTime(volume, now + duration * 0.7); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // Decay
    
    // Start and schedule stop
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    // Clean up after note finishes
    oscillator.onended = () => {
      oscillator.disconnect();
      filter.disconnect();
      gainNode.disconnect();
      this.activeNotes.delete(noteIndex);
    };
    
    // Store active note
    this.activeNotes.set(noteIndex, { oscillator, gainNode });
  }
  
  /**
   * Stop a currently playing note
   */
  stopNote(noteIndex) {
    if (this.activeNotes.has(noteIndex)) {
      const { oscillator, gainNode } = this.activeNotes.get(noteIndex);
      
      try {
        const now = this.audioContext.currentTime;
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        oscillator.stop(now + 0.05);
      } catch (e) {
        // Note might have already stopped
      }
      
      this.activeNotes.delete(noteIndex);
    }
  }
  
  /**
   * Set master volume
   * @param {number} volume - 0.0 to 1.0
   */
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  /**
   * Stop all playing notes
   */
  stopAll() {
    this.activeNotes.forEach((_, noteIndex) => {
      this.stopNote(noteIndex);
    });
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
