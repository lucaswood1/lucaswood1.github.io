// Game configuration and constants
export const Config = {
    canvasWidth: 800,
    canvasHeight: 600,
    gridWidth: 200,
    gridHeight: 160,
    unitSize: 6, // Units occupy 6x6 cells
    unitSpeed: 0.5, // Grid cells per frame
    fpsUpdateInterval: 1000, // milliseconds
    targetFPS: 60, // Target frames per second for attack timing
    startingGems: 45, // Starting gem count
    
    // Unit type configurations
    unitTypes: {
        caveman: {
            cost: 2,
            health: 10,
            maxHealth: 10,
            attackRange: 20,
            attackRate: 60, // Frames per attack (1 per second at 60 FPS)
            speed: 0.5,
            imageName: 'caveman'
        },
        builder: {
            cost: 3,
            health: 10,
            maxHealth: 10,
            attackRange: 0, // Builders don't attack
            attackRate: 0,
            speed: 0.5,
            imageName: 'builder',
            buildRange: 2, // Must be within 2 cells to build
            canAttack: false
        },
        worker: {
            cost: 2,
            health: 10,
            maxHealth: 10,
            attackRange: 20,
            attackRate: 60,
            speed: 0.5,
            imageName: 'worker'
        },
        miner: {
            cost: 3,
            health: 10,
            maxHealth: 10,
            attackRange: 20,
            attackRate: 60,
            speed: 0.5,
            imageName: 'miner'
        },
        hunter: {
            cost: 4,
            health: 10,
            maxHealth: 10,
            attackRange: 40,
            attackRate: 60,
            speed: 0.5,
            imageName: 'hunter'
        }
    },
    
    // Building configurations
    buildings: {
        trainingFacility: {
            cost: 10,
            size: 10, // 10x10 cells
            constructionTime: 15, // Seconds to build
            trainingTime: 10 // Seconds to train a unit
        },
        huntersLodge: {
            cost: 10,
            size: 10, // 10x10 cells
            constructionTime: 15, // Seconds to build
            trainingTime: 10 // Seconds to train a unit
        }
    },
    
    // Legacy support (for backward compatibility)
    unitCost: 2, // Gems per unit (default)
    trainingTime: 10, // Seconds to train a unit
    buildingCost: 10, // Gems per building
    constructionTime: 15, // Seconds to build a building
    
    // Unit type costs (legacy - use unitTypes[type].cost instead)
    unitCosts: {
        caveman: 2,
        builder: 3,
        worker: 2,
        miner: 3,
        hunter: 4
    }
};
