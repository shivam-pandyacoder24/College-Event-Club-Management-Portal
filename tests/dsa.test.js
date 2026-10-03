'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/load.js');

// ---------------------------------------------------------------- searching

test('linear search returns every match in order and checks each item once', () => {
  const result = linearSearch([4, 9, 2, 9, 7], (value) => value === 9);
  assert.deepEqual(result.found, [9, 9]);
  assert.equal(result.comparisons, 5);
  assert.deepEqual(linearSearch([], () => true).found, []);
});

test('lower bound finds the first key that is not smaller than the target', () => {
  const sorted = [10, 20, 20, 30, 50];
  assert.equal(lowerBound(sorted, 20).index, 1);
  assert.equal(lowerBound(sorted, 25).index, 3);
  assert.equal(lowerBound(sorted, 5).index, 0);
  assert.equal(lowerBound(sorted, 99).index, 5);
  assert.equal(lowerBound([], 1).index, 0);
});

test('binary search takes at most log2(n) + 1 steps', () => {
  const sorted = Array.from({ length: 1000 }, (_, index) => ({ at: index * 3 }));
  const result = lowerBound(sorted, 1500, (item) => item.at);
  assert.equal(result.index, 500);
  assert.ok(result.steps <= 10, `took ${result.steps} steps`);
});

test('sorted range returns the items between two keys, including the first and excluding the last', () => {
  const sorted = [1, 3, 5, 7, 9, 11];
  const range = sortedRange(sorted, 3, 9);
  assert.deepEqual(range.found, [3, 5, 7]);
  assert.equal(range.start, 1);
  assert.equal(range.end, 4);
  assert.deepEqual(sortedRange(sorted, 20, 30).found, []);
});

// ------------------------------------------------------------------ sorting

test('merge sort and quick sort agree with the built-in sort and leave the input alone', () => {
  const numbers = [38, 27, 43, 3, 9, 82, 10, 3, 27, 1];
  const expected = numbers.slice().sort((a, b) => a - b);
  const before = numbers.slice();

  assert.deepEqual(mergeSort(numbers, (a, b) => a - b).sorted, expected);
  assert.deepEqual(quickSort(numbers, (a, b) => a - b).sorted, expected);
  assert.deepEqual(numbers, before);
  assert.deepEqual(mergeSort([], (a, b) => a - b).sorted, []);
  assert.deepEqual(quickSort([5], (a, b) => a - b).sorted, [5]);
});

test('both sorts handle input that is already sorted, reversed or all equal', () => {
  const ascending = Array.from({ length: 200 }, (_, index) => index);
  const descending = ascending.slice().reverse();
  const equal = new Array(50).fill(7);

  for (const sort of [mergeSort, quickSort]) {
    assert.deepEqual(sort(ascending, (a, b) => a - b).sorted, ascending);
    assert.deepEqual(sort(descending, (a, b) => a - b).sorted, ascending);
    assert.deepEqual(sort(equal, (a, b) => a - b).sorted, equal);
  }
});

test('merge sort is stable: items that tie keep their original order', () => {
  const events = [
    { name: 'a', seats: 20 },
    { name: 'b', seats: 10 },
    { name: 'c', seats: 20 },
    { name: 'd', seats: 10 },
    { name: 'e', seats: 20 },
  ];
  const sorted = mergeSort(events, (x, y) => x.seats - y.seats).sorted;
  assert.deepEqual(sorted.map((event) => event.name), ['b', 'd', 'a', 'c', 'e']);
});

test('merge sort stays within n log2(n) comparisons', () => {
  const numbers = Array.from({ length: 256 }, (_, index) => (index * 97) % 256);
  const result = mergeSort(numbers, (a, b) => a - b);
  assert.ok(result.comparisons <= 256 * 8, `made ${result.comparisons} comparisons`);
});

// -------------------------------------------------------------- linked list

test('linked list appends at the tail and keeps joining order', () => {
  const list = new LinkedList();
  assert.equal(list.isEmpty(), true);

  list.append('first');
  list.append('second');
  list.append('third');

  assert.equal(list.size, 3);
  assert.deepEqual(list.toArray(), ['first', 'second', 'third']);
  assert.equal(list.head.value, 'first');
  assert.equal(list.tail.value, 'third');
  assert.equal(list.indexOf((value) => value === 'second'), 1);
  assert.equal(list.indexOf((value) => value === 'nobody'), -1);
});

test('linked list removes from the head, the middle and the tail', () => {
  const list = new LinkedList();
  ['a', 'b', 'c', 'd'].forEach((value) => list.append(value));

  assert.equal(list.remove((value) => value === 'b'), true);
  assert.deepEqual(list.toArray(), ['a', 'c', 'd']);

  assert.equal(list.remove((value) => value === 'd'), true);
  assert.equal(list.tail.value, 'c');

  assert.equal(list.remove((value) => value === 'a'), true);
  assert.equal(list.head.value, 'c');
  assert.equal(list.size, 1);

  assert.equal(list.remove((value) => value === 'missing'), false);
  assert.equal(list.remove((value) => value === 'c'), true);
  assert.equal(list.head, null);
  assert.equal(list.tail, null);

  list.append('again');
  assert.deepEqual(list.toArray(), ['again']);
});

test('linked list inserts at a position', () => {
  const list = new LinkedList();
  ['a', 'c'].forEach((value) => list.append(value));

  list.insertAt(1, 'b');
  list.insertAt(0, 'start');
  list.insertAt(99, 'end');

  assert.deepEqual(list.toArray(), ['start', 'a', 'b', 'c', 'end']);
  assert.equal(list.tail.value, 'end');
  assert.equal(list.size, 5);
});

// -------------------------------------------------------------------- stack

test('stack is last in, first out', () => {
  const stack = new Stack();
  assert.equal(stack.pop(), null);
  assert.equal(stack.peek(), null);

  stack.push('first');
  stack.push('second');
  stack.push('third');

  assert.equal(stack.size, 3);
  assert.equal(stack.peek(), 'third');
  assert.deepEqual(stack.toArray(), ['third', 'second', 'first']);
  assert.equal(stack.pop(), 'third');
  assert.equal(stack.pop(), 'second');
  assert.equal(stack.pop(), 'first');
  assert.equal(stack.isEmpty(), true);

  stack.push('x');
  stack.clear();
  assert.equal(stack.size, 0);
});

// -------------------------------------------------------------------- queue

test('queue is first in, first out', () => {
  const queue = new Queue();
  assert.equal(queue.dequeue(), null);

  queue.enqueue('first');
  queue.enqueue('second');
  queue.enqueue('third');

  assert.equal(queue.size, 3);
  assert.equal(queue.peek(), 'first');
  assert.equal(queue.positionOf('third'), 3);
  assert.equal(queue.positionOf('nobody'), 0);
  assert.equal(queue.dequeue(), 'first');
  assert.equal(queue.dequeue(), 'second');
  assert.equal(queue.dequeue(), 'third');
  assert.equal(queue.isEmpty(), true);
  assert.equal(queue.rear, null);

  queue.enqueue('again');
  assert.deepEqual(queue.toArray(), ['again']);
});

test('queue lets someone leave the line and puts them back where they were', () => {
  const queue = new Queue();
  ['a', 'b', 'c', 'd'].forEach((value) => queue.enqueue(value));

  assert.equal(queue.remove('c'), true);
  assert.deepEqual(queue.toArray(), ['a', 'b', 'd']);
  queue.insertAt(3, 'c');
  assert.deepEqual(queue.toArray(), ['a', 'b', 'c', 'd']);

  assert.equal(queue.remove('d'), true);
  assert.equal(queue.rear.value, 'c');
  queue.insertAt(4, 'd');
  assert.equal(queue.rear.value, 'd');

  assert.equal(queue.remove('a'), true);
  queue.insertAt(1, 'a');
  assert.deepEqual(queue.toArray(), ['a', 'b', 'c', 'd']);
  assert.equal(queue.size, 4);
  assert.equal(queue.remove('nobody'), false);
});

// ------------------------------------------------------------ category tree

function sampleTree() {
  const tree = new CategoryTree('all', 'All events');
  tree.add('technical', 'Technical', 'all');
  tree.add('workshops', 'Workshops', 'technical');
  tree.add('talks', 'Talks', 'technical');
  tree.add('cultural', 'Cultural', 'all');
  tree.add('music', 'Music', 'cultural');
  return tree;
}

test('category tree finds nodes, paths and subtrees', () => {
  const tree = sampleTree();

  assert.equal(tree.size, 6);
  assert.equal(tree.height(), 3);
  assert.equal(tree.find('music').name, 'Music');
  assert.equal(tree.find('missing'), null);
  assert.deepEqual(tree.pathTo('workshops').map((node) => node.name), ['All events', 'Technical', 'Workshops']);
  assert.deepEqual(tree.pathTo('missing'), []);
  assert.deepEqual(tree.subtreeIds('technical'), ['technical', 'workshops', 'talks']);
  assert.deepEqual(tree.subtreeIds('music'), ['music']);
  assert.equal(tree.topLevelOf('workshops').id, 'technical');
  assert.equal(tree.topLevelOf('technical').id, 'technical');
  assert.equal(tree.topLevelOf('all'), null);
});

test('category tree keeps children in the order they were added and rejects bad additions', () => {
  const tree = sampleTree();

  assert.deepEqual(tree.root.children.map((node) => node.id), ['technical', 'cultural']);
  assert.deepEqual(tree.find('technical').children.map((node) => node.id), ['workshops', 'talks']);
  assert.equal(tree.find('workshops').parent.id, 'technical');
  assert.throws(() => tree.add('dance', 'Dance', 'nowhere'), /Unknown parent/);
  assert.throws(() => tree.add('music', 'Music again', 'all'), /already exists/);
});

// ------------------------------------------------------- binary search tree

test('binary search tree finds keys and records the path it took', () => {
  const tree = new BinarySearchTree();
  [50, 30, 70, 20, 40, 60, 80].forEach((key) => tree.insert(key, `event ${key}`));

  assert.equal(tree.size, 7);
  assert.equal(tree.height(), 3);

  const hit = tree.find(60);
  assert.equal(hit.found, true);
  assert.equal(hit.value, 'event 60');
  assert.deepEqual(hit.path, [50, 70, 60]);

  const miss = tree.find(45);
  assert.equal(miss.found, false);
  assert.deepEqual(miss.path, [50, 30, 40]);

  tree.insert(60, 'replaced');
  assert.equal(tree.size, 7);
  assert.equal(tree.find(60).value, 'replaced');
});

test('binary search tree answers ordered questions', () => {
  const tree = new BinarySearchTree();
  [50, 30, 70, 20, 40, 60, 80].forEach((key) => tree.insert(key, key));

  assert.deepEqual(tree.inOrder().map((entry) => entry.key), [20, 30, 40, 50, 60, 70, 80]);
  assert.equal(tree.min(), 20);
  assert.equal(tree.max(), 80);
  assert.equal(tree.floor(45), 40);
  assert.equal(tree.ceiling(45), 50);
  assert.equal(tree.floor(40), 40);
  assert.equal(tree.floor(10), null);
  assert.equal(tree.ceiling(90), null);
});

test('a tree built from sorted entries is as short as it can be', () => {
  const entries = Array.from({ length: 32 }, (_, index) => ({ key: index, value: index }));
  const balanced = BinarySearchTree.fromSorted(entries);
  assert.equal(balanced.size, 32);
  assert.equal(balanced.height(), 6);
  assert.deepEqual(balanced.inOrder().map((entry) => entry.key), entries.map((entry) => entry.key));

  const lopsided = new BinarySearchTree();
  entries.forEach((entry) => lopsided.insert(entry.key, entry.value));
  assert.equal(lopsided.height(), 32);

  assert.equal(new BinarySearchTree().height(), 0);
  assert.equal(new BinarySearchTree().min(), null);
});

// --------------------------------------------------------------- hash table

test('hash table stores, replaces and deletes values', () => {
  const table = new HashTable();
  table.set('AI25042', 'Aarav');
  table.set('CS24014', 'Arjun');
  table.set(512, 'AI Workshop');

  assert.equal(table.size, 3);
  assert.equal(table.get('AI25042'), 'Aarav');
  assert.equal(table.get(512), 'AI Workshop');
  assert.equal(table.get('512'), 'AI Workshop');
  assert.equal(table.get('missing'), undefined);
  assert.equal(table.has('CS24014'), true);

  table.set('AI25042', 'Aarav Mehta');
  assert.equal(table.size, 3);
  assert.equal(table.get('AI25042'), 'Aarav Mehta');

  assert.equal(table.delete('CS24014'), true);
  assert.equal(table.delete('CS24014'), false);
  assert.equal(table.has('CS24014'), false);
  assert.equal(table.size, 2);
});

test('hash table chains keys that collide and still finds each one', () => {
  const table = new HashTable(4);
  // With 4 buckets and only 3 entries allowed before a resize, force collisions by hand.
  const colliding = [];
  for (let number = 0; colliding.length < 3; number++) {
    if (HashTable.hash(`K${number}`) % 4 === 1) colliding.push(`K${number}`);
  }
  colliding.forEach((key, index) => table.set(key, index));

  assert.equal(table.bucketCount, 4);
  assert.equal(table.chainAt(1).length, 3);
  colliding.forEach((key, index) => assert.equal(table.get(key), index));

  const stats = table.stats();
  assert.equal(stats.used, 1);
  assert.equal(stats.collisions, 2);
  assert.equal(stats.longestChain, 3);

  assert.equal(table.delete(colliding[1]), true);
  assert.equal(table.get(colliding[0]), 0);
  assert.equal(table.get(colliding[2]), 2);
});

test('hash table doubles its buckets when it gets crowded and keeps every entry', () => {
  const table = new HashTable(8);
  for (let number = 0; number < 100; number++) table.set(`ST${number}`, number);

  assert.equal(table.size, 100);
  assert.ok(table.bucketCount >= 128);
  assert.ok(table.loadFactor <= 0.75);
  assert.ok(table.resizes >= 4);
  for (let number = 0; number < 100; number++) assert.equal(table.get(`ST${number}`), number);
  assert.equal(table.keys().length, 100);
});

test('hash table trace shows the bucket and the keys compared', () => {
  const table = new HashTable();
  table.set('AI25042', 1);

  const hit = table.trace('AI25042');
  assert.equal(hit.found, true);
  assert.equal(hit.bucket, table.bucketIndex('AI25042'));
  assert.deepEqual(hit.compared, ['AI25042']);
  assert.equal(hit.hash, HashTable.hash('AI25042'));

  assert.equal(table.trace('ZZ00000').found, false);
});

// -------------------------------------------------------------------- graph

function sampleGraph() {
  const graph = new Graph();
  graph.connect('club:ai', 'event:1', 'hosts', 'hosted by');
  graph.connect('club:ai', 'event:3', 'hosts', 'hosted by');
  graph.connect('club:code', 'event:2', 'hosts', 'hosted by');
  graph.connect('event:1', 'event:2', 'leads to', 'comes after');
  graph.connect('event:2', 'event:3', 'leads to', 'comes after');
  graph.connect('student:a', 'event:1', 'registered for', 'has attendee');
  graph.connect('student:a', 'club:code', 'member of', 'has member');
  graph.addNode('student:alone');
  return graph;
}

test('graph stores each relationship in both directions with its own label', () => {
  const graph = sampleGraph();

  assert.equal(graph.nodeCount, 7);
  assert.equal(graph.linkCount, 7);
  assert.deepEqual(graph.neighbours('club:ai', 'hosts'), ['event:1', 'event:3']);
  assert.deepEqual(graph.neighbours('event:1', 'hosted by'), ['club:ai']);
  assert.deepEqual(graph.neighbours('event:1', 'has attendee'), ['student:a']);
  assert.equal(graph.hasEdge('event:1', 'event:2', 'leads to'), true);
  assert.equal(graph.hasEdge('event:2', 'event:1', 'leads to'), false);
  assert.equal(graph.edgesFrom('event:1').length, 3);

  graph.connect('club:ai', 'event:1', 'hosts', 'hosted by');
  assert.equal(graph.linkCount, 7);

  assert.equal(graph.disconnect('student:a', 'event:1', 'registered for', 'has attendee'), true);
  assert.equal(graph.disconnect('student:a', 'event:1', 'registered for', 'has attendee'), false);
  assert.deepEqual(graph.neighbours('event:1', 'has attendee'), []);
  assert.equal(graph.linkCount, 6);
});

test('breadth-first search finds a shortest chain and names each step', () => {
  const graph = sampleGraph();

  // One step: the direct edge wins over any longer way round.
  assert.deepEqual(graph.shortestPath('student:a', 'club:code'), [
    { key: 'student:a', label: null },
    { key: 'club:code', label: 'member of' },
  ]);

  // The two clubs are three steps apart, and more than one chain is that short.
  const path = graph.shortestPath('club:ai', 'club:code');
  assert.equal(path.length, 4);
  assert.equal(path[0].key, 'club:ai');
  assert.equal(path[0].label, null);
  assert.equal(path[3].key, 'club:code');
  for (let step = 1; step < path.length; step++) {
    assert.equal(graph.hasEdge(path[step - 1].key, path[step].key, path[step].label), true);
  }

  assert.deepEqual(graph.shortestPath('club:ai', 'club:ai'), [{ key: 'club:ai', label: null }]);
  assert.equal(graph.shortestPath('club:ai', 'student:alone'), null);
  assert.equal(graph.shortestPath('club:ai', 'nowhere'), null);
});

test('breadth-first search can be limited to some kinds of edge', () => {
  const graph = sampleGraph();
  const path = graph.shortestPath('club:ai', 'event:2', ['hosts', 'leads to']);
  assert.deepEqual(path.map((step) => step.key), ['club:ai', 'event:1', 'event:2']);

  const visited = graph.breadthFirst('club:ai', ['hosts', 'leads to']);
  assert.deepEqual(visited, [
    { key: 'club:ai', depth: 0 },
    { key: 'event:1', depth: 1 },
    { key: 'event:3', depth: 1 },
    { key: 'event:2', depth: 2 },
  ]);
});

test('depth-first search follows one branch to its end before trying the next', () => {
  const graph = sampleGraph();
  const tree = graph.depthFirstTree('club:ai', ['hosts', 'leads to']);

  // event:3 is hosted by the club, but the search reaches it first through event:1 and event:2.
  assert.deepEqual(tree, {
    key: 'club:ai',
    label: null,
    children: [
      {
        key: 'event:1',
        label: 'hosts',
        children: [
          {
            key: 'event:2',
            label: 'leads to',
            children: [{ key: 'event:3', label: 'leads to', children: [] }],
          },
        ],
      },
    ],
  });
  assert.equal(graph.depthFirstTree('nowhere'), null);
});
