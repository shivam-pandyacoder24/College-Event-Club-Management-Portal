'use strict';

/** The event dialog: everything about one event, and the button to register for it. */

const NAMES_SHOWN = 10;

function renderEventSheet(portal, event) {
  const club = portal.clubById(event.clubId);
  const status = portal.statusOf(event.id);
  const steps = portal.stepsAround(event.id);
  const going = portal.attendeesOf(event.id);
  const line = portal.waitingFor(event.id);

  return [
    h(
      'header',
      { class: `sheet-ticket colour-${portal.topCategoryOf(event.categoryId)}` },
      dateStub(event),
      h(
        'div',
        { class: 'sheet-ticket__body' },
        h('p', { class: 'sheet-ticket__category' }, event.categoryLabel),
        h('h2', { id: 'event-title', class: 'sheet-ticket__title' }, event.name),
        h(
          'p',
          { class: 'sheet-ticket__host' },
          'Hosted by ',
          h('a', { href: `#club/${club.id}`, 'data-action': 'close-dialog' }, club.name),
        ),
      ),
    ),

    h(
      'div',
      { class: 'sheet__content' },
      h(
        'dl',
        { class: 'facts' },
        h('div', {}, h('dt', {}, 'When'), h('dd', {}, `${formatWhen(event.date)} (${daysAway(event.date, portal.today)})`)),
        h('div', {}, h('dt', {}, 'Where'), h('dd', {}, event.venue)),
        h('div', {}, h('dt', {}, 'Event number'), h('dd', {}, String(event.id))),
      ),
      h('p', { class: 'sheet__about' }, event.about),

      h(
        'div',
        { class: 'register-box' },
        h('div', { class: 'register-box__status' }, seatMeter(portal, event), h('p', {}, statusSentence(portal, event, status))),
        eventAction(portal, event),
      ),

      stepsSection(portal, steps),
      waitingSection(portal, line),
      goingSection(portal, going),
    ),
  ];
}

/** One sentence on where the signed-in student stands with this event. */
function statusSentence(portal, event, status) {
  if (status.state === 'going') return 'You have a seat.';
  if (status.state === 'waiting') {
    const ahead = status.position - 1;
    return ahead === 0
      ? 'You are first in line. The next seat that opens is yours.'
      : `You are ${ordinal(status.position)} in line, with ${plural(ahead, 'student')} ahead of you.`;
  }
  if (portal.seatsLeft(event) === 0) {
    return 'Every seat is taken. Join the waiting list and a seat is yours when someone cancels, in the order people joined.';
  }
  return 'Seats are given in the order students register.';
}

/** GRAPH: the events on either side of this one in a trail. */
function stepsSection(portal, steps) {
  if (steps.before.length === 0 && steps.after.length === 0) return null;

  const row = (label, events) =>
    events.length === 0
      ? null
      : h('div', { class: 'steps__row' }, h('span', { class: 'steps__label' }, label), events.map((event) => eventChip(portal, event)));

  return h(
    'section',
    { class: 'sheet-section' },
    h('h3', {}, 'On the trail'),
    h('div', { class: 'steps' }, row('Good to do first', steps.before), row('Leads to', steps.after)),
  );
}

/** QUEUE: the waiting list, front of the line first. */
function waitingSection(portal, line) {
  if (line.length === 0) return null;

  return h(
    'section',
    { class: 'sheet-section' },
    h('h3', {}, `Waiting list, ${line.length} in line`),
    h(
      'ol',
      { class: 'line' },
      line.map((student, index) =>
        h(
          'li',
          { class: student.id === portal.currentStudentId ? 'is-you' : null },
          h('span', { class: 'line__place' }, ordinal(index + 1)),
          student.id === portal.currentStudentId ? `${student.name} (you)` : student.name,
          index === 0 ? h('span', { class: 'line__note' }, 'gets the next seat') : null,
        ),
      ),
    ),
  );
}

/** GRAPH: the students joined to this event by a "registered for" edge. */
function goingSection(portal, going) {
  if (going.length === 0) {
    return h('section', { class: 'sheet-section' }, h('h3', {}, 'Who is going'), h('p', { class: 'quiet' }, 'Nobody has registered yet.'));
  }

  // The signed-in student is listed first, so they can see at a glance that they are in.
  const you = going.filter((student) => student.id === portal.currentStudentId);
  const others = going.filter((student) => student.id !== portal.currentStudentId);
  const shown = you.concat(others).slice(0, NAMES_SHOWN);
  const names = shown.map((student) => (student.id === portal.currentStudentId ? 'You' : student.name));
  const hidden = going.length - shown.length;

  return h(
    'section',
    { class: 'sheet-section' },
    h('h3', {}, `Who is going, ${going.length}`),
    h('p', { class: 'names' }, names.join(', ') + (hidden > 0 ? ` and ${hidden} more.` : '.')),
  );
}
