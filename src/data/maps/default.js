// Default map/scenario configuration
// This defines the starting positions and initial game state
export const defaultMap = {
    name: "Default Map",
    description: "Standard starting scenario",
    
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
        // Red faction units
        { type: 'caveman', gridX: 30, gridY: 40, faction: 'red' },
        { type: 'caveman', gridX: 35, gridY: 43, faction: 'red' },
        { type: 'caveman', gridX: 40, gridY: 46, faction: 'red' },
        
        // Blue faction units
        { type: 'caveman', gridX: 150, gridY: 60, faction: 'blue' },
        { type: 'caveman', gridX: 155, gridY: 63, faction: 'blue' },
        { type: 'caveman', gridX: 160, gridY: 66, faction: 'blue' }
    ],
    
    // Starting builders
    builders: [
        { gridX: 25, gridY: 35, faction: 'red' },
        { gridX: 175, gridY: 55, faction: 'blue' }
    ],
    
    // Starting buildings
    buildings: [
        {
            gridX: 20,
            gridY: 30,
            faction: 'red',
            isComplete: true, // Already built
            isConstructing: false
        },
        {
            gridX: 170,
            gridY: 50,
            faction: 'blue',
            isComplete: true, // Already built
            isConstructing: false
        }
    ]
};
