import { Config } from '../core/Config.js';

// Projectile (stone) entity class
export class Projectile {
    constructor(x, y, targetX, targetY, faction, spatialGrid) {
        this.x = x;
        this.y = y;
        this.faction = faction;
        this.spatialGrid = spatialGrid;
        this.speed = Config.unitSpeed * 2; // Double the unit speed
        this.damage = 1;
        this.size = 1; // 1x1 cell
        
        // Calculate direction to target
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.velocityX = (dx / distance) * this.speed * spatialGrid.cellWidth;
            this.velocityY = (dy / distance) * this.speed * spatialGrid.cellHeight;
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }
        
        this.active = true;
    }
    
    update() {
        if (!this.active) return;
        
        // Move projectile
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Check bounds
        if (this.x < 0 || this.x > this.spatialGrid.gridWidth * this.spatialGrid.cellWidth ||
            this.y < 0 || this.y > this.spatialGrid.gridHeight * this.spatialGrid.cellHeight) {
            this.active = false;
            return;
        }
        
        // Check collision with units
        const gridPos = this.spatialGrid.pixelToGrid(this.x, this.y);
        
        // Check nearby cells for units (projectile might be between cells)
        const checkRadius = 1;
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                const checkX = gridPos.x + dx;
                const checkY = gridPos.y + dy;
                
                if (checkX >= 0 && checkX < this.spatialGrid.gridWidth &&
                    checkY >= 0 && checkY < this.spatialGrid.gridHeight) {
                    const units = this.spatialGrid.getUnitsAt(checkX, checkY);
                    
                    for (let unit of units) {
                        // Only hit enemy units that are alive
                        if (unit.faction !== this.faction && unit.isAlive && unit.isAlive()) {
                            // Check if projectile is within unit's 2x2 area
                            const unitPixelX = unit.gridX * this.spatialGrid.cellWidth;
                            const unitPixelY = unit.gridY * this.spatialGrid.cellHeight;
                            const unitWidth = this.spatialGrid.cellWidth * 2;
                            const unitHeight = this.spatialGrid.cellHeight * 2;
                            
                            if (this.x >= unitPixelX && this.x < unitPixelX + unitWidth &&
                                this.y >= unitPixelY && this.y < unitPixelY + unitHeight) {
                                
                                // Hit! Deal damage
                                unit.takeDamage(this.damage);
                                this.active = false;
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
    
    draw(ctx, cellWidth, cellHeight) {
        if (!this.active) return;
        
        // Color based on faction
        if (this.faction === 'red') {
            ctx.fillStyle = '#cc0000';
            ctx.strokeStyle = '#990000';
        } else {
            ctx.fillStyle = '#0000cc';
            ctx.strokeStyle = '#000099';
        }
        
        // Draw stone as a small circle at actual pixel position
        ctx.beginPath();
        ctx.arc(this.x, this.y, cellWidth * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
