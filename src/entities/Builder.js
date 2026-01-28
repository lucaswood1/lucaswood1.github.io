import { Config } from '../core/Config.js';
import { Unit } from './Unit.js';

// Builder unit class - extends Unit functionality
export class Builder extends Unit {
    constructor(gridX, gridY, faction = 'red', spatialGrid, imageLoader = null) {
        // Call parent constructor
        super(gridX, gridY, faction, spatialGrid, imageLoader);
        
        // Builder-specific properties
        this.unitType = 'builder';
        
        // Apply builder-specific stats from config
        const stats = Config.unitTypes.builder;
        this.health = stats.health;
        this.maxHealth = stats.maxHealth;
        this.attackRange = stats.attackRange; // 0 - builders don't attack
        this.attackRate = stats.attackRate;
        this.speed = stats.speed;
        this.buildRange = stats.buildRange; // Must be within 2 cells to build
        
        // Builder-specific state
        this.buildTarget = null; // Building being constructed
    }
    
    draw(ctx, cellWidth, cellHeight) {
        if (!this.isAlive()) return;
        
        const pixelX = this.gridX * cellWidth;
        const hopY = this.getHopOffsetPx(cellHeight);
        const pixelY = this.gridY * cellHeight + hopY;
        const width = cellWidth * Config.unitSize;
        const height = cellHeight * Config.unitSize;
        
        // Try to draw builder SVG image if available
        const builderImage = this.imageLoader ? this.imageLoader.getImage('builder') : null;
        
        if (builderImage && builderImage.complete) {
            // Save context state
            ctx.save();
            
            // Draw the SVG image
            ctx.drawImage(builderImage, pixelX, pixelY, width, height);
            
            // Apply faction color overlay
            ctx.globalCompositeOperation = 'multiply';
            if (this.faction === 'red') {
                ctx.fillStyle = 'rgba(255, 153, 153, 0.5)'; // Red tint
            } else {
                ctx.fillStyle = 'rgba(153, 153, 255, 0.5)'; // Blue tint
            }
            ctx.fillRect(pixelX, pixelY, width, height);
            ctx.globalCompositeOperation = 'source-over';
            
            // Restore context
            ctx.restore();
        } else {
            // Fallback to rectangle if image not loaded
            if (this.faction === 'red') {
                ctx.fillStyle = '#ffcc99';
                ctx.strokeStyle = '#cc6600';
            } else {
                ctx.fillStyle = '#99ccff';
                ctx.strokeStyle = '#0066cc';
            }
            
            ctx.fillRect(pixelX, pixelY, width, height);
            ctx.lineWidth = 2;
            ctx.strokeRect(pixelX, pixelY, width, height);
            
            // Draw "B" to indicate builder
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('B', pixelX + width / 2, pixelY + height / 2);
        }

        // Draw health bar
        const healthPercent = this.health / this.maxHealth;
        const barWidth = width;
        const barHeight = 3;
        const barX = pixelX;
        const barY = pixelY - 5;
        
        // Background (red)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health (green)
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Draw selection indicator
        if (this.selected) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(pixelX - 2, pixelY - 2, width + 4, height + 4);
        }
    }
    
    update(projectiles, terrainMap = null) {
        // Builders don't attack, but they do move and build
        if (this.health <= 0) {
            return;
        }
        
        // Handle building construction
        if (this.buildTarget) {
            const currentGridPos = this.spatialGrid.pixelToGrid(this.x, this.y);
            const buildCenterX = this.buildTarget.gridX + Math.floor(this.buildTarget.size / 2);
            const buildCenterY = this.buildTarget.gridY + Math.floor(this.buildTarget.size / 2);
            const dx = buildCenterX - currentGridPos.x;
            const dy = buildCenterY - currentGridPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if builder is close enough to build
            if (distance <= this.buildRange) {
                // Builder is at construction site, building will handle progress
                // Stop moving
                this.targetGridX = currentGridPos.x;
                this.targetGridY = currentGridPos.y;
            } else {
                // Move towards building site (bottom of building)
                this.moveToGrid(
                    buildCenterX,
                    this.buildTarget.gridY + this.buildTarget.size
                );
            }
        }
        
        // Call parent update for movement (but skip combat)
        // We'll override the combat part
        const currentGridPos = this.spatialGrid.pixelToGrid(this.x, this.y);
        const isAtTarget = (currentGridPos.x === this.targetGridX && currentGridPos.y === this.targetGridY);
        
        // Movement logic (same as parent)
        if (!isAtTarget && this.spatialGrid.isOccupied(this.targetGridX, this.targetGridY, this)) {
            const targetPixel = this.spatialGrid.gridToPixel(this.targetGridX, this.targetGridY);
            const distToTarget = Math.sqrt(
                Math.pow(this.x - targetPixel.x, 2) + 
                Math.pow(this.y - targetPixel.y, 2)
            );
            
            if (distToTarget < this.spatialGrid.cellWidth * 2) {
                const freePos = this.spatialGrid.findNearestFreePosition(
                    this.targetGridX, 
                    this.targetGridY, 
                    this,
                    3
                );
                
                if (freePos) {
                    this.targetGridX = freePos.x;
                    this.targetGridY = freePos.y;
                }
            }
        }

        // Collision avoidance
        const nearbyUnits = this.spatialGrid.getNearbyUnits(this.gridX, this.gridY, 3, this);
        let avoidanceX = 0;
        let avoidanceY = 0;
        
        for (let otherUnit of nearbyUnits) {
            const dx = this.gridX - otherUnit.gridX;
            const dy = this.gridY - otherUnit.gridY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 4) {
                const strength = (4 - distance) / 4;
                avoidanceX += (dx / distance) * strength;
                avoidanceY += (dy / distance) * strength;
            }
        }

        // Move towards target
        const targetPixel = this.spatialGrid.gridToPixel(this.targetGridX, this.targetGridY);
        this.targetX = targetPixel.x;
        this.targetY = targetPixel.y;
        
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.isMoving = distance > 0.5;

        if (Math.abs(avoidanceX) > 0.01 || Math.abs(avoidanceY) > 0.01) {
            const avoidanceMag = Math.sqrt(avoidanceX * avoidanceX + avoidanceY * avoidanceY);
            if (avoidanceMag > 0) {
                dx += (avoidanceX / avoidanceMag) * this.spatialGrid.cellWidth * 0.5;
                dy += (avoidanceY / avoidanceMag) * this.spatialGrid.cellHeight * 0.5;
            }
        }

        // Calculate terrain speed multiplier based on current position
        let speedMultiplier = 1.0;
        if (terrainMap) {
            const currentHeight = terrainMap.getHeight(currentGridPos.x, currentGridPos.y);
            speedMultiplier = terrainMap.getSpeedMultiplier(currentHeight);
        }

        if (distance > 0.5) {
            const moveDistance = Math.sqrt(dx * dx + dy * dy);
            if (moveDistance > 0) {
                // Apply terrain speed penalty
                const effectiveSpeed = this.speed * speedMultiplier;
                const newX = this.x + (dx / moveDistance) * effectiveSpeed * this.spatialGrid.cellWidth;
                const newY = this.y + (dy / moveDistance) * effectiveSpeed * this.spatialGrid.cellHeight;
                
                const newGridPos = this.spatialGrid.pixelToGrid(newX, newY);
                
                if (newGridPos.x === this.gridX && newGridPos.y === this.gridY) {
                    this.x = newX;
                    this.y = newY;
                } else if (!this.spatialGrid.isOccupied(newGridPos.x, newGridPos.y, this)) {
                    this.x = newX;
                    this.y = newY;
                } else {
                    const freePos = this.spatialGrid.findNearestFreePosition(
                        newGridPos.x, 
                        newGridPos.y, 
                        this,
                        2
                    );
                    
                    if (freePos && (freePos.x !== this.gridX || freePos.y !== this.gridY)) {
                        const freePixel = this.spatialGrid.gridToPixel(freePos.x, freePos.y);
                        const freeDx = freePixel.x - this.x;
                        const freeDy = freePixel.y - this.y;
                        const freeDist = Math.sqrt(freeDx * freeDx + freeDy * freeDy);
                        
                        if (freeDist > 0) {
                            // Apply terrain speed penalty
                            const effectiveSpeed = this.speed * speedMultiplier;
                            this.x += (freeDx / freeDist) * effectiveSpeed * this.spatialGrid.cellWidth * 0.5;
                            this.y += (freeDy / freeDist) * effectiveSpeed * this.spatialGrid.cellHeight * 0.5;
                        }
                    }
                }
            }
        } else {
            this.isMoving = false;
            const targetGridPos = this.spatialGrid.pixelToGrid(this.targetX, this.targetY);
            if (!this.spatialGrid.isOccupied(targetGridPos.x, targetGridPos.y, this) ||
                (targetGridPos.x === this.gridX && targetGridPos.y === this.gridY)) {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }
        
        // Update spatial grid
        this.spatialGrid.updateUnit(this);
    }
    
    assignBuildTarget(building) {
        this.buildTarget = building;
    }
    
    clearBuildTarget() {
        this.buildTarget = null;
    }
}
