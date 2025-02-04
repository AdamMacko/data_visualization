// ---- HTML prvky ----
const svg = d3.select("#floorplan");  // svg okno
const zoomGroup = svg.select("#zoomGroup"); // obsah svg okna
const mapContainer = document.getElementById("mapContainer");
const editPointMenu = document.getElementById("edit-point-menu"); // Rozbalovacie menu pre upravu bodu
const sizeSlider = document.getElementById("sizeSlider"); // slider pre zmenu velkosti

// ---- Ovladacie prvky ----
const buttons = {
    add: document.getElementById("btn-add-circle"),
    update: document.getElementById("btn-update-circle"),
    delete: document.getElementById("btn-delete-circle"),
    reset: document.getElementById("btn-reset-map"),
    uploadMap: document.getElementById("btn-upload-map"),
    uploadCSV: document.getElementById("btn-upload-csv"),
    uploadJSON: document.getElementById("btn-upload-json"),
    uploadTXT: document.getElementById("btn-upload-txt"),
};

const fileInputs = {
    map: document.getElementById("floorplan-upload"),
    json: document.getElementById("jsonFileInput"),
    txt: document.getElementById("txtFileInput"),
};

// Premenne na zoom a body
let currentTransform = d3.zoomIdentity;
let points = [];
let textCoordinates = [];
let isAddingPoint = false;
let isDeletingPoint = false;
let pointCounter = 1; // premenna pre ocislovanie pridaneho bodu
let selectedPoint = null; // aktualne vybrany bod


// rozbalovacie menu funkcionalita
buttons.update.addEventListener("click", (event) => {
    event.stopPropagation();
    editPointMenu.classList.toggle("show");
});

document.addEventListener("click", (event) => {
    if (!event.target.closest("#edit-point-menu") && !event.target.closest("#btn-update-circle")) {
        editPointMenu.classList.remove("show");
    }
});

// nNastavenie zoomu
const zoom = d3.zoom()
    .scaleExtent([0.5, 5])
    .on("zoom", (event) => {
        currentTransform = event.transform;
        zoomGroup.attr("transform", currentTransform);
    });
svg.call(zoom);

// zoom funkcie
function zoomIn() { svg.transition().call(zoom.scaleBy, 1.2); }
function zoomOut() { svg.transition().call(zoom.scaleBy, 0.8); }
function resetZoom() {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
    currentTransform = d3.zoomIdentity;
}

// pridavanie bodov
buttons.add.addEventListener("click", () => {
    isAddingPoint = !isAddingPoint;
    buttons.add.textContent = isAddingPoint ? "Zrušiť pridávanie bodov" : "Pridať bod";
    buttons.add.classList.toggle("active", isAddingPoint);
});

// odstranovanie bodov
buttons.delete.addEventListener("click", () => {
    isDeletingPoint = !isDeletingPoint;
    buttons.delete.textContent = isDeletingPoint ? "Zrušiť odstraňovanie" : "Odstrániť bod";
    buttons.delete.classList.toggle("active", isDeletingPoint);
});

// kliknutie na SVG + pridavanie bodov
svg.on("click", (event) => {
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    const x = (mouseX - currentTransform.x) / currentTransform.k;
    const y = (mouseY - currentTransform.y) / currentTransform.k;

    if (isAddingPoint) {
        addPoint(x, y);
    }
});

function addPoint(x, y) {
    const point = { x, y, id: `C${pointCounter}` };
    points.push(point);

    // Pridanie bodu do svg
    const circle = zoomGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5)
        .attr("fill", "red")
        .attr("class", "point")
        .datum(point)
        .on("click", function (event) {
            event.stopPropagation(); // zastavenie bublovania eventu
            if (isDeletingPoint) {
                removePoint(this, point);
            } else {
                selectPoint(this, point);
            }
        });

    // suradnice pre text (cislo bodu)
    const textX = x - 3.5;
    const textY = y + 4;

    const text = zoomGroup.append("text")
        .attr("x", textX)
        .attr("y", textY)
        .text(pointCounter)
        .style("fill", "white")
        .style("font-size", "12px")
        .style("pointer-events", "none");

    point.circleElement = circle;
    point.textElement = text;
    textCoordinates.push({ x: textX, y: textY });

    console.log(`Pridaný bod: ${point.id} (x=${x}, y=${y})`);
    pointCounter++;
    isAddingPoint = false;
    buttons.add.textContent = "Pridať bod";
    buttons.add.classList.remove("active");
}

// funkcia pre vymazanie bodu 
function removePoint(element, point) {
    const index = points.findIndex(p => p.x === point.x && p.y === point.y);
    if (index !== -1) points.splice(index, 1);

    point.circleElement.remove();
    point.textElement.remove();

    const textIndex = textCoordinates.findIndex(coord => coord.x === point.textElement.attr("x") && coord.y === point.textElement.attr("y"));
    if (textIndex !== -1) textCoordinates.splice(textIndex, 1);

    pointCounter--;
    console.log(`Odstránený bod: ${point.id}`);
}

// funkcia na vyber bodu + pulzovanie
function selectPoint(element, point) {

    zoomGroup.selectAll("circle").classed("pulsating", false);

    if (selectedPoint !== point) {
        selectedPoint = point;
        d3.select(element).classed("pulsating", true);
        console.log(`Vybraný bod: ${point.id}`);
    } else {
        selectedPoint = null;
        console.log(`Zrušený výber bodu: ${point.id}`);
    }
}

// upload mapy
buttons.uploadMap.addEventListener("click", () => fileInputs.map.click());
fileInputs.map.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        d3.select("#zoomGroup image").attr("href", e.target.result);
    };
    reader.readAsDataURL(file);
});

// zmena farby bodu 
function openColorPicker() {
    if (!selectedPoint) {
        alert("Najskôr vyberte bod!");
        return;
    }
    
    const colorPicker = document.getElementById("colorPicker");
    colorPicker.click();  // Otvori rgb

    colorPicker.addEventListener("input", function handler(event) {
        const newColor = event.target.value;
        selectedPoint.circleElement.attr("fill", newColor);
        document.getElementById("color-swatch").style.background = newColor;
    }, { once: true });
}

// zmena velkosti bodu cez slider 

sizeSlider.addEventListener("input", function() {
    if (selectedPoint) {
        const newSize = this.value;
        selectedPoint.circleElement.attr("r", newSize);
    }
});

function openSizeInput() {
    if (!selectedPoint) {
        alert("Najskôr vyberte bod!");
        return;
    }
    const currentSize = selectedPoint.circleElement.attr("r") || 5;
    sizeSlider.value = currentSize;
    sizeSlider.style.display = "block";
}
