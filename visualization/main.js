import { linePins } from './linePins.js';
import { drawBehaviorRug } from './behaviourrug.js';
import { drawFlowRadarGlyph } from './glyph.js';
import { drawTrajectoryView } from './trajectoryView.js';

const container = document.querySelector('.container');
let data;

async function main() {
    // Carrega dados (simulado ou real)
    data = await d3.csv("outputs/symbolic.csv");
    
    // Inicia com o Behavior Rug por padrão
    showBehaviorRug();
}

function clearContainer() {
    container.innerHTML = '';
    // Remove classes específicas de layout para não afetar outras views
    container.classList.remove('rug-view-layout');
    container.style.overflow = 'auto'; 
}

function showLinePins() {
    clearContainer();
    linePins(data, '.container');
}

function showBehaviorRug() {
    clearContainer();
    
    // Adiciona classe para ativar o Grid Layout (Split View)
    container.classList.add('rug-view-layout');
    container.style.overflow = 'hidden'; // Impede scroll duplo

    container.innerHTML = `
        <div id="rug-panel"></div>
        <div id="glyph-panel">
            <div style="text-align:center; margin-top: 50%; color:#888;">
                <p>Selecione uma trajetória<br/>para visualizar o glifo detalhado.</p>
            </div>
        </div>
    `;

    // Passamos a função de callback para desenhar o detalhe
    drawBehaviorRug(data, '#rug-panel', showGlyphForTrajectory);
}

function showFlowRadarGlyph() {
    clearContainer();
    drawFlowRadarGlyph(data, '.container');
}

function showGlyphForTrajectory(traj, opts) {
    const panel = document.getElementById('glyph-panel');
    panel.innerHTML = '';

    // 1. Visualização da Trajetória (topo)
    const trajDiv = document.createElement('div');
    trajDiv.id = 'trajectory-viz-container';
    trajDiv.style.width = '100%';
    trajDiv.style.paddingBottom = '10px';
    trajDiv.style.borderBottom = '1px solid #eee';
    trajDiv.style.marginBottom = '10px';
    panel.appendChild(trajDiv);

    drawTrajectoryView(traj, '#trajectory-viz-container', opts);

    // 2. Glifo detalhado (LinePins) (abaixo)
    const glyphDiv = document.createElement('div');
    glyphDiv.id = 'glyph-detail-container';
    glyphDiv.style.width = '100%';
    panel.appendChild(glyphDiv);

    // Renderiza o LinePin único no painel lateral
    linePins([traj], '#glyph-detail-container');
}

// Event Listeners
document.getElementById('line-pins-btn').addEventListener('click', showLinePins);
document.getElementById('behavior-rug-btn').addEventListener('click', showBehaviorRug);
document.getElementById('glyph-btn').addEventListener('click', showFlowRadarGlyph);

main();