'use strict';

/**
 * TREE 1: GENERAL TREE
 * Used for: the event categories in the sidebar.
 *
 * Categories nest: "All events" holds "Technical", which holds "Workshops".
 * A node can have any number of children, so this is a general tree and not a
 * binary one. Three questions are answered by walking it:
 *   - choosing a category shows the events in its whole subtree,
 *   - the breadcrumb is the path from the root down to the chosen node,
 *   - the colour of a ticket comes from its top-level ancestor.
 */

class CategoryNode {
  constructor(id, name, parent) {
    this.id = id;
    this.name = name;
    this.parent = parent;
    this.children = [];
  }
}

class CategoryTree {
  constructor(rootId, rootName) {
    this.root = new CategoryNode(rootId, rootName, null);
    this.count = 1;
  }

  get size() {
    return this.count;
  }

  /** Adds a category under a parent that is already in the tree. */
  add(id, name, parentId) {
    const parent = this.find(parentId);
    if (parent === null) throw new Error(`Unknown parent category: ${parentId}`);
    if (this.find(id) !== null) throw new Error(`Category already exists: ${id}`);

    const node = new CategoryNode(id, name, parent);
    parent.children.push(node);
    this.count++;
    return node;
  }

  /** Depth-first search for a node by id. Returns null when it is not in the tree. O(n) */
  find(id, from = this.root) {
    if (from.id === id) return from;
    for (const child of from.children) {
      const found = this.find(id, child);
      if (found !== null) return found;
    }
    return null;
  }

  /** The nodes from the root down to the given one. This is the breadcrumb. O(depth) */
  pathTo(id) {
    const path = [];
    for (let node = this.find(id); node !== null; node = node.parent) path.unshift(node);
    return path;
  }

  /** The id of the node and of everything below it. O(size of the subtree) */
  subtreeIds(id) {
    const start = this.find(id);
    if (start === null) return [];

    const ids = [];
    (function collect(node) {
      ids.push(node.id);
      node.children.forEach(collect);
    })(start);
    return ids;
  }

  /** The ancestor that sits directly under the root: "Technical" for "Workshops". */
  topLevelOf(id) {
    const path = this.pathTo(id);
    return path.length > 1 ? path[1] : null;
  }

  /** How many levels the tree has. A tree with only a root has height 1. */
  height(node = this.root) {
    let tallest = 0;
    for (const child of node.children) tallest = Math.max(tallest, this.height(child));
    return tallest + 1;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { CategoryTree };
