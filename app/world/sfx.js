// Tiny synthesised sound effects (no audio files to download or cache).
let ctx, muted = false;
try { muted = localStorage.getItem('spain-sfx') === 'off'; } catch {}

export const sfx = {
  get muted() { return muted; },
  setMuted(v) { muted = v; try { localStorage.setItem('spain-sfx', v ? 'off' : 'on'); } catch {} },
  unlock() { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch {} },
  play(name) {
    if (muted) return;
    try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const seq = SOUNDS[name]; if (!seq) return;
    const t0 = ctx.currentTime + .01;
    for (const [f, start, dur, type = 'square', vol = .07, slide = 0] of seq) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + start);
      if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t0 + start + dur);
      g.gain.setValueAtTime(0, t0 + start); g.gain.linearRampToValueAtTime(vol, t0 + start + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + start + dur);
      o.connect(g).connect(ctx.destination); o.start(t0 + start); o.stop(t0 + start + dur + .02);
    }
  },
};

const SOUNDS = {
  tap: [[880, 0, .07, 'square', .05]],
  select: [[660, 0, .06], [990, .06, .09]],
  go: [[523, 0, .08], [659, .08, .08], [784, .16, .14]],
  arrive: [[784, 0, .08, 'triangle', .1], [988, .08, .08, 'triangle', .1], [1175, .16, .08, 'triangle', .1], [1568, .24, .25, 'triangle', .1]],
  jump: [[420, 0, .16, 'square', .05, 2.2]],
  coin: [[988, 0, .07, 'square', .06], [1319, .07, .22, 'square', .06]],
  stamp: [[110, 0, .18, 'sawtooth', .12, .5], [70, .02, .2, 'triangle', .14]],
  levelup: [[523, 0, .1], [659, .1, .1], [784, .2, .1], [1047, .3, .1], [784, .4, .08], [1047, .48, .35]],
  gacha: Array.from({ length: 8 }, (_, i) => [300 + i * 60, i * .06, .05, 'square', .04]).concat([[1200, .55, .3, 'triangle', .09]]),
  whoosh: [[200, 0, .4, 'sawtooth', .03, 4]],
  close: [[600, 0, .06, 'square', .04], [400, .05, .08, 'square', .04]],
};

// Optional soft guitar-like loop on the Andalusian cadence (Am–G–F–E). Off by default.
let musicTimer = null, musicOn = false;
try { musicOn = localStorage.getItem('spain-music') === 'on'; } catch {}
const CHORDS = [[220, 261.6, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [164.8, 207.7, 246.9]];
function pluck(f, t, vol = .045) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
  lp.type = 'lowpass'; lp.frequency.value = 1800;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + 1.1);
  o.connect(lp).connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.2);
}
export const music = {
  get on() { return musicOn; },
  set(v) {
    musicOn = v; try { localStorage.setItem('spain-music', v ? 'on' : 'off'); } catch {}
    if (!v) { clearInterval(musicTimer); musicTimer = null; return; }
    try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); ctx.resume?.(); } catch { return; }
    let bar = 0;
    const play = () => {
      if (document.hidden) return;
      const t0 = ctx.currentTime + .05, ch = CHORDS[bar % 4], beat = .32;
      const pattern = [0, 1, 2, 1, 2, 1, 0, 2];
      pattern.forEach((n, i) => pluck(ch[n] * (i === 0 ? .5 : 1), t0 + i * beat, i === 0 ? .06 : .035));
      bar++;
    };
    clearInterval(musicTimer); play(); musicTimer = setInterval(play, 8 * 320);
  },
};
