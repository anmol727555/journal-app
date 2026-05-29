// Ambient Audio Engine using Web Audio API and fallback CDN streams

let audioCtx = null;
let rainNode = null;
let fireNode = null;
let fireCrackleInterval = null;
let streamNodes = {}; // For CDN audio loops
let masterGain = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5; // Default master volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generate a 2-second pink noise buffer
function createPinkNoiseBuffer(ctx) {
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    
    let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    pink *= 0.11; // rescue gain
    output[i] = pink;
  }
  
  return noiseBuffer;
}

// Synthesize RAIN
function startSynthRain(ctx) {
  if (rainNode) return;
  
  const buffer = createPinkNoiseBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  
  // Filter to make it sound like rain hitting a window (lowpass)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1000;
  
  // Wind modulation (subtle LFO on filter frequency)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.15; // 0.15 Hz wind gusts
  lfoGain.gain.value = 250; // modulate by 250Hz
  
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  
  const gain = ctx.createGain();
  gain.gain.value = 0.6; // Rain gain
  
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  lfo.start();
  source.start();
  
  rainNode = { source, lfo, gain, filter };
}

function stopSynthRain() {
  if (rainNode) {
    try {
      rainNode.source.stop();
      rainNode.lfo.stop();
    } catch(e) {}
    rainNode = null;
  }
}

// Synthesize COZY CAMPFIRE
function startSynthFire(ctx) {
  if (fireNode) return;
  
  // Create low frequency rumble (lowpass filtered pink noise)
  const rumbleBuffer = createPinkNoiseBuffer(ctx);
  const rumbleSource = ctx.createBufferSource();
  rumbleSource.buffer = rumbleBuffer;
  rumbleSource.loop = true;
  
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = 'lowpass';
  rumbleFilter.frequency.value = 80; // deep combustion hum
  
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.8;
  
  rumbleSource.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(masterGain);
  rumbleSource.start();
  
  // Schedule crackling clicks at random intervals
  fireCrackleInterval = setInterval(() => {
    // Generate a single tiny click sound
    const clickLength = 0.02 * ctx.sampleRate; // 20ms
    const clickBuffer = ctx.createBuffer(1, clickLength, ctx.sampleRate);
    const data = clickBuffer.getChannelData(0);
    
    // Tiny burst of highpass noise
    let lastOut = 0.0;
    for (let i = 0; i < clickLength; i++) {
      const white = Math.random() * 2 - 1;
      // Simple high pass filter
      data[i] = (white - lastOut) * 0.5;
      lastOut = white;
      
      // Exponential decay envelope
      const decay = Math.exp(-i / (clickLength * 0.2));
      data[i] *= decay * (Math.random() > 0.5 ? 0.3 : 0.15);
    }
    
    const clickSource = ctx.createBufferSource();
    clickSource.buffer = clickBuffer;
    
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.7;
    
    clickSource.connect(clickGain);
    clickGain.connect(masterGain);
    clickSource.start();
  }, 120); // click speed
  
  fireNode = { rumbleSource, rumbleGain };
}

function stopSynthFire() {
  if (fireNode) {
    try {
      fireNode.rumbleSource.stop();
    } catch(e) {}
    clearInterval(fireCrackleInterval);
    fireNode = null;
  }
}

// Streaming Loops (Lo-fi Beats, Forest Birds)
const CDN_STREAMS = {
  lofi: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3', // Relaxing lo-fi piano beat
  forest: 'https://assets.mixkit.co/music/preview/mixkit-forest-ambience-with-birds-chirping-1209.mp3' // Forest birds
};

function playCDNStream(type) {
  if (streamNodes[type]) return;
  
  const audio = new Audio(CDN_STREAMS[type]);
  audio.loop = true;
  audio.volume = 0.4;
  audio.play().catch(err => console.log('Audio autoplay blocked initially: ', err));
  
  streamNodes[type] = audio;
}

function stopCDNStream(type) {
  if (streamNodes[type]) {
    streamNodes[type].pause();
    streamNodes[type] = null;
  }
}

// Main API Export
export const AmbientAudio = {
  toggleSound: (soundId, isActive) => {
    try {
      const ctx = getAudioContext();
      
      if (soundId === 'rain') {
        if (isActive) startSynthRain(ctx);
        else stopSynthRain();
      } 
      else if (soundId === 'fire') {
        if (isActive) startSynthFire(ctx);
        else stopSynthFire();
      } 
      else if (soundId === 'lofi') {
        if (isActive) playCDNStream('lofi');
        else stopCDNStream('lofi');
      } 
      else if (soundId === 'forest') {
        if (isActive) playCDNStream('forest');
        else stopCDNStream('forest');
      }
    } catch(e) {
      console.warn('Audio Context error: ', e);
    }
  },
  
  setVolume: (value) => {
    try {
      const ctx = getAudioContext();
      if (masterGain) {
        masterGain.gain.value = value;
      }
      // Also adjust CDN streams
      Object.keys(streamNodes).forEach(key => {
        if (streamNodes[key]) {
          streamNodes[key].volume = value * 0.8;
        }
      });
    } catch(e) {}
  },
  
  stopAll: () => {
    stopSynthRain();
    stopSynthFire();
    stopCDNStream('lofi');
    stopCDNStream('forest');
  }
};
