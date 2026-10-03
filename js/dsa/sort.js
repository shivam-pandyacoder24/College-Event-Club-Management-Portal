'use strict';

/**
 * SORTING
 * Used for: the "Sort by" menu on the events page.
 *
 * Merge sort orders events by date, by popularity and by category. It is
 * stable: two events that tie stay in the order they arrived in. The portal
 * relies on that. Events reach the sort already in date order, so after a sort
 * by category the events inside each category are still in date order.
 *
 * Quick sort orders events by name. Names are unique, so stability does not
 * matter there, and quick sort needs no second array.
 *
 * Both return a new array and leave the input alone. `comparisons` is the
 * number of times two items were compared.
 */

/** Stable. O(n log n) time, O(n) extra space. */
function mergeSort(items, compare) {
  let comparisons = 0;

  function sort(list) {
    if (list.length <= 1) return list;

    const middle = Math.floor(list.length / 2);
    const left = sort(list.slice(0, middle));
    const right = sort(list.slice(middle));

    const merged = [];
    let l = 0;
    let r = 0;
    while (l < left.length && r < right.length) {
      comparisons++;
      // "<= 0" takes from the left half on a tie, which is what keeps the sort stable.
      if (compare(left[l], right[r]) <= 0) merged.push(left[l++]);
      else merged.push(right[r++]);
    }
    while (l < left.length) merged.push(left[l++]);
    while (r < right.length) merged.push(right[r++]);
    return merged;
  }

  return { sorted: sort(items.slice()), comparisons };
}

/** Not stable. O(n log n) on average, O(n^2) in the worst case, sorts in place on a copy. */
function quickSort(items, compare) {
  const list = items.slice();
  let comparisons = 0;

  function swap(a, b) {
    const held = list[a];
    list[a] = list[b];
    list[b] = held;
  }

  /** Moves the pivot to its final place and returns that index. */
  function partition(low, high) {
    // The middle item as pivot avoids the worst case on input that is already sorted.
    swap(low + Math.floor((high - low) / 2), high);
    const pivot = list[high];

    let boundary = low;
    for (let index = low; index < high; index++) {
      comparisons++;
      if (compare(list[index], pivot) < 0) swap(index, boundary++);
    }
    swap(boundary, high);
    return boundary;
  }

  function sort(low, high) {
    if (low >= high) return;
    const pivotIndex = partition(low, high);
    sort(low, pivotIndex - 1);
    sort(pivotIndex + 1, high);
  }

  sort(0, list.length - 1);
  return { sorted: list, comparisons };
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { mergeSort, quickSort };
