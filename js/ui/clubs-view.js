'use strict';

/** The Clubs page, and the page for one club with its trail, events and members. */

/** Join club or Leave club, whichever applies to the signed-in student. */
function clubAction(portal, club) {
  const member = portal.isMember(club.id);
  return h(
    'button',
    {
      type: 'button',
      class: `button${member ? ' button--quiet' : ''}`,
      'data-action': member ? 'leave-club' : 'join-club',
      'data-id': club.id,
      'data-focus': `club-action-${club.id}`,
    },
    member ? 'Leave club' : 'Join club',
  );
}

function renderClubsView(portal, ui) {
  const clubs = portal.searchClubs(ui.clubQuery);

  redraw(
    document.getElementById('clubs-lead'),
    `${plural(portal.clubs.length, 'club')}. Join one to be added to its members list, and open it to see where its events lead.`,
  );

  redraw(
    document.getElementById('clubs-results'),
    clubs.length === 0
      ? h(
          'div',
          { class: 'empty' },
          h('p', {}, `No clubs match “${ui.clubQuery.trim()}”.`),
          h('button', { type: 'button', class: 'button button--quiet', 'data-action': 'clear-club-search' }, 'Show all clubs'),
        )
      : h('ul', { class: 'club-grid' }, clubs.map((club) => h('li', {}, clubCard(portal, club)))),
  );
}

function clubCard(portal, club) {
  const events = portal.eventsOfClub(club.id);
  const next = events[0];

  return h(
    'article',
    { class: `club-card colour-${club.focus}` },
    portal.isMember(club.id) ? h('span', { class: 'stamp' }, 'Member') : null,
    h('h2', { class: 'club-card__name' }, h('a', { href: `#club/${club.id}` }, club.name)),
    h('p', { class: 'club-card__tagline' }, club.tagline),
    h(
      'p',
      { class: 'club-card__facts' },
      `${plural(portal.memberCount(club.id), 'member')}, ${plural(events.length, 'upcoming event')}`,
    ),
    next ? h('p', { class: 'club-card__next' }, `Next: ${next.name}, ${formatDay(next.date)}`) : null,
    h('div', { class: 'club-card__foot' }, clubAction(portal, club)),
  );
}

function renderClubPage(portal, ui) {
  const container = document.getElementById('club-page');
  const club = portal.clubById(ui.clubId);

  if (club === null) {
    redraw(
      container,
      h(
        'header',
        { class: 'view-head' },
        h('div', { class: 'view-head__inner' }, h('h1', {}, 'Club not found'), h('p', { class: 'view-head__lead' }, 'There is no club at this address.')),
      ),
      h('div', { class: 'page' }, h('p', {}, h('a', { href: '#clubs' }, 'See all clubs'))),
    );
    return;
  }

  const events = portal.eventsOfClub(club.id);
  const members = portal.membersOf(club.id);

  redraw(
    container,
    h(
      'header',
      { class: `view-head view-head--club colour-${club.focus}` },
      h(
        'div',
        { class: 'view-head__inner' },
        h('p', { class: 'view-head__back' }, h('a', { href: '#clubs' }, 'All clubs')),
        h('h1', { id: 'club-title' }, club.name),
        h('p', { class: 'view-head__lead' }, club.tagline),
        h(
          'div',
          { class: 'club-head__row' },
          clubAction(portal, club),
          h('p', { class: 'club-head__facts' }, `${plural(members.length, 'member')}. Meets ${club.meets}.`),
        ),
      ),
    ),

    h(
      'div',
      { class: 'page' },
      trailSection(portal, club),
      h(
        'div',
        { class: 'club-columns' },
        h(
          'section',
          { 'aria-labelledby': 'club-events-title' },
          h('h2', { id: 'club-events-title' }, 'Upcoming events'),
          ticketList(portal, events, 3),
        ),
        rosterSection(portal, members),
      ),
    ),
  );
}

/** GRAPH (depth-first search): where this club's events lead. */
function trailSection(portal, club) {
  const trail = portal.clubTrail(club.id);
  const paths = portal.trailPaths(club.id);

  const branch = (step) => {
    const { node } = step;
    let label;
    if (node.type === 'club') {
      label = h('span', { class: 'trail__node trail__node--club' }, h('span', { class: 'trail__name' }, node.name));
    } else {
      const event = node.record;
      const host = event.clubId === club.id ? null : portal.clubById(event.clubId);
      label = h(
        'button',
        {
          type: 'button',
          class: `trail__node colour-${portal.topCategoryOf(event.categoryId)}`,
          'data-action': 'open-event',
          'data-id': event.id,
        },
        h('span', { class: 'trail__name' }, event.name),
        h('span', { class: 'trail__note' }, host ? `${formatDay(event.date)}, by ${host.name}` : formatDay(event.date)),
      );
    }
    return h('li', {}, label, step.children.length > 0 ? h('ul', {}, step.children.map(branch)) : null);
  };

  return h(
    'section',
    { class: 'trail-section', 'aria-labelledby': 'trail-title' },
    h('h2', { id: 'trail-title' }, 'Event trail'),
    h(
      'p',
      { class: 'section-lead' },
      'Start with the first event and each one prepares you for the next. A trail can run into events hosted by other clubs.',
    ),
    h('div', { class: 'trail', tabindex: '0', role: 'group', 'aria-label': `Event trail for ${club.name}` }, h('ul', {}, branch(trail))),
    h(
      'div',
      { class: 'trail-paths' },
      h('p', { class: 'trail-paths__label' }, 'Found by depth-first search of the graph:'),
      paths.map((path) => h('p', { class: 'trail-paths__path' }, path.join(' → '))),
    ),
  );
}

/** LINKED LIST: the members from head to tail. */
function rosterSection(portal, members) {
  return h(
    'section',
    { class: 'roster-section', 'aria-labelledby': 'roster-title' },
    h('h2', { id: 'roster-title' }, `Members, ${members.length}`),
    h('p', { class: 'section-lead' }, 'In the order they joined. A new member is added at the end.'),
    h(
      'ol',
      { class: 'roster' },
      members.map((student) =>
        h(
          'li',
          { class: student.id === portal.currentStudentId ? 'is-you' : null },
          h('span', { class: 'roster__name' }, student.id === portal.currentStudentId ? `${student.name} (you)` : student.name),
          h('span', { class: 'roster__id' }, student.id),
        ),
      ),
    ),
  );
}
