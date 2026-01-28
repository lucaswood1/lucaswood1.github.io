// Simplified 2D Perlin Noise implementation
// Based on Ken Perlin's improved noise algorithm
export class PerlinNoise {
    constructor(seed = null) {
        // Permutation table - shuffled array of 0-255
        this.permutation = [];
        this.p = [];
        
        // Initialize with seed or random
        if (seed !== null) {
            this.seed = seed;
            this.seedRandom(seed);
        } else {
            this.seed = Math.random() * 1000000;
            this.seedRandom(this.seed);
        }
        
        // Create permutation table (256 values, then duplicate for wrapping)
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        
        // Shuffle the permutation array
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        // Duplicate for wrapping
        for (let i = 0; i < 512; i++) {
            this.p[i] = this.permutation[i % 256];
        }
    }
    
    // Seeded random number generator
    seedRandom(seed) {
        this.m_w = (123456789 + seed) & 0xffffffff;
        this.m_z = (987654321 - seed) & 0xffffffff;
    }
    
    random() {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & 0xffffffff;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & 0xffffffff;
        let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0;
        result /= 4294967296;
        return result;
    }
    
    // Fade function for smooth interpolation
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    // Gradient function - converts hash to gradient vector
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 1 ? y : (h === 1 || h === 2 ? x : 0);
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    // 2D Perlin noise function
    noise(x, y) {
        // Find unit grid cell containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Get relative x,y coordinates of point within that cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves for each of x,y
        const u = this.fade(x);
        const v = this.fade(y);
        
        // Hash coordinates of the 4 square corners
        const A = this.p[X] + Y;
        const AA = this.p[A];
        const AB = this.p[A + 1];
        const B = this.p[X + 1] + Y;
        const BA = this.p[B];
        const BB = this.p[B + 1];
        
        // And add blended results from 4 corners of the square
        return this.lerp(
            this.lerp(
                this.grad(this.p[AA], x, y),
                this.grad(this.p[BA], x - 1, y),
                u
            ),
            this.lerp(
                this.grad(this.p[AB], x, y - 1),
                this.grad(this.p[BB], x - 1, y - 1),
                u
            ),
            v
        );
    }
    
    // Octave noise - combines multiple frequencies for more natural terrain
    octaveNoise(x, y, octaves = 4, persistence = 0.5, scale = 1.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue; // Normalize to -1 to 1
    }
}
