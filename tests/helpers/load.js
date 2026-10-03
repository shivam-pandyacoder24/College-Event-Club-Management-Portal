'use strict';

/**
 * The site uses plain <script> tags, so in the browser every class is a global.
 * This helper recreates that for the tests: it loads the same files, in the same
 * order as index.html, and puts what they export on Node's global scope.
 */

const path = require('node:path');

const SCRIPTS = [
  'js/dsa/search.js',
  'js/dsa/sort.js',
  'js/dsa/linked-list.js',
  'js/dsa/stack.js',
  'js/dsa/queue.js',
  'js/dsa/category-tree.js',
  'js/dsa/bst.js',
  'js/dsa/hash-table.js',
  'js/dsa/graph.js',
  'js/data/campus.js',
  'js/app/portal.js',
];

for (const script of SCRIPTS) {
  Object.assign(globalThis, require(path.join(__dirname, '..', '..', script)));
}

/** A portal filled with the sample campus, on a fixed date so the tests never depend on today. */
function createPortal(options = {}) {
  return new Portal({
    categories: SAMPLE_CATEGORIES,
    clubs: SAMPLE_CLUBS,
    events: SAMPLE_EVENTS,
    links: SAMPLE_EVENT_LINKS,
    students: SAMPLE_STUDENTS,
    state: createSampleState(),
    studentId: DEMO_STUDENT.id,
    today: new Date(2026, 9, 3),
    ...options,
  });
}

module.exports = { SCRIPTS, createPortal };
