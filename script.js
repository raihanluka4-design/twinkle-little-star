/* =========================================================
   Realistic Digital ICU Life Support & Defibrillator System
   Complete with Web Audio API sound synthesis, 10s death timer,
   ECG/SPO2/ART oscilloscope rendering, and defib mechanics.
   ========================================================= */

// Audio Synthesizer Class (No external mp3 needed - fully self-contained & realistic)
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.continuousAlarmNode = null;
    this.continuousFlatlineNode = null;
    this.chargeOsc = null;
    this.chargeGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAllContinuous();
    }
    return !this.muted;
  }

  // Realistic normal heartbeat monitor beep (QRS "chirp")
  playHeartBeep(pitch = 880) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.9, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  // Urgent recurring ICU warning beep (for Cardiac Arrest countdown)
  playAlarmBeep() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.setValueAtTime(800, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn(e);
    }
  }

  // Rising charging whine typical of LIFEPAK defibrillators
  startChargeWhine(durationSec = 2.2) {
    if (this.muted || !this.ctx) return;
    this.stopChargeWhine();
    try {
      const now = this.ctx.currentTime;
      this.chargeOsc = this.ctx.createOscillator();
      this.chargeGain = this.ctx.createGain();

      this.chargeOsc.type = 'sawtooth';
      // Low tone sweeping up to high pitch
      this.chargeOsc.frequency.setValueAtTime(220, now);
      this.chargeOsc.frequency.exponentialRampToValueAtTime(1950, now + durationSec);

      this.chargeGain.gain.setValueAtTime(0.01, now);
      this.chargeGain.gain.linearRampToValueAtTime(0.18, now + durationSec * 0.8);

      this.chargeOsc.connect(this.chargeGain);
      this.chargeGain.connect(this.ctx.destination);

      this.chargeOsc.start(now);
    } catch (e) {
      console.warn(e);
    }
  }

  stopChargeWhine() {
    if (this.chargeOsc) {
      try {
        this.chargeOsc.stop();
        this.chargeOsc.disconnect();
      } catch (e) {}
      this.chargeOsc = null;
    }
  }

  // Defibrillator Ready constant high beep
  playReadyBeep() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(2000, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // Massive electrical discharge zap / thump
  playDefibShock() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      
      // Heavy low-frequency thump
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.4);

      subGain.gain.setValueAtTime(0.8, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.45);

      // White noise electric spark/zap burst
      const bufferSize = this.ctx.sampleRate * 0.25;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      whiteNoise.start(now);
    } catch (e) {
      console.warn(e);
    }
  }

  // Realistic flatline continuous tone (Asystole)
  startFlatline() {
    if (this.muted || !this.ctx || this.continuousFlatlineNode) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, now);

      gain.gain.setValueAtTime(0.18, now);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      this.continuousFlatlineNode = { osc, gain };
    } catch (e) {}
  }

  stopFlatline() {
    if (this.continuousFlatlineNode) {
      try {
        this.continuousFlatlineNode.osc.stop();
        this.continuousFlatlineNode.osc.disconnect();
      } catch (e) {}
      this.continuousFlatlineNode = null;
    }
  }

  stopAllContinuous() {
    this.stopChargeWhine();
    this.stopFlatline();
  }
}

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
const SystemState = {
  ARREST: 'ARREST',       // Ventricular Fibrillation, dying
  RECOVERED: 'RECOVERED', // Normal Sinus Rhythm, revived
  DEAD: 'DEAD'            // Asystole / irreversible clinical death
};

let currentState = SystemState.ARREST;
let timeLeft = 10.0;
let totalTime = 10.0;
let isCharging = false;
let chargeProgress = 0; // 0 to 100
let shockCount = 0;
let selectedEnergy = 200;
let lastTimerTick = Date.now();
let lastAlarmBeepTime = 0;

const sounds = new SoundSystem();

// Canvas Elements
const ecgCanvas = document.getElementById('ecgCanvas');
const plethCanvas = document.getElementById('plethCanvas');
const artCanvas = document.getElementById('artCanvas');

const ctxECG = ecgCanvas.getContext('2d');
const ctxPleth = plethCanvas.getContext('2d');
const ctxArt = artCanvas.getContext('2d');

// UI Elements
const timerDisplay = document.getElementById('deathTimer');
const timerProgress = document.getElementById('timerProgress');
const timerBox = document.getElementById('timerBox');
const timerSubtext = document.getElementById('timerSubtext');

const valHR = document.getElementById('valHR');
const valSPO2 = document.getElementById('valSPO2');
const valBP = document.getElementById('valBP');
const valRESP = document.getElementById('valRESP');

const rhythmName = document.getElementById('rhythmName');
const systemStatusBadge = document.getElementById('systemStatusBadge');
const consoleText = document.getElementById('consoleText');
const systemClock = document.getElementById('systemClock');

const chargeBtn = document.getElementById('chargeBtn');
const shockBtn = document.getElementById('shockBtn');
const chargeGauge = document.getElementById('chargeGauge');
const chargeLevelTxt = document.getElementById('chargeLevelTxt');
const shockWarning = document.getElementById('shockWarning');
const resetBtn = document.getElementById('resetBtn');

const deathModal = document.getElementById('deathModal');
const deathTimestamp = document.getElementById('deathTimestamp');
const attemptCountDisplay = document.getElementById('attemptCountDisplay');
const tryAgainBtn = document.getElementById('tryAgainBtn');
const shockFlash = document.getElementById('shockFlash');
const audioToggleBtn = document.getElementById('audioToggleBtn');

// Energy selector buttons
document.querySelectorAll('.energy-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.energy-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedEnergy = parseInt(btn.dataset.energy, 10);
    logConsole(`ENERGY SELECTED: ${selectedEnergy} Joules (Biphasic)`);
  });
});

// Audio unlock on click
window.addEventListener('click', () => sounds.init(), { once: true });
window.addEventListener('keydown', () => sounds.init(), { once: true });

audioToggleBtn.addEventListener('click', () => {
  sounds.init();
  const isOn = sounds.toggleMute();
  audioToggleBtn.textContent = isOn ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
});

// Update Digital Clock
setInterval(() => {
  const d = new Date();
  systemClock.textContent = d.toTimeString().split(' ')[0];
}, 1000);

function logConsole(msg) {
  const time = new Date().toTimeString().split(' ')[0];
  consoleText.innerHTML = `> [${time}] ${msg}<br>` + consoleText.innerHTML.slice(0, 300);
}

// -------------------------------------------------------------
// Defibrillator Mechanics
// -------------------------------------------------------------
chargeBtn.addEventListener('click', () => {
  sounds.init();
  if (currentState === SystemState.DEAD) {
    logConsole('ERROR: Defibrillation ineffective in persistent Asystole.');
    return;
  }
  if (isCharging) return;

  isCharging = true;
  chargeProgress = 0;
  chargeBtn.disabled = true;
  shockBtn.disabled = true;
  shockBtn.classList.remove('ready');
  shockWarning.textContent = `CHARGING CAPACITORS TO ${selectedEnergy}J...`;

  logConsole(`CHARGING: LifePak 20E charging to ${selectedEnergy} Joules...`);
  sounds.startChargeWhine(2.0);

  const chargeInterval = setInterval(() => {
    chargeProgress += 5;
    if (chargeProgress > 100) chargeProgress = 100;

    chargeGauge.style.setProperty('--charge-pct', `${chargeProgress}%`);
    chargeLevelTxt.textContent = `${chargeProgress}%`;

    if (chargeProgress >= 100) {
      clearInterval(chargeInterval);
      isCharging = false;
      chargeBtn.disabled = false;
      shockBtn.disabled = false;
      shockBtn.classList.add('ready');
      shockWarning.textContent = `⚠️ READY: CLEAR PATIENT & DELIVER ${selectedEnergy}J SHOCK!`;
      logConsole(`CAPACITOR CHARGED: ${selectedEnergy}J Ready. STAND CLEAR!`);
      sounds.stopChargeWhine();
      sounds.playReadyBeep();
    }
  }, 100);
});

shockBtn.addEventListener('click', () => {
  sounds.init();
  if (shockBtn.disabled || chargeProgress < 100) return;

  // Discharge
  shockCount++;
  chargeProgress = 0;
  chargeGauge.style.setProperty('--charge-pct', `0%`);
  chargeLevelTxt.textContent = `0%`;
  shockBtn.disabled = true;
  shockBtn.classList.remove('ready');
  shockWarning.textContent = 'PADDLES DISCHARGED / ENERGY DELIVERED';

  // Visual shock effects
  sounds.playDefibShock();
  triggerShockFlash();

  logConsole(`SHOCK DELIVERED: ${selectedEnergy}J discharged across myocardium.`);

  // Evaluate clinical outcome based on timer status
  if (currentState === SystemState.ARREST && timeLeft > 0) {
    // SUCCESSFUL RESUSCITATION!
    revivePatient();
  } else {
    // Shocked too late or already dead
    logConsole('POST-SHOCK RHYTHM: No response. Asystole persists.');
  }
});

function triggerShockFlash() {
  shockFlash.classList.add('flash');
  document.body.classList.add('body-convulsion');
  setTimeout(() => {
    shockFlash.classList.remove('flash');
  }, 90);
  setTimeout(() => {
    document.body.classList.remove('body-convulsion');
  }, 360);
}

function revivePatient() {
  currentState = SystemState.RECOVERED;
  sounds.stopAllContinuous();

  // Update Status & UI
  systemStatusBadge.className = 'status-badge stable';
  systemStatusBadge.textContent = 'PATIENT STABILIZED // NORMAL SINUS RHYTHM';

  timerBox.className = 'death-timer-box safe';
  timerDisplay.innerHTML = 'SAVED';
  timerSubtext.textContent = 'ROSC ACHIEVED (RETURN OF SPONTANEOUS CIRCULATION)';

  rhythmName.textContent = 'NORMAL SINUS RHYTHM (NSR)';
  rhythmName.style.color = 'var(--green-ecg)';

  valHR.textContent = '76';
  valSPO2.textContent = '98';
  valBP.textContent = '118/74';
  valRESP.textContent = '16';

  logConsole('★ SUCCESS: Sinus rhythm restored! Blood pressure rising. Patient revived.');
}

function declareDeath() {
  currentState = SystemState.DEAD;
  sounds.stopChargeWhine();
  sounds.startFlatline();

  systemStatusBadge.className = 'status-badge dead';
  systemStatusBadge.textContent = 'TERMINAL ASYSTOLE // PATIENT DECEASED';

  timerBox.className = 'death-timer-box expired';
  timerDisplay.innerHTML = '0.0<span class="unit">s</span>';
  timerSubtext.textContent = 'BIOLOGICAL DEATH CONFIRMED - CPR CEASED';

  rhythmName.textContent = 'ASYSTOLE (FLATLINE)';
  rhythmName.style.color = '#ff334b';

  valHR.textContent = '0';
  valSPO2.textContent = '--';
  valBP.textContent = '0/0';
  valRESP.textContent = '0';

  chargeBtn.disabled = true;
  shockBtn.disabled = true;

  logConsole('FATAL: Cardiac arrest timer expired without successful countershock. Patient flatlined.');

  // Reveal Death Marker Modal
  const now = new Date().toLocaleTimeString();
  deathTimestamp.textContent = now;
  attemptCountDisplay.textContent = shockCount;

  setTimeout(() => {
    deathModal.classList.remove('hidden');
  }, 800);
}

// Reset scenario
resetBtn.addEventListener('click', resetSimulation);
tryAgainBtn.addEventListener('click', resetSimulation);

function resetSimulation() {
  sounds.stopAllContinuous();
  currentState = SystemState.ARREST;
  timeLeft = 10.0;
  totalTime = 10.0;
  chargeProgress = 0;
  isCharging = false;
  shockCount = 0;

  chargeGauge.style.setProperty('--charge-pct', `0%`);
  chargeLevelTxt.textContent = `0%`;
  chargeBtn.disabled = false;
  shockBtn.disabled = true;
  shockBtn.classList.remove('ready');
  shockWarning.textContent = 'PADDLES DISCHARGED / NOT READY';

  timerBox.className = 'death-timer-box';
  timerSubtext.textContent = 'IMMEDIATE DEFIBRILLATION REQUIRED';

  systemStatusBadge.className = 'status-badge critical';
  systemStatusBadge.textContent = 'CRITICAL ALERT: CODE BLUE';

  rhythmName.textContent = 'VENTRICULAR FIBRILLATION';
  rhythmName.style.color = 'var(--text-dim)';

  valHR.textContent = '--';
  valSPO2.textContent = '--';
  valBP.textContent = '0/0';
  valRESP.textContent = '0';

  deathModal.classList.add('hidden');
  logConsole('SIMULATION RESET: Patient entering Ventricular Fibrillation (V-Fib). 10-second timer initiated.');
}

// -------------------------------------------------------------
// Oscilloscope & Waveform Rendering Engine
// -------------------------------------------------------------
function resizeCanvases() {
  [ecgCanvas, plethCanvas, artCanvas].forEach(canv => {
    canv.width = canv.parentElement.clientWidth;
    canv.height = canv.parentElement.clientHeight;
  });
}
window.addEventListener('resize', resizeCanvases);
resizeCanvases();

let scanX = 0;
const waveSpeed = 2.4; // pixels per frame
let phase = 0;
let lastHeartBeatTime = 0;

function drawWaveforms() {
  const w = ecgCanvas.width;
  const h = ecgCanvas.height;

  if (w === 0 || h === 0) {
    requestAnimationFrame(drawWaveforms);
    return;
  }

  // Erase a narrow beam ahead of the sweep needle for realistic CRT oscilloscope effect
  const eraseWidth = 24;
  [ctxECG, ctxPleth, ctxArt].forEach(c => {
    c.fillStyle = 'rgba(10, 17, 26, 0.25)';
    c.clearRect(scanX, 0, eraseWidth, h);
    c.fillRect(scanX, 0, eraseWidth, h);
  });

  const nextX = (scanX + waveSpeed);

  // Compute instantaneous signal amplitudes based on state
  let ecgY = h * 0.5;
  let plethY = h * 0.6;
  let artY = h * 0.6;

  phase += 0.08;

  if (currentState === SystemState.ARREST) {
    // Chaotic V-Fib waveform: high-frequency irregular spikes & sine mixtures
    const vfib = Math.sin(phase * 3.1) * 0.4 +
                 Math.sin(phase * 7.7) * 0.35 +
                 Math.cos(phase * 12.3) * 0.25 +
                 (Math.random() - 0.5) * 0.3;
    ecgY = (h * 0.5) - (vfib * (h * 0.35));

    // Zero pulse in arteries / pleth
    plethY = (h * 0.6) + (Math.sin(phase * 1.5) * 2);
    artY = (h * 0.7) + (Math.sin(phase * 2) * 2);

  } else if (currentState === SystemState.RECOVERED) {
    // Normal Sinus Rhythm (P - Q - R - S - T wave sequence)
    const cycle = (phase * 0.55) % (Math.PI * 2);
    let ecgSignal = 0;
    let plethSignal = 0;
    let artSignal = 0;

    // Normal QRS complex timing
    if (cycle > 0.4 && cycle < 0.7) {
      // P wave
      ecgSignal = Math.sin((cycle - 0.4) / 0.3 * Math.PI) * 0.15;
    } else if (cycle >= 0.9 && cycle < 1.0) {
      // Q dip
      ecgSignal = -0.15;
    } else if (cycle >= 1.0 && cycle < 1.15) {
      // R spike
      ecgSignal = 1.0;
      // Trigger synchronized audio beep on R wave
      const now = Date.now();
      if (now - lastHeartBeatTime > 600) {
        sounds.playHeartBeep(880);
        lastHeartBeatTime = now;
      }
    } else if (cycle >= 1.15 && cycle < 1.3) {
      // S dip
      ecgSignal = -0.3;
    } else if (cycle >= 1.5 && cycle < 2.1) {
      // T wave
      ecgSignal = Math.sin((cycle - 1.5) / 0.6 * Math.PI) * 0.3;
    }

    // Pleth & Arterial pulse follows R spike with brief delay
    if (cycle >= 1.2 && cycle < 2.5) {
      const pulsePhase = (cycle - 1.2) / 1.3;
      plethSignal = Math.sin(pulsePhase * Math.PI) * 0.85;
      // Dicrotic notch in ART wave
      const dicrotic = pulsePhase > 0.4 ? Math.sin((pulsePhase - 0.4) * 3) * 0.2 : 0;
      artSignal = (Math.sin(pulsePhase * Math.PI) + dicrotic) * 0.8;
    }

    ecgY = (h * 0.55) - (ecgSignal * (h * 0.42));
    plethY = (h * 0.7) - (plethSignal * (h * 0.35));
    artY = (h * 0.7) - (artSignal * (h * 0.35));

  } else if (currentState === SystemState.DEAD) {
    // Asystole: flatline with subtle electronic sensor noise
    ecgY = (h * 0.5) + (Math.random() - 0.5) * 1.5;
    plethY = (h * 0.6) + (Math.random() - 0.5) * 1.0;
    artY = (h * 0.65) + (Math.random() - 0.5) * 1.0;
  }

  // Draw ECG Line (Green)
  ctxECG.beginPath();
  ctxECG.lineWidth = 2.4;
  ctxECG.strokeStyle = '#00ff66';
  ctxECG.shadowColor = '#00ff66';
  ctxECG.shadowBlur = 8;
  ctxECG.moveTo(scanX, ecgY);
  ctxECG.lineTo(nextX, ecgY);
  ctxECG.stroke();

  // Draw Pleth Line (Cyan)
  ctxPleth.beginPath();
  ctxPleth.lineWidth = 2.2;
  ctxPleth.strokeStyle = '#00e5ff';
  ctxPleth.shadowColor = '#00e5ff';
  ctxPleth.shadowBlur = 8;
  ctxPleth.moveTo(scanX, plethY);
  ctxPleth.lineTo(nextX, plethY);
  ctxPleth.stroke();

  // Draw ART Line (Yellow)
  ctxArt.beginPath();
  ctxArt.lineWidth = 2.2;
  ctxArt.strokeStyle = '#ffcc00';
  ctxArt.shadowColor = '#ffcc00';
  ctxArt.shadowBlur = 8;
  ctxArt.moveTo(scanX, artY);
  ctxArt.lineTo(nextX, artY);
  ctxArt.stroke();

  scanX = nextX;
  if (scanX >= w) {
    scanX = 0;
  }

  requestAnimationFrame(drawWaveforms);
}
requestAnimationFrame(drawWaveforms);

// -------------------------------------------------------------
// Timer & Clinical Loop
// -------------------------------------------------------------
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTimerTick) / 1000;
  lastTimerTick = now;

  if (currentState === SystemState.ARREST) {
    timeLeft -= dt;

    // Periodic urgent alarm beeping during arrest
    if (now - lastAlarmBeepTime > 900) {
      sounds.playAlarmBeep();
      lastAlarmBeepTime = now;
    }

    if (timeLeft <= 0) {
      timeLeft = 0;
      declareDeath();
    }

    // Update timer visuals
    timerDisplay.innerHTML = `${Math.max(0, timeLeft).toFixed(1)}<span class="unit">s</span>`;
    const pct = Math.max(0, (timeLeft / totalTime) * 100);
    timerProgress.style.width = `${pct}%`;
  }
}, 50);

// Initialize with helpful message
logConsole('SYSTEM READY: Patient entered acute cardiac arrest. 10.0s critical window running!');
