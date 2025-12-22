export function linePins(dados) {
    const margin = { top: 40, right: 20, bottom: 30, left: 40 };
    const originalWidth = 960;
    const originalHeight = 500;
    const width = (originalWidth * 0.5) - margin.left - margin.right;
    const height = (originalHeight * 0.5) - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    const allSymbols = new Set();
    dados.forEach(trajectory => {
        const symbols = JSON.parse(trajectory.simbolic_movement.replace(/'/g, '"'));
        if (symbols) {
            symbols.forEach(symbol => allSymbols.add(symbol));
        }
    });
    const uniqueGlobalSymbols = [...allSymbols];

    const angle = d3.scalePoint()
        .domain(uniqueGlobalSymbols)
        .range([0, 2 * Math.PI]);

    const symbolCoords = {};
    uniqueGlobalSymbols.forEach(symbol => {
        symbolCoords[symbol] = {
            x: radius * Math.cos(angle(symbol) - Math.PI / 2),
            y: radius * Math.sin(angle(symbol) - Math.PI / 2)
        };
    });

    const container = d3.select(".container");

    dados.forEach(trajectory => {
        const symbols = JSON.parse(trajectory.simbolic_movement.replace(/'/g, '"'));
        if (!symbols || symbols.length === 0) {
            return;
        }
        const uniqueTrajectorySymbols = [...new Set(symbols)];

        const plotContainer = container.append("div")
            .attr("class", "plot-container")
            .style("display", "inline-block")
            .style("margin", "10px");

        plotContainer.append("h3").text(`Trajectory ID: ${trajectory.trajectory_id}`);

        const svg = plotContainer.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${width / 2 + margin.left}, ${height / 2 + margin.top})`);

        
        const symbolNodes = uniqueTrajectorySymbols.map(symbol => ({
            symbol: symbol,
            x: symbolCoords[symbol].x,
            y: symbolCoords[symbol].y
        }));


        const textRadius = radius + 20;

        svg.selectAll("circle")
            .data(symbolNodes)
            .enter().append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", 5)
            .style("fill", "steelblue");

        svg.selectAll("text")
            .data(symbolNodes)
            .enter().append("text")
            .attr("x", d => textRadius * Math.cos(angle(d.symbol) - Math.PI / 2))
            .attr("y", d => textRadius * Math.sin(angle(d.symbol) - Math.PI / 2))
            .text(d => d.symbol)
            .attr("dominant-baseline", "middle") 
            .attr("text-anchor", d => { 
                const symbolAngle = angle(d.symbol) - Math.PI / 2;
                if (symbolAngle > -Math.PI / 2 && symbolAngle < Math.PI / 2) {
                    return "start"; 
                } else if (symbolAngle === Math.PI / 2 || symbolAngle === -Math.PI / 2) {
                    return "middle"; 
                } else {
                    return "end"; 
                }
            });

        const links = [];
        for (let i = 0; i < symbols.length - 1; i++) {
            const sourceSymbol = symbols[i];
            const targetSymbol = symbols[i + 1];
            if (sourceSymbol && targetSymbol && sourceSymbol !== targetSymbol) {
                links.push({
                    source: symbolCoords[sourceSymbol],
                    target: symbolCoords[targetSymbol]
                });
            }
        }

        svg.selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.5);
    });
}
