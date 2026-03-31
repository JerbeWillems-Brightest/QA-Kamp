export default function initFireworks(canvasEl: HTMLCanvasElement) {
  const ctx = canvasEl.getContext('2d')!;

  let canvasWidth = 0;
  let canvasHeight = 0;
  function resize() {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = Math.max(1, Math.floor(rect.width * dpr));
    canvasEl.height = Math.max(1, Math.floor(rect.height * dpr));
    canvasEl.style.width = `${Math.floor(rect.width)}px`;
    canvasEl.style.height = `${Math.floor(rect.height)}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvasWidth = canvasEl.width;
    canvasHeight = canvasEl.height;
  }

  const PALETTES: string[][] = [
    ['#FFD700','#FFA500'],['#FF3333','#FF7777'],['#AA33FF','#DD88FF'],['#33DDFF','#0099FF'],
    ['#33FF88','#00CC55'],['#FF44AA','#FF0077'],['#FF3333','#AA33FF'],['#FFD700','#33DDFF']
  ];
  const rnd = (a:number,b:number) => a + Math.random() * (b - a);
  const pick = <T,>(arr:T[]) => arr[Math.floor(Math.random() * arr.length)];

  type TrailPoint = { x:number; y:number };

  class Particle {
    x:number; y:number; vx:number; vy:number; col:string; alpha:number; decay:number; r:number; tx:TrailPoint[]; doTrail:boolean;
    constructor(x:number,y:number,pal:string[],big:boolean){
      this.x = x; this.y = y;
      const a = Math.random() * Math.PI * 2;
      const s = big ? rnd(1.5,6) : rnd(0.5,2.5);
      this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
      this.col = pick(pal) as unknown as string;
      this.alpha = 1; this.decay = rnd(0.008,0.018);
      this.r = big ? rnd(1.5,3) : rnd(0.6,1.5);
      this.tx = []; this.doTrail = Math.random() < 0.45;
    }
    step(){
      if (this.doTrail) { this.tx.push({ x: this.x, y: this.y }); if (this.tx.length > 7) this.tx.shift(); }
      this.vy += 0.055; this.vx *= 0.99; this.x += this.vx; this.y += this.vy; this.alpha -= this.decay;
    }
    draw(){
      if (this.alpha <= 0) return;
      if (this.doTrail) {
        for (let i = 0; i < this.tx.length; i++) {
          const t = this.tx[i]; ctx.save(); ctx.globalAlpha = Math.max(0, (i / this.tx.length) * this.alpha * 0.35);
          ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(t.x, t.y, this.r * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      }
      ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    dead(){ return this.alpha <= 0; }
  }

  class Burst {
    x:number; y:number; pal:string[]; col:string; phase:number; alpha:number; maxR:number; arms:number; pts:{len:number; max:number}[]; particles:Particle[];
    constructor(x:number,y:number,pal:string[]){
      this.x = x; this.y = y; this.pal = pal; this.col = pal[0]; this.phase = 0; this.alpha = 1;
      this.maxR = rnd(20,38); this.arms = 8; this.pts = [];
      for (let i = 0; i < this.arms; i++) this.pts.push({ len: 0, max: this.maxR * (i % 2 === 0 ? 1 : 0.6) });
      this.particles = [];
        // reduced particle counts for better performance
        for (let i = 0; i < 40; i++) this.particles.push(new Particle(x,y,pal,true));
        for (let i = 0; i < 18; i++) this.particles.push(new Particle(x,y,pal,false));
    }
    step(){ this.phase += 0.04; this.alpha = Math.max(0, 1 - this.phase * 0.55); for (const p of this.pts) p.len = Math.min(p.max, p.len + 2.8); for (const p of this.particles) p.step(); this.particles = this.particles.filter(p => !p.dead()); }
    draw(){ for (const p of this.particles) p.draw(); if (this.alpha > 0.05) { ctx.save(); ctx.globalAlpha = this.alpha; ctx.strokeStyle = this.col; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let i = 0; i < this.arms; i++) { const a = (i / this.arms) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a) * this.pts[i].len, this.y + Math.sin(a) * this.pts[i].len); ctx.stroke(); } ctx.restore(); } }
    done(){ return this.alpha <= 0 && this.particles.length === 0; }
  }

  class Rocket {
    pal:string[]; col:string; x:number; y:number; tx:number; ty:number; vx:number; vy:number; trail:{x:number;y:number;a:number}[]; dist:number; gone:boolean; traveled:number;
    constructor(){ const pal = pick(PALETTES) as string[]; this.pal = pal; this.col = pal[0]; this.x = rnd(canvasWidth * 0.1, canvasWidth * 0.9); this.y = canvasHeight; this.tx = this.x + rnd(-60,60); this.ty = rnd(canvasHeight * 0.08, canvasHeight * 0.45); const ang = Math.atan2(this.ty - this.y, this.tx - this.x); const sp = rnd(9,15); this.vx = Math.cos(ang) * sp; this.vy = Math.sin(ang) * sp; this.trail = []; this.dist = Math.hypot(this.tx - this.x, this.ty - this.y); this.gone = false; this.traveled = 0; }
    step(){ this.trail.push({ x: this.x, y: this.y, a: 1 }); if (this.trail.length > 14) this.trail.shift(); for (const t of this.trail) t.a = Math.max(0, t.a - 0.08); this.vy += 0.03; this.x += this.vx; this.y += this.vy; this.traveled += Math.hypot(this.vx, this.vy); if (this.traveled >= this.dist * 0.9 || this.y <= this.ty) this.gone = true; }
    draw(){ for (const t of this.trail) { if (t.a <= 0) continue; ctx.save(); ctx.globalAlpha = t.a * 0.7; ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } if (!this.gone) { ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
  }

  const rockets: Rocket[] = [];
  const bursts: Burst[] = [];
  let last = 0;
    let interval = 900; // less frequent rockets
  let raf = 0;

  function loop(ts:number){
    raf = requestAnimationFrame(loop);
    ctx.fillStyle = 'rgba(255,255,255,0.17)';
    ctx.fillRect(0,0,canvasWidth,canvasHeight);

    if (ts - last > interval) {
      last = ts; interval = rnd(700,1400); rockets.push(new Rocket()); if (Math.random() < 0.35) setTimeout(() => rockets.push(new Rocket()), rnd(120,240));
    }

    for (let i = rockets.length - 1; i >= 0; i--) { const r = rockets[i]; r.step(); r.draw(); if (r.gone) { bursts.push(new Burst(r.x, r.y, r.pal)); rockets.splice(i,1); } }
    for (let i = bursts.length - 1; i >= 0; i--) { const b = bursts[i]; b.step(); b.draw(); if (b.done()) bursts.splice(i,1); }
  }

  resize();
  raf = requestAnimationFrame(loop);
  window.addEventListener('resize', resize);

  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
}

