export let routeData = {
    route1: {
        loaded: false,
        accelerometerData: {},
        0: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        1: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        2: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        3: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        4: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] }
    },
    route2: {
        loaded: false,
        accelerometerData: {},
        0: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        1: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        2: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        3: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        4: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] }
    },
    route3: {
        loaded: false,
        accelerometerData: {},
        0: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        1: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        2: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        3: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        4: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] }
    },
    route4: {
        loaded: false,
        accelerometerData: {},
        0: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        1: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        2: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        3: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] },
        4: { pointsGroup: null, floorplan: null, points: [], eventMarkers: [] }
    }
};

export let pointsHelpers = {
    0: { pointsGroup: null, points: [] },
    1: { pointsGroup: null, points: [] },
    2: { pointsGroup: null, points: [] },
    3: { pointsGroup: null, points: [] },
    4: { pointsGroup: null, points: [] }
};


// 🔹 Funkcia na uloženie eventMarker pre konkrétny bod
export function saveEventMarker(routeId, floor, marker) {
    if (!routeData[routeId] || !routeData[routeId][floor]) {
        console.error(`❌ Trasa ${routeId} alebo poschodie ${floor} neexistuje!`);
        return;
    }
    routeData[routeId][floor].eventMarkers.push(marker);
}

// 🔹 Funkcia na získanie všetkých eventMarkers na trase a poschodí
export function getEventMarkers(routeId, floor) {
    return routeData[routeId]?.[floor]?.eventMarkers || [];
}

// 🔹 Funkcia na získanie konkrétneho eventMarker podľa ID bodu
export function getEventMarkerByPointId(routeId, floor, pointId) {
    return routeData[routeId]?.[floor]?.eventMarkers.find(m => m.id === pointId) || null;
}
