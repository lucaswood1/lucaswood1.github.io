import { Config } from './Config.js';
import { UnitFactory } from '../entities/UnitFactory.js';
import { Building } from '../entities/Building.js';
import { Builder } from '../entities/Builder.js';

// Map loader utility - loads map/scenario data and initializes game state
export class MapLoader {
    /**
     * Load a map configuration and initialize game entities
     * @param {Object} game - The game instance
     * @param {Object} mapConfig - Map configuration object
     */
    static loadMap(game, mapConfig) {
        // Set starting resources
        if (mapConfig.resources) {
            if (mapConfig.resources.red) {
                game.gems = mapConfig.resources.red.gems || Config.startingGems;
            }
            // Note: Currently single-player, but structure supports multiple factions
        }
        
        // Create units
        if (mapConfig.units) {
            for (let unitData of mapConfig.units) {
                const unit = UnitFactory.createUnit(
                    unitData.type || 'caveman',
                    unitData.gridX,
                    unitData.gridY,
                    unitData.faction || 'red',
                    game.spatialGrid,
                    game.imageLoader
                );
                
                // Add to appropriate array
                if (unit.unitType === 'builder') {
                    game.builders.push(unit);
                } else {
                    game.units.push(unit);
                }
            }
        }
        
        // Create builders
        if (mapConfig.builders) {
            for (let builderData of mapConfig.builders) {
                const builder = new Builder(
                    builderData.gridX,
                    builderData.gridY,
                    builderData.faction || 'red',
                    game.spatialGrid,
                    game.imageLoader
                );
                game.builders.push(builder);
            }
        }
        
        // Create buildings
        if (mapConfig.buildings) {
            for (let buildingData of mapConfig.buildings) {
                const building = new Building(
                    buildingData.gridX,
                    buildingData.gridY,
                    buildingData.faction || 'red',
                    game.spatialGrid
                );
                
                // Set building state
                if (buildingData.isComplete !== undefined) {
                    building.isComplete = buildingData.isComplete;
                }
                if (buildingData.isConstructing !== undefined) {
                    building.isConstructing = buildingData.isConstructing;
                }
                
                game.buildings.push(building);
            }
        }
    }
}
