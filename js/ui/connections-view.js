'use strict';

/** The Connections page: the shortest chain between two nodes of the graph, and a walk around it. */

const KIND = { club: 'Club', event: 'Event', student: 'Student' };

/** How each edge label reads as a heading above a group of neighbours. */
const GROUP_TITLE = {
  [LINK.HOSTS]: 'Hosts',
  [LINK.HOSTED_BY]: 'Hosted by',
  [LINK.LEADS_TO]: 'Leads to',
  [LINK.COMES_AFTER]: 'Comes after',
  [LINK.MEMBER_OF]: 'Member of',
  [LINK.HAS_MEMBER]: 'Members',
  [LINK.REGISTERED_FOR]: 'Registered for',
  [LINK.HAS_ATTENDEE]: 'Students going',
};

/** Fills a <select> with every node of the graph, grouped into clubs, events and students. */
function fillNodeSelect(select, portal, selectedKey) {
  const group = (label, records, type, text) =>
    h(
      'optgroup',
      { label },
      records.map((record) => h('option', { value: Portal.key(type, record.id) }, text(record))),
    );

  const byName = (records) => mergeSort(records, (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).sorted;

  select.replaceChildren(
    group('Clubs', byName(portal.clubs), 'club', (club) => club.name),
    group('Events', byName(portal.events), 'event', (event) => event.name),
    group('Students', byName(portal.students), 'student', (student) => `${student.name}, ${student.id}`),
  );
  select.value = selectedKey;
}

/** A button for one node. Pressing it moves the explorer to that node. */
function nodePill(portal, node) {
  const colour = node.type === 'event' ? ` colour-${portal.topCategoryOf(node.record.categoryId)}` : '';
  return h(
    'button',
    {
      type: 'button',
      class: `pill pill--${node.type}${colour}`,
      'data-action': 'explore-node',
      'data-key': node.key,
    },
    node.type === 'event' ? h('span', { class: 'chip__dot', 'aria-hidden': 'true' }) : null,
    node.key === Portal.key('student', portal.currentStudentId) ? `${node.name} (you)` : node.name,
  );
}

function renderConnectionsView(portal, ui) {
  const { connect } = ui;

  // The selects are only rebuilt when a student has been added, so an open menu is never disturbed.
  const nodeCount = String(portal.graph.nodeCount);
  for (const [id, key] of [
    ['connect-from', connect.from],
    ['connect-to', connect.to],
    ['explore-node', connect.explore],
  ]) {
    const select = document.getElementById(id);
    if (select.dataset.nodes !== nodeCount) {
      fillNodeSelect(select, portal, key);
      select.dataset.nodes = nodeCount;
    } else if (select.value !== key) {
      select.value = key;
    }
  }

  redraw(document.getElementById('connect-result'), connectionResult(portal, connect));
  redraw(document.getElementById('explore-result'), exploreResult(portal, connect.explore));
}

/** GRAPH (breadth-first search): the chain between the two chosen nodes. */
function connectionResult(portal, connect) {
  const from = portal.describe(connect.from);
  const to = portal.describe(connect.to);

  if (connect.from === connect.to) {
    return h('p', { class: 'quiet' }, `Choose two different things to see how ${from.name} connects to something else.`);
  }

  const path = portal.connection(connect.from, connect.to);
  if (path === null) {
    return h(
      'p',
      { class: 'quiet' },
      `Nothing links ${from.name} and ${to.name}. A student is only connected once they join a club or register for an event.`,
    );
  }

  const steps = path.length - 1;
  return [
    h(
      'p',
      { class: 'chain-summary' },
      h('strong', {}, steps === 1 ? 'Directly connected.' : `${steps} steps apart.`),
      ' Breadth-first search checks everything one step away, then two steps away, so the first chain it finds is a shortest one.',
    ),
    h(
      'ol',
      { class: 'chain' },
      path.map((step, index) =>
        h(
          'li',
          {},
          index > 0 ? h('span', { class: 'chain__link' }, step.label) : null,
          h('span', { class: 'chain__stop' }, h('span', { class: 'chain__kind' }, KIND[step.type]), nodePill(portal, step)),
        ),
      ),
    ),
  ];
}

/** GRAPH: the chosen node's adjacency list, grouped by relationship. */
function exploreResult(portal, key) {
  const node = portal.describe(key);
  const groups = portal.neighboursOf(key);

  let facts;
  if (node.type === 'club') {
    facts = node.record.tagline;
  } else if (node.type === 'event') {
    facts = `${formatWhen(node.record.date)}, ${node.record.venue}`;
  } else {
    facts = `${node.id}, ${describeStudentId(node.id)}`;
  }

  const open =
    node.type === 'club'
      ? h('a', { class: 'button button--quiet button--small', href: `#club/${node.id}` }, 'Open club page')
      : node.type === 'event'
        ? h('button', { type: 'button', class: 'button button--quiet button--small', 'data-action': 'open-event', 'data-id': node.id }, 'Open event')
        : null;

  return [
    h(
      'div',
      { class: 'explore-head' },
      h(
        'div',
        {},
        h('p', { class: 'explore-head__kind' }, KIND[node.type]),
        h('h3', { class: 'explore-head__name' }, node.name),
        h('p', { class: 'explore-head__facts' }, facts),
      ),
      open,
    ),
    groups.length === 0
      ? h('p', { class: 'quiet' }, `${node.name} is not connected to anything yet.`)
      : h('p', { class: 'explore__reach' }, reachSentence(portal, key)),
    groups.map((group) =>
          h(
            'div',
            { class: 'explore-group' },
            h('h4', {}, `${GROUP_TITLE[group.label]}, ${group.nodes.length}`),
            h('div', { class: 'pills' }, group.nodes.map((other) => nodePill(portal, other))),
          ),
        ),
  ];
}

/** GRAPH (breadth-first search): how far the rest of the campus is from this node. */
function reachSentence(portal, key) {
  const STEPS = ['one step', 'two steps', 'three steps', 'four steps', 'five steps', 'six steps'];
  const counts = portal.distancesFrom(key);
  const parts = counts.map((count, index) => `${count} in ${STEPS[index] || `${index + 1} steps`}`);
  const listed = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];

  const others = portal.graph.nodeCount - 1;
  const reached = counts.reduce((sum, count) => sum + count, 0);
  const missed = others - reached;

  return (
    `Breadth-first search from here reaches ${listed}` +
    (missed === 0 ? `, which is all ${others} other clubs, events and students.` : `. ${missed} of the other ${others} cannot be reached.`)
  );
}
