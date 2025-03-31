import * as config from "./config.js";
config.initConfig();
import { initEventListeners } from "./eventListeners.js";
import { play, stop, stepForward, stepBack,resetAnimation } from "./animation.js";
import * as storage from "./storage.js";
window.play = play;
window.stop = stop;
window.stepForward = stepForward;
window.stepBack = stepBack;
initEventListeners();





config.svg.call(config.getZoom);
const zoom = config.getZoom();
window.zoomIn = function () {
    config.svg.transition().call(zoom.scaleBy, 1.2);
};

window.zoomOut = function () {
    config.svg.transition().call(zoom.scaleBy, 0.8);
};

window.resetZoom = function () {
    config.svg.transition().call(zoom.transform, d3.zoomIdentity);
};

/**
 * === Pridávanie bodov ===
 */
config.svg.on("click", (event) => {
    // Získame aktuálnu transformáciu priamo z eventu
    const transform = d3.zoomTransform(config.svg.node());
    const [mouseX, mouseY] = d3.pointer(event, config.svg.node());
    
    // Upravíme súradnice podľa aktuálneho zoomu
    const x = (mouseX - transform.x) / transform.k;
    const y = (mouseY - transform.y) / transform.k;
    
    if (config.state.isAddingPoint) {
        addPoint(x, y);
    }
});

 window.toggleShapeMenu = function() {
    config.menu.style.display = config.menu.style.display === "flex" ? "none" : "flex";
}

 window.changeShape = function(shape) {
    if (!config.state.selectedPoint) {
        alert("Najskôr vyberte bod, ktorý chcete zmeniť!");
        return;
    }

    if (!storage.pointsHelpers[config.state.currentFloor] || !storage.pointsHelpers[config.state.currentFloor].points.includes(config.state.selectedPoint)) {
        alert("Tento bod nepatrí aktuálnemu poschodiu!");
        return;
    }

    let d3Shape;
    if (shape === "circle") d3Shape = d3.symbolCircle;
    if (shape === "triangle") d3Shape = d3.symbolTriangle;
    if (shape === "diamond") d3Shape = d3.symbolDiamond;
    if (shape === "star") d3Shape = d3.symbolStar;


    let pointElement = config.state.selectedPoint.circleElement.node();
    if (!pointElement) {
        console.error("Nepodarilo sa nájsť vybraný bod v SVG.");
        return;
    }

    console.log(`Meníme tvar bodu na: ${shape}`);

    d3.select(pointElement)
        .transition()
        .duration(300)
        .attr("d", d3.symbol().type(d3Shape).size(150)());

    console.log(`Tvar bodu zmenený na ${shape}`);
}



function addPoint(x, y) {
    if (!storage.pointsHelpers[config.state.currentFloor]) return;

    if (!storage.pointsHelpers[config.state.currentFloor].pointsGroup) {
        storage.pointsHelpers[config.state.currentFloor].pointsGroup = config.zoomGroup
            .append("g")
            .attr("class", `manual-points-group-${config.state.currentFloor}`);
    }

    const pointId = `M${storage.pointsHelpers[config.state.currentFloor].points.length + 1}_${config.state.currentFloor}`;
    const point = { x, y, id: pointId };

    storage.pointsHelpers[config.state.currentFloor].points.push(point);

    const d3Shape = d3.symbol().type(d3.symbolCircle).size(150);

    const path = storage.pointsHelpers[config.state.currentFloor].pointsGroup.append("path")
        .attr("d", d3Shape()) // Začneme s kruhom
        .attr("fill", "yellow") 
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .attr("class", "manual-point")
        .style("cursor", "pointer")
        .datum(point)
        .attr("transform", `translate(${x},${y})`)
        .on("click", function (event) {
            event.stopPropagation();
            if (config.state.isDeletingPoint) {
                removePoint(this, point);
            } else {
                selectPoint(this, point);
            }
        });

    point.circleElement = path;
    console.log(`Pridaný manuálny bod: ${point.id} (x=${x}, y=${y}) na poschodie ${config.state.currentFloor}`);
}


export function processJSON(data, routeId) {
    if (!data || !data.x_positions || !data.y_positions) {
        console.error("Neplatný JSON formát alebo chýbajú potrebné dáta.");
        return;
    }

    // Ak už boli dáta pre trasu načítané, preskočíme spracovanie
    if (storage.routeData[routeId]?.loaded) {
        console.log(`Dáta pre trasu ${routeId} už boli načítané. Preskakujem.`);
        return;
    }

    const svgWidth = 1100;
    const svgHeight = 600;
    const maxX = Math.max(...data.x_positions);
    const maxY = Math.max(...data.y_positions);
    const scaleX = svgWidth / maxX;
    const scaleY = svgHeight / maxY;

    let selectedRouteData = storage.routeData[routeId] || {};
    storage.routeData[routeId] = selectedRouteData;

    let fillColor = {
        route1: "red",
        route2: "lime",
        route3: "blue",
        route4: "yellow"
    }[routeId] || "gray";

    // Ak JSON neobsahuje poschodia, použijeme aktuálne poschodie
    let floors = Array.isArray(data.floor) ? data.floor : new Array(data.x_positions.length).fill(config.state.currentFloor);

    for (let i = 0; i < data.x_positions.length; i++) {
        let x = data.x_positions[i] * scaleX;
        let y = data.y_positions[i] * scaleY;
        let floor = floors[i];

        if (!selectedRouteData[floor]) {
            console.log(`Vytváram objekt pre poschodie ${floor} v trase ${routeId}`);
            selectedRouteData[floor] = { pointsGroup: null, floorplan: null, points: [] };
        }

        if (!selectedRouteData[floor].pointsGroup) {
            selectedRouteData[floor].pointsGroup = config.zoomGroup.append("g")
                .attr("class", `points-group-floor-${floor}-${routeId}`);
        }

        const pointId = `T${routeId}-${selectedRouteData[floor].points.length + 1}_${floor}`;
        const point = { x, y, id: pointId };
        selectedRouteData[floor].points.push(point);

        const circle = selectedRouteData[floor].pointsGroup.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", 5)
            .attr("fill", fillColor)
            .attr("class", "point")
            .datum(point)
            .on("click", function (event) {
                event.stopPropagation();
                config.state.isDeletingPoint ? removePoint(this, point) : selectPoint(this, point);
            });

        const text = selectedRouteData[floor].pointsGroup.append("text")
            .attr("x", x - 3.5)
            .attr("y", y + 4)
            .text(selectedRouteData[floor].points.length)
            .style("fill", "white")
            .style("font-size", "12px")
            .style("pointer-events", "none");

        point.circleElement = circle;
        point.textElement = text;

        console.log(`Pridaný bod: ${point.id} (x=${x}, y=${y}) na poschodie ${floor}, trasa ${routeId}`);
    }

    storage.routeData[routeId].loaded = true;
    setFloor(config.state.currentFloor);
}

export function drawCharts() {
    const routeColors = {
        route1: "red",
        route2: "green",
        route3: "blue",
        route4: "orange"
    };

    Object.keys(routeColors).forEach(routeKey => {
        console.log(`✅ Spustil sa graf pre trasu: ${routeKey}`);
        const svgElement = document.querySelector(`.chart-${routeKey}`);
        if (!svgElement) {
            console.warn(`❌ Neexistuje SVG element pre trasu: ${routeKey}`);
            return;
        }
        
        const svg = d3.select(svgElement);
        svg.selectAll("*").remove(); // Vyčistiť starý graf
        console.log(`➡️ Vyčistil som predchádzajúci graf pre trasu: ${routeKey}`);

        // 🟢 Zlúčiť všetky akcelerometer dáta pre danú trasu
        let allData = [];
        Object.values(storage.routeData[routeKey]).forEach(floorData => {
            if (floorData.eventMarkers) {
                floorData.eventMarkers.forEach(marker => {
                    marker.accelerometer.forEach(accel => {
                        allData.push(accel);
                    });
                });
            }
        });

        console.log(`🔍 Počet akcelerometrových dát pre trasu ${routeKey}: ${allData.length}`);
        if (allData.length === 0) {
            console.warn(`❌ Žiadne akcelerometer dáta pre trasu ${routeKey}`);
            return;
        }

        // 🔹 Rozmery grafu
        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        console.log(`📏 Nastavenie rozmerov grafu: Šírka = ${width}, Výška = ${height}`);

        // 🔹 Nastaviť škálovanie osí
        const xScale = d3.scaleTime()
            .domain([d3.min(allData, d => d.timestamp), d3.max(allData, d => d.timestamp)])
            .range([margin.left, width - margin.right]);
        console.log(`🔄 Nastavenie X škály: Časová os od ${d3.min(allData, d => d.timestamp)} do ${d3.max(allData, d => d.timestamp)}`);

        const yScale = d3.scaleLinear()
            .domain([
                d3.min(allData, d => Math.min(d.x, d.y, d.z)), 
                d3.max(allData, d => Math.max(d.x, d.y, d.z))
            ])
            .range([height - margin.bottom, margin.top]);
        console.log(`🔄 Nastavenie Y škály: Zrýchlenie od ${d3.min(allData, d => Math.min(d.x, d.y, d.z))} do ${d3.max(allData, d => Math.max(d.x, d.y, d.z))}`);

        // 🔹 Funkcie na kreslenie čiar
        const lineX = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.x));

        const lineY = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.y));

        const lineZ = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.z));

        console.log(`✏️ Začínam kresliť grafy pre trasu ${routeKey}`);

        // 🔹 Nakresliť línie pre X, Y, Z
        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", routeColors[routeKey]) // 🔴 Farba trasy
            .attr("stroke-width", 2)
            .attr("d", lineX);
        console.log(`🔴 Kreslím čiaru pre X pre trasu ${routeKey}`);

        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", d3.color(routeColors[routeKey]).darker(1)) // 🔵 Tmavšia pre Y
            .attr("stroke-width", 2)
            .attr("d", lineY);
        console.log(`🔵 Kreslím čiaru pre Y pre trasu ${routeKey}`);

        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", d3.color(routeColors[routeKey]).brighter(1)) // 🟢 Svetlejšia pre Z
            .attr("stroke-width", 2)
            .attr("d", lineZ);
        console.log(`🟢 Kreslím čiaru pre Z pre trasu ${routeKey}`);

        // 🔹 Os X (čas)
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M:%S")));
        console.log(`🕰️ Kreslím os X (čas)`);

        // 🔹 Os Y (zrýchlenie)
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));
        console.log(`📏 Kreslím os Y (zrýchlenie)`);
    });
}




export function handleFileUpload(event, fileType) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        if (fileType === "txt") {
            processTXT(text);
        }
    };
    reader.readAsText(file);
}


function processTXT(text) {
    const lines = text.split("\n");

    if (config.state.activeRoutes.length === 0) {
        console.error("❌ Žiadna aktívna trasa nie je vybraná!");
        return;
    }

    let activeRouteKey = config.state.activeRoutes[0]; // Použijeme prvú aktívnu trasu
    if (!storage.routeData.hasOwnProperty(activeRouteKey)) {
        console.error(`❌ Neplatná trasa: ${activeRouteKey}`);
        return;
    }

    let currentMarker = null;
    let localMarkerCount = 0;
    let selectedFloorData = storage.routeData[activeRouteKey];
    let selectedMarkerEvents = [];
    
    // Uloženie akcelometer dát
    if (!storage.routeData[activeRouteKey].accelerometerData) {
        storage.routeData[activeRouteKey].accelerometerData = {};
    }

    for (let line of lines) {
        const parts = line.trim().split("\t");
        if (parts.length < 2) continue;

        const timestamp = parseInt(parts[0], 10);
        const eventType = parts[1];

        if (eventType === ".MarkerEvent") {
            localMarkerCount++;
            let pointId = `T${activeRouteKey}-${localMarkerCount}_${config.state.currentFloor}`;
            let point = selectedFloorData[config.state.currentFloor]?.points.find(p => p.id.trim() === pointId.trim());

            if (!point && selectedFloorData[config.state.currentFloor + 1]) {
                config.state.currentFloor++;
                localMarkerCount = 1;
                pointId = `T${activeRouteKey}-${localMarkerCount}_${config.state.currentFloor}`;
                point = selectedFloorData[config.state.currentFloor]?.points.find(p => p.id.trim() === pointId.trim());
            }

            if (!point) {
                console.error(`Bod s ID ${pointId} nebol nájdený!`);
                continue;
            }

            currentMarker = { id: point.id, timestamp, accelerometer: [] };
            selectedMarkerEvents.push(currentMarker);
        } 
        else if (eventType === ".events.AccelerometerEvent" && parts.length >= 6) {
            if (currentMarker) {
                const x = parseFloat(parts[3]);
                const y = parseFloat(parts[4]);
                const z = parseFloat(parts[5]);
                currentMarker.accelerometer.push({ timestamp, x, y, z });

                // Uloženie akcelerometer údajov podľa poschodia
                if (!storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor]) {
                    storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor] = [];
                }
                storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor].push({ timestamp, x, y, z });
            }
        }
    }

    // 🔹 Uložíme `selectedMarkerEvents` do `storage.routeData`
    storage.routeData[activeRouteKey][config.state.currentFloor].eventMarkers = selectedMarkerEvents;

    console.log(`✅ Uložené Marker Events pre trasu ${activeRouteKey}, poschodie ${config.state.currentFloor}:`, selectedMarkerEvents);
    console.log(`📊 Uložené Accelerometer Data pre trasu ${activeRouteKey}, poschodie ${config.state.currentFloor}:`, storage.routeData[activeRouteKey].accelerometerData);

    // Reset poschodia na 0
    config.state.currentFloor = 0;
}




/**
 * === Odstraňovanie bodov ===
 */
window.removePoint = function() {
    if (!config.state.selectedPoint) {
        alert("Najskôr vyberte bod, ktorý chcete odstrániť!");
        return;
    }

    const isManualPoint = storage.pointsHelpers[config.state.currentFloor]?.points.includes(config.state.selectedPoint);

    if (!isManualPoint) {
        alert("Nemôžete odstrániť tento bod, nie je manuálny.");
        return;
    }

    const index = storage.pointsHelpers[config.state.currentFloor].points.findIndex(p => p.id === config.state.selectedPoint.id);
    if (index !== -1) {
       storage.pointsHelpers[config.state.currentFloor].points.splice(index, 1);
    }


    if (config.state.selectedPoint.circleElement) {
        config.state.selectedPoint.circleElement.remove();
    }
    if (config.state.selectedPoint.textElement) {
        config.state.selectedPoint.textElement.remove();
    }


    config.state.selectedPoint = null;
}


function selectPoint(element, point) {
    if (!point || !point.id) {
        console.warn("⚠️ Kliknutý bod nemá platné ID!", point);
        return;
    }

    const pointId = point.id.trim();
    console.log(`🔍 Kliknutý bod: ${pointId}`);

    const detailsPanel = document.getElementById("marker-details-panel");
    if (!detailsPanel) {
        console.error("❌ Chýba HTML element #marker-details-panel!");
        return;
    }

    // === Získame všetky pomocné body pre aktuálne poschodie ===
    const helperPoints = storage.pointsHelpers[config.state.currentFloor]?.points || {};
    const isHelperPoint = Object.values(helperPoints).some(helper => helper.id === pointId);

    // === Ak je tento bod už vybraný, tak ho zrušíme ===
    if (config.state.selectedPoint?.id === pointId) {
        console.log(`❌ Zrušenie výberu bodu: ${pointId}`);
        d3.select(element).classed("pulsating", false);
        config.state.selectedPoint = null;
        document.getElementById("marker-details").innerHTML = "";
        detailsPanel.style.display = "none";
        return;
    }

    // === Odznačíme všetky ostatné body ===
    d3.selectAll("circle").classed("pulsating", false);

    // === Ak je to pomocný bod ===
    if (isHelperPoint) {
        console.log(`🟡 Bod ${pointId} je pomocný!`);
        d3.select(element).classed("pulsating", true);
        config.state.selectedPoint = point; // Uložíme vybraný bod

        document.getElementById("marker-details").innerHTML = `
            <strong>Pomocný bod</strong><br>
            ID: ${pointId}
        `;
        detailsPanel.style.display = "block";
        return;
    }

    // ✅ Debug: Skontrolujeme štruktúru routeData
    console.log("📌 Celé routeData:", storage.routeData);

    let allMarkerEvents = [];
    for (const [routeName, route] of Object.entries(storage.routeData)) {
        for (const [floor, floorData] of Object.entries(route)) {
            if (floorData?.eventMarkers) {
                console.log(`📌 EventMarkers z ${routeName}, poschodie ${floor}:`, floorData.eventMarkers);
                allMarkerEvents.push(...floorData.eventMarkers);
            }
        }
    }

    console.log("🔎 Všetky zozbierané markerEvents:", allMarkerEvents.map(m => m.id));

    let marker = allMarkerEvents.find(m => m.id.trim() === pointId);

    if (!marker) {
        console.warn(`⚠️ Nenašiel sa MarkerEvent pre bod ${pointId}`);
        return;
    }

    config.state.selectedPoint = point;
    d3.select(element).classed("pulsating", true);

    const lastAcc = marker.accelerometer.length > 0 
        ? marker.accelerometer[marker.accelerometer.length - 1] 
        : null;

    document.getElementById("marker-details").innerHTML = `
        <strong>Bod:</strong> ${pointId} <br>
        <strong>Timestamp:</strong> ${marker.timestamp / 1000} s <br>
        <strong>Počet akcelerometer meraní:</strong> ${marker.accelerometer.length} <br>
        ${lastAcc ? `<strong>Posledné zrýchlenie:</strong> X=${lastAcc.x}, Y=${lastAcc.y}, Z=${lastAcc.z}` : "Žiadne akcelerometer dáta"}
    `;
    detailsPanel.style.display = "block";
}

/**
 * === Zmena farby bodu cez color picker ===
 */
window.openColorPicker = function() {
    if (!config.state.selectedPoint) {
        alert("Najskôr vyberte bod!");
        return;
    }

    if (!storage.pointsHelpers[config.state.currentFloor] || !storage.pointsHelpers[config.state.currentFloor].points.includes(config.state.selectedPoint)) {
        alert("Tento bod nepatrí aktuálnemu poschodiu!");
        return;
    }

    config.colorPicker.click();
    config.colorPicker.addEventListener("input", function handler(event) {
        const newColor = event.target.value;

        
        let pointElement = config.state.selectedPoint.circleElement.node();
        if (!pointElement) {
            return;
        }

        d3.select(pointElement).attr("fill", newColor);
        document.getElementById("color-swatch").style.background = newColor;

    }, { once: true });
}

// 2. Vytvor funkciu pre spracovanie zmien
 export function handleSizeChange(event) {
    if (!config.state.selectedPoint) return;
    
    const newSize = parseFloat(event.target.value);
    updatePointSize(newSize);
}

// 3. Vylepšená funkcia pre aktualizáciu veľkosti
function updatePointSize(newSize) {
    const point = config.state.selectedPoint;
    if (!point || !point.circleElement) return;

    const element = point.circleElement.node();
    newSize = parseFloat(newSize) || 5;

    if (element.tagName === "circle") {
        point.circleElement.attr("r", newSize);
    } else if (element.tagName === "path") {
        // Získame pôvodnú pozíciu bez transformácie
        const [x, y] = [point.x, point.y];
        // Aplikujeme novú veľkosť
        point.circleElement.attr("transform", `translate(${x},${y}) scale(${newSize/10})`);
    }
}

// 4. Pôvodnú funkciu môžeme nechať ako fallback
window.openSizeInput = function() {
    if (!config.state.selectedPoint) {
        console.error("Nie je vybraný žiadny bod");
        return;
    }
    updatePointSize(config.sizeSlider.value);
}



/**
 * === Prepínanie poschodí a reset animácie ===
 */
function setFloor(floor) {
    // Ak aktuálne poschodie nie je definované v manuálnych dátach, môžeme vrátiť (alebo to upraviť podľa potreby)
    if (!storage.pointsHelpers[floor]) return;
    
    resetAnimation();

    // Najprv skryjeme všetky body zo všetkých trás (v routeData)
    Object.keys(storage.routeData).forEach(routeId => {
        const route = storage.routeData[routeId];
        Object.keys(route).forEach(key => {
            // Preskočíme vlastnosť "loaded"
            if (key === "loaded") return;
            if (route[key].pointsGroup) {
                route[key].pointsGroup.style("display", "none");
            }
        });
    });

    // Skryjeme aj manuálne body (pointsHelpers) pre všetky poschodia
    Object.keys(storage.pointsHelpers).forEach(f => {
        if (storage.pointsHelpers[f]?.pointsGroup) {
            storage.pointsHelpers[f].pointsGroup.style("display", "none");
        }
    });

    // Pre každú aktívnu trasu zobrazíme body pre požadované poschodie
    config.state.activeRoutes.forEach(routeId => {
        if (storage.routeData[routeId] && storage.routeData[routeId][floor] && storage.routeData[routeId][floor].pointsGroup) {
            storage.routeData[routeId][floor].pointsGroup.style("display", "block");
        }
    });

    // Zobrazíme manuálne body pre aktuálne poschodie
    if (storage.pointsHelpers[floor]?.pointsGroup) {
        storage.pointsHelpers[floor].pointsGroup.style("display", "block");
    }

    // Aktualizujeme stav aktuálneho poschodia
    config.state.currentFloor = floor;

    // Aktualizujeme text v zobrazovači poschodia
    document.getElementById("currentFloorDisplay").textContent = 
        floor === 0 ? "Prízemie" : `${floor}. poschodie`;

    // Nastavíme obrázok podlahového plánu.
    // Prejdeme cez aktívne trasy a pokúsime sa nájsť prvý definovaný floorplan pre dané poschodie.
    let floorplan = null;
    config.state.activeRoutes.some(routeId => {
        if (storage.routeData[routeId] && storage.routeData[routeId][floor] && storage.routeData[routeId][floor].floorplan) {
            floorplan = storage.routeData[routeId][floor].floorplan;
            return true; // našli sme
        }
        return false;
    });
    if (!floorplan) {
        floorplan = "images/background.png";
    }
    const floorplanImage = document.querySelector("#floorplan image");
    floorplanImage.setAttribute("href", floorplan);

    console.log(`Prepnuté na poschodie ${floor} (zobrazené body z aktívnych trás a manuálne body)`);
}
window.setFloor = setFloor;
 



window.resetWholeMap = function() {
    // 1. Reset všetkých trás v storage.routeData
    Object.keys(storage.routeData).forEach(routeId => {
        // Resetujeme každé poschodie pre každú trasu
        for (let floor = 0; floor <= 4; floor++) {
            if (storage.routeData[routeId][floor]) {
                // Odstránime všetky SVG prvky
                if (storage.routeData[routeId][floor].pointsGroup) {
                    storage.routeData[routeId][floor].pointsGroup.selectAll("*").remove();
                }
                // Vyčistíme pole bodov
                storage.routeData[routeId][floor].points = [];
                storage.routeData[routeId][floor].eventMarkers = [];
            }
        }
        // Označíme trasu ako nenahratú
        storage.routeData[routeId].loaded = false;
    });

    // 2. Reset manuálnych bodov v pointsHelpers
    Object.keys(storage.pointsHelpers).forEach(floor => {
        if (storage.pointsHelpers[floor].pointsGroup) {
            storage.pointsHelpers[floor].pointsGroup.selectAll("*").remove();
        }
        storage.pointsHelpers[floor].points = [];
    });

    // 3. Vyčistenie animovaných ciest
    config.pathGroup.selectAll("*").remove();

    // 4. Reset zoomu
    config.svg.transition().duration(750).call(config.zoom.transform, d3.zoomIdentity);

    // 5. Reset stavových premenných
    config.state.selectedPoint = null;
    config.state.isAddingPoint = false;
    config.state.isDeletingPoint = false;

    // 6. Reset animácie
    if (typeof stop === 'function') {
        stop();
    }

    // 7. Reset pôdorysu na predvolený obrázok
    config.floorplanImage.setAttribute("href", "images/background.png");

    console.log("Mapa bola kompletne resetovaná.");
};

export function toggleLED(color) {
    console.log("Farba LED:", color);
    
    const button = config.buttons[color];
    if (!button) {
        console.error(`❌ Chyba: Button pre ${color} neexistuje!`);
        return;
    }
    
    // Prepnutie triedy "active"
    const isActive = button.classList.toggle("active");
    
    // Získame identifikátor trasy z config.routeMapping
    const routeId = config.routeMapping[color];
    
    if (isActive) {
        // Pridáme trasu do aktívnych trás, ak ešte nie je pridaná
        if (!config.state.activeRoutes.includes(routeId)) {
            config.state.activeRoutes.push(routeId);
        }
        console.log(`Pridaná trasa: ${routeId}. Aktívne trasy:`, config.state.activeRoutes);
        
        // Tu môžete pridať volanie funkcie, ktorá načíta JSON dáta pre túto trasu,
        // napr. loadRouteData(routeId);
    } else {
        // Odstránime trasu z aktívnych trás
        config.state.activeRoutes = config.state.activeRoutes.filter(route => route !== routeId);
        console.log(`Odstránená trasa: ${routeId}. Aktívne trasy:`, config.state.activeRoutes);
        
        // Tu môžete pridať volanie funkcie, ktorá skryje dáta pre túto trasu,
        // napr. hideRouteData(routeId);
    }

    setFloor(config.state.currentFloor);
    
    console.log(`Triedy pre ${color}:`, button.classList);
}
