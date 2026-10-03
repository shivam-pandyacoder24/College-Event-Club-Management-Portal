'use strict';

/**
 * LINKED LIST (singly linked, with head and tail pointers)
 * Used for: the members of each club, in the order they joined.
 *
 * A club's roster grows and shrinks all the time, and it has no fixed size. A
 * new member is linked on after the tail in O(1), with no shifting and no
 * resizing. A member who leaves is unlinked by pointing the node before them
 * at the node after them.
 */

class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  isEmpty() {
    return this.count === 0;
  }

  /** Adds at the tail. O(1) */
  append(value) {
    const node = new ListNode(value);
    if (this.tail === null) this.head = node;
    else this.tail.next = node;
    this.tail = node;
    this.count++;
  }

  /**
   * Adds so the value ends up at `index` (0 is the head). O(n)
   * An index past the end adds at the tail. Undo uses this to put a member
   * back in the place they left.
   */
  insertAt(index, value) {
    if (index >= this.count) {
      this.append(value);
      return;
    }

    const node = new ListNode(value);
    if (index <= 0) {
      node.next = this.head;
      this.head = node;
    } else {
      let before = this.head;
      for (let step = 1; step < index; step++) before = before.next;
      node.next = before.next;
      before.next = node;
    }
    this.count++;
  }

  /** The position of the first value the test accepts (0 is the head), or -1. O(n) */
  indexOf(matches) {
    let index = 0;
    for (let node = this.head; node !== null; node = node.next) {
      if (matches(node.value)) return index;
      index++;
    }
    return -1;
  }

  /** Unlinks the first value the test accepts. Returns true when something was removed. O(n) */
  remove(matches) {
    let before = null;
    for (let node = this.head; node !== null; node = node.next) {
      if (matches(node.value)) {
        if (before === null) this.head = node.next;
        else before.next = node.next;
        if (node === this.tail) this.tail = before;
        this.count--;
        return true;
      }
      before = node;
    }
    return false;
  }

  /** Every value from head to tail. O(n) */
  toArray() {
    const values = [];
    for (let node = this.head; node !== null; node = node.next) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { LinkedList };
