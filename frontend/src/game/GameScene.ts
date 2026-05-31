import Phaser from 'phaser';
import { useGameStore, Team } from '../store/useGameStore.js';

export class GameScene extends Phaser.Scene {
  private ball!: Phaser.GameObjects.Container;
  private ballGraphic!: Phaser.GameObjects.Graphics;
  private ballShadow!: Phaser.GameObjects.Graphics;
  private playerLocal!: Phaser.GameObjects.Container;
  private playerVisitor!: Phaser.GameObjects.Container;
  
  private pitchWidth = 1920;
  private pitchHeight = 1080;
  private centerY = 680; // Render pitch slightly lower to leave room for scoreboard
  private pitchInnerWidth = 1500;
  private pitchInnerHeight = 620;

  // Visual lerp positions
  private targetBallX = 960;
  private currentBallX = 960;
  private ballBouncePhase = 0;
  private ballRotation = 0;
  private lastGrassSoundTime = 0;

  // Random vertical wandering (players + ball)
  private playerLocalYTarget = 0;
  private playerVisitorYTarget = 0;
  private ballYTarget = 0;
  private lastYChangeTime = 0;

  // Particle emitters for celebrations
  private confettiParticles: any[] = [];
  private fireworkParticles: any[] = [];
  private likeParticles: any[] = [];

  // Store the bound listener so we can remove it on destroy
  private handleLikeEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    this.triggerLikeCelebration(customEvent.detail.likeCount || 10);
  };

  private handleGiftEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    this.triggerGiftCelebration(customEvent.detail);
  };

  constructor() {
    super('GameScene');
  }

  preload() {
    // No external image assets required; all graphics are drawn procedurally for high resolution and zero loading bugs
  }

  create() {
    this.cameras.main.setBackgroundColor('#090d16');
    this.drawPitch();

    // Create Ball Shadow
    this.ballShadow = this.add.graphics();
    
    // Create Ball Container (ball graphic + inner markings)
    this.ball = this.add.container(960, this.centerY);
    this.ballGraphic = this.add.graphics();
    this.drawSoccerBall();
    this.ball.add(this.ballGraphic);

    // Create Players
    this.playerLocal = this.createPlayerContainer(true);
    this.playerVisitor = this.createPlayerContainer(false);

    // Subscribe to state updates to pull immediate changes
    useGameStore.subscribe((state) => {
      this.updateTeams(state.localTeam, state.visitorTeam);
      
      const maxDiamonds = parseInt(state.settings.goal_distance_diamonds || '200', 10);
      const maxPixels = parseInt(state.settings.goal_distance_pixels || '600', 10);
      
      // Calculate visual X and clamp to goal line boundaries
      const ratio = Math.max(-1, Math.min(1, state.ballProgress / maxDiamonds));
      this.targetBallX = 960 + (ratio * maxPixels);

      if (state.matchState === 'celebrating') {
        this.triggerGoalCelebration();
      } else if (state.matchState === 'idle' || state.matchState === 'finished') {
        this.targetBallX = 960;
        this.cameras.main.zoomTo(1.0, 500);
      }
    });

    // Seed initial values from current state immediately
    const initialState = useGameStore.getState();
    this.updateTeams(initialState.localTeam, initialState.visitorTeam);
    const initialMaxDiamonds = parseInt(initialState.settings.goal_distance_diamonds || '200', 10);
    const initialMaxPixels = parseInt(initialState.settings.goal_distance_pixels || '600', 10);
    const initialRatio = Math.max(-1, Math.min(1, initialState.ballProgress / initialMaxDiamonds));
    this.targetBallX = 960 + (initialRatio * initialMaxPixels);

    // Listen for custom like events from the React store
    window.addEventListener('tiktok_like', this.handleLikeEvent);
    window.addEventListener('tiktok_gift', this.handleGiftEvent);

    this.events.on('destroy', () => {
      window.removeEventListener('tiktok_like', this.handleLikeEvent);
      window.removeEventListener('tiktok_gift', this.handleGiftEvent);
    });
  }

  update(time: number, _delta: number) {
    const store = useGameStore.getState();
    const matchState = store.matchState;
    const isTurbo = store.settings.event_turbo === 'true';

    // 1. Interpolate Ball Position (LERP)
    // Turbo doubles the interpolation speed for snappy feedback!
    const lerpFactor = isTurbo ? 0.18 : 0.09;
    const prevX = this.currentBallX;
    this.currentBallX = Phaser.Math.Linear(this.currentBallX, this.targetBallX, lerpFactor);
    
    const speed = Math.abs(this.currentBallX - prevX);

    // Play grass running/rustling sound when ball moves during gameplay
    if (matchState === 'playing' && speed > 0.8) {
      if (time - this.lastGrassSoundTime > 160) {
        useGameStore.getState().triggerSound('grass');
        this.lastGrassSoundTime = time;
      }
    }

    // 2. Ball bouncing physics (amplitude and phase relative to speed)
    if (matchState === 'playing' && speed > 0.1) {
      this.ballBouncePhase += speed * 0.15;
    } else if (matchState === 'celebrating') {
      this.ballBouncePhase += 0.2;
    } else {
      this.ballBouncePhase = Phaser.Math.Linear(this.ballBouncePhase, 0, 0.1);
    }
    
    // Bounce amplitude up to 22px
    const bounceHeight = Math.abs(Math.sin(this.ballBouncePhase)) * -22 * (speed > 1 ? 1.5 : 1);

    // Random vertical wander for players + ball when playing
    if (matchState === 'playing') {
      if (time - this.lastYChangeTime > Phaser.Math.Between(1500, 4000)) {
        this.lastYChangeTime = time;
        const range = 220;
        this.playerLocalYTarget = Phaser.Math.Between(-range, range);
        this.playerVisitorYTarget = Phaser.Math.Between(-range, range);
        this.ballYTarget = Phaser.Math.Between(-range, range);
      }
    } else if (matchState === 'idle' || matchState === 'finished') {
      this.playerLocalYTarget = 0;
      this.playerVisitorYTarget = 0;
      this.ballYTarget = 0;
    }

    this.ball.x = this.currentBallX;
    this.ball.y = Phaser.Math.Linear(this.ball.y, this.centerY + this.ballYTarget + bounceHeight, 0.015);

    // 3. Spin the ball according to velocity direction
    this.ballRotation += (this.currentBallX - prevX) * 0.15;
    this.ballGraphic.setRotation(this.ballRotation);

    // 4. Scale and dim shadow dynamically as ball bounces
    const shadowScale = 1 + (bounceHeight / 80); // shrinks as ball goes up
    const shadowAlpha = 0.4 + (bounceHeight / 100); // fades as ball goes up
    
    this.ballShadow.clear();
    this.ballShadow.fillStyle(0x000000, Math.max(0.1, shadowAlpha));
    this.ballShadow.fillEllipse(this.currentBallX, this.centerY + 16, 28 * Math.max(0.2, shadowScale), 10 * Math.max(0.2, shadowScale));

    // 5. Apply ball scale
    const ballScale = parseFloat(useGameStore.getState().settings.ball_scale || '100') / 100;
    this.ball.setScale(ballScale);

    // 6. Position and Animate Players
    this.animatePlayers(time, speed);

    // 7. Handle active particles (celebrations)
    this.updateParticles();
  }

  // --- DRAWING PITCH GRAPHICS ---
  private drawPitch() {
    const graphics = this.add.graphics();
    const startX = 960 - (this.pitchInnerWidth / 2);
    const startY = this.centerY - (this.pitchInnerHeight / 2);

    // 1. Draw grass base (vertical light/dark green stripes)
    const stripeWidth = this.pitchInnerWidth / 15;
    for (let i = 0; i < 15; i++) {
      graphics.fillStyle(i % 2 === 0 ? 0x166534 : 0x15803d, 1.0); // rich dark green vs pitch green
      graphics.fillRect(startX + (i * stripeWidth), startY, stripeWidth, this.pitchInnerHeight);
    }

    // Grandstands shading (vignette dark overlays at edge of field)
    graphics.fillStyle(0x020617, 0.4);
    graphics.fillRect(0, 0, this.pitchWidth, startY);
    graphics.fillRect(0, startY + this.pitchInnerHeight, this.pitchWidth, this.pitchHeight - (startY + this.pitchInnerHeight));

    // 2. Regulation White Markings
    graphics.lineStyle(4, 0xffffff, 0.85);
    
    // Outer Border
    graphics.strokeRect(startX, startY, this.pitchInnerWidth, this.pitchInnerHeight);
    
    // Half-way Line
    graphics.lineBetween(960, startY, 960, startY + this.pitchInnerHeight);
    
    // Center Circle
    graphics.strokeCircle(960, this.centerY, 100);
    graphics.fillPoint(960, this.centerY, 8); // center spot

    // Left Penalty Area
    graphics.strokeRect(startX, this.centerY - 180, 160, 360);
    graphics.strokeRect(startX, this.centerY - 90, 60, 180);
    this.strokeArc(graphics, startX + 160, this.centerY, 90, -50, 50, false, 0.05); // penalty arc
    graphics.fillPoint(startX + 110, this.centerY, 6);

    // Right Penalty Area
    graphics.strokeRect(startX + this.pitchInnerWidth - 160, this.centerY - 180, 160, 360);
    graphics.strokeRect(startX + this.pitchInnerWidth - 60, this.centerY - 90, 60, 180);
    this.strokeArc(graphics, startX + this.pitchInnerWidth - 160, this.centerY, 90, 130, 230, false, 0.05);
    graphics.fillPoint(startX + this.pitchInnerWidth - 110, this.centerY, 6);

    // Corner arcs
    const r = 20;
    this.strokeArc(graphics, startX, startY, r, 0, 90, false, 0.05);
    this.strokeArc(graphics, startX + this.pitchInnerWidth, startY, r, 90, 180, false, 0.05);
    this.strokeArc(graphics, startX, startY + this.pitchInnerHeight, r, 270, 360, false, 0.05);
    this.strokeArc(graphics, startX + this.pitchInnerWidth, startY + this.pitchInnerHeight, r, 180, 270, false, 0.05);

    // 3. Draw Goals & White Net grids
    const drawGoal = (isLeft: boolean) => {
      const gX = isLeft ? startX - 30 : startX + this.pitchInnerWidth;
      const gY = this.centerY - 100;
      
      // Goal background shadow
      graphics.fillStyle(0x0b1329, 0.65);
      graphics.fillRect(gX, gY, 30, 200);

      // Goal post lines
      graphics.lineStyle(5, 0xffffff, 1.0);
      graphics.lineBetween(gX, gY, gX + 30, gY); // top post
      graphics.lineBetween(gX, gY + 200, gX + 30, gY + 200); // bottom post
      graphics.lineBetween(isLeft ? gX : gX + 30, gY, isLeft ? gX : gX + 30, gY + 200); // net-back post
      
      // Net netting grid
      graphics.lineStyle(1.5, 0xffffff, 0.35);
      const steps = 10;
      for (let i = 1; i < steps; i++) {
        const offset = (200 / steps) * i;
        graphics.lineBetween(gX, gY + offset, gX + 30, gY + offset);
      }
      for (let j = 1; j < 4; j++) {
        const xOffset = (30 / 4) * j;
        graphics.lineBetween(gX + xOffset, gY, gX + xOffset, gY + 200);
      }
    };

    drawGoal(true);
    drawGoal(false);
  }

  private drawSoccerBall() {
    this.ballGraphic.clear();
    
    // Outer circle
    this.ballGraphic.fillStyle(0xffffff, 1.0);
    this.ballGraphic.fillCircle(0, 0, 16);
    this.ballGraphic.lineStyle(1.5, 0x000000, 1.0);
    this.ballGraphic.strokeCircle(0, 0, 16);

    // Hexagonal leather panels
    this.ballGraphic.fillStyle(0x1e293b, 1.0); // slate-800
    
    // Center pentagon
    this.drawPentagon(0, 0, 5);

    // Outer lines to simulate sphere geometry
    this.ballGraphic.lineStyle(1.2, 0x000000, 0.85);
    const angles = [0, 72, 144, 216, 288];
    angles.forEach(ang => {
      const rad = Phaser.Math.DegToRad(ang);
      const radNext = Phaser.Math.DegToRad(ang + 36);
      
      // Lines connecting to outer edges
      const px = Math.cos(rad) * 5;
      const py = Math.sin(rad) * 5;
      const qx = Math.cos(rad) * 12;
      const qy = Math.sin(rad) * 12;
      const rx = Math.cos(radNext) * 16;
      const ry = Math.sin(radNext) * 16;

      this.ballGraphic.lineBetween(px, py, qx, qy);
      this.ballGraphic.lineBetween(qx, qy, rx, ry);
      
      // Little patch panel fills
      this.ballGraphic.beginPath();
      this.ballGraphic.moveTo(qx, qy);
      this.ballGraphic.lineTo(rx, ry);
      const radNextNext = Phaser.Math.DegToRad(ang - 36);
      this.ballGraphic.lineTo(Math.cos(radNextNext) * 16, Math.sin(radNextNext) * 16);
      this.ballGraphic.closePath();
      this.ballGraphic.fillPath();
    });
  }

  private drawPentagon(x: number, y: number, r: number) {
    this.ballGraphic.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = Phaser.Math.DegToRad(i * 72 - 90);
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) this.ballGraphic.moveTo(px, py);
      else this.ballGraphic.lineTo(px, py);
    }
    this.ballGraphic.closePath();
    this.ballGraphic.fillPath();
  }

  // --- PROCEDURAL ANIMATED PLAYERS CONTAINER ---
  private createPlayerContainer(isLocal: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(isLocal ? 800 : 1120, this.centerY);

    // Create procedural segments
    const legs = this.add.graphics();
    const torso = this.add.graphics();
    const head = this.add.graphics();
    const arms = this.add.graphics();

    container.add([legs, torso, head, arms]);

    // Store references on the container object for runtime animation
    (container as any).legs = legs;
    (container as any).torso = torso;
    (container as any).head = head;
    (container as any).arms = arms;
    (container as any).isLocal = isLocal;
    (container as any).jerseyColorHex = isLocal ? 0x74acdf : 0xfedf00;
    (container as any).shortsColorHex = isLocal ? 0xffffff : 0x009739;

    this.drawPlayerGraphics(container);

    return container;
  }

  private drawPlayerGraphics(player: Phaser.GameObjects.Container) {
    const isLocal = (player as any).isLocal;
    const jColor = (player as any).jerseyColorHex;
    const sColor = (player as any).shortsColorHex;

    const torso = (player as any).torso;
    const head = (player as any).head;

    torso.clear();
    head.clear();

    // 1. Draw Torso (Jersey + Team Accent)
    torso.fillStyle(jColor, 1.0);
    torso.fillCircle(0, -32, 14); // upper chest
    
    // Shorts
    torso.fillStyle(sColor, 1.0);
    torso.fillRect(-10, -22, 20, 10);
    torso.lineStyle(1.5, 0x000000, 1.0);
    torso.strokeRect(-10, -22, 20, 10);
    torso.strokeCircle(0, -32, 14);

    // Number on shirt (Local gets #10 Messi, Visitor gets #10 Neymar style)
    torso.lineStyle(1.5, 0xffffff, 0.7);
    torso.fillStyle(0xffffff, 1.0);
    // Visual soccer stripe detailing
    if (isLocal) {
      // Argentina stripes
      torso.fillStyle(0xffffff, 0.55);
      torso.fillRect(-5, -44, 4, 18);
      torso.fillRect(3, -44, 4, 18);
      torso.fillRect(-12, -38, 3, 10);
    } else {
      // Green neck trim
      torso.fillStyle(0x009739, 1.0);
      torso.fillCircle(0, -42, 4);
    }

    // 2. Draw Head (Skin + Hair)
    head.fillStyle(0xfbcfe8, 1.0); // skin
    head.fillCircle(0, -52, 8);
    head.lineStyle(1.5, 0x000000, 1.0);
    head.strokeCircle(0, -52, 8);
    
    // Hair
    head.fillStyle(isLocal ? 0x451a03 : 0x172554, 1.0); // Brunette vs Dark hair
    head.fillEllipse(0, -58, 8, 4);
    if (isLocal) {
      head.fillRect(-8, -58, 4, 6); // messi beard/sideburns
    }
  }

  private updateTeams(local: Team | null, visitor: Team | null) {
    if (local && this.playerLocal) {
      (this.playerLocal as any).jerseyColorHex = parseInt(local.jerseyColor.replace('#', '0x'), 16);
      (this.playerLocal as any).shortsColorHex = parseInt(local.secondaryColor.replace('#', '0x'), 16);
      this.drawPlayerGraphics(this.playerLocal);
    }
    if (visitor && this.playerVisitor) {
      (this.playerVisitor as any).jerseyColorHex = parseInt(visitor.jerseyColor.replace('#', '0x'), 16);
      (this.playerVisitor as any).shortsColorHex = parseInt(visitor.secondaryColor.replace('#', '0x'), 16);
      this.drawPlayerGraphics(this.playerVisitor);
    }
  }

  // --- STRIDE RUNNING ANIME ---
  private animatePlayers(time: number, _speed: number) {
    const matchState = useGameStore.getState().matchState;
    const isPlaying = matchState === 'playing';
    
    // Running speed factor
    const runCycle = time * (isPlaying ? 0.018 : 0.005);
    const swingAmp = isPlaying ? 35 : 10;
    const bounceAmp = isPlaying ? 4 : 1;

    // Set player visual targets: players hover around the ball
    // Local (Left) chases ball from left; Visitor (Right) chases ball from right
    let targetLocalX = this.currentBallX - 58;
    let targetVisitorX = this.currentBallX + 58;

    if (matchState === 'celebrating') {
      // Celebrating players cheer together
      targetLocalX = this.currentBallX - 100;
      targetVisitorX = this.currentBallX + 100;
    }

    this.playerLocal.x = Phaser.Math.Linear(this.playerLocal.x, targetLocalX, 0.12);
    this.playerVisitor.x = Phaser.Math.Linear(this.playerVisitor.x, targetVisitorX, 0.12);

    // Stride Bobbing (Y height bounce)
    const localBob = Math.sin(runCycle * 2) * bounceAmp;
    const visitorBob = Math.cos(runCycle * 2) * bounceAmp;

    this.playerLocal.y = Phaser.Math.Linear(this.playerLocal.y, this.centerY + this.playerLocalYTarget + localBob, 0.04);
    this.playerVisitor.y = Phaser.Math.Linear(this.playerVisitor.y, this.centerY + this.playerVisitorYTarget + visitorBob, 0.04);

    // Draw Legs swing
    const drawLegs = (player: Phaser.GameObjects.Container, cycle: number) => {
      const g = (player as any).legs;
      const sColor = (player as any).shortsColorHex;
      const skinColor = 0xfbcfe8;

      g.clear();
      g.lineStyle(6, skinColor, 1.0);

      const angle1 = Math.sin(cycle) * swingAmp;
      const angle2 = -Math.sin(cycle) * swingAmp;

      // Leg 1
      const rad1 = Phaser.Math.DegToRad(90 + angle1);
      const lx1 = Math.cos(rad1) * 20;
      const ly1 = -15 + Math.sin(rad1) * 20;
      g.lineBetween(0, -15, lx1, ly1);
      g.fillStyle(sColor, 1.0);
      g.fillCircle(lx1, ly1, 4); // shoe

      // Leg 2
      const rad2 = Phaser.Math.DegToRad(90 + angle2);
      const lx2 = Math.cos(rad2) * 20;
      const ly2 = -15 + Math.sin(rad2) * 20;
      g.lineBetween(0, -15, lx2, ly2);
      g.fillStyle(sColor, 1.0);
      g.fillCircle(lx2, ly2, 4); // shoe
    };

    // Draw Arms swing
    const drawArms = (player: Phaser.GameObjects.Container, cycle: number) => {
      const g = (player as any).arms;
      const skinColor = 0xfbcfe8;
      const jColor = (player as any).jerseyColorHex;

      g.clear();
      
      // Sleeves
      g.lineStyle(5, jColor, 1.0);
      const angle1 = -Math.sin(cycle) * swingAmp;
      const angle2 = Math.sin(cycle) * swingAmp;

      const rad1 = Phaser.Math.DegToRad(90 + angle1);
      const ax1 = Math.cos(rad1) * 16;
      const ay1 = -35 + Math.sin(rad1) * 16;
      g.lineBetween(0, -35, ax1, ay1);

      const rad2 = Phaser.Math.DegToRad(90 + angle2);
      const ax2 = Math.cos(rad2) * 16;
      const ay2 = -35 + Math.sin(rad2) * 16;
      g.lineBetween(0, -35, ax2, ay2);

      // Hands
      g.fillStyle(skinColor, 1.0);
      g.fillCircle(ax1, ay1, 3);
      g.fillCircle(ax2, ay2, 3);
    };

    drawLegs(this.playerLocal, runCycle);
    drawLegs(this.playerVisitor, runCycle + Math.PI); // offset cycle by 180 deg
    
    drawArms(this.playerLocal, runCycle);
    drawArms(this.playerVisitor, runCycle + Math.PI);

    const playerScale = parseFloat(useGameStore.getState().settings.player_scale || '100') / 100;
    // Flip X scale so they always face the ball
    this.playerLocal.setScale((this.playerLocal.x < this.currentBallX ? 1 : -1) * playerScale, playerScale);
    this.playerVisitor.setScale((this.playerVisitor.x < this.currentBallX ? 1 : -1) * playerScale, playerScale);
  }

  // --- CELEBRATIONS & PARTICLE PARTICULARS ---
  private triggerGoalCelebration() {
    this.cameras.main.zoomTo(1.15, 300, 'Quad.easeOut');
    this.cameras.main.shake(250, 0.015);

    // Actually read the scorer from the state in case of updates, we can also spawn fireworks at the scoring goal side!
    const side = this.currentBallX > 960 ? 'right' : 'left';
    const launchX = side === 'right' ? 1660 : 260;

    // Spawn 140 Confetti
    for (let i = 0; i < 140; i++) {
      const colors = [0xf59e0b, 0xef4444, 0x3b82f6, 0x10b981, 0xec4899, 0xffffff];
      const particle = this.add.graphics();
      particle.fillStyle(Phaser.Utils.Array.GetRandom(colors), 1.0);
      particle.fillRect(-4, -4, 8, 8);
      
      particle.x = Phaser.Math.Between(100, 1820);
      particle.y = Phaser.Math.Between(-80, -20);
      
      (particle as any).speedY = Phaser.Math.FloatBetween(2, 6);
      (particle as any).speedX = Phaser.Math.FloatBetween(-2, 2);
      (particle as any).spinSpeed = Phaser.Math.FloatBetween(-0.1, 0.1);
      (particle as any).decay = Phaser.Math.FloatBetween(0.001, 0.005);
      
      this.confettiParticles.push(particle);
    }

    // Spawn 4 fireworks
    for (let f = 0; f < 6; f++) {
      this.time.delayedCall(f * 400, () => {
        const fx = launchX + Phaser.Math.Between(-150, 150);
        const fy = this.centerY - Phaser.Math.Between(100, 300);
        const colors = [0xfbcfe8, 0xfde047, 0x86efac, 0x93c5fd, 0xffa500];
        const fireworkColor = Phaser.Utils.Array.GetRandom(colors);

        for (let i = 0; i < 50; i++) {
          const p = this.add.graphics();
          p.fillStyle(fireworkColor, 1.0);
          p.fillCircle(0, 0, 3);
          
          p.x = fx;
          p.y = fy;
          
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const speed = Phaser.Math.FloatBetween(2, 8);
          (p as any).vx = Math.cos(angle) * speed;
          (p as any).vy = Math.sin(angle) * speed;
          (p as any).alpha = 1.0;
          (p as any).gravity = 0.12;

          this.fireworkParticles.push(p);
        }
      });
    }
  }

  private giftParticles: any[] = [];

  private triggerGiftCelebration(action: any) {
    let diamonds = action.diamondCount || action.diamonds || 1;
    let team = action.teamSide || 'local'; // Uses backend's properly calculated teamSide
    
    // (Optional) We can still look up values to cap diamonds if needed, but backend gives correct team.
    // Local gifts are roughly left top, visitor gifts right top
    const spawnX = team === 'local' ? 250 : 1670;
    const spawnY = 180;
    const targetX = 960;
    const targetY = this.centerY;
    
    const numDiamonds = Math.min(diamonds, 200); // cap particles
    
    for (let i = 0; i < numDiamonds; i++) {
      this.time.delayedCall(Math.random() * 800, () => {
        const p = this.add.graphics();
        p.fillStyle(0x06b6d4, 1.0); // Cyan
        p.lineStyle(1.5, 0xffffff, 0.9);
        
        // Draw diamond shape (Doubled size)
        p.beginPath();
        p.moveTo(0, -20);
        p.lineTo(16, 0);
        p.lineTo(0, 20);
        p.lineTo(-16, 0);
        p.closePath();
        p.fillPath();
        p.strokePath();
        
        p.x = spawnX + Phaser.Math.Between(-60, 60);
        p.y = spawnY + Phaser.Math.Between(-40, 40);
        
        (p as any).vx = Phaser.Math.FloatBetween(-6, 6);
        (p as any).vy = Phaser.Math.FloatBetween(-8, -2);
        (p as any).targetX = targetX + Phaser.Math.Between(-150, 150);
        (p as any).targetY = targetY + Phaser.Math.Between(-80, 80);
        (p as any).spinSpeed = Phaser.Math.FloatBetween(-0.4, 0.4);
        
        this.giftParticles.push(p);
      });
    }
  }

  private triggerLikeCelebration(count: number) {
    const numSparks = Math.min(count, 500); // cap to 500 sparks to avoid lag
    const colors = [0xffffff, 0xfde047, 0xfcd34d, 0xfef08a];

    for (let i = 0; i < numSparks; i++) {
      const p = this.add.graphics();
      p.fillStyle(Phaser.Utils.Array.GetRandom(colors), 1.0);
      
      // Draw a small heart or star for likes
      p.fillCircle(0, 0, Phaser.Math.Between(3, 6));
      
      // Spawn around the center or randomly on the pitch
      p.x = Phaser.Math.Between(400, 1520);
      p.y = Phaser.Math.Between(this.centerY - 200, this.centerY + 200);
      
      (p as any).vy = Phaser.Math.FloatBetween(-6, -2);
      (p as any).vx = Phaser.Math.FloatBetween(-2, 2);
      (p as any).alpha = 1.0;
      (p as any).decay = Phaser.Math.FloatBetween(0.01, 0.03);
      (p as any).scale = 1.0;
      
      this.likeParticles.push(p);
    }
  }

  private updateParticles() {
    // 1. Confetti
    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i];
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.spinSpeed;
      p.alpha -= p.decay || 0.002;

      if (p.y > 1100 || p.alpha <= 0) {
        p.destroy();
        this.confettiParticles.splice(i, 1);
      }
    }

    // 2. Fireworks
    for (let j = this.fireworkParticles.length - 1; j >= 0; j--) {
      const p = this.fireworkParticles[j];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity; // drop gravity
      p.alpha -= 0.025;
      p.setScale(p.alpha);

      if (p.alpha <= 0) {
        p.destroy();
        this.fireworkParticles.splice(j, 1);
      }
    }

    // 3. Like Particles
    for (let k = this.likeParticles.length - 1; k >= 0; k--) {
      const p = this.likeParticles[k];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.scale -= p.decay;
      p.setScale(p.scale);

      if (p.alpha <= 0) {
        p.destroy();
        this.likeParticles.splice(k, 1);
      }
    }

    // 4. Gift Diamonds
    for (let l = this.giftParticles.length - 1; l >= 0; l--) {
      const p = this.giftParticles[l];
      
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 30) {
        p.x += (dx / dist) * 14 + p.vx;
        p.y += (dy / dist) * 14 + p.vy;
        p.vx *= 0.85;
        p.vy *= 0.85;
      } else {
        p.alpha -= 0.04;
      }
      
      p.rotation += p.spinSpeed;
      
      if (p.alpha <= 0) {
        p.destroy();
        this.giftParticles.splice(l, 1);
      }
    }
  }

  private strokeArc(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise: boolean, overshoot: number = 0) {
    graphics.beginPath();
    graphics.arc(
      x,
      y,
      radius,
      Phaser.Math.DegToRad(startAngle),
      Phaser.Math.DegToRad(endAngle),
      anticlockwise,
      overshoot
    );
    graphics.strokePath();
  }
}
