import { Game } from './core/Game.js';
import { GameLoop } from './core/GameLoop.js';
import { Renderer } from './rendering/Renderer.js';
import { InputHandler } from './input/InputHandler.js';
import { HUD } from './ui/HUD.js';
import { defaultMap } from './data/maps/default.js';

// Main entry point
async function init() {
    // Get canvas element
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    
    // Initialize game
    const game = new Game(canvas);
    
    // Wait for images to load
    await game.loadImages();
    
    // Load map/scenario configuration
    game.loadMap(defaultMap);
    
    // Initialize systems
    const renderer = new Renderer(game.ctx);
    const hud = new HUD(game);
    const inputHandler = new InputHandler(game, hud);
    const gameLoop = new GameLoop(game, renderer);
    
    // Start game loop
    gameLoop.start();
}

// Start the game when page loads
window.addEventListener('load', init);
