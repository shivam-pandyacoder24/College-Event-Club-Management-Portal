'use strict';

/**
 * The Data structures page. The explanations are written in index.html. This
 * file draws the live panel beside each one, straight from the structures the
 * rest of the site is using.
 */

const ARRAY_CELLS_SHOWN = 6;
const SORT_OPTIONS = [
  ['date', 'Date'],
  ['popular', 'Most popular'],
  ['category', 'Category'],
  ['name', 'Name'],
];

function renderStructuresView(portal, ui) {
  const choices = ui.structures;

  redraw(document.getElementById('live-array'), arrayPanel(portal));
  redraw(document.getElementById('live-search'), searchPanel(portal, choices.word));
  redraw(document.getElementById('live-sort'), sortPanel(portal));

  syncSelect('list-club', portal.clubs.map((club) => [club.id, `${club.name} (${portal.memberCount(club.id)})`]), choices.clubId);
  redraw(document.getElementById('live-list'), listPanel(portal, choices.clubId));

  redraw(document.getElementById('live-stack'), stackPanel(portal));

  const lines = portal.eventsByDate
    .filter((event) => portal.seatsLeft(event) === 0)
    .map((event) => [String(event.id), `${event.name} (${portal.waitingCount(event.id)} waiting)`]);
  if (!lines.some(([id]) => id === String(choices.queueEventId)) && lines.length > 0) {
    choices.queueEventId = Number(lines[0][0]);
  }
  syncSelect('queue-event', lines, String(choices.queueEventId));
  redraw(document.getElementById('live-queue'), queuePanel(portal, lines.length > 0 ? choices.queueEventId : null));

  redraw(document.getElementById('live-tree'), categoryPanel(portal));
  redraw(document.getElementById('live-bst'), bstPanel(portal, choices.number));
  redraw(document.getElementById('live-graph'), graphPanel(portal));
  redraw(document.getElementById('live-hash'), hashPanel(portal, choices.studentId));
}

/** Rebuilds a <select> only when its options have changed, and keeps the choice. */
function syncSelect(id, options, value) {
  const select = document.getElementById(id);
  const signature = JSON.stringify(options);
  if (select.dataset.options !== signature) {
    select.replaceChildren(...options.map(([optionValue, label]) => h('option', { value: optionValue }, label)));
    select.dataset.options = signature;
  }
  select.value = value;
}

/** A row of boxes joined by arrows, used to draw the linked list and the queue. */
function nodeChain(start, values, end) {
  const step = (box) =>
    h('span', { class: 'node-chain__step' }, h('span', { class: 'node-chain__arrow', 'aria-hidden': 'true' }, '→'), box);

  return h(
    'div',
    { class: 'node-chain' },
    h('span', { class: 'node-chain__end' }, start),
    // Each arrow is kept with the box it points at, so a line never ends on a loose arrow.
    values.map((value) => step(h('span', { class: 'node-chain__node' }, value))),
    step(h('span', { class: 'node-chain__end' }, end)),
  );
}

// -------------------------------------------------------------------- array

function arrayPanel(portal) {
  const shown = portal.events.slice(0, ARRAY_CELLS_SHOWN);
  const last = portal.events.length - 1;

  return [
    h(
      'div',
      { class: 'cells' },
      shown.map((event, index) =>
        h('div', { class: 'cell' }, h('span', { class: 'cell__index' }, `[${index}]`), h('span', { class: 'cell__value' }, event.name)),
      ),
      h('div', { class: 'cell cell--more' }, h('span', { class: 'cell__index' }, `[${ARRAY_CELLS_SHOWN}] to [${last}]`), h('span', { class: 'cell__value' }, `${portal.events.length - ARRAY_CELLS_SHOWN} more`)),
    ),
    h(
      'p',
      {},
      `${plural(portal.events.length, 'event')} in one array. events[${last}] is ${portal.events[last].name}, and reading it takes one step, the same as events[0].`,
    ),
  ];
}

// ---------------------------------------------------------------- searching

function searchPanel(portal, word) {
  const total = portal.events.length;
  const typed = word.trim();
  const linear = typed === '' ? null : portal.listEvents({ query: typed });
  const week = portal.listEvents({ when: 'week' });
  const fortnight = portal.listEvents({ when: 'fortnight' });

  let linearText;
  if (linear === null) {
    linearText = 'Type a word above to run a linear search.';
  } else {
    const names = linear.events.slice(0, 3).map((event) => event.name);
    const more = linear.events.length - names.length;
    linearText =
      `Linear search checked all ${total} events for “${typed}” and found ${linear.events.length}` +
      (names.length > 0 ? `: ${names.join(', ')}${more > 0 ? ` and ${more} more` : ''}.` : '.');
  }

  return [
    h('p', {}, linearText),
    h(
      'p',
      {},
      `Binary search found the ${plural(week.events.length, 'event')} in the next 7 days in ${plural(week.stats.range.steps, 'step')}, ` +
        `and the ${fortnight.events.length} in the next 14 days in ${fortnight.stats.range.steps}. A scan would check all ${total} each time.`,
    ),
  ];
}

// ------------------------------------------------------------------ sorting

function sortPanel(portal) {
  const table = h(
    'table',
    { class: 'table' },
    h('caption', {}, `Sorting all ${portal.events.length} events, just now`),
    h('thead', {}, h('tr', {}, ['Sort by', 'Algorithm', 'Comparisons', 'First event'].map((title) => h('th', { scope: 'col' }, title)))),
    h(
      'tbody',
      {},
      SORT_OPTIONS.map(([sortBy, label]) => {
        const { events, stats } = portal.listEvents({ sortBy });
        return h(
          'tr',
          {},
          h('th', { scope: 'row' }, label),
          h('td', {}, stats.sort.algorithm),
          h('td', { class: 'table__number' }, stats.sort.comparisons),
          h('td', {}, events[0].name),
        );
      }),
    ),
  );

  // On a narrow screen the table scrolls sideways inside its panel instead of pushing the page wider.
  return h('div', { class: 'table-scroll', tabindex: '0', role: 'group', 'aria-label': 'Sorting results' }, table);
}

// -------------------------------------------------------------- linked list

function listPanel(portal, clubId) {
  const club = portal.clubById(clubId);
  const members = portal.membersOf(clubId);

  return [
    nodeChain('head', members.map((student) => student.name), 'null'),
    h(
      'p',
      {},
      members.length === 0
        ? `${club.name} has no members. The head and tail pointers are both null.`
        : `${plural(members.length, 'node')}. The tail pointer is on ${members[members.length - 1].name}, so the next student to join is linked on in one step.`,
    ),
  ];
}

// -------------------------------------------------------------------- stack

function stackPanel(portal) {
  const column = (title, values, empty) =>
    h(
      'div',
      { class: 'stack-column' },
      h('h3', { class: 'live-title' }, title),
      values.length === 0
        ? h('p', { class: 'quiet' }, empty)
        : h(
            'ol',
            { class: 'stack' },
            values.map((value, index) => h('li', {}, index === 0 ? h('span', { class: 'stack__top' }, 'top') : null, value)),
          ),
    );

  return h(
    'div',
    { class: 'stack-columns' },
    column('Undo', portal.undoHistory(), 'Empty. Register for an event and it is pushed here.'),
    column(
      'Recently viewed',
      portal.recentlyViewed().map((event) => event.name),
      'Empty. Open an event and it is pushed here.',
    ),
  );
}

// -------------------------------------------------------------------- queue

function queuePanel(portal, eventId) {
  const event = eventId === null ? null : portal.eventByNumber(eventId);
  if (event === null) return h('p', { class: 'quiet' }, 'No event is full at the moment, so no waiting list is in use.');

  const line = portal.waitingFor(event.id);
  if (line.length === 0) {
    return h('p', {}, `${event.name} is full, but its queue is empty. The next student to register will be enqueued at the rear.`);
  }

  return [
    nodeChain('front', line.map((student) => student.name), 'rear'),
    h(
      'p',
      {},
      `${plural(line.length, 'student')} waiting. When a seat opens, ${line[0].name} is dequeued from the front and gets it.`,
    ),
  ];
}

// ------------------------------------------------------------ category tree

function categoryPanel(portal) {
  const branch = (node) =>
    h(
      'li',
      {},
      h('span', { class: 'tree-node' }, node.name, h('span', { class: 'tree-node__count' }, portal.countInCategory(node.id))),
      node.children.length > 0 ? h('ul', {}, node.children.map(branch)) : null,
    );

  return [
    h('ul', { class: 'tree-drawing' }, branch(portal.categories.root)),
    h(
      'p',
      {},
      `${plural(portal.categories.size, 'node')} on ${plural(portal.categories.height(), 'level')}. Each number is the count of events in that node's subtree.`,
    ),
  ];
}

// ------------------------------------------------------- binary search tree

function bstPanel(portal, number) {
  const tree = portal.eventNumbers;
  const lookup = Number.isInteger(number) ? portal.findEventNumber(number) : null;
  const onPath = lookup === null ? [] : lookup.path;
  const inOrderStart = tree.inOrder().slice(0, 4).map((entry) => entry.key);

  let sentence;
  if (lookup === null) {
    sentence = 'Type an event number above to trace a lookup.';
  } else if (lookup.event !== null) {
    sentence = `Found ${number}, ${lookup.event.name}, after ${plural(onPath.length, 'comparison')}: ${onPath.join(', ')}.`;
  } else {
    const nearest = [lookup.lower, lookup.higher].filter((key) => key !== null).join(' and ');
    sentence = `${number} is not in the tree. The search stopped after ${plural(onPath.length, 'comparison')}: ${onPath.join(', ')}. The closest numbers are ${nearest}.`;
  }

  return [
    h('div', { class: 'bst-scroll', tabindex: '0', role: 'group', 'aria-label': 'Drawing of the binary search tree. Scroll sideways to see all of it.' }, bstDrawing(tree, onPath, lookup !== null && lookup.event !== null)),
    h('p', {}, sentence),
    h(
      'p',
      {},
      `${plural(tree.size, 'event number')} on ${plural(tree.height(), 'level')}, so no lookup needs more than ${tree.height()} comparisons. ` +
        `The smallest is ${tree.min()}, the largest is ${tree.max()}, and an in-order walk reads them all in order: ${inOrderStart.join(', ')} and so on.`,
    ),
  ];
}

/** Draws the tree: a node's column is its place in sorted order, and its row is its depth. */
function bstDrawing(tree, path, found) {
  // Two nodes on the same level are always at least two columns apart, so a node can be wider than a column.
  const STEP_X = 19;
  const STEP_Y = 56;
  const NODE_WIDTH = 32;
  const NODE_HEIGHT = 22;

  const placed = [];
  let column = 0;
  (function place(node, depth, parent) {
    if (node === null) return;
    place(node.left, depth + 1, node);
    placed.push({ key: node.key, parent: parent === null ? null : parent.key, x: 20 + column * STEP_X, y: 18 + depth * STEP_Y });
    column++;
    place(node.right, depth + 1, node);
  })(tree.root, 0, null);

  const at = (key) => placed.find((node) => node.key === key);
  const isOnPath = (key) => path.includes(key);
  const width = 40 + (placed.length - 1) * STEP_X;
  const height = 36 + (tree.height() - 1) * STEP_Y;

  return svg(
    'svg',
    {
      class: 'bst',
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      role: 'img',
      'aria-label': `Binary search tree of ${placed.length} event numbers on ${tree.height()} levels. The root is ${tree.root.key}.`,
    },
    placed
      .filter((node) => node.parent !== null)
      .map((node) => {
        const parent = at(node.parent);
        return svg('line', {
          class: isOnPath(node.key) && isOnPath(node.parent) ? 'bst__edge is-on-path' : 'bst__edge',
          x1: parent.x,
          y1: parent.y,
          x2: node.x,
          y2: node.y,
        });
      }),
    placed.map((node) => {
      const last = path.length > 0 && node.key === path[path.length - 1];
      const state = last ? (found ? ' is-found' : ' is-end') : isOnPath(node.key) ? ' is-on-path' : '';
      return svg(
        'g',
        { class: `bst__node${state}` },
        svg('rect', { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2, width: NODE_WIDTH, height: NODE_HEIGHT, rx: 6 }),
        svg('text', { x: node.x, y: node.y + 4.5, 'text-anchor': 'middle' }, node.key),
      );
    }),
  );
}

// -------------------------------------------------------------------- graph

function graphPanel(portal) {
  const { graph } = portal;

  // Count the edges under each label by reading every adjacency list once.
  const counts = {};
  for (const [, edges] of graph.adjacency.entries()) {
    for (const edge of edges) counts[edge.label] = (counts[edge.label] || 0) + 1;
  }

  const rows = [
    ['Club hosts event', LINK.HOSTS],
    ['Event leads to event', LINK.LEADS_TO],
    ['Student is a member of club', LINK.MEMBER_OF],
    ['Student is registered for event', LINK.REGISTERED_FOR],
  ];

  const me = Portal.key('student', portal.currentStudentId);
  const mine = graph.edgesFrom(me);

  return [
    h(
      'table',
      { class: 'table' },
      h('caption', {}, `${graph.nodeCount} nodes and ${graph.linkCount} relationships`),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Relationship'), h('th', { scope: 'col', class: 'table__number' }, 'Edges'))),
      h(
        'tbody',
        {},
        rows.map(([title, label]) => h('tr', {}, h('th', { scope: 'row' }, title), h('td', { class: 'table__number' }, counts[label] || 0))),
      ),
    ),
    h('h3', { class: 'live-title' }, `Adjacency list of ${portal.student.name}`),
    mine.length === 0
      ? h('p', { class: 'quiet' }, 'Empty. This student has not joined a club or registered for an event.')
      : h(
          'ul',
          { class: 'adjacency' },
          mine.map((edge) => h('li', {}, h('span', { class: 'adjacency__label' }, edge.label), portal.describe(edge.to).name)),
        ),
  ];
}

// --------------------------------------------------------------- hash table

function hashPanel(portal, typedId) {
  const table = portal.studentIndex;
  const stats = table.stats();
  const id = Portal.cleanStudentId(typedId);
  const trace = id === '' ? null : table.trace(id);

  let sentence;
  if (trace === null) {
    sentence = 'Type a student ID above to trace a lookup.';
  } else {
    const hash = trace.hash.toLocaleString('en-US');
    const where = `hash("${id}") is ${hash}, and ${hash} mod ${stats.buckets} is bucket ${trace.bucket}.`;
    if (trace.found) {
      sentence = `${where} ${portal.studentById(id).name} was found there after comparing ${plural(trace.compared.length, 'key')}.`;
    } else if (trace.compared.length === 0) {
      sentence = `${where} That bucket is empty, so no student has this ID.`;
    } else {
      sentence = `${where} None of the ${plural(trace.compared.length, 'key')} in that bucket match, so no student has this ID.`;
    }
  }

  return [
    h(
      'div',
      {
        class: 'buckets',
        role: 'img',
        'aria-label': `${stats.buckets} buckets. ${stats.used} hold at least one key and the longest chain has ${stats.longestChain}.`,
      },
      table.buckets.map((_, index) => {
        const length = table.chainAt(index).length;
        const highlighted = trace !== null && trace.bucket === index;
        return h('span', { class: `bucket bucket--${Math.min(length, 3)}${highlighted ? ' is-target' : ''}` }, length > 0 ? length : '');
      }),
    ),
    h('p', { class: 'buckets-key' }, 'Each square is a bucket, and the number in it is how many keys are chained there.'),
    h('p', {}, sentence),
    h(
      'p',
      {},
      `${plural(stats.size, 'student')} in ${stats.buckets} buckets: a load factor of ${stats.loadFactor.toFixed(2)}. ` +
        `${plural(stats.collisions, 'key')} collided, the longest chain is ${stats.longestChain}, and the table has doubled ${plural(stats.resizes, 'time')}.`,
    ),
  ];
}
