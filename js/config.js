let svg, zoomGroup, sizeSlider, colorPicker, pathGroup;
let mapContainer, editPointMenu, btnChangeFloor, floorMenu, floorButtons, currentFloorDisplay;
let floorplanImage, btnUploadMap, map, menu, currentSpeedDisplay, decreaseSpeedButton, increaseSpeedButton;
let buttons;

// Interná premenná pre zoom
let _zoom;

export function initConfig() {
    svg = d3.select("#floorplan");
    zoomGroup = svg.select("#zoomGroup");

    // Inicializácia zoomu
    _zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
        });

    svg.call(_zoom); // Aplikujeme zoom

    console.log("✅ Config načítaný!");
    pathGroup = zoomGroup.append("g").attr("id", "pathGroup");

    sizeSlider = document.getElementById("sizeSlider");
    colorPicker = document.getElementById("colorPicker");
    mapContainer = document.getElementById("mapContainer");
    editPointMenu = document.getElementById("edit-point-menu");
    btnChangeFloor = document.getElementById("btn-change-floor");
    floorMenu = document.getElementById("floor-menu");
    floorButtons = document.querySelectorAll("#floor-menu .dropdown-item");
    currentFloorDisplay = document.getElementById("currentFloorDisplay");
    floorplanImage = document.querySelector("#floorplan image");
    btnUploadMap = document.getElementById("btn-upload-map");
    menu = document.getElementById("shape-options");
    currentSpeedDisplay = document.getElementById("currentSpeed");
    decreaseSpeedButton = document.getElementById("decreaseSpeed");
    increaseSpeedButton = document.getElementById("increaseSpeed");
    map = document.getElementById("floorplan-upload");

    // Inicializujeme `buttons`
    buttons = {
        add: document.getElementById("btn-add-circle"),
        update: document.getElementById("btn-update-circle"),
        delete: document.getElementById("btn-delete-circle"),
        reset: document.getElementById("btn-reset-map"),
        uploadMap: document.getElementById("btn-upload-map"),
        uploadCSV: document.getElementById("btn-upload-csv"),
        uploadJSON: document.getElementById("btn-upload-json"),
        uploadTXT: document.getElementById("btn-upload-txt"),
        red: document.getElementById("led-red"),
        green: document.getElementById("led-green"),
        blue: document.getElementById("led-blue"),
        yellow: document.getElementById("led-yellow"),
    };

    console.log("✅ Buttons inicializované!", buttons);
}

// Funkcia na získanie zoomu
function getZoom() {
    return _zoom;
}



// ✅ **Globálny stav (state)** 
export const state = {
    isAddingPoint: false,
    isDeletingPoint: false,
    selectedPoint: null,
    currentFloor: 0,
    activeRoutes: [],
    floorPlans : {},
};

export const routeMapping = {
    red: "route1",
    green: "route2",
    blue: "route3",
    yellow: "route4"
};

// ✅ **Export všetkých premenných a objektov**
export { 
    svg, zoomGroup, pathGroup, sizeSlider, colorPicker, mapContainer, editPointMenu,
    btnChangeFloor, floorMenu, floorButtons, currentFloorDisplay, floorplanImage, btnUploadMap,
    menu, currentSpeedDisplay, decreaseSpeedButton, increaseSpeedButton, buttons, map,
    getZoom
};