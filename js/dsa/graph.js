'use strict';

/**
 * GRAPH (labelled edges, adjacency lists)
 * Used for: the connections between clubs, events and students.
 *
 * Every club, event and student is a node. An edge joins two nodes that have
 * something to do with each other, and its label says what:
 *   club    -- hosts -->           event
 *   event   -- leads to -->        event   (a good next step)
 *   student -- member of -->       club
 *   student -- registered for -->  event
 * Each relationship is stored in both directions, with a label for each way,
 * so it can be followed from either end.
 *
 * Three walks answer the portal's questions:
 *   - depth-first search from a club gives its event trail,
 *     such as AI Club > AI Workshop > Hackathon > ML Seminar,
 *   - breadth-first search finds the shortest chain between any two nodes,
 *   - reading a node's neighbours gives "who is going" and "what else are they
 *     going to".
 *
 * The adjacency lists are kept in the portal's own hash table, and the
 * breadth-first search uses the portal's own queue.
 */

class Graph {
  constructor() {
    // node key -> list of { to, label }
    this.adjacency = new HashTable();
    this.links = 0;
  }

  get nodeCount() {
    return this.adjacency.size;
  }

  /** The number of relationships. One relationship is two edges, one each way. */
  get linkCount() {
    return this.links;
  }

  addNode(key) {
    if (!this.adjacency.has(key)) this.adjacency.set(key, []);
  }

  hasNode(key) {
    return this.adjacency.has(key);
  }

  /**
   * Joins two nodes: a -> b gets the `forward` label and b -> a gets the
   * `backward` label. Joining the same pair with the same labels twice does
   * nothing the second time.
   */
  connect(a, b, forward, backward) {
    this.addNode(a);
    this.addNode(b);
    if (this.hasEdge(a, b, forward)) return;

    this.adjacency.get(a).push({ to: b, label: forward });
    this.adjacency.get(b).push({ to: a, label: backward });
    this.links++;
  }

  /** Removes a relationship added with connect. Returns true when it existed. */
  disconnect(a, b, forward, backward) {
    if (!this.hasEdge(a, b, forward)) return false;

    this.dropEdge(a, b, forward);
    this.dropEdge(b, a, backward);
    this.links--;
    return true;
  }

  dropEdge(from, to, label) {
    const edges = this.adjacency.get(from);
    const index = edges.findIndex((edge) => edge.to === to && edge.label === label);
    if (index !== -1) edges.splice(index, 1);
  }

  hasEdge(from, to, label) {
    const edges = this.adjacency.get(from);
    return edges !== undefined && edges.some((edge) => edge.to === to && edge.label === label);
  }

  /** A copy of the edges leaving a node, limited to the given labels when a list is passed. */
  edgesFrom(key, labels = null) {
    const edges = this.adjacency.get(key) || [];
    return labels === null ? edges.slice() : edges.filter((edge) => labels.includes(edge.label));
  }

  /** The nodes one step away along edges with the given label, in the order they were joined. */
  neighbours(key, label) {
    return this.edgesFrom(key, [label]).map((edge) => edge.to);
  }

  /**
   * Breadth-first search for the shortest chain from one node to another.
   * O(nodes + edges)
   *
   * Nodes are visited in order of distance: everything one step away, then
   * everything two steps away, and so on. So the first time the search reaches
   * the target, it has found a shortest chain.
   *
   * Returns the chain as [{ key, label }], where label is the edge that led to
   * that node (null for the first one), or null when the two are not connected.
   */
  shortestPath(from, to, labels = null) {
    if (!this.hasNode(from) || !this.hasNode(to)) return null;

    const reachedBy = new HashTable(); // node -> { from, label }
    const waiting = new Queue();
    reachedBy.set(from, { from: null, label: null });
    waiting.enqueue(from);

    while (!waiting.isEmpty()) {
      const current = waiting.dequeue();
      if (current === to) break;

      for (const edge of this.edgesFrom(current, labels)) {
        if (reachedBy.has(edge.to)) continue;
        reachedBy.set(edge.to, { from: current, label: edge.label });
        waiting.enqueue(edge.to);
      }
    }

    if (!reachedBy.has(to)) return null;

    // Walk back from the target to the start, then reverse.
    const path = [];
    for (let key = to; key !== null; key = reachedBy.get(key).from) {
      path.unshift({ key, label: reachedBy.get(key).label });
    }
    return path;
  }

  /**
   * Every node that can be reached from the start, with its distance in steps.
   * Breadth-first, so the list is ordered nearest first. O(nodes + edges)
   */
  breadthFirst(start, labels = null) {
    if (!this.hasNode(start)) return [];

    const distance = new HashTable();
    const waiting = new Queue();
    const visited = [];
    distance.set(start, 0);
    waiting.enqueue(start);

    while (!waiting.isEmpty()) {
      const current = waiting.dequeue();
      visited.push({ key: current, depth: distance.get(current) });

      for (const edge of this.edgesFrom(current, labels)) {
        if (distance.has(edge.to)) continue;
        distance.set(edge.to, distance.get(current) + 1);
        waiting.enqueue(edge.to);
      }
    }

    return visited;
  }

  /**
   * Depth-first search from a node, returned as the tree of first visits:
   * { key, label, children: [...] }. O(nodes + edges)
   *
   * The search follows one edge as far as it can go before it comes back and
   * tries the next. A node already visited is not visited again, so each node
   * appears once, under the node the search first reached it from.
   *
   * `arrange` decides which edge to try first. It receives the edges leaving
   * a node and returns them in the order to follow.
   */
  depthFirstTree(start, labels = null, arrange = (edges) => edges) {
    if (!this.hasNode(start)) return null;

    const visited = new HashTable();
    const visit = (key, label) => {
      visited.set(key, true);
      const node = { key, label, children: [] };
      for (const edge of arrange(this.edgesFrom(key, labels))) {
        if (!visited.has(edge.to)) node.children.push(visit(edge.to, edge.label));
      }
      return node;
    };

    return visit(start, null);
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Graph };
