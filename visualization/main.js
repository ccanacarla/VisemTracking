import { linePins } from './linePins.js';
import { drawBehaviorRug } from './behaviourrug.js';
import { drawFlowRadarGlyph, drawSingleGlyph } from './glyph.js';


const container = document.querySelector('.container');
let data;

async function main() {
    data = await d3.csv("outputs/symbolic.csv");
    showLinePins();
}

function clearContainer() {
    container.innerHTML = '';
}

function showLinePins() {
    clearContainer();
    linePins(data);
}

function showBehaviorRug() {
    clearContainer();
    container.innerHTML = `
        <div id="rug-panel"></div>
        <div id="glyph-panel">
            <span style="color:#888; font-size:12px;">
                Clique em uma trajetória<br/>para ver o glifo
            </span>
        </div>
    `;
    drawBehaviorRug(data, '#rug-panel', showGlyphForTrajectory);
}

function showFlowRadarGlyph() {
    clearContainer();
    drawFlowRadarGlyph(data, '.container');
}

function showGlyphForTrajectory(traj) {

  const panel = d3.select('#glyph-panel');
  panel.selectAll('*').remove();

  const size = 200;

  const svg = panel.append('svg')
    .attr('width', size)
    .attr('height', size);

  const g = svg.append('g')
    .attr('transform', `translate(${size / 2}, ${size / 2})`);

  drawSingleGlyph(g, traj.simbolic_movement);
}


document.getElementById('line-pins-btn').addEventListener('click', showLinePins);
document.getElementById('behavior-rug-btn').addEventListener('click', showBehaviorRug);
document.getElementById('glyph-btn').addEventListener('click', showFlowRadarGlyph);

main();