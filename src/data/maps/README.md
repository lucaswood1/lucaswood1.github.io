# Map Files

Map files define the starting configuration for game scenarios. Each map file exports a map configuration object.

## Map File Structure

```javascript
export const mapName = {
    name: "Map Name",
    description: "Description of the map",
    
    // Starting resources per faction
    resources: {
        red: {
            gems: 45
        },
        blue: {
            gems: 45
        }
    },
    
    // Starting units
    units: [
        { type: 'caveman', gridX: 30, gridY: 40, faction: 'red' },
        { type: 'hunter', gridX: 35, gridY: 43, faction: 'red' },
        // ... more units
    ],
    
    // Starting builders
    builders: [
        { gridX: 25, gridY: 35, faction: 'red' },
        // ... more builders
    ],
    
    // Starting buildings
    buildings: [
        {
            gridX: 20,
            gridY: 30,
            faction: 'red',
            isComplete: true,  // true = already built, false = needs construction
            isConstructing: false
        },
        // ... more buildings
    ]
};
```

## Unit Types

Available unit types:
- `caveman` - Basic melee unit
- `builder` - Can construct buildings
- `worker` - Worker unit
- `miner` - Mining unit
- `hunter` - Ranged unit with long attack range

## Creating a New Map

1. Create a new file in `src/data/maps/` (e.g., `myMap.js`)
2. Export a map configuration object
3. Import and use it in `src/main.js`:

```javascript
import { myMap } from './data/maps/myMap.js';
// ...
game.loadMap(myMap);
```
