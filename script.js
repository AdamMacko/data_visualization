// Prvky z HTML -----------------------------------------------------------
const svg = d3.select("#floorplan");
const mapContainer = document.getElementById('mapContainer');
const zoomGroup = svg.select("#zoomGroup");
// Ovládací panel tlačidlá ---------------------------------------
const addCircle = document.getElementById('btn-add-circle');
const updateCircle = document.getElementById('btn-update-circle');
const deleteCircle = document.getElementById('btn-delete-circle');
const resetMap = document.getElementById('btn-reset-map');
const uploadMapButton = document.getElementById('btn-upload-map');
const fileInput = document.getElementById('floorplan-upload');
const changeFloor = document.getElementById('btn-change-floor');
const uploadCSV = document.getElementById('btn-upload-csv');
// ------------------------------------------------------------


// Inicializácia premennej na uloženie transformácie zoomu
let currentTransform = d3.zoomIdentity;

// Pole na uloženie súradníc bodov
let points = [];

// Inicializácia zoomovania
const zoom = d3.zoom()
    .scaleExtent([0.5, 5]) // Min. a max. zoom
    .on("zoom", (event) => {
        currentTransform = event.transform; // Uloženie aktuálnej transformácie
        zoomGroup.attr("transform", currentTransform); // Aplikácia transformácie
    });

// Aplikácia zoomovania na SVG
svg.call(zoom);

// Funkcia pre priblíženie
function zoomIn() {
    svg.transition().call(zoom.scaleBy, 1.2); // Zvýši mierku o 20%
}

// Funkcia pre oddialenie
function zoomOut() {
    svg.transition().call(zoom.scaleBy, 0.8); // Zníži mierku o 20%
}

// Funkcia pre resetovanie zoomu
function resetZoom() {
    svg.transition().call(zoom.transform, d3.zoomIdentity); // Resetuje zoom
    currentTransform = d3.zoomIdentity; // Reset transformácie
}

// Prepínač pre režim pridávania bodov
let isAddingPoint = false;


// Kliknutie na tlačidlo "Pridať bod"
addCircle.addEventListener('click', () => {
    isAddingPoint = !isAddingPoint; // Prepnutie režimu
    addCircle.textContent = isAddingPoint ? 'Zruš pridávanie bodov' : 'Pridať bod';
    addCircle.classList.toggle('active', isAddingPoint); // Zmena farby tlačidla
});

// Kliknutie na SVG mapu pre pridanie bodu
svg.on("click", (event) => {
    if (!isAddingPoint) return;

    // Získanie pozície myši v rámci SVG
    const [mouseX, mouseY] = d3.pointer(event);

    // Prepočet súradníc na zohľadnenie transformácie
    const x = (mouseX - currentTransform.x) / currentTransform.k;
    const y = (mouseY - currentTransform.y) / currentTransform.k;

    // Pridanie bodu do zoomovacej skupiny
    zoomGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5) // Polomer bodu
        .attr("fill", "red");

        // Uloženie súradníc do poľa
    points.push({ x, y });
    console.log("Pridaný bod:", { x, y }); // Pre kontrolu v konzole
    // Vypnutie režimu pridávania bodov
    isAddingPoint = false;
    addCircle.textContent = 'Pridať bod';
    addCircle.classList.remove('active');
});


let isDeletingPoint = false; // Režim odstraňovania bodov

deleteCircle.addEventListener('click', () => {
    isDeletingPoint = !isDeletingPoint; // Prepnutie režimu
    deleteCircle.textContent = isDeletingPoint ? 'Zruš odstraňovanie' : 'Odstrániť bod';
    deleteCircle.classList.toggle('active', isDeletingPoint); // Zmena farby tlačidla
});

svg.on("click", (event) => {
    if (!isAddingPoint) return;

    // Získanie pozície myši v rámci SVG
    const [mouseX, mouseY] = d3.pointer(event);

    // Prepočet súradníc na zohľadnenie transformácie
    const x = (mouseX - currentTransform.x) / currentTransform.k;
    const y = (mouseY - currentTransform.y) / currentTransform.k;

    // Pridanie bodu do zoomovacej skupiny
    const point = { x, y }; // Objekt so súradnicami
    zoomGroup.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 5) // Polomer bodu
        .attr("fill", "red")
        .datum(point) // Naviazanie údajov na element
        .on("click", function (event) {
            if (isDeletingPoint) {
                const index = points.findIndex(p => p.x === point.x && p.y === point.y); // Nájdeme index bodu v poli
                if (index !== -1) points.splice(index, 1); // Odstránenie z poľa
                d3.select(this).remove(); // Odstránenie bodu z mapy
                console.log("Odstránený bod:", point); // Pre kontrolu
            }
        });

    // Uloženie súradníc do poľa
    points.push(point);
    console.log("Pridaný bod:", point); // Pre kontrolu v konzole

    // Vypnutie režimu pridávania bodov
    isAddingPoint = false;
    addCircle.textContent = 'Pridať bod';
    addCircle.classList.remove('active');
});


// Keď klikneš na tlačidlo "Nahrať pôdorys"
uploadMapButton.addEventListener('click', () => {
    fileInput.click(); // Otvorí dialóg na výber súboru
});

// Keď používateľ vyberie súbor
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Načítanie obrázka ako URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target.result;

        // Nahradenie pozadia SVG mapy
        const floorplanImage = d3.select("#zoomGroup image");
        floorplanImage.attr("href", imageUrl); // Aktualizuje URL obrázka
    };
    reader.readAsDataURL(file); // Prečíta obrázok ako Base64 URL
});