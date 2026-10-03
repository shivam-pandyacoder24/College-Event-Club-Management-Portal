'use strict';

/**
 * HASH TABLE (separate chaining)
 * Used for: finding a student by student ID and an event by event number.
 *
 * A hash function turns the key into a number, and that number picks a bucket.
 * The lookup then only has to check the few entries in that one bucket, so it
 * takes about the same time whether the college has 60 students or 60,000.
 *
 * Two keys can land in the same bucket. That is a collision, and each bucket
 * holds a short chain of entries to deal with it. When the table gets crowded
 * (more than 0.75 entries per bucket) it doubles its buckets and re-places
 * every entry, which keeps the chains short.
 *
 * The portal also uses this table for its other "look it up by key" jobs: a
 * student's registration for an event, each event's waiting list, each club's
 * member list and the graph's adjacency lists.
 */

class HashEntry {
  constructor(key, value, next) {
    this.key = key;
    this.value = value;
    this.next = next;
  }
}

class HashTable {
  constructor(bucketCount = 16) {
    this.buckets = new Array(bucketCount).fill(null);
    this.count = 0;
    this.resizes = 0;
  }

  /**
   * Polynomial rolling hash: each character is mixed in as hash * 31 + code.
   * ">>> 0" keeps the result an unsigned 32-bit number.
   */
  static hash(key) {
    const text = String(key);
    let hash = 0;
    for (let index = 0; index < text.length; index++) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  get size() {
    return this.count;
  }

  get bucketCount() {
    return this.buckets.length;
  }

  get loadFactor() {
    return this.count / this.buckets.length;
  }

  /** Which bucket a key belongs in. */
  bucketIndex(key) {
    return HashTable.hash(key) % this.buckets.length;
  }

  /** Adds a key, or replaces the value of a key that is already stored. O(1) on average */
  set(key, value) {
    const name = String(key);
    const index = this.bucketIndex(name);

    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) {
      if (entry.key === name) {
        entry.value = value;
        return;
      }
    }

    this.buckets[index] = new HashEntry(name, value, this.buckets[index]);
    this.count++;
    if (this.loadFactor > 0.75) this.resize(this.buckets.length * 2);
  }

  /** The value stored under a key, or undefined. O(1) on average */
  get(key) {
    const name = String(key);
    for (let entry = this.buckets[this.bucketIndex(name)]; entry !== null; entry = entry.next) {
      if (entry.key === name) return entry.value;
    }
    return undefined;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  /** Removes a key. Returns true when it was stored. O(1) on average */
  delete(key) {
    const name = String(key);
    const index = this.bucketIndex(name);

    let before = null;
    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) {
      if (entry.key === name) {
        if (before === null) this.buckets[index] = entry.next;
        else before.next = entry.next;
        this.count--;
        return true;
      }
      before = entry;
    }
    return false;
  }

  /** Moves every entry into a new, larger set of buckets. O(n) */
  resize(bucketCount) {
    const old = this.buckets;
    this.buckets = new Array(bucketCount).fill(null);
    this.resizes++;

    for (const head of old) {
      for (let entry = head; entry !== null; entry = entry.next) {
        const index = this.bucketIndex(entry.key);
        this.buckets[index] = new HashEntry(entry.key, entry.value, this.buckets[index]);
      }
    }
  }

  /** Every [key, value] pair. The order follows the buckets, so it looks shuffled. O(n) */
  entries() {
    const pairs = [];
    for (const head of this.buckets) {
      for (let entry = head; entry !== null; entry = entry.next) pairs.push([entry.key, entry.value]);
    }
    return pairs;
  }

  keys() {
    return this.entries().map(([key]) => key);
  }

  /** The keys chained in one bucket, first to last. */
  chainAt(index) {
    const keys = [];
    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) keys.push(entry.key);
    return keys;
  }

  /** Shows the work one lookup does: the hash, the bucket and the keys compared. */
  trace(key) {
    const name = String(key);
    const index = this.bucketIndex(name);
    const compared = [];

    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) {
      compared.push(entry.key);
      if (entry.key === name) return { hash: HashTable.hash(name), bucket: index, compared, found: true };
    }
    return { hash: HashTable.hash(name), bucket: index, compared, found: false };
  }

  /** Numbers that describe how well the keys are spread out. */
  stats() {
    let used = 0;
    let longestChain = 0;

    for (let index = 0; index < this.buckets.length; index++) {
      const length = this.chainAt(index).length;
      if (length > 0) used++;
      if (length > longestChain) longestChain = length;
    }

    return {
      size: this.count,
      buckets: this.buckets.length,
      used,
      // Every entry beyond the first in a bucket got there by colliding.
      collisions: this.count - used,
      longestChain,
      loadFactor: this.loadFactor,
      resizes: this.resizes,
    };
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { HashTable };
