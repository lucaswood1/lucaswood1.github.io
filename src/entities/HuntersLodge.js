import { Building } from './Building.js';
import { Config } from '../core/Config.js';
import { UnitFactory } from './UnitFactory.js';

// Hunter's Lodge - can only train hunters
export class HuntersLodge extends Building {
    constructor(gridX, gridY, faction = 'red', spatialGrid) {
        super(gridX, gridY, faction, spatialGrid);
        
        // Override building config reference
        this.buildingType = 'huntersLodge';
        
        // Update size and times to use huntersLodge config
        const buildingConfig = Config.buildings.huntersLodge;
        this.size = buildingConfig.size;
        this.trainingTime = Config.targetFPS * buildingConfig.trainingTime;
        this.constructionTime = Config.targetFPS * buildingConfig.constructionTime;
    }
    
    /**
     * Override canTrain to only allow hunter unit type
     */
    canTrain(unitType, gems) {
        // Only allow training hunters
        if (unitType !== 'hunter') {
            return false;
        }
        
        // Check if player has enough gems
        const cost = UnitFactory.getUnitCost(unitType);
        return gems >= cost;
    }
    
    /**
     * Override queueTraining to ensure only hunters can be queued
     */
    queueTraining(unitType = 'hunter') {
        // Force unitType to be hunter if something else is passed
        if (unitType !== 'hunter') {
            return false;
        }
        
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
    
    /**
     * Override update to use huntersLodge config for construction and training
     */
    update(units, gems, spendGemsCallback, imageLoader = null) {
        this.setGems(gems);
        const buildingConfig = Config.buildings.huntersLodge;
        
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
                const trainingDurationMs = buildingConfig.trainingTime * 1000; // Convert to milliseconds
                this.trainingProgress = Math.min(elapsed / trainingDurationMs, 1);
                
                // Training complete
                if (this.trainingProgress >= 1) {
                    const unitType = this.currentTraining.unitType || 'hunter';
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
}
