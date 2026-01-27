// Spatial Grid system for collision detection and spatial partitioning
export class SpatialGrid {
    constructor(gridWidth, gridHeight, cellWidth, cellHeight) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.cellWidth = cellWidth;
        this.cellHeight = cellHeight;
        this.grid = [];
        
        // Initialize grid - each cell contains an array of units
        for (let y = 0; y < gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < gridWidth; x++) {
                this.grid[y][x] = [];
            }
        }
    }

    // Get grid cell coordinates from pixel coordinates
    pixelToGrid(px, py) {
        const gridX = Math.floor(px / this.cellWidth);
        const gridY = Math.floor(py / this.cellHeight);
        return {
            x: Math.max(0, Math.min(gridX, this.gridWidth - 1)),
            y: Math.max(0, Math.min(gridY, this.gridHeight - 1))
        };
    }

    // Get pixel coordinates from grid cell coordinates (center of cell)
    gridToPixel(gx, gy) {
        return {
            x: gx * this.cellWidth + this.cellWidth / 2,
            y: gy * this.cellHeight + this.cellHeight / 2
        };
    }

    // Get all cells occupied by a unit (2x2 cells)
    getUnitCells(gridX, gridY) {
        const cells = [];
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const x = gridX + dx;
                const y = gridY + dy;
                if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
                    cells.push({ x, y });
                }
            }
        }
        return cells;
    }

    // Add unit to grid
    addUnit(unit) {
        const gridPos = this.pixelToGrid(unit.x, unit.y);
        const cells = this.getUnitCells(gridPos.x, gridPos.y);
        
        unit.gridX = gridPos.x;
        unit.gridY = gridPos.y;
        
        cells.forEach(cell => {
            if (!this.grid[cell.y][cell.x].includes(unit)) {
                this.grid[cell.y][cell.x].push(unit);
            }
        });
    }

    // Remove unit from grid
    removeUnit(unit) {
        if (unit.gridX === undefined || unit.gridY === undefined) return;
        
        const cells = this.getUnitCells(unit.gridX, unit.gridY);
        cells.forEach(cell => {
            const index = this.grid[cell.y][cell.x].indexOf(unit);
            if (index > -1) {
                this.grid[cell.y][cell.x].splice(index, 1);
            }
        });
    }

    // Update unit position in grid
    updateUnit(unit) {
        const newGridPos = this.pixelToGrid(unit.x, unit.y);
        
        // Only update if grid position changed
        if (unit.gridX !== newGridPos.x || unit.gridY !== newGridPos.y) {
            this.removeUnit(unit);
            this.addUnit(unit);
        }
    }

    // Check if a grid position is occupied
    isOccupied(gridX, gridY, excludeUnit = null) {
        const cells = this.getUnitCells(gridX, gridY);
        for (let cell of cells) {
            if (cell.x < 0 || cell.x >= this.gridWidth || 
                cell.y < 0 || cell.y >= this.gridHeight) {
                return true; // Out of bounds
            }
            
            const units = this.grid[cell.y][cell.x];
            for (let unit of units) {
                if (unit !== excludeUnit) {
                    return true;
                }
            }
        }
        return false;
    }

    // Get all units near a grid position (within a radius)
    getNearbyUnits(gridX, gridY, radius = 3, excludeUnit = null) {
        const nearby = [];
        const minX = Math.max(0, gridX - radius);
        const maxX = Math.min(this.gridWidth - 1, gridX + radius + 1);
        const minY = Math.max(0, gridY - radius);
        const maxY = Math.min(this.gridHeight - 1, gridY + radius + 1);
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const units = this.grid[y][x];
                for (let unit of units) {
                    if (unit !== excludeUnit && !nearby.includes(unit)) {
                        nearby.push(unit);
                    }
                }
            }
        }
        return nearby;
    }

    // Find nearest unoccupied position near a target
    findNearestFreePosition(targetGridX, targetGridY, excludeUnit = null, maxRadius = 5) {
        // First check if target is free
        if (!this.isOccupied(targetGridX, targetGridY, excludeUnit)) {
            return { x: targetGridX, y: targetGridY };
        }

        // Search in expanding circles
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    // Only check positions on the edge of the circle
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const x = targetGridX + dx;
                        const y = targetGridY + dy;
                        
                        // Check bounds
                        if (x >= 0 && x <= this.gridWidth - 2 && 
                            y >= 0 && y <= this.gridHeight - 2) {
                            if (!this.isOccupied(x, y, excludeUnit)) {
                                return { x, y };
                            }
                        }
                    }
                }
            }
        }
        
        // If no free position found, return null
        return null;
    }

    // Get units in a grid cell
    getUnitsAt(gridX, gridY) {
        if (gridX < 0 || gridX >= this.gridWidth || 
            gridY < 0 || gridY >= this.gridHeight) {
            return [];
        }
        return [...this.grid[gridY][gridX]];
    }

    // Clear the entire grid
    clear() {
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                this.grid[y][x] = [];
            }
        }
    }
}
