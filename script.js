// ---- HTML prvky ----
const svg = d3.select("#floorplan");  // svg okno
const zoomGroup = svg.select("#zoomGroup"); // obsah svg okna
const mapContainer = document.getElementById("mapContainer");
const editPointMenu = document.getElementById("edit-point-menu"); // Rozbalovacie menu pre upravu bodu
const sizeSlider = document.getElementById("sizeSlider"); // slider pre zmenu velkosti
const pathGroup = zoomGroup.append("g").attr("id", "pathGroup"); // Skupina pre trasu
const pointsGroup = zoomGroup.append("g").attr("id", "pointsGroup"); // Skupina pre body


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
let animationRunning = false;//pomocna boolean pre animovane vykreslovanie
let animationIndex = 0; // index na ktorom bode animujeme aktualne
let movingCircle = null; // kruh animacie, ktory prechadza trasou
let pathLine = null; // hrany medzi bodmi


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
//pridavanie bodov button
buttons.add.addEventListener("click", () => {
    isAddingPoint = !isAddingPoint;
    
    if (isAddingPoint) {
        buttons.add.innerHTML = `<span class="material-symbols-outlined">close</span> Zrušiť pridávanie bodov`;
    } else {
        buttons.add.innerHTML = `<span class="material-symbols-outlined">add</span> Pridať bod`;
    }

    buttons.add.classList.toggle("active", isAddingPoint);
});


// odstranovanie bodov
buttons.delete.addEventListener("click", () => {
    isDeletingPoint = !isDeletingPoint;
    

    buttons.delete.innerHTML = isDeletingPoint 
        ? `<span class="material-symbols-outlined">cancel</span> Zrušiť odstraňovanie` 
        : `<span class="material-symbols-outlined">delete</span> Odstrániť bod`;

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

    // Pridanie bodu do SVG
    const circle = pointsGroup.append("circle")
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

    // suradnice pre text- cislovanie bodov
    const textX = x - 3.5;
    const textY = y + 4;

    const text = pointsGroup.append("text")
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
    buttons.add.innerHTML = `<span class="material-symbols-outlined">add</span> Pridať bod`;
    buttons.add.classList.remove("active");
}


// funkcia na odstranenie bodu- cislovanie
function removePoint(element, point) {
    // Nájdeme index bodu
    const index = points.findIndex(p => p.id === point.id);
    if (index !== -1) {
        points.splice(index, 1);
    }

    
    point.circleElement.remove();
    point.textElement.remove();

    const textIndex = textCoordinates.findIndex(coord => coord.x === point.textElement.attr("x") && coord.y === point.textElement.attr("y"));
    if (textIndex !== -1) {
        textCoordinates.splice(textIndex, 1);
    }

    console.log(`Odstránený bod: ${point.id}`);


    updatePointNumbers();

    isDeletingPoint = false;
    buttons.delete.innerHTML = `<span class="material-symbols-outlined">delete</span> Odstrániť bod`;
    buttons.delete.classList.remove("active");
}

function updatePointNumbers() {
    points.forEach((point, index) => {
        point.textElement.text(index + 1); 
        point.id = `C${index + 1}`;
    });

    pointCounter = points.length + 1;
}



// funkcia na vyber bodu + pulzovanie
function selectPoint(element, point) {

    pointsGroup.selectAll("circle").classed("pulsating", false);

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
    colorPicker.click();  // otvori rgb

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




function play(duration = 3000) {
    if (points.length < 2 || animationRunning) return;
    animationRunning = true;

    // ak animacia uz bezi, nerob nic
    if (!movingCircle) {
        movingCircle = pathGroup.append("circle")
            .attr("cx", points[animationIndex].x)
            .attr("cy", points[animationIndex].y)
            .attr("r", 6)
            .attr("fill", "green");
    }

    // Pri kazdom spusteni zresetujeme trasu
    if (pathLine) {
        pathLine.remove();
    }
    pathLine = pathGroup.append("path")
        .attr("fill", "none")
        .attr("stroke", "blue")
        .attr("stroke-width", 2)
        .attr("d", `M ${points[animationIndex].x} ${points[animationIndex].y}`);

    function moveToNextPoint(index) {
        if (!animationRunning || index >= points.length) {
            animationRunning = false;
            return;
        }
        animationIndex = index; // ulozime aktualny bod

        movingCircle.transition()
            .duration(duration)
            .attr("cx", points[index].x)
            .attr("cy", points[index].y)
            .on("end", () => moveToNextPoint(index + 1));

        let currentPath = pathLine.attr("d");
        pathLine.attr("d", currentPath + ` L ${points[index].x} ${points[index].y}`);
    }

    moveToNextPoint(animationIndex + 1);
}




function stop() {
    animationRunning = false;
    if (movingCircle) {
        movingCircle.interrupt();
        animationIndex--;
    }
}

function stepBack() {
    if (animationIndex > 0) {
        animationIndex--;
        movingCircle.attr("cx", points[animationIndex].x)
                    .attr("cy", points[animationIndex].y);
    }
}

function stepForward() {
    if (animationIndex <= points.length) {
        animationIndex++;
        movingCircle.attr("cx", points[animationIndex].x)
                    .attr("cy", points[animationIndex].y);
    }
}

function resetWholeMap() {

    pointsGroup.selectAll("circle").remove();
    pointsGroup.selectAll("text").remove();


    pathGroup.selectAll("*").remove();

    points = [];
    textCoordinates = [];
    pointCounter = 1;
    selectedPoint = null;

    resetZoom();


    animationRunning = false;
    animationIndex = 0;


    if (movingCircle) {
        movingCircle.remove();
        movingCircle = null;
    }

    if (pathLine) {
        pathLine.remove();
        pathLine = null;
    }

    console.log("Mapa bola resetovaná.");
}


