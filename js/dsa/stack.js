'use strict';

/**
 * STACK (last in, first out)
 * Used for: Undo, and the "Recently viewed" list.
 *
 * Every registration, cancellation and club change is pushed onto the undo
 * stack. Undo pops the top entry, which is always the most recent action, and
 * reverses it. The recently viewed stack works the same way: the event you
 * opened last is on top.
 *
 * push, pop and peek are O(1): they only ever touch the top node.
 */

class StackNode {
  constructor(value, below) {
    this.value = value;
    this.below = below;
  }
}

class Stack {
  constructor() {
    this.top = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  isEmpty() {
    return this.count === 0;
  }

  /** Puts a value on top. */
  push(value) {
    this.top = new StackNode(value, this.top);
    this.count++;
  }

  /** Removes and returns the top value, or null when the stack is empty. */
  pop() {
    if (this.top === null) return null;
    const value = this.top.value;
    this.top = this.top.below;
    this.count--;
    return value;
  }

  /** Returns the top value without removing it, or null. */
  peek() {
    return this.top === null ? null : this.top.value;
  }

  clear() {
    this.top = null;
    this.count = 0;
  }

  /** Every value from the top down. O(n) */
  toArray() {
    const values = [];
    for (let node = this.top; node !== null; node = node.below) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Stack };
