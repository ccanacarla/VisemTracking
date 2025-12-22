
export function drawBehaviorRug(
  data,
  containerSelector,
  onTrajectoryClick = null
) {

  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  // ==================================================
  // Parâmetros visuais
  // ==================================================
  const rowHeight = 10;
  const cellWidth = 10;

  const speedSize = {
    "Parado": 4,
    "Lento": 6,
    "Medio": 8,
    "Rapido": 10
  };

  // ==================================================
  // Funções semânticas
  // ==================================================
  function getHeightFromSymbol(symbol) {
    if (!symbol) return rowHeight;

    if (symbol.includes("Parado")) return speedSize.Parado;
    if (symbol.includes("Lento"))  return speedSize.Lento;
    if (symbol.includes("Medio"))  return speedSize.Medio;
    if (symbol.includes("Rápido")) return speedSize.Rapido;

    return rowHeight;
  }

  // ==================================================
  // Extrair símbolos globais
  // ==================================================
  const symbolsSet = new Set();

  data.forEach(d => {
    if (!d.simbolic_movement) return;
    try {
      const seq = JSON.parse(d.simbolic_movement.replace(/'/g, '"'));
      if (Array.isArray(seq)) {
        seq.forEach(s => symbolsSet.add(s));
      }
    } catch {}
  });

  const symbols = Array.from(symbolsSet);
  if (symbols.length === 0) return;

  const color = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(symbols);

  // ==================================================
  // Preparar sequências
  // ==================================================
  const sequences = data.map(d => {
    let seq = [];
    try {
      seq = JSON.parse(d.simbolic_movement.replace(/'/g, '"'));
    } catch {}

    return {
      id: d.trajectory_id,
      cluster: d.cluster_markov,
      seq: Array.isArray(seq) ? seq : [],
      simbolic_movement: d.simbolic_movement
    };
  });

  // Agrupamento por cluster
  sequences.sort((a, b) =>
    d3.ascending(a.cluster, b.cluster) ||
    d3.ascending(a.id, b.id)
  );

  // ==================================================
  // Dimensões
  // ==================================================
  const maxLen = d3.max(sequences, d => d.seq.length);
  const width = maxLen * cellWidth;
  const height = sequences.length * rowHeight;

  // ==================================================
  // SVG
  // ==================================================
  const svg = container.append("svg")
    .attr("width", width + 300)
    .attr("height", height + 20)
    .style("border", "1px solid #ccc");

  const g = svg.append("g")
    .attr("transform", "translate(140,10)");

  // ==================================================
  // Rows (trajetórias)
  // ==================================================
  const rows = g.selectAll(".row")
    .data(sequences)
    .enter()
    .append("g")
    .attr("class", "row")
    .attr("transform", (d, i) => `translate(0, ${i * rowHeight})`)
    .style("cursor", "pointer")
    .on("click", function(event, d) {

      // feedback visual
      g.selectAll(".row").classed("selected", false);
      d3.select(this).classed("selected", true);

      if (onTrajectoryClick) {
        onTrajectoryClick(d);
      }
    });

  // ==================================================
  // Rótulos de cluster
  // ==================================================
  rows.filter((d, i) =>
    i === 0 || d.cluster !== sequences[i - 1].cluster
  )
  .append("text")
  .attr("x", -120)
  .attr("y", rowHeight / 2)
  .attr("dy", ".35em")
  .attr("font-weight", "bold")
  .attr("font-size", 10)
  .text(d => `Cluster ${d.cluster}`);

  // ==================================================
  // Behavior Rug (retângulos)
  // ==================================================
  rows.each(function(rowData) {

    let currentX = 0;

    d3.select(this)
      .selectAll("rect")
      .data(rowData.seq)
      .enter()
      .append("rect")
      .attr("x", () => {
        const x = currentX;
        currentX += cellWidth;
        return x;
      })
      .attr("y", d => (rowHeight - getHeightFromSymbol(d)) / 2)
      .attr("width", cellWidth)
      .attr("height", d => getHeightFromSymbol(d) - 0.6)
      .attr("fill", d => color(d));
  });

  // ==================================================
  // Labels das trajetórias
  // ==================================================
  rows.append("text")
    .attr("x", -5)
    .attr("y", (rowHeight / 2) - 1)
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("font-size", 8)
    .text(d => d.id);

  // ==================================================
  // Legenda
  // ==================================================
  const legend = svg.append("g")
    .attr("transform", `translate(${width + 160}, 20)`);

  legend.append("text")
    .attr("y", -10)
    .attr("font-weight", "bold")
    .attr("font-size", 12)
    .text("Legenda (Estados)");

  const legendItem = legend.selectAll(".legend-item")
    .data(symbols)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 22})`);

  legendItem.append("rect")
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", d => color(d))
    .attr("stroke", "#333");

  legendItem.append("text")
    .attr("x", 22)
    .attr("y", 8)
    .attr("dy", ".35em")
    .attr("font-size", 11)
    .text(d => d);
}
