'use strict';

/** The My registrations page: seats, waiting lists, clubs, undo and suggestions for the signed-in student. */

function renderRegistrationsView(portal) {
  const student = portal.student;
  const going = portal.eventsOfStudent();
  const waiting = portal.waitingOfStudent();
  const clubs = portal.clubsOfStudent();

  redraw(
    document.getElementById('registrations-lead'),
    `Signed in as ${student.name}, ${student.id}. `,
    h('button', { type: 'button', class: 'link-button link-button--light', 'data-action': 'open-student' }, 'Switch student'),
  );

  redraw(
    document.getElementById('registrations-main'),
    h(
      'section',
      { 'aria-labelledby': 'going-title' },
      h('h2', { id: 'going-title' }, `Registered, ${going.length}`),
      going.length > 0
        ? ticketList(portal, going, 3)
        : h(
            'div',
            { class: 'empty' },
            h('p', {}, 'You have not registered for an event yet.'),
            h('a', { class: 'button', href: '#events' }, 'Browse events'),
          ),
    ),

    waiting.length > 0
      ? h(
          'section',
          { 'aria-labelledby': 'waiting-title' },
          h('h2', { id: 'waiting-title' }, `On a waiting list, ${waiting.length}`),
          h('p', { class: 'section-lead' }, 'When someone cancels, the seat goes to whoever is first in line.'),
          ticketList(portal, waiting.map((entry) => entry.event), 3),
        )
      : null,

    h(
      'section',
      { 'aria-labelledby': 'my-clubs-title' },
      h('h2', { id: 'my-clubs-title' }, `Your clubs, ${clubs.length}`),
      clubs.length > 0
        ? h(
            'ul',
            { class: 'rows' },
            clubs.map((club) =>
              h(
                'li',
                { class: `row colour-${club.focus}` },
                h(
                  'div',
                  { class: 'row__text' },
                  h('a', { class: 'row__title', href: `#club/${club.id}` }, club.name),
                  h('span', { class: 'row__note' }, `Meets ${club.meets}`),
                ),
                clubAction(portal, club),
              ),
            ),
          )
        : h(
            'div',
            { class: 'empty' },
            h('p', {}, 'You have not joined a club yet.'),
            h('a', { class: 'button', href: '#clubs' }, 'Browse clubs'),
          ),
    ),
  );

  redraw(
    document.getElementById('registrations-side'),
    undoPanel(portal),
    trailPanel(portal),
    companionsPanel(portal),
    hostClubsPanel(portal),
  );
}

/** STACK: the most recent action is on top, and it is the one Undo takes back. */
function undoPanel(portal) {
  const history = portal.undoHistory();

  if (history.length === 0) {
    return h(
      'section',
      { class: 'panel', 'aria-labelledby': 'undo-title' },
      h('h2', { id: 'undo-title' }, 'Undo'),
      h('p', { class: 'quiet' }, 'Nothing to undo. Anything you register for, cancel, join or leave can be taken back here, most recent first.'),
    );
  }

  return h(
    'section',
    { class: 'panel', 'aria-labelledby': 'undo-title' },
    h('h2', { id: 'undo-title' }, 'Undo'),
    h(
      'ol',
      { class: 'history' },
      history.map((description, index) =>
        h(
          'li',
          { class: index === 0 ? 'history__top' : null },
          h('span', {}, description),
          index === 0
            ? h('button', { type: 'button', class: 'button button--small', 'data-action': 'undo', 'data-focus': 'undo-panel' }, 'Undo')
            : null,
        ),
      ),
    ),
    history.length > 1
      ? h('p', { class: 'quiet' }, 'Actions are undone from the top down, the most recent first.')
      : null,
  );
}

/** GRAPH: the "leads to" edges out of the events the student is going to. */
function trailPanel(portal) {
  const steps = portal.nextOnTrail();
  if (steps.length === 0) return null;

  return h(
    'section',
    { class: 'panel', 'aria-labelledby': 'next-title' },
    h('h2', { id: 'next-title' }, 'Next on your trail'),
    h(
      'ul',
      { class: 'suggestions' },
      steps.map((step) =>
        h('li', {}, eventChip(portal, step.event), h('span', { class: 'suggestions__why' }, `Follows ${step.after.name}`)),
      ),
    ),
  );
}

/** GRAPH: events chosen by the students who share an event with this one. */
function companionsPanel(portal) {
  // An event already listed under "Next on your trail" is not suggested a second time.
  const onTrail = portal.nextOnTrail().map((step) => step.event.id);
  const suggested = portal
    .suggestedEvents(portal.currentStudentId, 4 + onTrail.length)
    .filter(({ event }) => !onTrail.includes(event.id))
    .slice(0, 4);
  if (suggested.length === 0) return null;

  return h(
    'section',
    { class: 'panel', 'aria-labelledby': 'companions-title' },
    h('h2', { id: 'companions-title' }, 'Popular with students at your events'),
    h(
      'ul',
      { class: 'suggestions' },
      suggested.map(({ event, score }) =>
        h(
          'li',
          {},
          eventChip(portal, event),
          h('span', { class: 'suggestions__why' }, `${plural(score, 'student')} from your events ${score === 1 ? 'is' : 'are'} going`),
        ),
      ),
    ),
  );
}

/** GRAPH: clubs that host an event the student is going to. */
function hostClubsPanel(portal) {
  const clubs = portal.suggestedClubs();
  if (clubs.length === 0) return null;

  return h(
    'section',
    { class: 'panel', 'aria-labelledby': 'host-clubs-title' },
    h('h2', { id: 'host-clubs-title' }, 'Clubs behind your events'),
    h(
      'ul',
      { class: 'suggestions' },
      clubs.map(({ club, because }) =>
        h(
          'li',
          {},
          h('a', { class: 'suggestions__club', href: `#club/${club.id}` }, club.name),
          h('span', { class: 'suggestions__why' }, `Hosts ${because.name}`),
        ),
      ),
    ),
  );
}
