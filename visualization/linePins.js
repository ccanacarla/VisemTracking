import { VISUALIZATION_CONFIG, SPEED_STRINGS, DIRECTION_STRINGS } from './config.js';

export function linePins(data) {
  const container = d3.select(".container");
  container.selectAll("*").remove();

  // ==================================================
  // Configuration
  // ==================================================
  const size = VISUALIZATION_CONFIG.linePins.glyphSize;
  const half = size / 2;
  const levels = VISUALIZATION_CONFIG.linePins.glyphLevels;
  const step = half / levels;
  
  const speedMap = {
    [SPEED_STRINGS.PARADO]: 0,
    [SPEED_STRINGS.LENTO]: 1,
    [SPEED_STRINGS.MEDIO]: 2,
    [SPEED_STRINGS.RAPIDO]: 3,
    [SPEED_STRINGS.RAPIDO_ALT]: 3
  };

  const dirMap = {
    [DIRECTION_STRINGS.N]: 0,
    [DIRECTION_STRINGS.E]: 1,
    [DIRECTION_STRINGS.S]: 2,
    [DIRECTION_STRINGS.W]: 3
  };

  const baseColor = VISUALIZATION_CONFIG.baseGlyphColor;

  // ==================================================
  // Helper: Get Grid Paths
  // ==================================================
  // Generates path strings for the regions
  function getRegionPath(direction, level) {
    if (level === 0) { // Parado (Center Square)
      return `M${-step},${-step} L${step},${-step} L${step},${step} L${-step},${step} Z`;
    }

    const innerR = level * step;
    const outerR = (level + 1) * step;
    
    if (direction === dirMap[DIRECTION_STRINGS.N]) { 
      return `M${-innerR},${-innerR} L${innerR},${-innerR} L${outerR},${-outerR} L${-outerR},${-outerR} Z`;
    }
    if (direction === dirMap[DIRECTION_STRINGS.E]) { 
      return `M${innerR},${-innerR} L${innerR},${innerR} L${outerR},${outerR} L${outerR},${-outerR} Z`;
    }
    if (direction === dirMap[DIRECTION_STRINGS.S]) { 
      return `M${innerR},${innerR} L${-innerR},${innerR} L${-outerR},${outerR} L${outerR},${outerR} Z`;
    }
    if (direction === dirMap[DIRECTION_STRINGS.W]) { 
      return `M${-innerR},${innerR} L${-innerR},${-innerR} L${-outerR},${-outerR} L${-outerR},${outerR} Z`;
    }
    return "";
  }

  // ==================================================
  // Process Data
  // ==================================================
  data.forEach(d => {
    // 1. Parse Sequence
    let seq = [];
    try {
      const raw = JSON.parse(d.simbolic_movement.replace(/'/g, '"'));
      if (Array.isArray(raw)) seq = raw;
    } catch (e) {}

    if (seq.length === 0) return;

    // 2. Aggregate Counts
    const counts = {}; // Key: "Level_Dir" or "Parado"
    let maxCount = 0;

    seq.forEach(s => {
      if (!s) return;
      
      let speedStr = null;
      let dirStr = null;

      if (s.includes(SPEED_STRINGS.PARADO)) speedStr = SPEED_STRINGS.PARADO;
      else if (s.includes(SPEED_STRINGS.LENTO)) speedStr = SPEED_STRINGS.LENTO;
      else if (s.includes(SPEED_STRINGS.MEDIO)) speedStr = SPEED_STRINGS.MEDIO;
      else if (s.includes(SPEED_STRINGS.RAPIDO) || s.includes(SPEED_STRINGS.RAPIDO_ALT)) speedStr = SPEED_STRINGS.RAPIDO;

      if (s.includes(DIRECTION_STRINGS.NORTE)) dirStr = DIRECTION_STRINGS.N;
      else if (s.includes(DIRECTION_STRINGS.LESTE)) dirStr = DIRECTION_STRINGS.E;
      else if (s.includes(DIRECTION_STRINGS.SUL)) dirStr = DIRECTION_STRINGS.S;
      else if (s.includes(DIRECTION_STRINGS.OESTE)) dirStr = DIRECTION_STRINGS.W;

      const speedVal = speedMap[speedStr];
      const dirVal = dirMap[dirStr];

      let key = null;
      if (speedVal === 0) {
        key = "0"; // Parado
      } else if (speedVal !== undefined && dirVal !== undefined) {
        key = `${speedVal}_${dirVal}`;
      }

      if (key) {
        counts[key] = (counts[key] || 0) + 1;
        maxCount = Math.max(maxCount, counts[key]);
      }
    });

    // ==================================================
    // Draw Glyph
    // ==================================================
    const plotContainer = container.append("div")
      .attr("class", "plot-container")
      .style("display", "inline-block")
      .style("margin", VISUALIZATION_CONFIG.linePins.plotContainerMargin)
      .style("vertical-align", "top")
      .style("text-align", "center")
      .style("padding", VISUALIZATION_CONFIG.linePins.plotContainerPadding)
      .style("background", VISUALIZATION_CONFIG.linePins.plotContainerBackground);

    plotContainer.append("h4")
      .text(`${d.trajectory_id}`)
      .style("font-size", VISUALIZATION_CONFIG.linePins.headerFontSize)
      .style("margin-bottom", VISUALIZATION_CONFIG.linePins.headerMarginBottom);

    const svg = plotContainer.append("svg")
      .attr("width", size + 20)
      .attr("height", size + 20);

    const g = svg.append("g")
      .attr("transform", `translate(${size / 2 + 10}, ${size / 2 + 10})`);

    // --- Background (Light Gray + White Border) ---
    g.append("rect")
      .attr("x", -half)
      .attr("y", -half)
      .attr("width", size)
      .attr("height", size)
      .attr("fill", VISUALIZATION_CONFIG.cellBackgroundColor)
      .attr("stroke", VISUALIZATION_CONFIG.cellBorderColor)
      .attr("stroke-width", VISUALIZATION_CONFIG.cellBorderWidth);

    // --- Draw Grid (Levels) ---
    const countP = counts["0"] || 0;
    const opacityP = maxCount > 0 ? countP / maxCount : 0;
    
    g.append("path")
      .attr("d", getRegionPath(null, 0))
      .attr("fill", baseColor)
      .attr("opacity", opacityP)
      .attr("stroke", VISUALIZATION_CONFIG.linePins.gridLineColor)
      .attr("stroke-width", VISUALIZATION_CONFIG.linePins.gridLineWidth);

    // Directional Levels (1, 2, 3)
    for (let l = 1; l <= 3; l++) {
      for (let dir = 0; dir < 4; dir++) {
        const key = `${l}_${dir}`;
        const count = counts[key] || 0;
        const opacity = maxCount > 0 ? count / maxCount : 0;

        g.append("path")
          .attr("d", getRegionPath(dir, l))
          .attr("fill", baseColor)
          .attr("opacity", opacity)
          .attr("stroke", VISUALIZATION_CONFIG.linePins.gridLineColor)
          .attr("stroke-width", VISUALIZATION_CONFIG.linePins.gridLineWidth)
          .append("title")
          .text(`Level: ${l}, Dir: ${dir}, Count: ${count}`);
      }
    }

    // --- Grid Lines Overlay ---
    g.append("line").attr("x1", -half).attr("y1", -half).attr("x2", half).attr("y2", half).attr("stroke", VISUALIZATION_CONFIG.linePins.gridLineColor).attr("stroke-width", VISUALIZATION_CONFIG.linePins.gridLineWidth).style("pointer-events", "none");
    g.append("line").attr("x1", half).attr("y1", -half).attr("x2", -half).attr("y2", half).attr("stroke", VISUALIZATION_CONFIG.linePins.gridLineColor).attr("stroke-width", VISUALIZATION_CONFIG.linePins.gridLineWidth).style("pointer-events", "none");
    
    // Concentric Squares
    for (let i = 1; i <= 4; i++) {
        const r = i * step;
        g.append("rect")
            .attr("x", -r).attr("y", -r)
            .attr("width", r*2).attr("height", r*2)
            .attr("fill", "none")
            .attr("stroke", VISUALIZATION_CONFIG.linePins.gridLineColor)
            .attr("stroke-width", VISUALIZATION_CONFIG.linePins.gridLineWidth)
            .style("pointer-events", "none");
    }

  });
}