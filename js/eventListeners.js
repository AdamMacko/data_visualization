import * as config from "./config.js";
import { processJSON ,handleFileUpload,toggleLED,drawCharts,handleSizeChange} from "./main.js"; 
import { changeSpeed } from "./animation.js";
import * as storage from "./storage.js";

/**
 * Inicializácia všetkých event listenerov
 */
export function initEventListeners() {
    console.log("Event listenery inicializované!");
// Prepínanie menu pre výber poschodia
config.btnChangeFloor?.addEventListener("click", (event) => {
    event.stopPropagation();
    config.floorMenu.style.display =
        (config.floorMenu.style.display === "block") ? "none" : "block";
});

document.getElementById("openModal").addEventListener("click", function() {
    document.getElementById("myModal").style.display = "flex";
    
    // Počkaj chvíľu, kým sa modal zobrazí, a potom vykresli grafy
    setTimeout(() => {
        drawCharts();
    }, 100); 
});


document.getElementById("myModal").addEventListener("click", function(event) {
    if (event.target === this || event.target.classList.contains("close")) {
        this.style.display = "none";
    }
});

// Event listener pre tlačidlá poschodí
config.floorButtons.forEach(button => {
    button.addEventListener("click", function () {
    
        let floor = parseInt(this.textContent);
      
        config.state.currentFloor = floor;
       
        config.floorMenu.style.display = "none";
        
        let floorplan = null;
    
        if (config.state.activeRoutes.length > 0) {
            let activeRoute = config.state.activeRoutes[0];
            if (storage.routeData[activeRoute] && storage.routeData[activeRoute][floor] && storage.routeData[activeRoute][floor].floorplan) {
                floorplan = storage.routeData[activeRoute][floor].floorplan;
            }
        }
  
        if (!floorplan) {
            floorplan = config.state.floorPlans[floor];
        }
  
        if (!floorplan) {
            floorplan = "images/background.png";
        }
        
        config.floorplanImage.setAttribute("href", floorplan);
        console.log(`Aktuálne poschodie nastavené na ${floor}.`);
        

        if (typeof setFloor === "function") {
            setFloor(config.state.currentFloor);
        }
    });
});

// Kliknutím mimo menu skryjeme floorMenu
document.addEventListener("click", (event) => {
    if (!config.btnChangeFloor.contains(event.target) && !config.floorMenu.contains(event.target)) {
        config.floorMenu.style.display = "none";
    }
});
/** === UPLOAD MAPY === */
config.btnUploadMap?.addEventListener("click", () => config.map.click());

config.map?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        config.floorplanImage.setAttribute("href", e.target.result);
    };
    reader.readAsDataURL(file);
});


document.getElementById("btn-upload-json")?.addEventListener("click", () => {
    document.getElementById("jsonFileInput").click();
});

document.getElementById("jsonFileInput")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log("Nebol vybraný žiadny súbor.");
        return;
    }
    
    console.log(`Vybraný súbor: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            console.log("JSON dáta úspešne parsované:", jsonData);
            
            // Skontrolujeme, či máme aspoň jednu aktívnu trasu v config.state.activeRoutes
            if (!config.state.activeRoutes || config.state.activeRoutes.length === 0) {
                console.log("Žiadna aktívna trasa nebola vybraná. JSON sa nespracuje.");
                return;
            }
            
            console.log("Aktívne trasy:", config.state.activeRoutes);
            

            config.state.activeRoutes.forEach(routeId => {
                if (!storage.routeData[routeId].loaded) {
                    console.log(`Spracovávam JSON pre trasu: ${routeId}`);
                    processJSON(jsonData, routeId);
                } else {
                    console.log(`Dáta pre trasu ${routeId} už boli načítané.`);
                }
            });
            
        } catch (error) {
            console.error(" Chyba pri parsovaní JSON:", error);
        }
    };
    reader.readAsText(file);
});
    

    document.getElementById("btn-upload-txt")?.addEventListener("click", () => {
        document.getElementById("txtFileInput").click();
    });

    document.getElementById("txtFileInput")?.addEventListener("change", (event) => handleFileUpload(event, "txt"));

    /** ===  OVLÁDACIE PRVKY === */
    config.buttons?.delete?.addEventListener("click", () => removePoint());

    config.buttons?.update?.addEventListener("click", (event) => {
        event.stopPropagation();
        config.editPointMenu.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest("#edit-point-menu") && !event.target.closest("#btn-update-circle")) {
            config.editPointMenu.classList.remove("show");
        }
    });

    config.buttons?.add?.addEventListener("click", () => {
        config.state.isAddingPoint = !config.state.isAddingPoint;
        config.buttons.add.innerHTML = config.state.isAddingPoint
            ? `<span class="material-symbols-outlined">close</span> Zrušiť pridávanie bodov`
            : `<span class="material-symbols-outlined">add</span> Pridať bod`;
        config.buttons.add.classList.toggle("active", config.state.isAddingPoint);
    });

    /** ===  ZMENA RÝCHLOSTI ANIMÁCIE === */
    if (config.decreaseSpeedButton && config.increaseSpeedButton) {
        config.decreaseSpeedButton.addEventListener("click", () => changeSpeed(-250));
        config.increaseSpeedButton.addEventListener("click", () => changeSpeed(250));
    } else {
        console.error(" decreaseSpeedButton alebo increaseSpeedButton neboli nájdené!");
    }

 

    config.sizeSlider?.addEventListener("input", handleSizeChange);

    config.buttons.red.addEventListener("click", () => toggleLED("red"));
    config.buttons.green.addEventListener("click", () => toggleLED("green"));
    config.buttons.blue.addEventListener("click", () => toggleLED("blue"));
    config.buttons.yellow.addEventListener("click", () => toggleLED("yellow"));

    console.log(" Event listenery boli úspešne nastavené!");
}
