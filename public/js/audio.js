/**
 * Sintetizador retro 16-bit con control independiente de Efectos (SFX) y Música por mapa.
 */

const MAP_MELODIES = {
  aldea: { tempoMs: 430, wave: 'triangle', vol: 0.032, notes: [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0] },
  bosque: { tempoMs: 350, wave: 'triangle', vol: 0.03, notes: [220.0, 261.63, 329.63, 293.66, 220.0, 246.94, 329.63, 261.63] },
  cueva: { tempoMs: 290, wave: 'sawtooth', vol: 0.02, notes: [130.81, 155.56, 146.83, 123.47, 130.81, 196.0, 155.56, 123.47] },
  desierto: { tempoMs: 310, wave: 'triangle', vol: 0.028, notes: [220.0, 233.08, 293.66, 329.63, 293.66, 233.08, 220.0, 196.0] },
  montanas: { tempoMs: 390, wave: 'sine', vol: 0.034, notes: [392.0, 440.0, 523.25, 659.25, 587.33, 523.25, 440.0, 392.0] },
  fortaleza: { tempoMs: 245, wave: 'sawtooth', vol: 0.022, notes: [110.0, 130.81, 164.81, 155.56, 110.0, 146.83, 130.81, 103.83] }
};

class RetroAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.musicZone = null;
    this.musicTimer = null;
    this.noteIdx = 0;
  }

  setEnabled(val) {
    this.setSfxEnabled(val);
    this.setMusicEnabled(val);
  }

  setSfxEnabled(val) {
    this.sfxEnabled = Boolean(val);
  }

  setMusicEnabled(val) {
    this.musicEnabled = Boolean(val);
    if (!this.musicEnabled) {
      this.stopMusic();
    } else if (this.musicZone) {
      const z = this.musicZone;
      this.musicZone = null;
      this.setMusicZone(z);
    }
  }

  ensureCtx() {
    if (!this.sfxEnabled && !this.musicEnabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  tone(freq, duration = 0.09, type = 'square', volume = 0.08, slideTo = null, isMusic = false) {
    if (isMusic ? !this.musicEnabled : !this.sfxEnabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  setMusicZone(mapId) {
    if (!mapId || !MAP_MELODIES[mapId]) return;
    if (this.musicZone === mapId && this.musicTimer) return;
    this.stopMusic();
    this.musicZone = mapId;
    if (!this.musicEnabled) return;

    const cfg = MAP_MELODIES[mapId];
    this.noteIdx = 0;
    this.musicTimer = setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const freq = cfg.notes[this.noteIdx % cfg.notes.length];
      this.noteIdx += 1;
      this.tone(freq, (cfg.tempoMs / 1000) * 0.85, cfg.wave, cfg.vol, null, true);
    }, cfg.tempoMs);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playAttack(gender = 'male') {
    if (gender === 'female') {
      this.tone(460, 0.07, 'triangle', 0.08, 280);
      setTimeout(() => this.tone(620, 0.05, 'sine', 0.05, 420), 25);
    } else {
      this.tone(320, 0.08, 'triangle', 0.09, 130);
    }
  }
  playSkill(gender = 'male') {
    if (gender === 'female') {
      this.tone(580, 0.13, 'triangle', 0.08, 980);
    } else {
      this.tone(440, 0.14, 'sawtooth', 0.07, 760);
    }
  }
  playHit(gender = null) {
    if (gender === 'female') {
      this.tone(360, 0.08, 'sine', 0.08, 210);
    } else {
      this.tone(150, 0.07, 'square', 0.08, 70);
    }
  }
  playPotion() { this.tone(520, 0.1, 'sine', 0.09, 880); }
  playCoin() { this.tone(880, 0.07, 'square', 0.06, 1180); }
  playGem() {
    this.tone(740, 0.08, 'sine', 0.08, 1240);
    setTimeout(() => this.tone(1180, 0.12, 'triangle', 0.07, 1560), 70);
  }
  playBuy() {
    this.tone(587, 0.08, 'triangle', 0.08);
    setTimeout(() => this.tone(880, 0.12, 'triangle', 0.08), 80);
  }
  playUpgrade() {
    this.tone(440, 0.08, 'square', 0.07);
    setTimeout(() => this.tone(660, 0.08, 'square', 0.07), 70);
    setTimeout(() => this.tone(990, 0.18, 'triangle', 0.09), 140);
  }
  playLevelUp() {
    [523, 659, 784, 1046].forEach((f, idx) => setTimeout(() => this.tone(f, 0.12, 'triangle', 0.09), idx * 80));
  }
  playChest() {
    this.tone(392, 0.09, 'triangle', 0.08);
    setTimeout(() => this.tone(523, 0.09, 'triangle', 0.08), 90);
    setTimeout(() => this.tone(784, 0.2, 'sine', 0.09), 180);
  }
  playTeleport() { this.tone(300, 0.28, 'sine', 0.09, 1100); }
  playPortal() { this.tone(260, 0.24, 'triangle', 0.09, 680); }
  playQuest() {
    this.tone(523, 0.1, 'triangle', 0.08);
    setTimeout(() => this.tone(659, 0.1, 'triangle', 0.08), 90);
    setTimeout(() => this.tone(784, 0.18, 'triangle', 0.09), 180);
  }
  playVictory() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, idx) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.1), idx * 110));
  }
  playBossWave() { this.tone(120, 0.35, 'sawtooth', 0.11, 55); }
}

export const sfx = new RetroAudio();
