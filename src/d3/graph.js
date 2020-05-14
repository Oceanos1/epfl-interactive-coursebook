import * as d3 from "d3";

const t = d3
  .transition()
  .duration(1000)
  .ease(d3.easeLinear);

const tooltipSelector = "#tooltip";

export default class Graph {
  vue;

  svg;

  simulation;

  node;

  link;

  constructor(vue) {
    // We want access to the vue component
    this.vue = vue;

    const svg = d3.select("#viz");
    const width = parseFloat(svg.style("width"));
    const height = parseFloat(svg.style("height"));

    this.simulation = d3
      .forceSimulation()
      .force("charge", d3.forceManyBody())
      .force(
        "link",
        d3.forceLink().id(d => d.id)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .on("tick", this.ticked.bind(this));

    this.node = svg
      .append("g")
      .attr("cursor", "grab")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle");

    this.link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line");

    this.svg = svg;
  }

  ticked() {
    this.link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    this.node.attr("cx", d => d.x).attr("cy", d => d.y);
  }

  // Mouse events for node tooltip
  mouseover({ id, name, credits }) {
    const html = `
      <div>${id}</div>
      <div>${name}</div>
      <div>Credits: ${credits}</div>
    `;

    d3.select(tooltipSelector)
      .style("display", "block")
      .html(html);
    d3.select(this)
      .style("stroke", "black")
      .style("opacity", 1);
  }

  mousemove() {
    const [x, y] = d3.mouse(this);

    d3.select(tooltipSelector)
      .style("left", `${x + 20}px`)
      .style("top", `${y}px`);
  }

  mouseleave() {
    d3.select(tooltipSelector).style("display", "none");
    d3.select(this)
      .style("stroke", "none")
      .style("opacity", 0.8);
  }

  // Drag events for nodes
  dragstarted(d) {
    if (!d3.event.active) {
      // I don't know what this does, I just copied it
      this.simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;

    this.node
      .attr("cursor", "grabbing")
      .on("mouseover", null)
      // .on("mousemove", null)
      .on("mouseleave", null);

    d3.select(tooltipSelector).style("display", "none");
  }

  dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  dragended(d) {
    if (!d3.event.active) {
      // I don't know what this does, I just copied it
      this.simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;

    this.node
      .attr("cursor", "grab")
      .on("mouseover", this.mouseover)
      // .on("mousemove", this.mousemove)
      .on("mouseleave", this.mouseleave);
  }

  render(nodes, links) {
    // Make a shallow copy to protect against mutation, while
    // recycling old nodes to preserve position and velocity.
    const old = new Map(this.node.data().map(d => [d.id, d]));
    const newNodes = nodes.map(d => Object.assign(old.get(d.id) || {}, d));
    const newLinks = links.map(d => Object.assign({}, d));

    /* Links */
    this.link = this.link
      .data(newLinks, d => `${d.source} -> ${d.target}`)
      .join(
        enter =>
          enter
            .append("line")
            .call(enter => enter.transition(t).attr("stroke-width", 1)),
        update => update,
        exit =>
          exit.call(exit =>
            exit
              .transition(t)
              .attr("stroke-width", 0)
              .remove()
          )
      )
      .attr("class", "link");

    /* Nodes */
    this.node = this.node
      .data(newNodes, d => d.id)
      .join(
        enter =>
          enter
            .append("circle")
            .attr("fill", "green")
            .call(enter =>
              enter
                .transition(t)
                .attr("r", d => Math.log(Math.pow(Number(d.credits), 7) + 3))
            ),
        update =>
          update.call(update => update.transition(t).attr("fill", "orange")),
        exit =>
          exit.attr("fill", "red").call(exit =>
            exit
              .transition(t)
              .attr("r", 0)
              .remove()
          )
      )
      .attr("class", "node");

    this.node
      .call(
        d3
          .drag()
          .on("start", this.dragstarted.bind(this))
          .on("drag", this.dragged.bind(this))
          .on("end", this.dragended.bind(this))
      )
      .on("mouseover", this.mouseover)
      .on("mousemove", this.mousemove)
      .on("mouseleave", this.mouseleave)
      .on("dblclick", this.vue.onNodeDblClick);

    this.restartSimulation(newNodes, newLinks);
  }

  restartSimulation(nodes, links) {
    this.simulation.nodes(nodes);
    this.simulation.force("link").links(links);
    this.simulation.alpha(1).restart();
  }
}
