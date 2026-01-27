import { Unit } from './Unit.js';
import { Config } from '../core/Config.js';

// Caveman unit class - extends Unit
export class Caveman extends Unit {
    constructor(gridX, gridY, faction = 'red', spatialGrid, imageLoader = null) {
        super(gridX, gridY, faction, spatialGrid, imageLoader);
        
        // Override unit type
        this.unitType = 'caveman';
        
        // Apply caveman-specific stats from config
        const stats = Config.unitTypes.caveman;
        this.health = stats.health;
        this.maxHealth = stats.maxHealth;
        this.attackRange = stats.attackRange;
        this.attackRate = stats.attackRate;
        this.speed = stats.speed;
    }
}
