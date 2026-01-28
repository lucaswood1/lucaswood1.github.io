import { Config } from '../core/Config.js';
import { Projectile } from './Projectile.js';

// Unit entity class
export class Unit {
    constructor(gridX, gridY, faction = 'red', spatialGrid, imageLoader = null) {
        // Store grid position
        this.gridX = gridX;
        this.gridY = gridY;
        
        // Convert to pixel position (center of 2x2 cell area)
        const pixelPos = spatialGrid.gridToPixel(gridX, gridY);
        this.x = pixelPos.x;
        this.y = pixelPos.y;
        
        this.faction = faction; // 'red' or 'blue'
        this.selected = false;
        this.targetGridX = gridX;
        this.targetGridY = gridY;
        this.targetX = this.x;
        this.targetY = this.y;
        this.speed = Config.unitSpeed;
        this.id = Math.random().toString(36).substr(2, 9);
        this.spatialGrid = spatialGrid;
        this.imageLoader = imageLoader;
        this.unitType = 'caveman'; // Unit type identifier (can be overridden by subclasses)

        // Movement animation (hop) state
        this.spawnTimeMs = performance.now();
        this.isMoving = false;
        // Stable per-unit phase offset so groups don't hop in sync
        this.hopPhase01 = Unit.hash01(this.id);
        
        // Combat properties (default values - can be overridden by subclasses)
        this.health = 10;
        this.maxHealth = 10;
        this.attackRange = 20; // Grid cells
        this.attackCooldown = 0; // Frames until can attack again
        this.attackRate = Config.targetFPS; // Frames per attack (1 per second)
        
        // Add to spatial grid
        this.spatialGrid.addUnit(this);
    }

    static hash01(str) {
        // Simple deterministic string hash -> [0, 1)
        // (Not cryptographic; just for stable animation phase.)
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        // Convert to unsigned and normalize
        return ((h >>> 0) % 1000000) / 1000000;
    }

    getHopOffsetPx(cellHeight) {
        if (!this.isMoving) return 0;

        // Tune these for feel
        const periodMs = 420; // hop cadence
        const amplitudePx = 3; // hop height in pixels
        const phaseMs = this.hopPhase01 * periodMs;

        const t = (performance.now() - this.spawnTimeMs + phaseMs) / periodMs;
        // Only hop upwards (positive half-wave), with a little easing
        const wave = Math.sin(t * Math.PI * 2);
        const up = Math.max(0, wave);
        const eased = Math.pow(up, 1.6);

        // Negative Y lifts up on canvas
        return -amplitudePx * eased;
    }

    update(projectiles, terrainMap = null) {
        // Check if unit is dead
        if (this.health <= 0) {
            return;
        }
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // Check for enemies in range and attack
        this.checkAndAttack(projectiles);
        
        // Only check for collisions if we're trying to move to a new position
        const currentGridPos = this.spatialGrid.pixelToGrid(this.x, this.y);
        const isAtTarget = (currentGridPos.x === this.targetGridX && currentGridPos.y === this.targetGridY);
        
        // If we're not at target and target is occupied, try to find alternative
        if (!isAtTarget && this.spatialGrid.isOccupied(this.targetGridX, this.targetGridY, this)) {
            const targetPixel = this.spatialGrid.gridToPixel(this.targetGridX, this.targetGridY);
            const distToTarget = Math.sqrt(
                Math.pow(this.x - targetPixel.x, 2) + 
                Math.pow(this.y - targetPixel.y, 2)
            );
            
            // Only find alternative if we're within 2 cells of target
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

        // Apply collision avoidance with nearby units (stronger push to prevent overlap)
        const nearbyUnits = this.spatialGrid.getNearbyUnits(this.gridX, this.gridY, 3, this);
        let avoidanceX = 0;
        let avoidanceY = 0;
        
        for (let otherUnit of nearbyUnits) {
            const dx = this.gridX - otherUnit.gridX;
            const dy = this.gridY - otherUnit.gridY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 4) {
                // Push away from nearby units (stronger when very close)
                const strength = (4 - distance) / 4;
                avoidanceX += (dx / distance) * strength;
                avoidanceY += (dy / distance) * strength;
            }
        }

        // Move towards target grid position
        const targetPixel = this.spatialGrid.gridToPixel(this.targetGridX, this.targetGridY);
        this.targetX = targetPixel.x;
        this.targetY = targetPixel.y;
        
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.isMoving = distance > 0.5;

        // Apply avoidance force (stronger to prevent overlap)
        if (Math.abs(avoidanceX) > 0.01 || Math.abs(avoidanceY) > 0.01) {
            const avoidanceMag = Math.sqrt(avoidanceX * avoidanceX + avoidanceY * avoidanceY);
            if (avoidanceMag > 0) {
                // Blend avoidance with movement direction (stronger blend)
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
                // Calculate proposed new position with terrain speed penalty
                const effectiveSpeed = this.speed * speedMultiplier;
                const newX = this.x + (dx / moveDistance) * effectiveSpeed * this.spatialGrid.cellWidth;
                const newY = this.y + (dy / moveDistance) * effectiveSpeed * this.spatialGrid.cellHeight;
                
                // Check if the new position would cause a collision
                const newGridPos = this.spatialGrid.pixelToGrid(newX, newY);
                
                // Only move if the new grid position is not occupied (or is our current position)
                if (newGridPos.x === this.gridX && newGridPos.y === this.gridY) {
                    // Moving within same cell - allow it
                    this.x = newX;
                    this.y = newY;
                } else if (!this.spatialGrid.isOccupied(newGridPos.x, newGridPos.y, this)) {
                    // New cell is free - allow movement
                    this.x = newX;
                    this.y = newY;
                } else {
                    // Blocked - try to find alternative nearby position
                    const freePos = this.spatialGrid.findNearestFreePosition(
                        newGridPos.x, 
                        newGridPos.y, 
                        this,
                        2
                    );
                    
                    if (freePos && (freePos.x !== this.gridX || freePos.y !== this.gridY)) {
                        // Move towards the free position instead
                        const freePixel = this.spatialGrid.gridToPixel(freePos.x, freePos.y);
                        const freeDx = freePixel.x - this.x;
                        const freeDy = freePixel.y - this.y;
                        const freeDist = Math.sqrt(freeDx * freeDx + freeDy * freeDy);
                        
                        if (freeDist > 0) {
                            this.x += (freeDx / freeDist) * this.speed * this.spatialGrid.cellWidth * 0.5;
                            this.y += (freeDy / freeDist) * this.speed * this.spatialGrid.cellHeight * 0.5;
                        }
                    }
                    // If no free position found, unit stays put (blocked)
                }
            }
        } else {
            this.isMoving = false;
            // Snap to grid position when close enough, but check for collisions first
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

    draw(ctx, cellWidth, cellHeight) {
        if (!this.isAlive()) return;
        
        const pixelX = this.gridX * cellWidth;
        const hopY = this.getHopOffsetPx(cellHeight);
        const pixelY = this.gridY * cellHeight + hopY;
        const width = cellWidth * Config.unitSize;
        const height = cellHeight * Config.unitSize;
        
        // Try to draw SVG image if available
        // Use unitType to determine which image to load
        const imageName = this.unitType || 'caveman';
        // Use UnitFactory to get the correct image name for the unit type
        const unitImage = this.imageLoader ? this.imageLoader.getImage(imageName) : null;
        
        if (unitImage && unitImage.complete) {
            // Save context state
            ctx.save();
            
            // Draw the SVG image
            ctx.drawImage(unitImage, pixelX, pixelY, width, height);
            
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
                ctx.fillStyle = '#ff9999';
                ctx.strokeStyle = '#cc0000';
            } else {
                ctx.fillStyle = '#9999ff';
                ctx.strokeStyle = '#0000cc';
            }
            
            ctx.fillRect(pixelX, pixelY, width, height);
            ctx.lineWidth = 2;
            ctx.strokeRect(pixelX, pixelY, width, height);
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

    containsPoint(x, y) {
        const gridPos = this.spatialGrid.pixelToGrid(x, y);
        return gridPos.x >= this.gridX && gridPos.x < this.gridX + 2 &&
               gridPos.y >= this.gridY && gridPos.y < this.gridY + 2;
    }

    moveToGrid(gridX, gridY) {
        // Clamp to valid grid bounds (accounting for 2x2 size)
        const maxX = Math.floor(this.spatialGrid.gridWidth / Config.unitSize) * Config.unitSize - Config.unitSize;
        const maxY = Math.floor(this.spatialGrid.gridHeight / Config.unitSize) * Config.unitSize - Config.unitSize;
        
        gridX = Math.max(0, Math.min(gridX, maxX));
        gridY = Math.max(0, Math.min(gridY, maxY));
        
        // Only check for alternative if target is occupied
        // But allow movement anyway - collision avoidance will handle it
        if (this.spatialGrid.isOccupied(gridX, gridY, this)) {
            const freePos = this.spatialGrid.findNearestFreePosition(gridX, gridY, this, 3);
            if (freePos) {
                gridX = freePos.x;
                gridY = freePos.y;
            }
            // Even if no free position found, still set target - unit will try to get close
        }
        
        this.targetGridX = gridX;
        this.targetGridY = gridY;
    }

    moveTo(x, y) {
        // Convert pixel coordinates to grid coordinates
        const gridPos = this.spatialGrid.pixelToGrid(x, y);
        // Adjust to top-left of 2x2 area
        this.moveToGrid(gridPos.x, gridPos.y);
    }
    
    checkAndAttack(projectiles) {
        // Find nearby enemy units
        const nearbyUnits = this.spatialGrid.getNearbyUnits(this.gridX, this.gridY, this.attackRange, this);
        const enemies = nearbyUnits.filter(unit => unit.faction !== this.faction && unit.health > 0);
        
        if (enemies.length > 0 && this.attackCooldown === 0) {
            // Attack the closest enemy
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            for (let enemy of enemies) {
                const dx = enemy.gridX - this.gridX;
                const dy = enemy.gridY - this.gridY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance && distance <= this.attackRange) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
            
            if (closestEnemy) {
                // Throw a stone at the enemy
                const enemyPixel = this.spatialGrid.gridToPixel(closestEnemy.gridX, closestEnemy.gridY);
                const projectile = new Projectile(
                    this.x,
                    this.y,
                    enemyPixel.x,
                    enemyPixel.y,
                    this.faction,
                    this.spatialGrid
                );
                projectiles.push(projectile);
                this.attackCooldown = this.attackRate;
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            // Remove from spatial grid when dead
            this.spatialGrid.removeUnit(this);
        }
    }
    
    isAlive() {
        return this.health > 0;
    }
}
