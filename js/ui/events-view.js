'use strict';

/** The Events page: category tree, search, filters, the tickets, and the two small tools in the sidebar. */

const WHEN_LABELS = { any: '', week: ' in the next 7 days', fortnight: ' in the next 14 days' };

function renderEventsView(portal, ui) {
  redraw(
    document.getElementById('events-lead'),
    `${plural(portal.events.length, 'event')} from ${plural(portal.clubs.length, 'club')}. ` +
      'Register for a seat, or join the waiting list when an event is full.',
  );

  renderCategoryTree(portal, ui);
  renderNumberResult(portal, ui);
  renderRecentlyViewed(portal);
  renderEventResults(portal, ui);
}

/** TREE 1: the category tree, drawn by walking it from the root. */
function renderCategoryTree(portal, ui) {
  const branch = (node, depth) => {
    const selected = node.id === ui.filters.categoryId;
    return h(
      'li',
      {},
      h(
        'button',
        {
          type: 'button',
          class: 'tree__item',
          'data-action': 'pick-category',
          'data-id': node.id,
          'aria-current': selected ? 'true' : null,
        },
        depth === 1 ? h('span', { class: `swatch colour-${node.id}`, 'aria-hidden': 'true' }) : null,
        h('span', { class: 'tree__name' }, node.name),
        h('span', { class: 'tree__count' }, portal.countInCategory(node.id)),
      ),
      node.children.length > 0 ? h('ul', {}, node.children.map((child) => branch(child, depth + 1))) : null,
    );
  };

  redraw(document.getElementById('category-tree'), branch(portal.categories.root, 0));
  redraw(document.getElementById('category-current'), portal.categories.find(ui.filters.categoryId).name);
}

/** TREE 2: what the binary search tree answered for the number typed in the sidebar. */
function renderNumberResult(portal, ui) {
  const container = document.getElementById('number-result');
  const lookup = ui.numberLookup;
  if (lookup === null) {
    redraw(container);
    return;
  }

  if (lookup.event !== null) {
    redraw(
      container,
      `Found ${lookup.event.name} in ${plural(lookup.path.length, 'step')}: ${lookup.path.join(', ')}.`,
    );
    return;
  }

  const open = (number) =>
    h('button', { type: 'button', class: 'link-button', 'data-action': 'open-event', 'data-id': number }, String(number));
  const nearest = [lookup.lower, lookup.higher].filter((number) => number !== null);
  redraw(
    container,
    `There is no event ${lookup.number}. `,
    nearest.length === 2
      ? ['The closest numbers are ', open(nearest[0]), ' and ', open(nearest[1]), '.']
      : ['The closest number is ', open(nearest[0]), '.'],
  );
}

/** STACK: the events opened most recently, top of the stack first. */
function renderRecentlyViewed(portal) {
  const recent = portal.recentlyViewed();
  redraw(
    document.getElementById('recent-list'),
    recent.length === 0
      ? h('p', { class: 'quiet' }, 'Events you open are listed here, newest first.')
      : h(
          'ol',
          { class: 'recent__list' },
          recent.map((event) =>
            h(
              'li',
              {},
              h(
                'button',
                { type: 'button', class: 'link-button', 'data-action': 'open-event', 'data-id': event.id },
                event.name,
              ),
              h('span', { class: 'recent__date' }, formatDay(event.date)),
            ),
          ),
        ),
  );
}

function renderEventResults(portal, ui) {
  const { filters } = ui;
  const { events } = portal.listEvents(filters);

  const path = portal.categoryPath(filters.categoryId);
  const category = path[path.length - 1];
  // TREE 1: the breadcrumb is the path from the root to the chosen category. At the root there is no path to show.
  const breadcrumb =
    path.length < 2
      ? null
      : h(
          'nav',
          { class: 'breadcrumb', 'aria-label': 'Category path' },
          path.map((node, index) =>
            index === path.length - 1
              ? h('span', { 'aria-current': 'true' }, node.name)
              : [
                  h('button', { type: 'button', class: 'link-button', 'data-action': 'pick-category', 'data-id': node.id }, node.name),
                  h('span', { class: 'breadcrumb__slash', 'aria-hidden': 'true' }, '/'),
                ],
          ),
        );

  const query = filters.query.trim();
  const clubs = query === '' ? [] : portal.searchClubs(query);
  const clubMatches =
    clubs.length === 0
      ? null
      : h(
          'p',
          { class: 'club-matches' },
          `${clubs.length === 1 ? 'Club' : 'Clubs'} matching “${query}”: `,
          clubs.map((club, index) => [index > 0 ? ', ' : '', h('a', { href: `#club/${club.id}` }, club.name)]),
        );

  redraw(
    document.getElementById('events-results'),
    h(
      'div',
      { class: 'results-head' },
      breadcrumb,
      h('h2', { class: 'results-head__title' }, category.name),
      h('p', { class: 'results-head__count', role: 'status' }, plural(events.length, 'event')),
    ),
    clubMatches,
    events.length > 0 ? ticketList(portal, events, 3, 'tickets--grid') : emptyResults(portal, filters),
  );
}

/** Says exactly which filters produced nothing, and offers the way out. */
function emptyResults(portal, filters) {
  const query = filters.query.trim();
  const category = portal.categories.find(filters.categoryId);
  const where = filters.categoryId === ROOT_CATEGORY ? '' : ` in ${category.name}`;
  const what = query === '' ? 'There are no events' : `No events match “${query}”`;

  return h(
    'div',
    { class: 'empty' },
    h('p', {}, `${what}${where}${WHEN_LABELS[filters.when]}.`),
    h('button', { type: 'button', class: 'button button--quiet', 'data-action': 'clear-filters' }, 'Clear filters'),
  );
}
