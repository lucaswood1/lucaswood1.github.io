import { Config } from '../core/Config.js';

// Rendering system
export class Renderer {
    constructor(ctx) {
        this.ctx = ctx;
    }
    
    render(game) {
        // Clear canvas
        this.ctx.clearRect(0, 0, game.canvas.width, game.canvas.height);
        
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
    
    drawBuildingPreview(game) {
        if (!game.pendingBuilding) return;
        
        const buildingConfig = Config.buildings.trainingFacility;
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
