import { PerlinNoise } from '../utils/PerlinNoise.js';

// Terrain Map system for procedural height-based terrain
export class TerrainMap {
    constructor(gridWidth, gridHeight, seed = null) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.heights = [];
        
        // Initialize Perlin noise generator
        this.noise = new PerlinNoise(seed);
        
        // Generate procedural height data (0-10 for each cell) using Perlin noise
        this.generateHeights();
    }
    
    /**
     * Generate height values using Perlin noise (0-10)
     * Creates exaggerated topography with one or two distinct mountain ranges
     */
    generateHeights() {
        // Use very low scale for large mountain ranges that span the map
        const rangeScale = 0.015; // Large-scale features for mountain ranges
        const detailScale = 0.1; // Smaller details on the mountains
        const octaves = 3; // Fewer octaves for smoother, more defined ranges
        const persistence = 0.65; // Higher persistence for more dramatic peaks
        
        for (let y = 0; y < this.gridHeight; y++) {
            this.heights[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                // Get base noise for large mountain ranges (-1 to 1)
                // This creates the overall structure of 1-2 mountain ranges
                const rangeNoise = this.noise.octaveNoise(x, y, octaves, persistence, rangeScale);
                
                // Get detail noise for texture and variation (-1 to 1)
                const detailNoise = this.noise.octaveNoise(x + 1000, y + 1000, 2, 0.3, detailScale) * 0.25;
                
                // Combine range structure with detail
                let combinedNoise = rangeNoise + detailNoise;
                
                // Apply aggressive power curve to create dramatic peaks and valleys
                // This exaggerates the topography significantly
                const sign = combinedNoise >= 0 ? 1 : -1;
                const absValue = Math.abs(combinedNoise);
                // Use inverse power (0.35) to push values toward extremes
                const exaggerated = sign * Math.pow(absValue, 0.35);
                
                // Normalize from -1 to 1 range to 0-1 range
                let normalized = (exaggerated + 1) / 2;
                
                // Apply aggressive curve transformation to create distinct ranges
                // This creates clear separation between valleys (0-3) and peaks (7-10)
                if (normalized < 0.4) {
                    // Compress low areas - create flat valleys
                    normalized = normalized * 0.3; // 0 to 0.12
                } else if (normalized > 0.6) {
                    // Expand high areas - create dramatic peaks
                    normalized = 0.12 + (normalized - 0.4) * 2.2; // 0.12 to 0.56, then scale up
                    normalized = 0.4 + (normalized - 0.12) * 1.36; // Map to 0.4-1.0
                } else {
                    // Smooth transition in middle (foothills)
                    normalized = 0.12 + (normalized - 0.4) * 0.15; // 0.12 to 0.15
                }
                
                // Convert to height 0-10
                const height = Math.round(normalized * 10);
                
                this.heights[y][x] = Math.max(0, Math.min(10, height)); // Clamp to 0-10
            }
        }
    }
    
    /**
     * Get height at a specific grid position
     * @param {number} gridX - Grid X coordinate
     * @param {number} gridY - Grid Y coordinate
     * @returns {number} Height value (0-10)
     */
    getHeight(gridX, gridY) {
        // Clamp coordinates to valid range
        const x = Math.max(0, Math.min(gridX, this.gridWidth - 1));
        const y = Math.max(0, Math.min(gridY, this.gridHeight - 1));
        return this.heights[y][x];
    }
    
    /**
     * Get height at pixel coordinates
     * @param {number} pixelX - Pixel X coordinate
     * @param {number} pixelY - Pixel Y coordinate
     * @param {number} cellWidth - Width of each cell in pixels
     * @param {number} cellHeight - Height of each cell in pixels
     * @returns {number} Height value (0-10)
     */
    getHeightAtPixel(pixelX, pixelY, cellWidth, cellHeight) {
        const gridX = Math.floor(pixelX / cellWidth);
        const gridY = Math.floor(pixelY / cellHeight);
        return this.getHeight(gridX, gridY);
    }
    
    /**
     * Calculate speed multiplier based on terrain height
     * Higher terrain = slower movement
     * @param {number} height - Terrain height (0-10)
     * @returns {number} Speed multiplier (0.0 to 1.0)
     */
    getSpeedMultiplier(height) {
        // Linear penalty: height 0 = 100% speed, height 10 = 50% speed
        // Formula: 1 - (height / 10) * 0.5
        return Math.max(0.5, 1 - (height / 10) * 0.5);
    }
}
