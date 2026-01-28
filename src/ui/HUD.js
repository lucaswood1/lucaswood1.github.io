import { Config } from '../core/Config.js';
import { UnitFactory } from '../entities/UnitFactory.js';
import { HuntersLodge } from '../entities/HuntersLodge.js';

// HUD (Heads-Up Display) management
export class HUD {
    constructor(game) {
        this.game = game;
        this.actionGrid = document.getElementById('actionGrid');
        this.actionButtons = [];
        this.setupActionGrid();
    }
    
    setupActionGrid() {
        // Clear the grid
        this.actionGrid.innerHTML = '';
        this.actionButtons = [];
        
        // Create 3x3 grid (9 buttons total)
        for (let i = 0; i < 9; i++) {
            const button = document.createElement('button');
            button.className = 'action-btn';
            button.style.display = 'none';
            button.dataset.index = i;
            this.actionGrid.appendChild(button);
            this.actionButtons.push(button);
        }
    }
    
    updateActionGrid() {
        // Clear all buttons
        this.actionButtons.forEach(btn => {
            btn.style.display = 'none';
            btn.onclick = null;
            btn.innerHTML = '';
        });
        
        const selectedBuilding = this.game.getSelectedBuilding();
        const selectedBuilders = this.game.getSelectedBuilders();
        
        // Show building training buttons if building is selected
        if (selectedBuilding && selectedBuilding.isComplete) {
            // Check if this is a hunters lodge (only trains hunters)
            // Use buildingType property (more reliable than instanceof across modules)
            const isHuntersLodge = selectedBuilding.buildingType === 'huntersLodge';
            
            // Get available unit types based on building type
            let unitTypes;
            if (isHuntersLodge) {
                // Hunters lodge can only train hunters
                unitTypes = ['hunter'];
            } else {
                // Training facility can train all units except hunters
                unitTypes = ['caveman', 'builder', 'worker', 'miner'];
            }
            
            unitTypes.forEach((unitType, index) => {
                if (index < 9) {
                    const button = this.actionButtons[index];
                    const cost = Config.unitCosts[unitType] || Config.unitCost;
                    const canAfford = this.game.getGems() >= cost;
                    
                    button.style.display = 'flex';
                    button.disabled = !canAfford;
                    
                    // Try to show unit image on button
                    const imageLoader = this.game.getImageLoader();
                    const imageName = UnitFactory.getUnitImageName(unitType);
                    const unitImage = imageLoader ? imageLoader.getImage(imageName) : null;
                    
                    if (unitImage && unitImage.complete && unitImage instanceof HTMLImageElement) {
                        const img = document.createElement('img');
                        img.src = unitImage.src;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'contain';
                        button.innerHTML = '';
                        button.appendChild(img);
                        
                        // Add cost overlay
                        const costOverlay = document.createElement('div');
                        costOverlay.style.position = 'absolute';
                        costOverlay.style.bottom = '2px';
                        costOverlay.style.right = '2px';
                        costOverlay.style.background = 'rgba(0,0,0,0.7)';
                        costOverlay.style.color = '#ffd700';
                        costOverlay.style.fontSize = '8px';
                        costOverlay.style.padding = '1px 2px';
                        costOverlay.textContent = cost;
                        button.appendChild(costOverlay);
                    } else {
                        button.innerHTML = `<div style="font-size: 9px; line-height: 1.1;">${unitType.charAt(0).toUpperCase() + unitType.slice(1)}<br>${cost}g</div>`;
                    }
                    
                    button.onclick = () => {
                        if (canAfford) {
                            const success = this.game.trainUnit(selectedBuilding, unitType);
                            if (success) {
                                this.updateActionGrid();
                                this.updateSelectedDisplay();
                            }
                        }
                    };
                }
            });
        }
        // Show build buttons if builders are selected
        else if (selectedBuilders.length > 0) {
            // Show both building types: Training Facility and Hunter's Lodge
            const buildingTypes = [
                { type: 'trainingFacility', name: 'Training', config: Config.buildings.trainingFacility },
                { type: 'huntersLodge', name: "Hunter's Lodge", config: Config.buildings.huntersLodge }
            ];
            
            buildingTypes.forEach((buildingInfo, index) => {
                if (index < 2) {
                    const button = this.actionButtons[index];
                    const canAfford = this.game.getGems() >= buildingInfo.config.cost;
                    const isActiveType = this.game.pendingBuildingType === buildingInfo.type;
                    
                    button.style.display = 'flex';
                    button.disabled = !canAfford || (this.game.buildingPlacementMode && !isActiveType);
                    
                    if (this.game.buildingPlacementMode && isActiveType) {
                        button.innerHTML = `<div style="font-size: 9px; line-height: 1.1;">Place<br>${buildingInfo.name}</div>`;
                    } else {
                        button.innerHTML = `<div style="font-size: 9px; line-height: 1.1;">${buildingInfo.name}<br>${buildingInfo.config.cost}g</div>`;
                    }
                    
                    button.onclick = () => {
                        if (this.game.buildingPlacementMode && isActiveType) {
                            // Cancel placement
                            this.game.cancelBuildingPlacement();
                            this.updateActionGrid();
                        } else if (canAfford && !this.game.buildingPlacementMode) {
                            this.game.startBuildingPlacement(buildingInfo.type);
                            this.updateActionGrid();
                        }
                    };
                }
            });
        }
    }
    
    updateSelectedDisplay() {
        const container = document.getElementById('selectedUnits');
        container.innerHTML = '';
        
        // Check if a building is selected
        const selectedBuilding = this.game.getSelectedBuilding();
        if (selectedBuilding) {
            // Show building info (simplified)
            const buildingDiv = document.createElement('div');
            buildingDiv.className = 'unit-icon';
            buildingDiv.innerHTML = `
                <div class="unit-image" style="background-color: ${selectedBuilding.faction === 'red' ? '#cc6666' : '#6666cc'};">
                    <div style="font-size: 8px; text-align: center; padding: 4px;">Building</div>
                </div>
            `;
            container.appendChild(buildingDiv);
            
            // Update action grid
            this.updateActionGrid();
            return;
        }
        
        // Group selected units by type (show all factions, not just red)
        const selectedUnits = this.game.getSelectedUnits();
        const unitsByType = {};
        
        selectedUnits.forEach(unit => {
            const type = unit.unitType || 'caveman';
            if (!unitsByType[type]) {
                unitsByType[type] = [];
            }
            unitsByType[type].push(unit);
        });
        
        // Display each unit type with count
        Object.keys(unitsByType).forEach(unitType => {
            const units = unitsByType[unitType];
            const unit = units[0]; // Use first unit for display
            const count = units.length;
            
            const unitDiv = document.createElement('div');
            unitDiv.className = 'unit-icon';
            
            const imageContainer = document.createElement('div');
            imageContainer.className = 'unit-image';
            
            // Try to load unit image
            const imageName = UnitFactory.getUnitImageName(unitType);
            const imageLoader = this.game.getImageLoader();
            const unitImage = imageLoader ? imageLoader.getImage(imageName) : null;
            
            if (unitImage && unitImage.complete && unitImage instanceof HTMLImageElement) {
                const img = document.createElement('img');
                img.src = unitImage.src;
                // Apply faction tinting via CSS filter
                if (unit.faction === 'red') {
                    img.style.filter = 'hue-rotate(0deg) saturate(1.2) brightness(1.1)';
                } else {
                    img.style.filter = 'hue-rotate(200deg) saturate(1.2) brightness(1.1)';
                }
                imageContainer.appendChild(img);
            } else {
                // Fallback to colored square
                imageContainer.style.backgroundColor = unit.faction === 'red' ? '#ff9999' : '#9999ff';
                imageContainer.innerHTML = `<div style="font-size: 8px; text-align: center; padding: 4px;">${unitType.charAt(0).toUpperCase()}</div>`;
            }
            
            // Health bar
            const healthBar = document.createElement('div');
            healthBar.className = 'health-bar';
            const healthFill = document.createElement('div');
            healthFill.className = 'health-bar-fill';
            const healthPercent = unit.health / unit.maxHealth;
            healthFill.style.width = `${healthPercent * 100}%`;
            healthBar.appendChild(healthFill);
            imageContainer.appendChild(healthBar);
            
            // Unit count badge
            if (count > 1) {
                const countBadge = document.createElement('div');
                countBadge.className = 'unit-count';
                countBadge.textContent = count.toString();
                imageContainer.appendChild(countBadge);
            }
            
            unitDiv.appendChild(imageContainer);
            container.appendChild(unitDiv);
        });
        
        // Update action grid
        this.updateActionGrid();
    }
}
