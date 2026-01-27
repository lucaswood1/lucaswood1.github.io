import { Config } from './Config.js';
import { SpatialGrid } from '../systems/SpatialGrid.js';
import { Unit } from '../entities/Unit.js';
import { Builder } from '../entities/Builder.js';
import { Projectile } from '../entities/Projectile.js';
import { Building } from '../entities/Building.js';
import { ImageLoader } from '../utils/ImageLoader.js';
import { MapLoader } from './MapLoader.js';

// Main game class
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = Config.canvasWidth;
        this.canvas.height = Config.canvasHeight;
        
        // Calculate cell dimensions
        this.cellWidth = this.canvas.width / Config.gridWidth;
        this.cellHeight = this.canvas.height / Config.gridHeight;
        
        // Initialize spatial grid
        this.spatialGrid = new SpatialGrid(
            Config.gridWidth, 
            Config.gridHeight, 
            this.cellWidth, 
            this.cellHeight
        );
        
        // Game state
        this.units = [];
        this.builders = [];
        this.selectedUnits = [];
        this.projectiles = [];
        this.buildings = [];
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
        
        // Resources
        this.gems = Config.startingGems; // Starting gems
        
        // Building placement
        this.buildingPlacementMode = false;
        this.pendingBuilding = null;
        
        // Performance tracking
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        // Image loader
        this.imageLoader = new ImageLoader();
        this.loadImages();
    }
    
    async loadImages() {
        try {
            await this.imageLoader.loadImage('caveman', 'assets/images/caveman.svg');
            await this.imageLoader.loadImage('builder', 'assets/images/builder.svg');
            await this.imageLoader.loadImage('worker', 'assets/images/worker.svg');
            await this.imageLoader.loadImage('miner', 'assets/images/miner.svg');
            await this.imageLoader.loadImage('hunter', 'assets/images/hunter.svg');
        } catch (error) {
            console.error('Failed to load images:', error);
        }
    }
    
    getImageLoader() {
        return this.imageLoader;
    }
    
    /**
     * Load initial game state from a map configuration
     * @param {Object} mapConfig - Map configuration object (from maps/*.js files)
     */
    loadMap(mapConfig) {
        MapLoader.loadMap(this, mapConfig);
    }
    
    // Legacy methods - kept for backward compatibility but deprecated
    // Use loadMap() instead
    createUnits() {
        // This method is deprecated - use loadMap() instead
        console.warn('createUnits() is deprecated. Use loadMap() instead.');
    }
    
    createInitialBuildings() {
        // This method is deprecated - use loadMap() instead
        console.warn('createInitialBuildings() is deprecated. Use loadMap() instead.');
    }
    
    createInitialBuilders() {
        // This method is deprecated - use loadMap() instead
        console.warn('createInitialBuilders() is deprecated. Use loadMap() instead.');
    }
    
    getAllUnits() {
        // Return both regular units and builders
        return [...this.units, ...this.builders];
    }
    
    getBuilders() {
        return this.builders;
    }
    
    getSelectedBuilders() {
        return this.selectedUnits.filter(u => u.unitType === 'builder');
    }
    
    canPlaceBuilding(gridX, gridY, size) {
        // Check bounds
        if (gridX < 0 || gridY < 0 || 
            gridX + size > Config.gridWidth || 
            gridY + size > Config.gridHeight) {
            return false;
        }
        
        // Check if cells are occupied by units or other buildings
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const x = gridX + dx;
                const y = gridY + dy;
                
                // Check spatial grid for units
                if (this.spatialGrid.isOccupied(x, y)) {
                    return false;
                }
                
                // Check if overlapping with existing buildings
                for (let building of this.buildings) {
                    if (x >= building.gridX && x < building.gridX + building.size &&
                        y >= building.gridY && y < building.gridY + building.size) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    placeBuilding(gridX, gridY, faction) {
        const buildingConfig = Config.buildings.trainingFacility;
        const buildingSize = buildingConfig.size;
        if (this.canPlaceBuilding(gridX, gridY, buildingSize)) {
            const building = new Building(gridX, gridY, faction, this.spatialGrid);
            this.buildings.push(building);
            return building;
        }
        return null;
    }
    
    getBuildings() {
        return this.buildings;
    }
    
    getGems() {
        return this.gems;
    }
    
    spendGems(amount) {
        if (this.gems >= amount) {
            this.gems -= amount;
            return true;
        }
        return false;
    }
    
    update() {
        // Update buildings (training and construction)
        for (let building of this.buildings) {
            const spawnedUnit = building.update(this.units, this.gems, (amount) => this.spendGems(amount), this.imageLoader);
            
            // Handle unit spawning - add builders to builders array
            if (spawnedUnit && spawnedUnit.unitType === 'builder') {
                if (!this.builders.includes(spawnedUnit)) {
                    this.builders.push(spawnedUnit);
                }
            }
        }
        
        // Update builders
        for (let builder of this.builders) {
            if (builder.isAlive && builder.isAlive()) {
                builder.update(this.projectiles);
            }
        }
        
        // Update units (pass projectiles array for combat)
        for (let unit of this.units) {
            if (unit.isAlive && unit.isAlive()) {
                unit.update(this.projectiles);
            }
        }
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (projectile.active) {
                projectile.update();
            }
            
            // Remove inactive projectiles
            if (!projectile.active) {
                this.projectiles.splice(i, 1);
            }
        }
        
        // Remove dead units and clean up spatial grid
        for (let i = this.units.length - 1; i >= 0; i--) {
            const unit = this.units[i];
            if (!unit.isAlive || !unit.isAlive()) {
                // Remove from spatial grid
                this.spatialGrid.removeUnit(unit);
                this.units.splice(i, 1);
            }
        }
        
        // Remove dead builders
        for (let i = this.builders.length - 1; i >= 0; i--) {
            const builder = this.builders[i];
            if (!builder.isAlive || !builder.isAlive()) {
                // Clear build target if assigned
                if (builder.buildTarget) {
                    const building = builder.buildTarget;
                    const index = building.builders.indexOf(builder);
                    if (index > -1) {
                        building.builders.splice(index, 1);
                    }
                }
                this.spatialGrid.removeUnit(builder);
                this.builders.splice(i, 1);
            }
        }
        
        // Update selected units to remove dead ones
        this.selectedUnits = this.selectedUnits.filter(unit => unit.isAlive && unit.isAlive());
    }
    
    startBuildingPlacement() {
        const buildingConfig = Config.buildings.trainingFacility;
        if (this.gems >= buildingConfig.cost) {
            this.buildingPlacementMode = true;
            return true;
        }
        return false;
    }
    
    cancelBuildingPlacement() {
        this.buildingPlacementMode = false;
        this.pendingBuilding = null;
    }
    
    placeBuildingAt(gridX, gridY, faction) {
        if (!this.buildingPlacementMode) return null;
        
        const buildingConfig = Config.buildings.trainingFacility;
        const buildingSize = buildingConfig.size;
        if (!this.canPlaceBuilding(gridX, gridY, buildingSize)) {
            return null;
        }
        
        // Spend gems first
        if (!this.spendGems(Config.buildingCost)) {
            return null;
        }
        
        // Create building
        const building = new Building(gridX, gridY, faction, this.spatialGrid);
        
        // Start construction
        building.isConstructing = true;
        building.isComplete = false;
        building.constructionProgress = 0;
        
        // Assign builders to construction
        const selectedBuilders = this.getSelectedBuilders();
        for (let builder of selectedBuilders) {
            if (builder.faction === faction && builder.isAlive && builder.isAlive()) {
                builder.assignBuildTarget(building);
                building.builders.push(builder);
            }
        }
        
        this.buildings.push(building);
        this.buildingPlacementMode = false;
        this.pendingBuilding = null;
        return building;
    }
    
    trainUnit(building, unitType = 'caveman') {
        if (building && building.canTrain(unitType, this.gems)) {
            return building.queueTraining(unitType);
        }
        return false;
    }
    
    getSelectedBuilding() {
        // Return the first selected building, if any
        for (let building of this.buildings) {
            if (building.selected) {
                return building;
            }
        }
        return null;
    }
    
    selectBuilding(building) {
        // Deselect all buildings first
        for (let b of this.buildings) {
            b.selected = false;
        }
        // Select this building (or deselect if null)
        if (building) {
            building.selected = true;
        }
    }
    
    getImageLoader() {
        return this.imageLoader;
    }
    
    getProjectiles() {
        return this.projectiles;
    }
    
    getUnits() {
        return this.units;
    }
    
    getSelectedUnits() {
        return this.selectedUnits;
    }
    
    deselectAll() {
        const allUnits = this.getAllUnits();
        for (let unit of allUnits) {
            unit.selected = false;
        }
        this.selectedUnits = [];
    }
    
    selectUnit(unit, addToSelection = false) {
        if (!addToSelection) {
            this.deselectAll();
        }
        unit.selected = true;
        if (!this.selectedUnits.includes(unit)) {
            this.selectedUnits.push(unit);
        }
    }
    
    selectUnitsInBox(minX, minY, maxX, maxY, addToSelection = false) {
        if (!addToSelection) {
            this.deselectAll();
        }
        
        // Select from all units (regular units and builders)
        const allUnits = this.getAllUnits();
        for (let unit of allUnits) {
            if (unit.x >= minX && unit.x <= maxX && 
                unit.y >= minY && unit.y <= maxY) {
                unit.selected = true;
                if (!this.selectedUnits.includes(unit)) {
                    this.selectedUnits.push(unit);
                }
            }
        }
    }
    
    moveUnitsInFormation(units, targetX, targetY) {
        if (units.length === 0) return;
        
        // Filter to only move units of the same faction as the first selected unit
        const sameFactionUnits = units.filter(u => u.faction === units[0].faction);
        if (sameFactionUnits.length === 0) return;
        
        const targetGrid = this.spatialGrid.pixelToGrid(targetX, targetY);
        
        if (sameFactionUnits.length === 1) {
            // Single unit - just move to target
            // Clear build target if it's a builder
            if (sameFactionUnits[0].unitType === 'builder') {
                sameFactionUnits[0].clearBuildTarget();
            }
            sameFactionUnits[0].moveToGrid(targetGrid.x, targetGrid.y);
            return;
        }
        
        // For multiple units, arrange them in a formation
        const formationSize = Math.ceil(Math.sqrt(sameFactionUnits.length));
        const spacing = 4; // Grid cells between units
        
        let unitIndex = 0;
        for (let row = 0; row < formationSize && unitIndex < sameFactionUnits.length; row++) {
            for (let col = 0; col < formationSize && unitIndex < sameFactionUnits.length; col++) {
                const offsetX = (col - (formationSize - 1) / 2) * spacing;
                const offsetY = (row - (formationSize - 1) / 2) * spacing;
                
                const targetGridX = targetGrid.x + Math.round(offsetX);
                const targetGridY = targetGrid.y + Math.round(offsetY);
                
                // Clamp to bounds
                const maxX = Config.gridWidth - Config.unitSize;
                const maxY = Config.gridHeight - Config.unitSize;
                const clampedX = Math.max(0, Math.min(targetGridX, maxX));
                const clampedY = Math.max(0, Math.min(targetGridY, maxY));
                
                // Clear build target if it's a builder
                if (sameFactionUnits[unitIndex].unitType === 'builder') {
                    sameFactionUnits[unitIndex].clearBuildTarget();
                }
                
                // Move unit to target position - collision system will handle blocking
                sameFactionUnits[unitIndex].moveToGrid(clampedX, clampedY);
                
                unitIndex++;
            }
        }
    }
    
    stopSelectedUnits() {
        for (let unit of this.selectedUnits) {
            unit.targetGridX = unit.gridX;
            unit.targetGridY = unit.gridY;
        }
    }
}
