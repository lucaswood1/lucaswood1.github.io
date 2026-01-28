import { Config } from '../core/Config.js';

// Input handling system
export class InputHandler {
    constructor(game, hud) {
        this.game = game;
        this.hud = hud;
        this.canvas = game.canvas;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Canvas click for unit selection
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleContextMenu(e);
        });
    }
    
    handleMouseDown(e) {
        // Skip selection logic for right-click
        if (e.button === 2) {
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Handle building placement mode
        if (this.game.buildingPlacementMode) {
            const gridPos = this.game.spatialGrid.pixelToGrid(x, y);
            const selectedBuilders = this.game.getSelectedBuilders();
            if (selectedBuilders.length > 0) {
                const faction = selectedBuilders[0].faction;
                const building = this.game.placeBuildingAt(gridPos.x, gridPos.y, faction);
                if (building) {
                    this.hud.updateBuildButton();
                } else {
                    // Invalid placement location
                    console.log('Cannot place building here');
                }
            }
            return;
        }
        
        // Check if clicking on a building
        let clickedBuilding = null;
        for (let building of this.game.getBuildings()) {
            if (building.containsPoint(x, y)) {
                clickedBuilding = building;
                break;
            }
        }
        
        if (clickedBuilding) {
            if (clickedBuilding.isComplete) {
                // Select the building (don't train immediately)
                this.game.selectBuilding(clickedBuilding);
                this.game.deselectAll(); // Deselect units when selecting building
                this.hud.updateSelectedDisplay();
            }
            return;
        }
        
        // Check if clicking on a unit or builder
        let clickedUnit = null;
        const allUnits = this.game.getAllUnits();
        for (let unit of allUnits) {
            if (unit.containsPoint(x, y)) {
                clickedUnit = unit;
                break;
            }
        }
        
        if (clickedUnit) {
            // Select unit (with shift for multi-select)
            this.game.selectUnit(clickedUnit, e.shiftKey);
            // Deselect building when selecting unit
            if (!e.shiftKey) {
                this.game.selectBuilding(null);
            }
            this.hud.updateSelectedDisplay();
        } else {
            // Start selection box
            this.game.isSelecting = true;
            this.game.selectionStart = { x, y };
            this.game.selectionEnd = { x, y };
            
            // Deselect all if not holding shift
            if (!e.shiftKey) {
                this.game.deselectAll();
                this.game.selectBuilding(null); // Also deselect building
                this.hud.updateSelectedDisplay();
            }
        }
    }
    
    handleMouseMove(e) {
        if (this.game.isSelecting) {
            const rect = this.canvas.getBoundingClientRect();
            this.game.selectionEnd = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
        
        // Update building placement preview if in placement mode
        if (this.game.buildingPlacementMode) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const gridPos = this.game.spatialGrid.pixelToGrid(x, y);
            
            // Store preview position with correct building type
            const buildingType = this.game.pendingBuildingType || 'trainingFacility';
            const buildingConfig = Config.buildings[buildingType] || Config.buildings.trainingFacility;
            this.game.pendingBuilding = {
                gridX: gridPos.x,
                gridY: gridPos.y,
                size: buildingConfig.size
            };
        }
    }
    
    handleMouseUp(e) {
        // Handle right-click movement
        if (e.button === 2 && this.game.getSelectedUnits().length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Check if clicking on a unit (don't move if clicking on enemy)
            let clickedUnit = null;
            const allUnits = this.game.getAllUnits();
            for (let unit of allUnits) {
                if (unit.containsPoint(x, y)) {
                    clickedUnit = unit;
                    break;
                }
            }
            
            const selectedUnits = this.game.getSelectedUnits();
            if (!clickedUnit || clickedUnit.faction === selectedUnits[0]?.faction) {
                // Move selected units with formation spreading
                this.game.moveUnitsInFormation(selectedUnits, x, y);
            }
            return;
        }
        
        // Handle selection box
        if (this.game.isSelecting && e.button === 0) {
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            
            // Select units in selection box
            const minX = Math.min(this.game.selectionStart.x, endX);
            const maxX = Math.max(this.game.selectionStart.x, endX);
            const minY = Math.min(this.game.selectionStart.y, endY);
            const maxY = Math.max(this.game.selectionStart.y, endY);
            
            this.game.selectUnitsInBox(minX, minY, maxX, maxY, false);
            // Deselect building when selecting units via box
            this.game.selectBuilding(null);
            this.hud.updateSelectedDisplay();
            
            this.game.isSelecting = false;
            this.game.selectionStart = null;
            this.game.selectionEnd = null;
        }
    }
    
    handleContextMenu(e) {
        // Handle right-click movement when context menu is prevented
        if (this.game.getSelectedUnits().length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            let clickedUnit = null;
            const allUnits = this.game.getAllUnits();
            for (let unit of allUnits) {
                if (unit.containsPoint(x, y)) {
                    clickedUnit = unit;
                    break;
                }
            }
            
            const selectedUnits = this.game.getSelectedUnits();
            if (!clickedUnit || clickedUnit.faction === selectedUnits[0]?.faction) {
                // Move selected units with formation spreading
                this.game.moveUnitsInFormation(selectedUnits, x, y);
            }
        }
    }
    
    handleMoveCommand() {
        // Move command is handled by right-click or left-click with selection
        // This button can be used for future functionality
        console.log('Move command');
    }
    
    handleStopCommand() {
        this.game.stopSelectedUnits();
        // Cancel building placement if active
        if (this.game.buildingPlacementMode) {
            this.game.cancelBuildingPlacement();
            this.hud.updateBuildButton();
        }
    }
    
    handleAttackCommand() {
        // Attack functionality to be implemented
        console.log('Attack command');
    }
}
