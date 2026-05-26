// Web Audio API Synthesizer for lag-free, dependency-free sports sound effects
export class SoundSynth {
  private ctx: AudioContext | null = null;

  constructor() {
    // Initialized on first user interaction to satisfy browser security policies
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public play(type: 'whistle' | 'kick' | 'goal' | 'cheer' | 'beep' | 'win' | 'grass' | 'drum' | 'band', volume: number = 0.5) {
    try {
      const ctx = this.initCtx();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      switch (type) {
        case 'kick':
          this.synthesizeKick(ctx, masterGain);
          break;
        case 'whistle':
          this.synthesizeWhistle(ctx, masterGain);
          break;
        case 'beep':
          this.synthesizeBeep(ctx, masterGain);
          break;
        case 'goal':
          this.synthesizeGoal(ctx, masterGain);
          break;
        case 'cheer':
          this.synthesizeCheer(ctx, masterGain);
          break;
        case 'win':
          this.synthesizeWin(ctx, masterGain);
          break;
        case 'grass':
          this.synthesizeGrass(ctx, masterGain);
          break;
        case 'drum':
          this.synthesizeDrum(ctx, masterGain);
          break;
        case 'band':
          this.synthesizeBand(ctx, masterGain);
          break;
      }
    } catch (e) {
      console.warn('Audio Synthesis error:', e);
    }
  }

  // Ball Kick - Low bass thump
  private synthesizeKick(ctx: AudioContext, destination: AudioNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.16);
  }

  // Referee Whistle - High piercing dual frequency with rapid vibration
  private synthesizeWhistle(ctx: AudioContext, destination: AudioNode) {
    const playWhistleBlast = (delay: number, duration: number) => {
      const time = ctx.currentTime + delay;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1500, time);

      // LFO to create rapid vibrato whistle flutter
      lfo.frequency.setValueAtTime(35, time);
      lfoGain.gain.setValueAtTime(120, time);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.6, time + 0.05);
      gain.gain.setValueAtTime(0.6, time + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(destination);

      lfo.start(time);
      osc1.start(time);
      osc2.start(time);

      lfo.stop(time + duration + 0.1);
      osc1.stop(time + duration + 0.1);
      osc2.stop(time + duration + 0.1);
    };

    // Standard referee double blast (short, then longer)
    playWhistleBlast(0, 0.15);
    playWhistleBlast(0.22, 0.45);
  }

  // Beep warning sound
  private synthesizeBeep(ctx: AudioContext, destination: AudioNode) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  // Goal Horn - Sliding synthetic brass blast
  private synthesizeGoal(ctx: AudioContext, destination: AudioNode) {
    const time = ctx.currentTime;
    
    // Play multiple brassy oscillators stacked together
    const playHorn = (freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.linearRampToValueAtTime(freq * 1.05, time + 0.5);
      osc.frequency.linearRampToValueAtTime(freq * 0.95, time + 1.2);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + 0.1);
      gain.gain.setValueAtTime(0.25, time + 1.4);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.8);

      // Filter to take off the harsh edge
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1500, time);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);

      osc.start(time);
      osc.stop(time + 2.0);
    };

    // Stacked major triad for stadium horn sound
    playHorn(180);
    playHorn(225);
    playHorn(270);
  }

  // Crowd Cheering - Procedural dynamic stadium bandpass noise
  private synthesizeCheer(ctx: AudioContext, destination: AudioNode) {
    const time = ctx.currentTime;
    const duration = 4.0;
    
    // Generate white noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter to shape noise into roaring ocean-like crowd sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.5, time);
    filter.frequency.setValueAtTime(350, time);
    
    // Animate filter frequency to represent roar swells
    filter.frequency.exponentialRampToValueAtTime(800, time + 0.6);
    filter.frequency.exponentialRampToValueAtTime(450, time + 3.0);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.7, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.3, time + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noiseSource.start(time);
    noiseSource.stop(time + duration);
  }

  // Win fanfare - Celebratory major arpeggio
  private synthesizeWin(ctx: AudioContext, destination: AudioNode) {
    const now = ctx.currentTime;
    const notes = [
      { note: 261.63, dur: 0.15 }, // C4
      { note: 329.63, dur: 0.15 }, // E4
      { note: 392.00, dur: 0.15 }, // G4
      { note: 523.25, dur: 0.40 }, // C5
      { note: 392.00, dur: 0.15 }, // G4
      { note: 523.25, dur: 1.00 }  // C5
    ];

    let delay = 0;
    notes.forEach((item) => {
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.note, noteTime);

      gain.gain.setValueAtTime(0.0, noteTime);
      gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.02);
      gain.gain.setValueAtTime(0.3, noteTime + item.dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + item.dur);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(noteTime);
      osc.stop(noteTime + item.dur + 0.05);

      delay += item.dur + 0.02;
    });
  }

  // Ball/Players running on grass - soft lowpass noise rustle
  private synthesizeGrass(ctx: AudioContext, destination: AudioNode) {
    const time = ctx.currentTime;
    const duration = 0.18;
    
    // Generate white noise buffer
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Bandpass filter to capture the rustling frequency of grass (mid-low range)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, time);
    filter.frequency.setValueAtTime(450, time);
    // Add subtle frequency sliding for realistic swish
    filter.frequency.exponentialRampToValueAtTime(250, time + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    noiseSource.start(time);
    noiseSource.stop(time + duration);
  }

  // Stadium Drum (Bombos de tribuna) - Deep punchy low tom with reverb simulation
  private synthesizeDrum(ctx: AudioContext, destination: AudioNode) {
    const startTime = ctx.currentTime;
    
    // Create a function to play a single hit
    const playDrumHit = (time: number, velocity: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

      gain.gain.setValueAtTime(velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(300, time);
      clickOsc.frequency.exponentialRampToValueAtTime(50, time + 0.05);

      clickGain.gain.setValueAtTime(velocity * 0.3, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gain);
      clickOsc.connect(clickGain);
      
      gain.connect(destination);
      clickGain.connect(destination);

      osc.start(time);
      clickOsc.start(time);
      
      osc.stop(time + 0.5);
      clickOsc.stop(time + 0.1);
    };

    // Drum roll sequence
    let delay = 0;
    for(let i=0; i<8; i++) {
      const vol = i === 7 ? 1.5 : (i % 2 === 0 ? 0.8 : 0.5);
      playDrumHit(startTime + delay, vol);
      delay += 0.12;
    }
    // Big finish hit
    playDrumHit(startTime + delay + 0.1, 2.0);
  }

  // Band Sound for Donations: Trumpet, Bass Drum and Cymbals
  private synthesizeBand(ctx: AudioContext, destination: AudioNode) {
    const time = ctx.currentTime;

    // 1. Bass Drum Hit
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(150, time);
    kickOsc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    kickGain.gain.setValueAtTime(1.5, time);
    kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    kickOsc.connect(kickGain);
    kickGain.connect(destination);
    kickOsc.start(time);
    kickOsc.stop(time + 0.5);

    // 2. Cymbals Crash (Filtered Noise)
    const duration = 0.8;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const cymbalFilter = ctx.createBiquadFilter();
    cymbalFilter.type = 'highpass';
    cymbalFilter.frequency.setValueAtTime(8000, time);
    
    const cymbalGain = ctx.createGain();
    cymbalGain.gain.setValueAtTime(1.0, time);
    cymbalGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noiseSource.connect(cymbalFilter);
    cymbalFilter.connect(cymbalGain);
    cymbalGain.connect(destination);
    noiseSource.start(time);
    noiseSource.stop(time + duration);

    // 3. Synthetic Trumpet Fanfare
    const playTrumpetNote = (freq: number, startDelay: number, dur: number) => {
      const noteTime = time + startDelay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);
      
      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.4, noteTime + 0.05);
      gain.gain.setValueAtTime(0.4, noteTime + dur - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);
      
      // Filter to make it sound brassy
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, noteTime);
      filter.frequency.linearRampToValueAtTime(2500, noteTime + 0.05);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      
      osc.start(noteTime);
      osc.stop(noteTime + dur + 0.1);
    };

    // Charge! sequence
    playTrumpetNote(392.00, 0.0, 0.15); // G4
    playTrumpetNote(523.25, 0.2, 0.15); // C5
    playTrumpetNote(659.25, 0.4, 0.3);  // E5
  }
}
export const globalSoundSynth = new SoundSynth();
