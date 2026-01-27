import { Config } from '../core/Config.js';
import { UnitFactory } from './UnitFactory.js';

// Building entity class (training facility)
export class Building {
    constructor(gridX, gridY, faction = 'red', spatialGrid) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.faction = faction;
        this.spatialGrid = spatialGrid;
        
        // Get building config
        const buildingConfig = Config.buildings.trainingFacility;
        this.size = buildingConfig.size; // 10x10 cells (from config)
        
        // Convert to pixel position
        const pixelPos = spatialGrid.gridToPixel(gridX, gridY);
        this.x = pixelPos.x;
        this.y = pixelPos.y;
        
        // Training properties
        this.trainingQueue = [];
        this.currentTraining = null;
        this.trainingProgress = 0;
        this.trainingTime = Config.targetFPS * buildingConfig.trainingTime; // From config
        this.selected = false; // Building selection state
        
        // Construction properties
        this.isConstructing = false;
        this.constructionProgress = 0;
        this.constructionTime = Config.targetFPS * buildingConfig.constructionTime; // From config
        this.builders = []; // Builders assigned to this building
        this.isComplete = false;
        
        // Mark building cells as occupied
        this.occupyCells();
    }
    
    occupyCells() {
        // Mark all 10x10 cells as occupied by this building
        for (let dy = 0; dy < this.size; dy++) {
            for (let dx = 0; dx < this.size; dx++) {
                const x = this.gridX + dx;
                const y = this.gridY + dy;
                if (x < this.spatialGrid.gridWidth && y < this.spatialGrid.gridHeight) {
                    // Add building reference to cells (we'll need to update SpatialGrid)
                    // For now, we'll handle this in the game's building placement check
                }
            }
        }
    }
    
    canTrain(unitType, gems) {
        const cost = UnitFactory.getUnitCost(unitType);
        return gems >= cost;
    }
    
    queueTraining(unitType = 'caveman') {
        const cost = UnitFactory.getUnitCost(unitType);
        if (this.canTrain(unitType, this.getGems())) {
            this.trainingQueue.push({
                startTime: null,
                unitType: unitType,
                progress: 0
            });
            return true;
        }
        return false;
    }
    
    getGems() {
        // This will be set by the game
        return this._gems || 0;
    }
    
    setGems(gems) {
        this._gems = gems;
    }
    
    update(units, gems, spendGemsCallback, imageLoader = null) {
        this.setGems(gems);
        
        // Handle construction
        if (this.isConstructing && !this.isComplete) {
            // Check if builders are nearby
            let buildersNearby = 0;
            for (let builder of this.builders) {
                if (builder && builder.isAlive && builder.isAlive()) {
                    const builderGridPos = this.spatialGrid.pixelToGrid(builder.x, builder.y);
                    const buildCenterX = this.gridX + Math.floor(this.size / 2);
                    const buildCenterY = this.gridY + Math.floor(this.size / 2);
                    const dx = builderGridPos.x - buildCenterX;
                    const dy = builderGridPos.y - buildCenterY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= builder.buildRange) {
                        buildersNearby++;
                    }
                }
            }
            
            // Only progress construction if builders are nearby
            if (buildersNearby > 0) {
                const buildingConfig = Config.buildings.trainingFacility;
                const constructionDurationMs = buildingConfig.constructionTime * 1000;
                // Progress based on frame time (assuming 60 FPS)
                const frameTime = 1000 / Config.targetFPS;
                this.constructionProgress += frameTime / constructionDurationMs;
                this.constructionProgress = Math.min(this.constructionProgress, 1);
                
                // Construction complete
                if (this.constructionProgress >= 1) {
                    this.isComplete = true;
                    this.isConstructing = false;
                    // Clear builder assignments
                    for (let builder of this.builders) {
                        if (builder) {
                            builder.clearBuildTarget();
                        }
                    }
                    this.builders = [];
                }
            }
        }
        
        // Only train if building is complete
        if (this.isComplete) {
            // Start training if queue has items and nothing is currently training
            if (this.trainingQueue.length > 0 && !this.currentTraining) {
                const nextTraining = this.trainingQueue[0];
                const cost = UnitFactory.getUnitCost(nextTraining.unitType);
                if (gems >= cost) {
                    // Spend gems when training starts
                    if (spendGemsCallback && spendGemsCallback(cost)) {
                        this.currentTraining = this.trainingQueue.shift();
                        this.currentTraining.startTime = performance.now();
                        this.trainingProgress = 0;
                    }
                }
            }
            
            // Update current training
            if (this.currentTraining) {
                const elapsed = performance.now() - this.currentTraining.startTime;
                const buildingConfig = Config.buildings.trainingFacility;
                const trainingDurationMs = buildingConfig.trainingTime * 1000; // Convert to milliseconds
                this.trainingProgress = Math.min(elapsed / trainingDurationMs, 1);
                
                // Training complete
                if (this.trainingProgress >= 1) {
                    const unitType = this.currentTraining.unitType || 'caveman';
                    const spawnedUnit = this.spawnUnit(units, imageLoader, unitType);
                    this.currentTraining = null;
                    this.trainingProgress = 0;
                    // Return spawned unit so Game can handle it
                    return spawnedUnit;
                }
            }
        }
        return null;
    }
    
    spawnUnit(units, imageLoader = null, unitType = null) {
        // Use provided unitType or get from currentTraining
        if (!unitType && this.currentTraining) {
            unitType = this.currentTraining.unitType || 'caveman';
        }
        if (!unitType) return null;
        
        // Spawn unit at bottom of building
        const spawnX = this.gridX + Math.floor(this.size / 2);
        const spawnY = this.gridY + this.size; // Bottom of building
        
        // Check if spawn location is free, find alternative if needed
        let finalSpawnX = spawnX;
        let finalSpawnY = spawnY;
        
        if (this.spatialGrid.isOccupied(finalSpawnX, finalSpawnY)) {
            const freePos = this.spatialGrid.findNearestFreePosition(finalSpawnX, finalSpawnY, null, 5);
            if (freePos) {
                finalSpawnX = freePos.x;
                finalSpawnY = freePos.y;
            } else {
                // Can't spawn, skip
                return null;
            }
        }
        
        // Create unit using factory based on unit type
        const newUnit = UnitFactory.createUnit(unitType, finalSpawnX, finalSpawnY, this.faction, this.spatialGrid, imageLoader);
        
        // Add to appropriate array based on unit type
        if (unitType === 'builder') {
            // Builder will be added to builders array by Game
            return newUnit;
        } else {
            units.push(newUnit);
        }
        return newUnit;
    }
    
    draw(ctx, cellWidth, cellHeight) {
        const pixelX = this.gridX * cellWidth;
        const pixelY = this.gridY * cellHeight;
        const width = cellWidth * this.size;
        const height = cellHeight * this.size;
        
        // Color based on faction and construction state
        if (this.isConstructing && !this.isComplete) {
            // Under construction - gray/transparent
            ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            ctx.strokeStyle = '#666666';
        } else {
            if (this.faction === 'red') {
                ctx.fillStyle = '#cc6666';
                ctx.strokeStyle = '#990000';
            } else {
                ctx.fillStyle = '#6666cc';
                ctx.strokeStyle = '#000099';
            }
        }
        
        // Draw building
        ctx.fillRect(pixelX, pixelY, width, height);
        ctx.lineWidth = 3;
        ctx.strokeRect(pixelX, pixelY, width, height);
        
        // Draw construction progress bar
        if (this.isConstructing && !this.isComplete) {
            const barWidth = width * 0.8;
            const barHeight = 8;
            const barX = pixelX + width * 0.1;
            const barY = pixelY + height * 0.5;
            
            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Construction progress
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(barX, barY, barWidth * this.constructionProgress, barHeight);
            
            // Border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Building...', pixelX + width / 2, barY - 5);
        }
        
        // Draw training progress bar if training
        if (this.isComplete && this.currentTraining) {
            const barWidth = width * 0.8;
            const barHeight = 6;
            const barX = pixelX + width * 0.1;
            const barY = pixelY + height * 0.1;
            
            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Progress
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(barX, barY, barWidth * this.trainingProgress, barHeight);
            
            // Border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
    
    containsPoint(x, y) {
        const gridPos = this.spatialGrid.pixelToGrid(x, y);
        return gridPos.x >= this.gridX && gridPos.x < this.gridX + this.size &&
               gridPos.y >= this.gridY && gridPos.y < this.gridY + this.size;
    }
    
    getCells() {
        const cells = [];
        for (let dy = 0; dy < this.size; dy++) {
            for (let dx = 0; dx < this.size; dx++) {
                cells.push({
                    x: this.gridX + dx,
                    y: this.gridY + dy
                });
            }
        }
        return cells;
    }
}
