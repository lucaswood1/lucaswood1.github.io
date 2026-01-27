// Image loading utility
export class ImageLoader {
    constructor() {
        this.images = new Map();
        this.loadPromises = [];
    }
    
    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images.set(key, img);
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Failed to load image: ${path}`));
            };
            img.src = path;
        });
    }
    
    getImage(key) {
        return this.images.get(key);
    }
    
    async loadAll() {
        await Promise.all(this.loadPromises);
    }
}
