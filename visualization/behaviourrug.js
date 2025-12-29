import { VISUALIZATION_CONFIG, SPEED_STRINGS, DIRECTION_STRINGS } from './config.js';

export function drawBehaviorRug(data, containerSelector, onTrajectoryClick = null) {
  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  // ---------- Build fixed layout ----------
  const wrap = container.append("div").attr("class", "behavior-rug-wrap");

  const leftDiv = wrap.append("div").attr("class", "behavior-rug-left");
  const centerDiv = wrap.append("div").attr("class", "behavior-rug-center");
  const rightDiv = wrap.append("div").attr("class", "behavior-rug-right");

  const leftSvg = leftDiv.append("svg").attr("class", "behavior-rug-svg");
  const centerSvg = centerDiv.append("svg").attr("class", "behavior-rug-svg");
  const rightSvg = rightDiv.append("svg").attr("class", "behavior-rug-svg");

  // ==================================================
  // Helpers
  // ==================================================
  function getSpeed(symbol) {
    if (!symbol) return null;
    if (symbol.includes(SPEED_STRINGS.RAPIDO) || symbol.includes(SPEED_STRINGS.RAPIDO_ALT)) return SPEED_STRINGS.RAPIDO;
    if (symbol.includes(SPEED_STRINGS.MEDIO)) return SPEED_STRINGS.MEDIO;
    if (symbol.includes(SPEED_STRINGS.LENTO)) return SPEED_STRINGS.LENTO;
    if (symbol.includes(SPEED_STRINGS.PARADO)) return SPEED_STRINGS.PARADO;
    return null;
  }

  function getDirection(symbol) {
    if (!symbol) return null;
    if (symbol.includes(DIRECTION_STRINGS.NORTE)) return DIRECTION_STRINGS.N;
    if (symbol.includes(DIRECTION_STRINGS.SUL)) return DIRECTION_STRINGS.S;
    if (symbol.includes(DIRECTION_STRINGS.LESTE)) return DIRECTION_STRINGS.E;
    if (symbol.includes(DIRECTION_STRINGS.OESTE)) return DIRECTION_STRINGS.W;
    return null;
  }

  // ==================================================
  // Data
  // ==================================================
  const sequences = data.map(d => {
    let seq = [];
    try {
      const rawSeq = JSON.parse(d.simbolic_movement.replace(/'/g, '"'));
      if (Array.isArray(rawSeq)) {
        seq = rawSeq.map(s => {
          if (!s) return { empty: true };
          return { raw: s, speed: getSpeed(s), dir: getDirection(s) };
        });
      }
    } catch (e) {}

    return { id: d.trajectory_id, cluster: d.cluster_markov, seq };
  });

  sequences.sort((a, b) => d3.ascending(a.cluster, b.cluster) || d3.ascending(a.id, b.id));
  if (!sequences.length) return;

  // ==================================================
  // Sizing
  // ==================================================
  const cellSize = VISUALIZATION_CONFIG.cellSize;      // keep readable
  const cellPadding = VISUALIZATION_CONFIG.cellPadding;

  const rowHeight = cellSize + cellPadding;
  const colWidth = cellSize + cellPadding;

  const marginTop = VISUALIZATION_CONFIG.behaviourRug.marginTop;
  const marginLeft = VISUALIZATION_CONFIG.behaviourRug.marginLeft; // used only for internal spacing now

  const maxLen = d3.max(sequences, d => d.seq.length) || 0;
  const rugWidth = maxLen * colWidth;
  const rugHeight = sequences.length * rowHeight;

  // Left column width (labels area)
  const leftWidth = VISUALIZATION_CONFIG.behaviourRug.leftPanelWidth ?? 200;
  // Right column width (legend area)
  const legendWidth = VISUALIZATION_CONFIG.behaviourRug.legendWidth;

  // Set SVG sizes (fixed columns don't scroll)
  leftSvg
    .attr("width", leftWidth)
    .attr("height", rugHeight + marginTop + 60);

  centerSvg
    .attr("width", rugWidth + 20)
    .attr("height", rugHeight + marginTop + 60);

  rightSvg
    .attr("width", legendWidth + 40)
    .attr("height", rugHeight + marginTop + 60);

  // ==================================================
  // Sync scrolling (vertical) so rows align
  // ==================================================
  const centerNode = centerDiv.node();
  const leftNode = leftDiv.node();

  centerNode.addEventListener("scroll", () => {
    // keep left labels aligned vertically with glyph rows
    leftNode.scrollTop = centerNode.scrollTop;
    // right legend stays fixed; no sync
  });

  // ==================================================
  // LEFT: Labels (clusters + ids) - fixed column
  // ==================================================
  const leftG = leftSvg.append("g").attr("transform", `translate(0, ${marginTop})`);

  const leftRows = leftG.selectAll(".l-row")
    .data(sequences)
    .enter()
    .append("g")
    .attr("class", "l-row")
    .attr("transform", (d, i) => `translate(0, ${i * rowHeight})`);

  // Cluster label once per group
  leftRows.filter((d, i) => i === 0 || d.cluster !== sequences[i - 1].cluster)
    .append("text")
    .attr("x", 10)
    .attr("y", rowHeight / 2)
    .attr("dy", ".35em")
    .attr("font-weight", "bold")
    .attr("font-size", 10)
    .text(d => `Cluster ${d.cluster}`);

  // Trajectory id labels
  leftRows.append("text")
    .attr("x", leftWidth - 10)
    .attr("y", rowHeight / 2)
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("font-size", 8)
    .text(d => d.id);

  // Optional: clicking on label selects row (and triggers callback)
  leftRows.style("cursor", "pointer").on("click", (event, d) => {
    if (onTrajectoryClick) onTrajectoryClick(d);
  });

  // ==================================================
  // CENTER: Glyph rug - scrollable
  // ==================================================
  const speedOpacity = VISUALIZATION_CONFIG.speedOpacity;
  const baseColor = VISUALIZATION_CONFIG.baseGlyphColor;

  const cx = cellSize / 2;
  const cy = cellSize / 2;

  const pathN = `M0,0 L${cellSize},0 L${cx},${cy} Z`;
  const pathE = `M${cellSize},0 L${cellSize},${cellSize} L${cx},${cy} Z`;
  const pathS = `M${cellSize},${cellSize} L0,${cellSize} L${cx},${cy} Z`;
  const pathW = `M0,${cellSize} L0,0 L${cx},${cy} Z`;

  const centerG = centerSvg.append("g").attr("transform", `translate(0, ${marginTop})`);

  const rows = centerG.selectAll(".row")
    .data(sequences)
    .enter()
    .append("g")
    .attr("class", "row")
    .attr("transform", (d, i) => `translate(0, ${i * rowHeight})`)
    .style("cursor", "pointer")
    .on("click", (event, d) => { if (onTrajectoryClick) onTrajectoryClick(d); });

  rows.each(function(rowData) {
    const rowG = d3.select(this);

    const cells = rowG.selectAll(".g-cell")
      .data(rowData.seq)
      .enter()
      .append("g")
      .attr("class", "g-cell")
      .attr("transform", (d, i) => `translate(${i * colWidth}, 0)`);

    cells.each(function(d) {
      const cellG = d3.select(this);

      // Background: light grey + thin white border
      cellG.append("rect")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", VISUALIZATION_CONFIG.cellBackgroundColor)
        .attr("stroke", VISUALIZATION_CONFIG.cellBorderColor)
        .attr("stroke-width", VISUALIZATION_CONFIG.cellBorderWidth);

      if (d.empty) return;

      const op = speedOpacity[d.speed] ?? 0;

      if (d.speed === SPEED_STRINGS.PARADO) {
        cellG.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", Math.max(1.5, cellSize * 0.18))
          .attr("fill", baseColor)
          .attr("opacity", op);
        return;
      }

      let path = null;
      if (d.dir === DIRECTION_STRINGS.N) path = pathN;
      else if (d.dir === DIRECTION_STRINGS.E) path = pathE;
      else if (d.dir === DIRECTION_STRINGS.S) path = pathS;
      else if (d.dir === DIRECTION_STRINGS.W) path = pathW;

      if (path) {
        cellG.append("path")
          .attr("d", path)
          .attr("fill", baseColor)
          .attr("opacity", op);
      }
    });
  });

  // ==================================================
  // RIGHT: Legend - fixed column
  // ==================================================
  const legend = rightSvg.append("g")
    .attr("transform", `translate(10, 0)`);

  // Direction Legend
  const legDirY = 30;
  const legSize = 30;
  const legCX = legSize / 2;
  const legCY = legSize / 2;

  const gDir = legend.append("g")
    .attr("transform", `translate(20, ${legDirY})`);

  gDir.append("text")
    .attr("y", -15)
    .attr("x", -10)
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .text("Direction");

  const legStroke = VISUALIZATION_CONFIG.linePins.gridLineColor;
  const legStrokeW = VISUALIZATION_CONFIG.linePins.gridLineWidth;

  gDir.append("path")
    .attr("d", `M0,0 L${legSize},0 L${legCX},${legCY} Z`)
    .attr("fill", baseColor).attr("opacity", 0.5)
    .attr("stroke", legStroke).attr("stroke-width", legStrokeW);
  gDir.append("text")
    .attr("x", legCX).attr("y", -3).text(DIRECTION_STRINGS.N)
    .attr("text-anchor", "middle").attr("font-size", 9);

  gDir.append("path")
    .attr("d", `M${legSize},0 L${legSize},${legSize} L${legCX},${legCY} Z`)
    .attr("fill", baseColor).attr("opacity", 0.5)
    .attr("stroke", legStroke).attr("stroke-width", legStrokeW);
  gDir.append("text")
    .attr("x", legSize + 3).attr("y", legCY).text(DIRECTION_STRINGS.E)
    .attr("alignment-baseline", "middle").attr("font-size", 9);

  gDir.append("path")
    .attr("d", `M${legSize},${legSize} L0,${legSize} L${legCX},${legCY} Z`)
    .attr("fill", baseColor).attr("opacity", 0.5)
    .attr("stroke", legStroke).attr("stroke-width", legStrokeW);
  gDir.append("text")
    .attr("x", legCX).attr("y", legSize + 8).text(DIRECTION_STRINGS.S)
    .attr("text-anchor", "middle").attr("font-size", 9);

  gDir.append("path")
    .attr("d", `M0,${legSize} L0,0 L${legCX},${legCY} Z`)
    .attr("fill", baseColor).attr("opacity", 0.5)
    .attr("stroke", legStroke).attr("stroke-width", legStrokeW);
  gDir.append("text")
    .attr("x", -3).attr("y", legCY).text(DIRECTION_STRINGS.W)
    .attr("text-anchor", "end").attr("alignment-baseline", "middle").attr("font-size", 9);
  
  // Speed Legend
  const legSpeedY = legDirY + legSize + 40;
  const gSpeed = legend.append("g")
    .attr("transform", `translate(10, ${legSpeedY})`);

  gSpeed.append("text")
    .attr("y", -5)
    .attr("font-size", 11)
    .attr("font-weight", "bold")
    .text("Speed Intensity");

  const speeds = [SPEED_STRINGS.PARADO, SPEED_STRINGS.LENTO, SPEED_STRINGS.MEDIO, SPEED_STRINGS.RAPIDO];

  speeds.forEach((s, i) => {
    const rowY = i * 20;
    const op = speedOpacity[s];

    if (s === SPEED_STRINGS.PARADO) {
      gSpeed.append("circle")
        .attr("cx", 8)
        .attr("cy", rowY + 8)
        .attr("r", 3)
        .attr("fill", baseColor)
        .attr("opacity", op);
    } else {
      gSpeed.append("rect")
        .attr("x", 0)
        .attr("y", rowY)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", baseColor)
        .attr("opacity", op);
    }

    gSpeed.append("text")
      .attr("x", 25)
      .attr("y", rowY + 8)
      .attr("dy", ".35em")
      .attr("font-size", 10)
      .text(s);
  });

}
