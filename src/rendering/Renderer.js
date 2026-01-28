import { Config } from '../core/Config.js';

// Rendering system
export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    render(game) {
        // Clear canvas
        this.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
        
        // Draw terrain (background layer)
        if (game.terrainMap) {
            this.drawTerrain(game);
        }
        
        // Draw grid (optional - for debugging)
        this.drawGrid(game);
        
        // Draw buildings
        for (let building of game.getBuildings()) {
            building.draw(this.ctx, game.cellWidth, game.cellHeight);
            
            // Draw selection indicator for buildings
            if (building.selected) {
                const pixelX = building.gridX * game.cellWidth;
                const pixelY = building.gridY * game.cellHeight;
                const width = game.cellWidth * building.size;
                const height = game.cellHeight * building.size;
                
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 4;
                this.ctx.setLineDash([8, 4]);
                this.ctx.strokeRect(pixelX - 3, pixelY - 3, width + 6, height + 6);
                this.ctx.setLineDash([]);
            }
        }
        
        // Draw pending building placement preview (before units so it's behind)
        if (game.buildingPlacementMode && game.pendingBuilding) {
            this.drawBuildingPreview(game);
        }
        
        // Draw selection box
        if (game.isSelecting && game.selectionStart && game.selectionEnd) {
            this.drawSelectionBox(game);
        }
        
        // Draw units and builders sorted by Y position (units further down appear on top)
        const allUnits = [...game.getAllUnits()];
        const sortedUnits = allUnits.sort((a, b) => {
            // Sort by grid Y position, then by X position for consistent ordering
            if (a.gridY !== b.gridY) {
                return a.gridY - b.gridY;
            }
            return a.gridX - b.gridX;
        });
        
        for (let unit of sortedUnits) {
            if (unit.isAlive()) {
                unit.draw(this.ctx, game.cellWidth, game.cellHeight);
            }
        }
        
        // Draw projectiles
        for (let projectile of game.getProjectiles()) {
            projectile.draw(this.ctx, game.cellWidth, game.cellHeight);
        }
        
        // Draw UI elements
        this.drawGemCounter(game);
        this.drawFPS(game);
    }
    
    drawGemCounter(game) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Gems: ${game.getGems()}`, 10, 25);
    }
    
    drawGrid(game) {
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;
        
        // Draw vertical lines
        for (let x = 0; x <= Config.gridWidth; x++) {
            const px = x * game.cellWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(px, 0);
            this.ctx.lineTo(px, game.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= Config.gridHeight; y++) {
            const py = y * game.cellHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(0, py);
            this.ctx.lineTo(game.canvas.width, py);
            this.ctx.stroke();
        }
    }
    
    drawSelectionBox(game) {
        const x = Math.min(game.selectionStart.x, game.selectionEnd.x);
        const y = Math.min(game.selectionStart.y, game.selectionEnd.y);
        const width = Math.abs(game.selectionEnd.x - game.selectionStart.x);
        const height = Math.abs(game.selectionEnd.y - game.selectionStart.y);
        
        this.ctx.strokeStyle = '#00ff00';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.setLineDash([]);
    }
    
    drawFPS(game) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`FPS: ${game.fps}`, game.canvas.width - 10, 20);
    }
    
    /**
     * Draw terrain with height-based colors
     * Height 0 = light brown, height 9 = dark brown, height 10 = white (snow)
     */
    drawTerrain(game) {
        const terrainMap = game.terrainMap;
        const cellWidth = game.cellWidth;
        const cellHeight = game.cellHeight;
        
        for (let y = 0; y < terrainMap.gridHeight; y++) {
            for (let x = 0; x < terrainMap.gridWidth; x++) {
                const height = terrainMap.getHeight(x, y);
                const pixelX = x * cellWidth;
                const pixelY = y * cellHeight;
                
                // Calculate color based on height
                let color;
                if (height === 10) {
                    // White for snow caps (height 10)
                    color = '#ffffff';
                } else if (height >= 9) {
                    // Dark brown for height 9
                    color = '#8B4513';
                } else {
                    // Interpolate between light brown (height 0) and dark brown (height 9)
                    // Light brown: #D2B48C (tan), Dark brown: #8B4513
                    const t = height / 9; // 0 to 1
                    const r1 = 0xD2, g1 = 0xB4, b1 = 0x8C; // Light brown
                    const r2 = 0x8B, g2 = 0x45, b2 = 0x13; // Dark brown
                    
                    const r = Math.round(r1 + (r2 - r1) * t);
                    const g = Math.round(g1 + (g2 - g1) * t);
                    const b = Math.round(b1 + (b2 - b1) * t);
                    
                    color = `rgb(${r}, ${g}, ${b})`;
                }
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
            }
        }
    }
    
    drawBuildingPreview(game) {
        if (!game.pendingBuilding) return;
        
        const buildingType = game.pendingBuildingType || 'trainingFacility';
        const buildingConfig = Config.buildings[buildingType] || Config.buildings.trainingFacility;
        const buildingSize = game.pendingBuilding.size || buildingConfig.size;
        const pixelX = game.pendingBuilding.gridX * game.cellWidth;
        const pixelY = game.pendingBuilding.gridY * game.cellHeight;
        const width = game.cellWidth * buildingSize;
        const height = game.cellHeight * buildingSize;
        
        // Check if placement is valid
        const canPlace = game.canPlaceBuilding(
            game.pendingBuilding.gridX, 
            game.pendingBuilding.gridY, 
            buildingSize
        );
        
        // Draw preview building
        this.ctx.save();
        if (canPlace) {
            this.ctx.fillStyle = 'rgba(100, 200, 100, 0.3)';
            this.ctx.strokeStyle = '#00ff00';
        } else {
            this.ctx.fillStyle = 'rgba(200, 100, 100, 0.3)';
            this.ctx.strokeStyle = '#ff0000';
        }
        
        this.ctx.fillRect(pixelX, pixelY, width, height);
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(pixelX, pixelY, width, height);
        this.ctx.setLineDash([]);
        this.ctx.restore();
    }
}
