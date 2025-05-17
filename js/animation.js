import * as config from "./config.js";
import * as storage from "./storage.js";
config.initConfig();

let animationRunning = false;
let animationIndex = 0;
let movingCircles = {};
let pathLine = null;
let animationSpeed = 4000;
const minSpeed = 4000;
const maxSpeed = 10000;
let currentProgress = {};
let stepSize = 0.1;
const step = 250;

export function resetAnimation() {
    animationRunning = false;
    animationIndex = 0;

    Object.values(movingCircles).forEach(circle => circle.remove?.());
    movingCircles = {};
    currentProgress = {};

    if (pathLine) {
        pathLine.remove();
        pathLine = null;
    }

    config.pathGroup.selectAll("*").remove();
    console.log("Animácia bola resetovaná pri zmene poschodia.");
}

export function updateSpeedDisplay() {
    if (!config.currentSpeedDisplay) {
        console.error("currentSpeedDisplay je undefined! Skontroluj initConfig().");
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
    const routeColors = {
        route1: { line: "blue", circle: "green" },
        route2: { line: "red", circle: "yellow" },
        route3: { line: "purple", circle: "cyan" },
        route4: { line: "orange", circle: "magenta" }
    };

    if (config.state.activeRoutes.length === 0) {
        console.error("Žiadna aktívna trasa nie je vybraná!");
        return;
    }

    animationRunning = true;

    config.state.activeRoutes.forEach((routeKey) => {
        const floorData = storage.routeData?.[routeKey]?.[config.state.currentFloor];
        if (!floorData || !floorData.points || floorData.points.length === 0) {
            console.error(`Trasa ${routeKey} nemá body na poschodí ${config.state.currentFloor}!`);
            return;
        }

        const points = floorData.points;
        const lineGenerator = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveCatmullRom);

        const pathData = lineGenerator(points);

        config.pathGroup.selectAll(`.animation-path-${routeKey}`).remove();
        if (movingCircles[routeKey]) {
            movingCircles[routeKey].remove();
            delete movingCircles[routeKey];
        }

        const path = config.pathGroup.append("path")
            .attr("d", pathData)
            .attr("fill", "none")
            .attr("stroke", routeColors[routeKey]?.line || "gray")
            .attr("stroke-width", 2)
            .attr("class", `animation-path animation-path-${routeKey}`);

        const pathLength = path.node().getTotalLength();
        const startProgress = currentProgress[routeKey] || 0;

        path
            .attr("stroke-dasharray", pathLength)
            .attr("stroke-dashoffset", pathLength * startProgress)
            .transition()
            .duration(animationSpeed * (1 - startProgress))
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        movingCircles[routeKey] = config.pathGroup.append("circle")
            .attr("r", 6)
            .attr("fill", routeColors[routeKey]?.circle || "black");

        movingCircles[routeKey]
            .transition()
            .duration(animationSpeed * (1 - startProgress))
            .ease(d3.easeLinear)
            .attrTween("transform", function () {
                return function (t) {
                    const progress = startProgress + (1 - startProgress) * t;
                    const { x, y } = path.node().getPointAtLength(progress * pathLength);
                    return `translate(${x},${y})`;
                };
            })
            .on("end", () => {
                animationRunning = false;
                currentProgress[routeKey] = 0;
            });
    });
}

export function stop() {
    animationRunning = false;

    Object.entries(movingCircles).forEach(([key, circle]) => {
        const transform = circle.attr("transform");
        const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
        if (match) {
            const [ , xStr, yStr ] = match;
            const x = parseFloat(xStr);
            const y = parseFloat(yStr);

            const path = config.pathGroup.select(`.animation-path-${key}`).node();
            if (path) {
                const pathLength = path.getTotalLength();
                for (let i = 0; i <= pathLength; i++) {
                    const p = path.getPointAtLength(i);
                    if (Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1) {
                        currentProgress[key] = i / pathLength;
                        break;
                    }
                }
            }
        }

        circle.interrupt?.();
        circle.remove?.();
    });

    movingCircles = {};
}

let currentStep = 0;

export function stepForward() {
    const routeKey = config.state.activeRoutes[0];
    const floorData = storage.routeData?.[routeKey]?.[config.state.currentFloor];
    if (!floorData || currentStep >= floorData.points.length - 1) return;
    currentStep++;
    moveToNearestPoint(currentStep);
}

export function stepBack() {
    if (currentStep <= 0) return;
    currentStep--;
    moveToNearestPoint(currentStep);
}

function moveToNearestPoint(index) {
    const routeKey = config.state.activeRoutes[0];
    const floorData = storage.routeData?.[routeKey]?.[config.state.currentFloor];
    if (!floorData || !floorData.points || floorData.points.length === 0) return;
    const point = floorData.points[index];
    if (!point) return;

    if (!movingCircles[routeKey]) {
        movingCircles[routeKey] = config.pathGroup.append("circle")
            .attr("r", 6)
            .attr("fill", routeKey === "route1" ? "green" : "red");
    }

    movingCircles[routeKey].interrupt?.();
    movingCircles[routeKey].attr("transform", `translate(${point.x},${point.y})`);
}

if (config.decreaseSpeedButton && config.increaseSpeedButton) {
    config.decreaseSpeedButton.addEventListener("click", () => changeSpeed(-step));
    config.increaseSpeedButton.addEventListener("click", () => changeSpeed(step));
} else {
    console.error(" decreaseSpeedButton alebo increaseSpeedButton neboli nájdené!");
}
