import { Config } from './Config.js';

// Game loop manager
export class GameLoop {
    constructor(game, renderer) {
        this.game = game;
        this.renderer = renderer;
        this.isRunning = false;
        this.animationFrameId = null;
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.loop();
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
    
    loop() {
        if (!this.isRunning) return;
        
        // Calculate FPS
        const currentTime = performance.now();
        this.game.frameCount++;
        if (currentTime >= this.game.lastTime + Config.fpsUpdateInterval) {
            this.game.fps = this.game.frameCount;
            this.game.frameCount = 0;
            this.game.lastTime = currentTime;
        }
        
        // Update game state
        this.game.update();
        
        // Render
        this.renderer.render(this.game);
        
        // Continue loop
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}
