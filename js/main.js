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
    const transform = d3.zoomTransform(config.svg.node());
    const [mouseX, mouseY] = d3.pointer(event, config.svg.node());
    
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
        .attr("d", d3Shape())
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

    // ak json neobsahuje poschodia k bodom, tak vytvorime len pole velkosti poctu bodov a naplnime aktualnym poschodim
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
        console.log(`Spustil sa graf pre trasu: ${routeKey}`);
        const svgElement = document.querySelector(`.chart-${routeKey}`);
        if (!svgElement) {
            console.warn(`Neexistuje SVG element pre trasu: ${routeKey}`);
            return;
        }
        
        const svg = d3.select(svgElement);
        
         svg.on("click", () => {
         openDetailChart(routeKey);
         });

        svg.selectAll("*").remove();
        
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

        console.log(`Počet akcelerometrových dát pre trasu ${routeKey}: ${allData.length}`);

        if (allData.length === 0) {
            console.warn(`Žiadne akcelerometer dáta pre trasu ${routeKey}`);
            return;
        }

        const width = +svg.attr("width");
        const height = +svg.attr("height");
        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        console.log(`Nastavenie rozmerov grafu: Šírka = ${width}, Výška = ${height}`);

        // vytvara casovy interval na ktorom bude vykresleny graf 
        const xScale = d3.scaleTime()
            .domain([d3.min(allData, d => d.timestamp), d3.max(allData, d => d.timestamp)])
            .range([margin.left, width - margin.right]);
        console.log(`Nastavenie X škály: Časová os od ${d3.min(allData, d => d.timestamp)} do ${d3.max(allData, d => d.timestamp)}`);
        
        //nastavenie osy Y od minimalnej po maximalnu hodnotu zrychlenia 
        const yScale = d3.scaleLinear()
            .domain([
                d3.min(allData, d => Math.min(d.x, d.y, d.z)), 
                d3.max(allData, d => Math.max(d.x, d.y, d.z))
            ])
            .range([height - margin.bottom, margin.top]);
        console.log(`Nastavenie Y škály: Zrýchlenie od ${d3.min(allData, d => Math.min(d.x, d.y, d.z))} do ${d3.max(allData, d => Math.max(d.x, d.y, d.z))}`);

        const lineX = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.x));

        const lineY = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.y));

        const lineZ = d3.line()
            .x(d => xScale(d.timestamp))
            .y(d => yScale(d.z));

        console.log(`Začínam kresliť grafy pre trasu ${routeKey}`);


        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", routeColors[routeKey])
            .attr("stroke-width", 2)
            .attr("d", lineX);
        console.log(`Kreslím čiaru pre X pre trasu ${routeKey}`);

        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", d3.color(routeColors[routeKey]).darker(1))
            .attr("stroke-width", 2)
            .attr("d", lineY);
        console.log(`Kreslím čiaru pre Y pre trasu ${routeKey}`);

        svg.append("path")
            .datum(allData)
            .attr("fill", "none")
            .attr("stroke", d3.color(routeColors[routeKey]).brighter(1)) 
            .attr("stroke-width", 2)
            .attr("d", lineZ);
        console.log(`Kreslím čiaru pre Z pre trasu ${routeKey}`);


        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%M:%S, ")));
        console.log(`Kreslím os X (čas)`);


        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale));
        console.log(`Kreslím os Y (zrýchlenie)`);
    });
}

export function drawDetailChart(routeKey) {
    const svg = d3.select("#detailChart");
    svg.selectAll("*").remove();

    const routeData = storage.routeData[routeKey];
    if (!routeData) return;

    const allData = [];
    Object.values(routeData).forEach(floorData => {
        if (floorData?.eventMarkers) {
            floorData.eventMarkers.forEach(marker => {
                marker.accelerometer.forEach(a => allData.push(a));
            });
        }
    });

    if (allData.length === 0) {
        svg.append("text").text("Žiadne dáta").attr("x", 50).attr("y", 50);
        return;
    }

    const width = +svg.node().clientWidth || 1000;  // fallback
    const height = +svg.node().clientHeight || 500;

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };

    const x = d3.scaleTime()
        .domain(d3.extent(allData, d => d.timestamp))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(allData, d => Math.min(d.x, d.y, d.z)),
            d3.max(allData, d => Math.max(d.x, d.y, d.z))
        ])
        .range([height - margin.bottom, margin.top]);

    const line = axis => d3.line()
        .x(d => x(d.timestamp))
        .y(d => y(d[axis]));

    svg.append("path").datum(allData).attr("fill", "none").attr("stroke", "red").attr("stroke-width", 2).attr("d", line("x"));
    svg.append("path").datum(allData).attr("fill", "none").attr("stroke", "green").attr("stroke-width", 2).attr("d", line("y"));
    svg.append("path").datum(allData).attr("fill", "none").attr("stroke", "blue").attr("stroke-width", 2).attr("d", line("z"));

    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d3.timeFormat("%M:%S")));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

    svg.append("text").attr("x", 60).attr("y", 30).text("X (červená)").style("fill", "red");
    svg.append("text").attr("x", 160).attr("y", 30).text("Y (zelená)").style("fill", "green");
    svg.append("text").attr("x", 260).attr("y", 30).text("Z (modrá)").style("fill", "blue");
}


export function openDetailChart(routeKey) {
    document.getElementById("detailChartModal").style.display = "flex";
    setTimeout(() => drawDetailChart(routeKey), 50); 
}



export function handleFileUpload(event, fileType) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        //obsah nahrateho suboru ako text
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
        console.error("Žiadna aktívna trasa nie je vybraná!");
        return;
    }

    // Pouzijeme prvu aktivnu trasu
    let activeRouteKey = config.state.activeRoutes[0];  
    if (!storage.routeData.hasOwnProperty(activeRouteKey)) {
        console.error(`Neplatná trasa: ${activeRouteKey}`);
        return;
    }

    let currentMarker = null;
    let localMarkerCount = 0;
    let selectedFloorData = storage.routeData[activeRouteKey];
    let selectedMarkerEvents = [];
    

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
            //ak bod neexistuje na aktualnom poschodi, tak sa snazime najst na dalsom 
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

                // Uloženie akcelerometer udajov podla poschodia
                if (!storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor]) {
                    storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor] = [];
                }
                storage.routeData[activeRouteKey].accelerometerData[config.state.currentFloor].push({ timestamp, x, y, z });
            }
        }
    }

    storage.routeData[activeRouteKey][config.state.currentFloor].eventMarkers = selectedMarkerEvents;

    console.log(`Uložené Marker Events pre trasu ${activeRouteKey}, poschodie ${config.state.currentFloor}:`, selectedMarkerEvents);
    console.log(`Uložené Accelerometer Data pre trasu ${activeRouteKey}, poschodie ${config.state.currentFloor}:`, storage.routeData[activeRouteKey].accelerometerData);

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
        console.warn("Kliknutý bod nemá platné ID!", point);
        return;
    }

    const pointId = point.id.trim();
    const detailsPanel = document.getElementById("marker-details-panel");
    // Získame všetky pomocné body pre aktuálne poschodie
    const helperPoints = storage.pointsHelpers[config.state.currentFloor]?.points || {};
    const isHelperPoint = Object.values(helperPoints).some(helper => helper.id === pointId);

    // Ak je tento bod už vybraný, tak ho zrušíme 
    if (config.state.selectedPoint?.id === pointId) {
        console.log(`Zrušenie výberu bodu: ${pointId}`);
        d3.select(element).classed("pulsating", false);
        config.state.selectedPoint = null;
        document.getElementById("marker-details").innerHTML = "";
        detailsPanel.style.display = "none";
        return;
    }

    // odznacime vsetky ostatne body
    d3.selectAll("circle").classed("pulsating", false);

    // Ak je to pomocný bod 
    if (isHelperPoint) {
        console.log(`Bod ${pointId} je pomocný!`);
        d3.select(element).classed("pulsating", true);
        config.state.selectedPoint = point;

        document.getElementById("marker-details").innerHTML = `
            <strong>Pomocný bod</strong><br>
            ID: ${pointId}
        `;
        detailsPanel.style.display = "block";
        return;
    }

    console.log("Celé routeData:", storage.routeData);
    let allMarkerEvents = [];
    for (const [routeName, route] of Object.entries(storage.routeData)) {
        for (const [floor, floorData] of Object.entries(route)) {
            if (floorData?.eventMarkers) {
                console.log(`EventMarkers z ${routeName}, poschodie ${floor}:`, floorData.eventMarkers);
                allMarkerEvents.push(...floorData.eventMarkers);
            }
        }
    }

    console.log("Všetky zozbierané markerEvents:", allMarkerEvents.map(m => m.id));

    let marker = allMarkerEvents.find(m => m.id.trim() === pointId);

    if (!marker) {
        console.warn(`Nenašiel sa MarkerEvent pre bod ${pointId}`);
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


 export function handleSizeChange(event) {
    if (!config.state.selectedPoint) return;
    
    const newSize = parseFloat(event.target.value);
    updatePointSize(newSize);
}


function updatePointSize(newSize) {
    const point = config.state.selectedPoint;
    if (!point || !point.circleElement) return;

    const element = point.circleElement.node();
    newSize = parseFloat(newSize) || 5;

    if (element.tagName === "circle") {
        point.circleElement.attr("r", newSize);
    } else if (element.tagName === "path") {

        const [x, y] = [point.x, point.y];

        point.circleElement.attr("transform", `translate(${x},${y}) scale(${newSize/10})`);
    }
}


window.openSizeInput = function() {
    if (!config.state.selectedPoint) {
        console.error("Nie je vybraný žiaden bod");
        return;
    }
    updatePointSize(config.sizeSlider.value);
}


/**
 * === Prepínanie poschodí a reset animácie ===
 */
function setFloor(floor) {

    if (isNaN(floor)) {
        console.warn("Hodnota poschodia je NaN, nastavujem na 0 (prízemie).");
        floor = 0;
    }
    if (!storage.pointsHelpers[floor]) return;

    
    resetAnimation();


    Object.keys(storage.routeData).forEach(routeId => {
        const route = storage.routeData[routeId];
        Object.keys(route).forEach(key => {

            if (key === "loaded") return;
            if (route[key].pointsGroup) {
                route[key].pointsGroup.style("display", "none");
            }
        });
    });


    Object.keys(storage.pointsHelpers).forEach(f => {
        if (storage.pointsHelpers[f]?.pointsGroup) {
            storage.pointsHelpers[f].pointsGroup.style("display", "none");
        }
    });


    config.state.activeRoutes.forEach(routeId => {
        if (storage.routeData[routeId] && storage.routeData[routeId][floor] && storage.routeData[routeId][floor].pointsGroup) {
            storage.routeData[routeId][floor].pointsGroup.style("display", "block");
        }
    });

    if (storage.pointsHelpers[floor]?.pointsGroup) {
        storage.pointsHelpers[floor].pointsGroup.style("display", "block");
    }


    config.state.currentFloor = floor;

    document.getElementById("currentFloorDisplay").textContent = 
        floor === 0 ? "Prízemie" : `${floor}. poschodie`;


    let floorplan = null;
    config.state.activeRoutes.some(routeId => {
        if (storage.routeData[routeId] && storage.routeData[routeId][floor] && storage.routeData[routeId][floor].floorplan) {
            floorplan = storage.routeData[routeId][floor].floorplan;
            return true;
        }
        return false;
    });
    if (!floorplan) {
        floorplan = config.state.floorPlans[floor];
    }
    if (!floorplan) {
        floorplan = "images/background.png";
    }
    
    const floorplanImage = document.querySelector("#floorplan image");
    floorplanImage.setAttribute("href", floorplan);

    console.log(`Prepnuté na poschodie ${floor} (zobrazené body z aktívnych trás a manuálne body)`);
}
window.setFloor = setFloor;
 



window.resetWholeMap = function() {

    Object.keys(storage.routeData).forEach(routeId => {
 
        for (let floor = 0; floor <= 4; floor++) {
            if (storage.routeData[routeId][floor]) {
  
                if (storage.routeData[routeId][floor].pointsGroup) {
                    storage.routeData[routeId][floor].pointsGroup.selectAll("*").remove();
                }
       
                storage.routeData[routeId][floor].points = [];
                storage.routeData[routeId][floor].eventMarkers = [];
            }
        }
   
        storage.routeData[routeId].loaded = false;
    });

    Object.keys(storage.pointsHelpers).forEach(floor => {
        if (storage.pointsHelpers[floor].pointsGroup) {
            storage.pointsHelpers[floor].pointsGroup.selectAll("*").remove();
        }
        storage.pointsHelpers[floor].points = [];
    });


    config.pathGroup.selectAll("*").remove();


    config.svg.transition().duration(750).call(config.zoom.transform, d3.zoomIdentity);

    config.state.selectedPoint = null;
    config.state.isAddingPoint = false;
    config.state.isDeletingPoint = false;

    if (typeof stop === 'function') {
        stop();
    }


    config.floorplanImage.setAttribute("href", "images/background.png");

    console.log("Mapa bola kompletne resetovaná.");
};

export function toggleLED(color) {
    console.log("Farba LED:", color);
    
    const button = config.buttons[color];

    if (!button) {
        console.error(`Chyba: Button pre ${color} neexistuje!`);
        return;
    }
    
    const isActive = button.classList.toggle("active");
    const routeId = config.routeMapping[color];
    
    if (isActive) {
 
        if (!config.state.activeRoutes.includes(routeId)) {
            config.state.activeRoutes.push(routeId);
        }
        console.log(`Pridaná trasa: ${routeId}. Aktívne trasy:`, config.state.activeRoutes);

    } else {
        // Odstránime trasu z aktívnych trás
        config.state.activeRoutes = config.state.activeRoutes.filter(route => route !== routeId);
        console.log(`Odstránená trasa: ${routeId}. Aktívne trasy:`, config.state.activeRoutes);
    }

    setFloor(config.state.currentFloor);
    
    console.log(`Triedy pre ${color}:`, button.classList);
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function exportFullProject() {
    // Deep clone, ale iba serializovateľné dáta
    function cleanPoints(points) {
        return points.map(p => {
            const { x, y, id } = p;
            return { x, y, id };
        });
    }

    function cleanRouteData(routeData) {
        const cleaned = {};
        for (const floor in routeData) {
            if (["loaded", "accelerometerData"].includes(floor)) {
                cleaned[floor] = routeData[floor];
                continue;
            }

            cleaned[floor] = {
                floorplan: routeData[floor].floorplan,
                points: cleanPoints(routeData[floor].points),
                eventMarkers: routeData[floor].eventMarkers
            };
        }
        cleaned.accelerometerData = routeData.accelerometerData;
        cleaned.loaded = routeData.loaded;
        return cleaned;
    }

    function cleanPointsHelpers(helpers) {
        const result = {};
        for (const floor in helpers) {
            result[floor] = {
                points: cleanPoints(helpers[floor].points)
            };
        }
        return result;
    }

    const exportData = {
        routes: Object.fromEntries(
            Object.entries(storage.routeData).map(([routeId, route]) => [
                routeId,
                cleanRouteData(route)
            ])
        ),
        manualPoints: cleanPointsHelpers(storage.pointsHelpers),
        floorPlans: config.state.floorPlans,
        state: {
            currentFloor: config.state.currentFloor,
            activeRoutes: config.state.activeRoutes
        }
    };

    downloadJSON(exportData, "indoor_project_export.json");
}

export function importFullProject(data) {
    if (!data || !data.routes) {
        console.error("Neplatný formát projektu.");
        return;
    }

    // Reset aktuálnych dát
    config.pathGroup.selectAll("*").remove();
    config.state.selectedPoint = null;
    config.state.isAddingPoint = false;
    config.state.isDeletingPoint = false;

    // Obnova dát
    Object.assign(storage.routeData, data.routes);
    Object.assign(storage.pointsHelpers, data.manualPoints);
    config.state.floorPlans = data.floorPlans;
    config.state.currentFloor = data.state.currentFloor || 0;
    config.state.activeRoutes = data.state.activeRoutes || [];

    // Prekresli všetko
    Object.entries(storage.routeData).forEach(([routeId, route]) => {
        for (let floor = 0; floor <= 4; floor++) {
            if (route[floor]?.points?.length > 0) {
                if (!route[floor].pointsGroup) {
                    route[floor].pointsGroup = config.zoomGroup.append("g")
                        .attr("class", `points-group-floor-${floor}-${routeId}`);
                }
                route[floor].points.forEach((point, index) => {
                    const circle = route[floor].pointsGroup.append("circle")
                        .attr("cx", point.x)
                        .attr("cy", point.y)
                        .attr("r", 5)
                        .attr("fill", routeId === "route1" ? "red" :
                                        routeId === "route2" ? "lime" :
                                        routeId === "route3" ? "blue" : "yellow")
                        .attr("class", "point")
                        .datum(point)
                        .on("click", function (event) {
                            event.stopPropagation();
                            config.state.isDeletingPoint ? removePoint(this, point) : selectPoint(this, point);
                        });

                    const text = route[floor].pointsGroup.append("text")
                        .attr("x", point.x - 3.5)
                        .attr("y", point.y + 4)
                        .text(index + 1)
                        .style("fill", "white")
                        .style("font-size", "12px")
                        .style("pointer-events", "none");

                    point.circleElement = circle;
                    point.textElement = text;
                });
            }
        }
    });

    Object.entries(storage.pointsHelpers).forEach(([floor, helper]) => {
        if (!helper.pointsGroup) {
            helper.pointsGroup = config.zoomGroup.append("g")
                .attr("class", `manual-points-group-${floor}`);
        }

        helper.points.forEach(point => {
            const d3Shape = d3.symbol().type(d3.symbolCircle).size(150);
            const path = helper.pointsGroup.append("path")
                .attr("d", d3Shape())
                .attr("fill", "yellow")
                .attr("stroke", "black")
                .attr("stroke-width", 1.5)
                .attr("class", "manual-point")
                .style("cursor", "pointer")
                .datum(point)
                .attr("transform", `translate(${point.x},${point.y})`)
                .on("click", function (event) {
                    event.stopPropagation();
                    if (config.state.isDeletingPoint) {
                        removePoint(this, point);
                    } else {
                        selectPoint(this, point);
                    }
                });

            point.circleElement = path;
        });
    });

    setFloor(config.state.currentFloor);
}
