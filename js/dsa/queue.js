'use strict';

/**
 * QUEUE (first in, first out)
 * Used for: the waiting list of an event that is full.
 *
 * A student who wants a seat at a full event joins at the rear. When someone
 * cancels, the student at the front gets the seat, so seats always go to
 * whoever has waited longest. enqueue and dequeue are O(1) because the queue
 * keeps a pointer to both ends.
 *
 * The graph's breadth-first search also runs on this queue.
 */

class QueueNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  constructor() {
    this.front = null;
    this.rear = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  isEmpty() {
    return this.count === 0;
  }

  /** Adds at the rear. O(1) */
  enqueue(value) {
    const node = new QueueNode(value);
    if (this.rear === null) this.front = node;
    else this.rear.next = node;
    this.rear = node;
    this.count++;
  }

  /** Removes and returns the value at the front, or null when the queue is empty. O(1) */
  dequeue() {
    if (this.front === null) return null;
    const value = this.front.value;
    this.front = this.front.next;
    if (this.front === null) this.rear = null;
    this.count--;
    return value;
  }

  /** Returns the value at the front without removing it, or null. */
  peek() {
    return this.front === null ? null : this.front.value;
  }

  /** 1 for the front of the queue, 2 for the next, and 0 when the value is not waiting. O(n) */
  positionOf(value) {
    let position = 1;
    for (let node = this.front; node !== null; node = node.next) {
      if (node.value === value) return position;
      position++;
    }
    return 0;
  }

  /**
   * Takes a value out of the line wherever it is standing, for a student who
   * gives up waiting. Everyone behind moves up one place. O(n)
   */
  remove(value) {
    let before = null;
    for (let node = this.front; node !== null; node = node.next) {
      if (node.value === value) {
        if (before === null) this.front = node.next;
        else before.next = node.next;
        if (node === this.rear) this.rear = before;
        this.count--;
        return true;
      }
      before = node;
    }
    return false;
  }

  /**
   * Puts a value back at a position it held before (1 is the front). O(n)
   * Only Undo calls this, to restore a line exactly as it was. New arrivals
   * always go through enqueue.
   */
  insertAt(position, value) {
    if (position > this.count) {
      this.enqueue(value);
      return;
    }

    const node = new QueueNode(value);
    if (position <= 1) {
      node.next = this.front;
      this.front = node;
    } else {
      let before = this.front;
      for (let step = 2; step < position; step++) before = before.next;
      node.next = before.next;
      before.next = node;
    }
    this.count++;
  }

  /** Every value from front to rear. O(n) */
  toArray() {
    const values = [];
    for (let node = this.front; node !== null; node = node.next) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Queue };
