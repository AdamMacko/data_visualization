// Prvky z HTML -----------------------------------------------------------
const svg = d3.select("#floorplan");
const mapContainer = document.getElementById('mapContainer');
const zoomGroup = svg.select("#zoomGroup");
// Ovladaci panel tlacidla ---------------------------------------
const addCircle = document.getElementById('btn-add-circle');
const updateCircle = document.getElementById('btn-update-circle');
const deleteCircle = document.getElementById('btn-delete-circle');
const resetMap = document.getElementById('btn-reset-map');
const uploadMapButton = document.getElementById('btn-upload-map');
const fileInput = document.getElementById('floorplan-upload');
const changeFloor = document.getElementById('btn-change-floor');
const uploadCSV = document.getElementById('btn-upload-csv');
// ------------------------------------------------------------


// Inicializacia premennej na ulozenie transformácie zoomu
let currentTransform = d3.zoomIdentity;

// Pole na ulozenie bodov
let points = [];


const zoom = d3.zoom()
    .scaleExtent([0.5, 5]) // Min. a max. zoom
    .on("zoom", (event) => {
        currentTransform = event.transform; 
        zoomGroup.attr("transform", currentTransform); 
    });


svg.call(zoom);
//+
function zoomIn() {
    svg.transition().call(zoom.scaleBy, 1.2); 
}

//-
function zoomOut() {
    svg.transition().call(zoom.scaleBy, 0.8); 
}

//reset
function resetZoom() {
    svg.transition().call(zoom.transform, d3.zoomIdentity);
    currentTransform = d3.zoomIdentity;
}

let isAddingPoint = false;


// Kliknutie na tlacidlo "Pridat bod"
addCircle.addEventListener('click', () => {
    isAddingPoint = !isAddingPoint; 
    addCircle.textContent = isAddingPoint ? 'Zruš pridávanie bodov' : 'Pridať bod';
    addCircle.classList.toggle('active', isAddingPoint);
});

// Kliknutie na SVG mapu pre pridanie bodu
svg.on("click", (event) => {
    if (!isAddingPoint) return;

    // Ziskanie pozicie mysi
    const [mouseX, mouseY] = d3.pointer(event);
    // Prepocet suradnic
    const x = (mouseX - currentTransform.x) / currentTransform.k;
    const y = (mouseY - currentTransform.y) / currentTransform.k;

    // Pridanie bodu do zoomovacej skupiny
    zoomGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5)
        .attr("fill", "red");

    // Ulozenie súradníc do pola
    points.push({ x, y });
    console.log("Pridaný bod:", { x, y });
    isAddingPoint = false;
    addCircle.textContent = 'Pridať bod';
    addCircle.classList.remove('active');
});

let isDeletingPoint = false;

deleteCircle.addEventListener('click', () => {
    isDeletingPoint = !isDeletingPoint;
    deleteCircle.textContent = isDeletingPoint ? 'Zruš odstraňovanie' : 'Odstrániť bod';
    deleteCircle.classList.toggle('active', isDeletingPoint);
});

svg.on("click", (event) => {

    if (!isAddingPoint) return;

    const [mouseX, mouseY] = d3.pointer(event);

   
    const x = (mouseX - currentTransform.x) / currentTransform.k;
    const y = (mouseY - currentTransform.y) / currentTransform.k;

   
    const point = { x, y };
    zoomGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5)
        .attr("fill", "red")
        .datum(point)
        .on("click", function (event) {
            if (isDeletingPoint) {
                const index = points.findIndex(p => p.x === point.x && p.y === point.y);
                if (index !== -1) points.splice(index, 1);
                d3.select(this).remove();
                console.log("Odstránený bod:", point);
            }
        });


    points.push(point);
    console.log("Pridaný bod:", point);

    isAddingPoint = false;
    addCircle.textContent = 'Pridať bod';
    addCircle.classList.remove('active');
});


// Vlozenie podorysu
uploadMapButton.addEventListener('click', () => {
    fileInput.click();
});


fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;


    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;

        const floorplanImage = d3.select("#zoomGroup image");
        floorplanImage.attr("href", imageUrl);
    };
    reader.readAsDataURL(file);
});