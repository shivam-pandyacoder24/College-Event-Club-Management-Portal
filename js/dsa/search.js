'use strict';

/**
 * SEARCHING
 * Used for: the search box (linear search) and the "When" filter (binary search).
 *
 * Linear search checks every element, so it works on data in any order. The
 * search box needs that, because a word can match an event's name, its club,
 * its venue or one of its tags.
 *
 * Binary search halves the range on every step, but only works on sorted data.
 * The portal keeps one copy of the events sorted by date, so "events in the
 * next 7 days" is two binary searches (where the range starts and where it
 * ends) instead of a scan of every event.
 */

/**
 * Returns every item the test accepts, in their original order. O(n)
 * `comparisons` is how many items were checked, which is always items.length.
 */
function linearSearch(items, matches) {
  const found = [];
  let comparisons = 0;

  for (let index = 0; index < items.length; index++) {
    comparisons++;
    if (matches(items[index], index)) found.push(items[index]);
  }

  return { found, comparisons };
}

/**
 * Binary search for a position rather than for one item: the index of the
 * first item whose key is not less than `target`. O(log n)
 *
 * If every key is smaller than the target, the answer is items.length.
 * `items` must already be sorted by the same key, smallest first.
 */
function lowerBound(items, target, keyOf = (item) => item) {
  let low = 0;
  let high = items.length;
  let steps = 0;

  while (low < high) {
    steps++;
    const middle = low + Math.floor((high - low) / 2);
    if (keyOf(items[middle]) < target) low = middle + 1;
    else high = middle;
  }

  return { index: low, steps };
}

/**
 * Every item whose key is at least `from` and less than `to`, found with two
 * binary searches. O(log n) to find the range, plus the size of the answer.
 */
function sortedRange(items, from, to, keyOf = (item) => item) {
  const start = lowerBound(items, from, keyOf);
  const end = lowerBound(items, to, keyOf);

  return {
    found: items.slice(start.index, end.index),
    start: start.index,
    end: end.index,
    steps: start.steps + end.steps,
  };
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { linearSearch, lowerBound, sortedRange };
