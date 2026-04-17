export class SoundManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
  }

  updateSettings(settings) {
    this.settings = settings;
  }

  ensureContext() {
    if (!this.context) {
      this.context = new window.AudioContext();
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }

    return this.context;
  }

  get masterGainScalar() {
    return (this.settings.audio.masterVolume ?? 100) / 100;
  }

  tone({ frequency = 440, endFrequency = 220, duration = 0.1, gain = 0.2, type = 'sine' }) {
    const context = this.ensureContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(endFrequency, 1),
      context.currentTime + duration,
    );

    gainNode.gain.setValueAtTime(gain * this.masterGainScalar, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  playHit() {
    this.tone({
      frequency: 820,
      endFrequency: 220,
      duration: 0.08,
      gain: 0.22 * ((this.settings.audio.hitVolume ?? 100) / 100),
      type: 'triangle',
    });
  }

  playMiss() {
    this.tone({
      frequency: 240,
      endFrequency: 120,
      duration: 0.14,
      gain: 0.18 * ((this.settings.audio.missVolume ?? 100) / 100),
      type: 'sawtooth',
    });
  }

  playHeadshot() {
    this.playHit();
    window.setTimeout(() => {
      this.tone({
        frequency: 1400,
        endFrequency: 700,
        duration: 0.06,
        gain: 0.12 * ((this.settings.audio.hitVolume ?? 100) / 100),
        type: 'square',
      });
    }, 18);
  }

  playStreak(level) {
    const pitches = [380, 520, 680, 880];
    this.tone({
      frequency: pitches[Math.min(level, pitches.length - 1)],
      endFrequency: pitches[Math.min(level, pitches.length - 1)] * 0.7,
      duration: 0.12,
      gain: 0.12,
      type: 'triangle',
    });
  }

  playUiClick() {
    if (!this.settings.audio.uiSounds) return;
    this.tone({
      frequency: 620,
      endFrequency: 400,
      duration: 0.04,
      gain: 0.08,
      type: 'square',
    });
  }

  playCountdown() {
    this.tone({
      frequency: 900,
      endFrequency: 620,
      duration: 0.07,
      gain: 0.1,
      type: 'sine',
    });
  }

  playSessionEnd() {
    [0, 120, 260].forEach((delay, index) => {
      window.setTimeout(() => {
        this.tone({
          frequency: 420 + index * 180,
          endFrequency: 260 + index * 120,
          duration: 0.16,
          gain: 0.14,
          type: 'triangle',
        });
      }, delay);
    });
  }

  playCue() {
    this.tone({
      frequency: 520,
      endFrequency: 520,
      duration: 0.09,
      gain: 0.1,
      type: 'sine',
    });
  }
}
