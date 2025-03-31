import * as config from "./config.js";
import * as storage from "./storage.js";
config.initConfig();
let animationRunning = false;
let animationIndex = 0;
let movingCircle = null;
let pathLine = null;
let animationSpeed = 4000;
const minSpeed = 4000;
const maxSpeed = 10000;
let currentProgress = 0;
let stepSize = 0.1;
const step = 250;

export function resetAnimation() {
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
    config.pathGroup.selectAll("*").remove();
    console.log("Animácia bola resetovaná pri zmene poschodia.");
}

export function updateSpeedDisplay() {
    if (!config.currentSpeedDisplay) {
        console.error("❌ currentSpeedDisplay je undefined! Skontroluj initConfig().");
        return;
    }
    config.currentSpeedDisplay.textContent = `${animationSpeed} ms`;
}


export function changeSpeed(delta) {
    const newSpeed = animationSpeed + delta;
    if (newSpeed >= minSpeed && newSpeed <= maxSpeed) {
        animationSpeed = newSpeed;
        updateSpeedDisplay();
    }
}

updateSpeedDisplay();

export function play() {
    if (config.state.activeRoutes.length === 0) {
        console.error("❌ Žiadna aktívna trasa nie je vybraná!");
        return;
    }

    animationRunning = true;

    config.state.activeRoutes.forEach((routeKey) => {
        const floorData = storage.routeData?.[routeKey]?.[config.state.currentFloor];
        
        if (!floorData || !floorData.points || floorData.points.length === 0) {
            console.error(`⚠️ Trasa ${routeKey} nemá body na poschodí ${config.state.currentFloor}!`);
            return;
        }

        const points = floorData.points;

        const lineGenerator = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveCatmullRom);
        const pathData = lineGenerator(points);

        config.pathGroup.selectAll(`.animation-path-${routeKey}`).remove();

        const path = config.pathGroup.append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", routeKey === 1 ? "blue" : "orange") 
            .attr("stroke-width", 2)
            .attr("class", `animation-path animation-path-${routeKey}`);

        const movingCircle = config.pathGroup.append("circle")
            .attr("r", 6)
            .attr("fill", routeKey === 1 ? "green" : "red");

        const pathLength = path.node().getTotalLength();

        movingCircle.transition()
            .duration(animationSpeed)
            .ease(d3.easeLinear)
            .attrTween("transform", function () {
                return function (t) {
                    const { x, y } = path.node().getPointAtLength(t * pathLength);
                    return `translate(${x},${y})`;
                };
            })
            .on("end", () => {
                animationRunning = false;
            });
    });
}



export function stop() {
    animationRunning = false;
    if (movingCircle) {
        movingCircle.interrupt();
    }
}

export function stepForward() {
    if (!config.pathGroup.select(".animation-path").node()) return;
    currentProgress = Math.min(1, currentProgress + stepSize);
    moveToProgress(currentProgress);
}

export function stepBack() {
    if (!config.pathGroup.select(".animation-path").node()) return;
    currentProgress = Math.max(0, currentProgress - stepSize);
    moveToProgress(currentProgress);
}

function moveToProgress(progress) {
    const path = config.pathGroup.select(".animation-path").node();
    if (!path) return;
    const pathLength = path.getTotalLength();
    const { x, y } = path.getPointAtLength(progress * pathLength);
    movingCircle.attr("transform", `translate(${x},${y})`);
}

if (config.decreaseSpeedButton && config.increaseSpeedButton) {
    config.decreaseSpeedButton.addEventListener("click", () => changeSpeed(-step));
    config.increaseSpeedButton.addEventListener("click", () => changeSpeed(step));
} else {
    console.error("❌ decreaseSpeedButton alebo increaseSpeedButton neboli nájdené!");
}

