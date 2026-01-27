import { Config } from '../core/Config.js';
import { Unit } from './Unit.js';
import { Builder } from './Builder.js';
import { Caveman } from './Caveman.js';
import { Hunter } from './Hunter.js';

// Unit factory for creating different unit types
export class UnitFactory {
    static createUnit(unitType, gridX, gridY, faction, spatialGrid, imageLoader) {
        switch (unitType) {
            case 'caveman':
                return new Caveman(gridX, gridY, faction, spatialGrid, imageLoader);
            case 'builder':
                return new Builder(gridX, gridY, faction, spatialGrid, imageLoader);
            case 'hunter':
                return new Hunter(gridX, gridY, faction, spatialGrid, imageLoader);
            case 'worker':
                const worker = new Unit(gridX, gridY, faction, spatialGrid, imageLoader);
                worker.unitType = 'worker';
                // Apply worker stats from config
                const workerStats = Config.unitTypes.worker;
                worker.health = workerStats.health;
                worker.maxHealth = workerStats.maxHealth;
                worker.attackRange = workerStats.attackRange;
                worker.attackRate = workerStats.attackRate;
                worker.speed = workerStats.speed;
                return worker;
            case 'miner':
                const miner = new Unit(gridX, gridY, faction, spatialGrid, imageLoader);
                miner.unitType = 'miner';
                // Apply miner stats from config
                const minerStats = Config.unitTypes.miner;
                miner.health = minerStats.health;
                miner.maxHealth = minerStats.maxHealth;
                miner.attackRange = minerStats.attackRange;
                miner.attackRate = minerStats.attackRate;
                miner.speed = minerStats.speed;
                return miner;
            default:
                return new Unit(gridX, gridY, faction, spatialGrid, imageLoader);
        }
    }
    
    static getUnitCost(unitType) {
        if (Config.unitTypes[unitType]) {
            return Config.unitTypes[unitType].cost;
        }
        return Config.unitCosts[unitType] || Config.unitCost;
    }
    
    static getUnitImageName(unitType) {
        if (Config.unitTypes[unitType]) {
            return Config.unitTypes[unitType].imageName;
        }
        // Fallback mapping
        const imageMap = {
            'caveman': 'caveman',
            'builder': 'builder',
            'worker': 'worker',
            'miner': 'miner',
            'hunter': 'hunter'
        };
        return imageMap[unitType] || 'caveman';
    }
    
    static getUnitStats(unitType) {
        return Config.unitTypes[unitType] || null;
    }
}
