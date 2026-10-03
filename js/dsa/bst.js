'use strict';

/**
 * TREE 2: BINARY SEARCH TREE
 * Used for: finding an event by its event number.
 *
 * Every node holds one event number. Smaller numbers go to the left and larger
 * ones to the right, so a lookup throws away half of what is left at each
 * step. Because the tree keeps the numbers in order, it can also answer
 * questions a hash table cannot:
 *   - "there is no event 500, which numbers are closest?" (floor and ceiling)
 *   - "list every event number in order" (in-order walk)
 *   - "what are the smallest and largest numbers?" (min and max)
 */

class TreeNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  /**
   * Builds a tree of the smallest possible height from entries sorted by key.
   * The middle entry becomes the root, then the middle of each half becomes a
   * child, and so on. Inserting sorted keys one by one would instead give a
   * tree shaped like a linked list.
   */
  static fromSorted(entries) {
    const tree = new BinarySearchTree();

    (function insertMiddle(low, high) {
      if (low > high) return;
      const middle = low + Math.floor((high - low) / 2);
      tree.insert(entries[middle].key, entries[middle].value);
      insertMiddle(low, middle - 1);
      insertMiddle(middle + 1, high);
    })(0, entries.length - 1);

    return tree;
  }

  /** Adds a key. A key that is already in the tree gets the new value. O(height) */
  insert(key, value) {
    if (this.root === null) {
      this.root = new TreeNode(key, value);
      this.count++;
      return;
    }

    let node = this.root;
    while (true) {
      if (key === node.key) {
        node.value = value;
        return;
      }
      const side = key < node.key ? 'left' : 'right';
      if (node[side] === null) {
        node[side] = new TreeNode(key, value);
        this.count++;
        return;
      }
      node = node[side];
    }
  }

  /**
   * Looks a key up. O(height)
   * `path` lists every key the search compared against, in order, so the page
   * can show the route it took through the tree.
   */
  find(key) {
    const path = [];
    let node = this.root;

    while (node !== null) {
      path.push(node.key);
      if (key === node.key) return { found: true, value: node.value, path };
      node = key < node.key ? node.left : node.right;
    }

    return { found: false, value: null, path };
  }

  /** The largest key that is not greater than the given one, or null. O(height) */
  floor(key) {
    let best = null;
    let node = this.root;
    while (node !== null) {
      if (node.key === key) return key;
      if (node.key < key) {
        best = node.key;
        node = node.right;
      } else {
        node = node.left;
      }
    }
    return best;
  }

  /** The smallest key that is not less than the given one, or null. O(height) */
  ceiling(key) {
    let best = null;
    let node = this.root;
    while (node !== null) {
      if (node.key === key) return key;
      if (node.key > key) {
        best = node.key;
        node = node.left;
      } else {
        node = node.right;
      }
    }
    return best;
  }

  min() {
    if (this.root === null) return null;
    let node = this.root;
    while (node.left !== null) node = node.left;
    return node.key;
  }

  max() {
    if (this.root === null) return null;
    let node = this.root;
    while (node.right !== null) node = node.right;
    return node.key;
  }

  /** Every entry in ascending key order: left subtree, node, right subtree. O(n) */
  inOrder() {
    const entries = [];
    (function visit(node) {
      if (node === null) return;
      visit(node.left);
      entries.push({ key: node.key, value: node.value });
      visit(node.right);
    })(this.root);
    return entries;
  }

  /** The number of levels. An empty tree has height 0. */
  height(node = this.root) {
    if (node === null) return 0;
    return 1 + Math.max(this.height(node.left), this.height(node.right));
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { BinarySearchTree };
