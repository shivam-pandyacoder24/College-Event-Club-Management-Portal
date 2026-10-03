'use strict';

/** The pieces every page uses to show an event: the ticket, its seat line and its button. */

/** The coloured date block on the left of a ticket. The same date is in the ticket text for screen readers. */
function dateStub(event) {
  return h(
    'div',
    { class: 'stub', 'aria-hidden': 'true' },
    h('span', { class: 'stub__weekday' }, WEEKDAYS[event.date.getDay()]),
    h('span', { class: 'stub__day' }, event.date.getDate()),
    h('span', { class: 'stub__month' }, MONTHS[event.date.getMonth()]),
  );
}

/** "3 seats left of 20", "Full" or "Full, 4 waiting". */
function seatSummary(portal, event) {
  const left = portal.seatsLeft(event);
  const waiting = portal.waitingCount(event.id);
  if (left > 0) return `${plural(left, 'seat')} left of ${event.seats}`;
  return waiting > 0 ? `Full, ${waiting} waiting` : 'Full';
}

/** A bar showing how many seats are taken, with the same fact in words beside it. */
function seatMeter(portal, event) {
  const percent = Math.round((event.taken / event.seats) * 100);
  const full = portal.seatsLeft(event) === 0;
  return h(
    'div',
    { class: `seats${full ? ' seats--full' : ''}` },
    h('span', { class: 'seats__bar', 'aria-hidden': 'true' }, h('span', { style: `width: ${percent}%` })),
    h('span', { class: 'seats__text' }, seatSummary(portal, event)),
  );
}

/** The stamp on a ticket the signed-in student holds, or is waiting for. */
function statusStamp(portal, event) {
  const status = portal.statusOf(event.id);
  if (status.state === 'going') return h('span', { class: 'stamp' }, 'Registered');
  if (status.state === 'waiting') {
    return h('span', { class: 'stamp stamp--waiting' }, `${ordinal(status.position)} in line`);
  }
  return null;
}

/** The one thing the signed-in student can do with this event right now. */
function eventAction(portal, event) {
  const status = portal.statusOf(event.id);
  const button = (action, label, quiet) =>
    h(
      'button',
      {
        type: 'button',
        class: `button${quiet ? ' button--quiet' : ''}`,
        'data-action': action,
        'data-id': event.id,
        'data-focus': `event-action-${event.id}`,
      },
      label,
    );

  if (status.state === 'going') return button('cancel-registration', 'Cancel registration', true);
  if (status.state === 'waiting') return button('leave-waiting', 'Leave waiting list', true);
  if (portal.seatsLeft(event) > 0) return button('register', 'Register', false);
  return button('register', 'Join waiting list', false);
}

/** A ticket: date stub on the left, the event on the right. `level` is its heading level. */
function ticket(portal, event, level = 3) {
  const club = portal.clubById(event.clubId);
  const stamp = statusStamp(portal, event);
  const category = portal.categories.find(event.categoryId);

  return h(
    'article',
    {
      class: `ticket colour-${portal.topCategoryOf(event.categoryId)}${stamp ? ' ticket--stamped' : ''}`,
    },
    dateStub(event),
    h(
      'div',
      { class: 'ticket__body' },
      stamp,
      h(
        `h${level}`,
        { class: 'ticket__title' },
        h(
          'button',
          { type: 'button', class: 'ticket__open', 'data-action': 'open-event', 'data-id': event.id },
          event.name,
        ),
      ),
      h('p', { class: 'ticket__host' }, `${club.name}, ${category.name}`),
      h(
        'p',
        { class: 'ticket__where' },
        h('time', { datetime: event.date.toISOString() }, formatWhen(event.date)),
        `, ${event.venue}`,
      ),
      seatMeter(portal, event),
      h(
        'div',
        { class: 'ticket__foot' },
        h('span', { class: 'ticket__number' }, `No. ${event.id}`),
        eventAction(portal, event),
      ),
    ),
  );
}

/** A list of tickets. */
function ticketList(portal, events, level = 3, modifier = '') {
  return h(
    'ul',
    { class: `tickets ${modifier}`.trim() },
    events.map((event) => h('li', {}, ticket(portal, event, level))),
  );
}

/** A small button that opens an event, used wherever events are mentioned in passing. */
function eventChip(portal, event) {
  return h(
    'button',
    {
      type: 'button',
      class: `chip chip--event colour-${portal.topCategoryOf(event.categoryId)}`,
      'data-action': 'open-event',
      'data-id': event.id,
    },
    h('span', { class: 'chip__dot', 'aria-hidden': 'true' }),
    event.name,
    h('span', { class: 'chip__note' }, formatDay(event.date)),
  );
}
