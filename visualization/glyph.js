/* ======================================================
   Tooltip (criado uma única vez)
   ====================================================== */

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "glyph-tooltip")
  .style("position", "absolute")
  .style("padding", "4px 8px")
  .style("background", "rgba(0,0,0,0.75)")
  .style("color", "#fff")
  .style("font-size", "11px")
  .style("border-radius", "4px")
  .style("pointer-events", "none")
  .style("opacity", 0);

/* ======================================================
   Parsing semântico do símbolo
   ====================================================== */

function extractSpeed(symbol) {
  if (!symbol) return null;
  if (symbol.includes("Parado")) return "Parado";
  if (symbol.includes("Lento")) return "Lento";
  if (symbol.includes("Medio")) return "Medio";
  if (symbol.includes("Rápido") || symbol.includes("Rapido")) return "Rapido";
  return null;
}

function extractDirection(symbol) {
  if (!symbol) return null;
  if (symbol.includes("Norte")) return "N";
  if (symbol.includes("Sul")) return "S";
  if (symbol.includes("Leste")) return "E";
  if (symbol.includes("Oeste")) return "W";
  return null;
}

function directionToAngle(dir) {
  const map = { N: 135, E: 45, S: -45, W: 225 };
  return ((map[dir] ?? 0) * Math.PI) / 180;
}

function parseSimbolicMovement(simbolic_movement) {
  try {
    const raw = JSON.parse(simbolic_movement.replace(/'/g, '"'));
    return raw
      .map(s => ({
        speed: extractSpeed(s),
        direction: extractDirection(s)
      }))
      .filter(d => d.speed && d.direction);
  } catch {
    return [];
  }
}

/* ======================================================
   Glyph individual (curvo + tempo → cor)
   ====================================================== */

export function drawSingleGlyph(g, simbolic_movement, options = {}) {

  const {
    maxRadius = 60,
    strokeWidth = 1.6,
    colormap = d3.interpolateViridis,
    speedScale = {
      Parado: 0.2,
      Lento: 0.5,
      Medio: 0.8,
      Rapido: 1.2
    }
  } = options;

  const states = parseSimbolicMovement(simbolic_movement);
  if (states.length < 2) return;

  const dr = maxRadius / states.length;
  let r = 0;

  const points = states.map(s => {
    const angle = directionToAngle(s.direction);
    r += dr * (speedScale[s.speed] ?? 0.5);
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle)
    };
  });

  const tScale = d3.scaleLinear()
    .domain([0, points.length - 1])
    .range([0, 1]);

  const steps = 12; // controla suavidade do arco

for (let i = 0; i < states.length - 1; i++) {

  const a0 = directionToAngle(states[i].direction);
  const a1 = directionToAngle(states[i + 1].direction);

  const r0 = dr * (speedScale[states[i].speed] ?? 0.5) * i;
  const r1 = dr * (speedScale[states[i + 1].speed] ?? 0.5) * (i + 1);

  const arcPoints = [];

  for (let t = 0; t <= steps; t++) {
    const u = t / steps;

    // interpolação angular contínua
    const angle = a0 + (a1 - a0) * u;

    // interpolação radial
    const radius = r0 + (r1 - r0) * u;

    arcPoints.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    });
  }

  g.append("path")
    .datum(arcPoints)
    .attr("d", d3.line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinear)
    )
    .attr("fill", "none")
    .attr("stroke", colormap(tScale(i)))
    .attr("stroke-width", strokeWidth)
    .attr("stroke-linecap", "round");
}


  // Marca inicial
  g.append("circle")
    .attr("cx", points[0].x)
    .attr("cy", points[0].y)
    .attr("r", 2.5)
    .attr("fill", colormap(0));
}

/* ======================================================
   Small multiples agrupados por cluster
   ====================================================== */

export function drawFlowRadarGlyph(data, containerSelector) {

  const container = d3.select(containerSelector);
  container.selectAll("*").remove();

  const dataSorted = [...data].sort((a, b) =>
    d3.ascending(a.cluster_markov, b.cluster_markov)
  );

  const size = 150;
  const cols = 5;
  const clusterGap = 25;

  let x = 0;
  let y = 0;
  let currentCluster = null;

  const svg = container.append("svg")
    .attr("width", cols * size + 200)
    .attr("height", 2000);

  dataSorted.forEach((d, i) => {

    // Novo cluster
    if (d.cluster_markov !== currentCluster) {
      currentCluster = d.cluster_markov;

      if (i !== 0) {
        y += size + clusterGap;
        x = 0;
      }

      svg.append("text")
        .attr("x", 10)
        .attr("y", y + size / 2)
        .attr("font-weight", "bold")
        .attr("font-size", 12)
        .text(`Cluster ${currentCluster}`);
    }

    const gx = x * size + 160;
    const gy = y + size / 2;

    const g = svg.append("g")
      .attr("transform", `translate(${gx}, ${gy})`)
      .style("cursor", "default")
      .on("mouseover", (event) => {
        tooltip
          .style("opacity", 1)
          .html(
            `<b>Trajetória:</b> ${d.trajectory_id}<br/>
             <b>Cluster:</b> ${d.cluster_markov}`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY + 10) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    drawSingleGlyph(g, d.simbolic_movement);

    x++;
    if (x >= cols) {
      x = 0;
      y += size;
    }
  });
}
