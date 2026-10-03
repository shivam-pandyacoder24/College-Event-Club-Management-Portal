'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createPortal } = require('./helpers/load.js');

const AI_WORKSHOP = 512; // full, with a waiting list
const HACKATHON = 407; // has free seats
const DRONE_WORKSHOP = 629; // full; the demo student is 3rd on the waiting list
const PHOTO_WALK = 384; // the demo student has a seat

/**
 * The parts of a snapshot that describe the campus, in a form that can be
 * compared. Seat lists are sorted because a seat has no position, but waiting
 * lists and club rosters are kept in order because their order matters.
 */
function campusState(portal) {
  const snapshot = portal.snapshot();
  const going = {};
  for (const [eventId, ids] of Object.entries(snapshot.going)) going[eventId] = ids.slice().sort();
  return { going, waiting: snapshot.waiting, members: snapshot.members };
}

// ------------------------------------------------------------ sample campus

test('the sample campus loads with every seat and waiting list in place', () => {
  const portal = createPortal();

  assert.equal(portal.events.length, 32);
  assert.equal(portal.clubs.length, 12);
  assert.equal(portal.students.length, 60);
  assert.equal(portal.student.name, 'Aarav Mehta');

  for (const sample of SAMPLE_EVENTS) {
    const event = portal.eventByNumber(sample.id);
    assert.equal(event.taken, sample.going, `seats taken at ${sample.name}`);
    assert.equal(portal.waitingCount(sample.id), sample.waiting, `waiting for ${sample.name}`);
    assert.ok(event.taken <= event.seats);
  }
  for (const club of SAMPLE_CLUBS) assert.equal(portal.memberCount(club.id), club.members);
});

test('the sample campus is the same every time it is built', () => {
  assert.deepEqual(createSampleState(), createSampleState());
});

test('event dates are counted from today', () => {
  const portal = createPortal({ today: new Date(2026, 9, 3, 16, 51) });
  const workshop = portal.eventByNumber(AI_WORKSHOP);

  assert.equal(workshop.date.getFullYear(), 2026);
  assert.equal(workshop.date.getMonth(), 9);
  assert.equal(workshop.date.getDate(), 7);
  assert.equal(workshop.date.getHours(), 14);
});

// ---------------------------------------------------------- browsing events

test('choosing a category shows the events in its whole subtree', () => {
  const portal = createPortal();

  const technical = portal.listEvents({ categoryId: 'technical' }).events;
  assert.equal(technical.length, 10);
  assert.ok(technical.every((event) => portal.topCategoryOf(event.categoryId) === 'technical'));

  const workshops = portal.listEvents({ categoryId: 'workshops' }).events;
  assert.deepEqual(
    workshops.map((event) => event.name),
    ['Arduino Starter Night', 'Git and GitHub Basics', 'AI Workshop', 'Drone Building Workshop'],
  );

  assert.equal(portal.listEvents().events.length, 32);
  assert.equal(portal.countInCategory('all'), 32);
  assert.equal(portal.countInCategory('technical'), 10);
  assert.deepEqual(
    portal.categoryPath('workshops').map((node) => node.name),
    ['All events', 'Technical', 'Workshops'],
  );
});

test('search matches words in the name, club, venue, tags and category', () => {
  const portal = createPortal();
  const names = (query) => portal.listEvents({ query }).events.map((event) => event.name);

  assert.deepEqual(names('hackathon'), ['Hackathon']);
  assert.deepEqual(names('  AI   club '), ['AI Workshop', 'ML Seminar']);
  assert.deepEqual(names('amphitheatre'), ['Open Mic Night', 'Poetry Slam']);
  assert.deepEqual(names('quiz science'), ['Science and Tech Quiz']);
  assert.deepEqual(names('no such thing'), []);

  const result = portal.listEvents({ query: 'workshop' });
  assert.equal(result.stats.search.comparisons, 32);
  assert.equal(result.stats.search.found, result.events.length);
});

test('search finds clubs too', () => {
  const portal = createPortal();
  assert.deepEqual(portal.searchClubs('photo').map((club) => club.name), ['Photography Club']);
  assert.equal(portal.searchClubs('').length, 12);
  assert.deepEqual(portal.searchClubs('zzz'), []);
});

test('the date filter uses binary search and returns only events in the window', () => {
  const portal = createPortal();
  const week = portal.listEvents({ when: 'week' });
  const windowEnd = portal.today.getTime() + 7 * 24 * 60 * 60 * 1000;

  assert.ok(week.events.length > 0 && week.events.length < 32);
  assert.ok(week.events.every((event) => event.startsAt < windowEnd));
  assert.equal(
    week.events.length,
    portal.events.filter((event) => event.startsAt < windowEnd).length,
  );
  // Two binary searches over 32 events: at most 6 steps each.
  assert.ok(week.stats.range.steps <= 12);

  const fortnight = portal.listEvents({ when: 'fortnight' });
  assert.ok(fortnight.events.length > week.events.length);
});

test('events sort by date, popularity, category and name', () => {
  const portal = createPortal();

  const byDate = portal.listEvents({ sortBy: 'date' }).events;
  for (let index = 1; index < byDate.length; index++) {
    assert.ok(byDate[index - 1].startsAt <= byDate[index].startsAt);
  }

  const popular = portal.listEvents({ sortBy: 'popular' }).events;
  for (let index = 1; index < popular.length; index++) {
    const before = popular[index - 1];
    const after = popular[index];
    assert.ok(portal.demand(before) >= portal.demand(after));
    // Merge sort is stable, so events with the same demand stay in date order.
    if (portal.demand(before) === portal.demand(after)) assert.ok(before.startsAt <= after.startsAt);
  }
  assert.equal(popular[0].name, 'Campus 5K Run');

  const byCategory = portal.listEvents({ sortBy: 'category' }).events;
  for (let index = 1; index < byCategory.length; index++) {
    const before = byCategory[index - 1];
    const after = byCategory[index];
    assert.ok(before.categoryLabel <= after.categoryLabel);
    if (before.categoryLabel === after.categoryLabel) assert.ok(before.startsAt <= after.startsAt);
  }

  const byName = portal.listEvents({ sortBy: 'name' });
  const names = byName.events.map((event) => event.name.toLowerCase());
  assert.deepEqual(names, names.slice().sort());
  assert.equal(byName.stats.sort.algorithm, 'Quick sort');
  assert.equal(portal.listEvents({ sortBy: 'popular' }).stats.sort.algorithm, 'Merge sort');
});

// ------------------------------------------------------------ event numbers

test('an event is found by number through the hash table and the search tree', () => {
  const portal = createPortal();

  assert.equal(portal.eventByNumber(HACKATHON).name, 'Hackathon');
  assert.equal(portal.eventByNumber('407').name, 'Hackathon');
  assert.equal(portal.eventByNumber(999), null);

  const hit = portal.findEventNumber(HACKATHON);
  assert.equal(hit.event.name, 'Hackathon');
  assert.equal(hit.path[hit.path.length - 1], HACKATHON);
  assert.ok(hit.path.length <= portal.eventNumbers.height());

  const miss = portal.findEventNumber(500);
  assert.equal(miss.event, null);
  assert.equal(miss.lower, 437);
  assert.equal(miss.higher, 502);

  assert.equal(portal.findEventNumber(1).lower, null);
  assert.equal(portal.findEventNumber(1).higher, 121);
});

test('the search tree holds every event number and is balanced', () => {
  const portal = createPortal();
  const numbers = portal.eventNumbers.inOrder().map((entry) => portal.events[entry.value].id);

  assert.equal(numbers.length, 32);
  assert.deepEqual(numbers, numbers.slice().sort((a, b) => a - b));
  assert.equal(portal.eventNumbers.height(), 6);
});

// ------------------------------------------------------------ registrations

test('registering takes a free seat', () => {
  const portal = createPortal();
  const hackathon = portal.eventByNumber(HACKATHON);
  const takenBefore = hackathon.taken;

  const result = portal.register(HACKATHON);

  assert.equal(result.ok, true);
  assert.equal(result.state, 'going');
  assert.equal(result.message, 'Registered for Hackathon.');
  assert.equal(hackathon.taken, takenBefore + 1);
  assert.equal(portal.statusOf(HACKATHON).state, 'going');
  assert.ok(portal.attendeeIds(HACKATHON).includes('AI25042'));
  assert.ok(portal.eventsOfStudent().some((event) => event.id === HACKATHON));

  const again = portal.register(HACKATHON);
  assert.equal(again.ok, false);
  assert.equal(hackathon.taken, takenBefore + 1);
});

test('registering for a full event joins the rear of its waiting list', () => {
  const portal = createPortal();
  const football = portal.eventByNumber(319);
  assert.equal(portal.seatsLeft(football), 0);

  const result = portal.register(319);

  assert.equal(result.state, 'waiting');
  assert.equal(result.position, 4);
  assert.equal(result.message, 'Joined the waiting list for Five-a-side Football League. You are 4th in line.');
  assert.equal(football.taken, 20);
  assert.deepEqual(portal.statusOf(319), { state: 'waiting', position: 4 });
  assert.equal(portal.waitingFor(319)[3].id, 'AI25042');
  assert.equal(portal.attendeeIds(319).includes('AI25042'), false);
});

test('a cancelled seat goes to the student at the front of the waiting list', () => {
  const portal = createPortal();
  const workshop = portal.eventByNumber(AI_WORKSHOP);
  const lineBefore = portal.waitingFor(AI_WORKSHOP).map((student) => student.id);
  assert.equal(lineBefore.length, 4);

  const result = portal.cancelRegistration(AI_WORKSHOP);

  assert.equal(result.ok, true);
  assert.equal(result.promoted, lineBefore[0]);
  assert.equal(workshop.taken, 12);
  assert.equal(portal.statusOf(AI_WORKSHOP).state, 'none');
  assert.equal(portal.statusOf(AI_WORKSHOP, lineBefore[0]).state, 'going');
  assert.deepEqual(
    portal.waitingFor(AI_WORKSHOP).map((student) => student.id),
    lineBefore.slice(1),
  );
  assert.match(result.message, /Your seat went to .+, who was first on the waiting list\./);
});

test('cancelling when nobody is waiting frees the seat', () => {
  const portal = createPortal();
  const walk = portal.eventByNumber(PHOTO_WALK);

  const result = portal.cancelRegistration(PHOTO_WALK);

  assert.equal(result.promoted, null);
  assert.equal(result.message, 'Registration cancelled for Campus Photo Walk.');
  assert.equal(walk.taken, 11);
  assert.equal(portal.cancelRegistration(PHOTO_WALK).ok, false);
  assert.equal(portal.cancelRegistration(999).ok, false);
});

test('leaving a waiting list moves everyone behind up one place', () => {
  const portal = createPortal();
  const lineBefore = portal.waitingFor(DRONE_WORKSHOP).map((student) => student.id);
  assert.equal(lineBefore[2], 'AI25042');
  assert.deepEqual(portal.statusOf(DRONE_WORKSHOP), { state: 'waiting', position: 3 });

  const result = portal.leaveWaitingList(DRONE_WORKSHOP);

  assert.equal(result.ok, true);
  assert.deepEqual(
    portal.waitingFor(DRONE_WORKSHOP).map((student) => student.id),
    [lineBefore[0], lineBefore[1], lineBefore[3]],
  );
  assert.equal(portal.statusOf(DRONE_WORKSHOP, lineBefore[3]).position, 3);
  assert.equal(portal.leaveWaitingList(DRONE_WORKSHOP).ok, false);
});

test('seats are handed out in the order students joined the waiting list', () => {
  const portal = createPortal();
  const line = portal.waitingFor(DRONE_WORKSHOP).map((student) => student.id);

  // Three students with a seat cancel, one after another.
  const promoted = [];
  for (const studentId of portal.attendeeIds(DRONE_WORKSHOP).slice(0, 3)) {
    portal.signIn(studentId);
    promoted.push(portal.cancelRegistration(DRONE_WORKSHOP).promoted);
  }

  assert.deepEqual(promoted, line.slice(0, 3));
  assert.equal(promoted[2], 'AI25042');
  assert.equal(portal.statusOf(DRONE_WORKSHOP, 'AI25042').state, 'going');
});

// -------------------------------------------------------------------- undo

test('undo reverses each kind of action and leaves the campus as it was', () => {
  const actions = [
    (portal) => portal.register(HACKATHON),
    (portal) => portal.register(319),
    (portal) => portal.cancelRegistration(AI_WORKSHOP),
    (portal) => portal.cancelRegistration(PHOTO_WALK),
    (portal) => portal.leaveWaitingList(DRONE_WORKSHOP),
    (portal) => portal.joinClub('coding'),
    (portal) => portal.leaveClub('ai'),
  ];

  for (const action of actions) {
    const portal = createPortal();
    const before = campusState(portal);

    assert.equal(action(portal).ok, true);
    assert.notDeepEqual(campusState(portal), before);
    assert.equal(portal.canUndo, true);

    assert.equal(portal.undo().ok, true);
    assert.deepEqual(campusState(portal), before);
    assert.equal(portal.canUndo, false);
  }
});

test('undoing a cancellation takes the seat back from the student it was passed to', () => {
  const portal = createPortal();
  const lineBefore = portal.waitingFor(AI_WORKSHOP).map((student) => student.id);

  const { promoted } = portal.cancelRegistration(AI_WORKSHOP);
  const result = portal.undo();

  assert.equal(result.message, 'Undone. You are registered for AI Workshop again.');
  assert.equal(portal.statusOf(AI_WORKSHOP).state, 'going');
  assert.deepEqual(portal.statusOf(AI_WORKSHOP, promoted), { state: 'waiting', position: 1 });
  assert.deepEqual(portal.waitingFor(AI_WORKSHOP).map((student) => student.id), lineBefore);
  assert.equal(portal.eventByNumber(AI_WORKSHOP).taken, 12);
});

test('undo works backwards through the actions, most recent first', () => {
  const portal = createPortal();
  const before = campusState(portal);

  portal.register(HACKATHON);
  portal.joinClub('coding');
  portal.cancelRegistration(AI_WORKSHOP);
  portal.register(AI_WORKSHOP); // now at the rear of the waiting list

  assert.deepEqual(portal.undoHistory(), [
    'Joined the waiting list for AI Workshop',
    'Cancelled registration for AI Workshop',
    'Joined Coding Club',
    'Registered for Hackathon',
  ]);

  assert.equal(portal.undo().message, 'Undone. You are off the waiting list for AI Workshop.');
  assert.equal(portal.undo().message, 'Undone. You are registered for AI Workshop again.');
  assert.equal(portal.undo().message, 'Undone. You are no longer a member of Coding Club.');
  assert.equal(portal.undo().message, 'Undone. You are no longer registered for Hackathon.');

  assert.deepEqual(campusState(portal), before);
  assert.equal(portal.undo().ok, false);
});

// -------------------------------------------------------------------- clubs

test('joining a club adds the member at the tail of its list', () => {
  const portal = createPortal();
  assert.equal(portal.isMember('coding'), false);

  const result = portal.joinClub('coding');

  assert.equal(result.message, 'Joined Coding Club.');
  assert.equal(portal.isMember('coding'), true);
  assert.equal(portal.memberCount('coding'), 19);
  assert.equal(portal.membersOf('coding')[18].id, 'AI25042');
  assert.ok(portal.clubsOfStudent().some((club) => club.id === 'coding'));
  assert.equal(portal.joinClub('coding').ok, false);
  assert.equal(portal.joinClub('nowhere').ok, false);
});

test('leaving a club unlinks the member, and undo puts them back in the same place', () => {
  const portal = createPortal();
  const rosterBefore = portal.membersOf('ai').map((student) => student.id);
  assert.equal(rosterBefore[6], 'AI25042');

  assert.equal(portal.leaveClub('ai').message, 'Left AI Club.');
  assert.deepEqual(
    portal.membersOf('ai').map((student) => student.id),
    rosterBefore.filter((id) => id !== 'AI25042'),
  );
  assert.equal(portal.isMember('ai'), false);
  assert.equal(portal.leaveClub('ai').ok, false);

  portal.undo();
  assert.deepEqual(portal.membersOf('ai').map((student) => student.id), rosterBefore);
});

test('a club lists the events it hosts, soonest first', () => {
  const portal = createPortal();
  assert.deepEqual(
    portal.eventsOfClub('coding').map((event) => event.name),
    ['Git and GitHub Basics', 'Code Sprint', 'Hackathon'],
  );
});

// ---------------------------------------------------------- recently viewed

test('recently viewed is a stack: the event opened last is on top', () => {
  const portal = createPortal();
  [512, 407, 731].forEach((id) => portal.viewEvent(id));
  assert.deepEqual(portal.recentlyViewed().map((event) => event.id), [731, 407, 512]);

  // Opening an event again moves it to the top instead of listing it twice.
  portal.viewEvent(512);
  assert.deepEqual(portal.recentlyViewed().map((event) => event.id), [512, 731, 407]);

  portal.viewEvent(999);
  assert.equal(portal.recentlyViewed().length, 3);
});

test('recently viewed keeps the six newest events', () => {
  const portal = createPortal();
  [512, 407, 731, 153, 884, 975, 629, 346].forEach((id) => portal.viewEvent(id));
  assert.deepEqual(portal.recentlyViewed().map((event) => event.id), [346, 629, 975, 884, 153, 731]);
});

// -------------------------------------------------------------- connections

test('the AI Club trail matches the example in the brief', () => {
  const portal = createPortal();
  assert.deepEqual(portal.trailPaths('ai'), [['AI Club', 'AI Workshop', 'Hackathon', 'ML Seminar']]);
  assert.deepEqual(portal.trailPaths('coding'), [
    ['Coding Club', 'Git and GitHub Basics', 'Code Sprint', 'Hackathon', 'ML Seminar'],
  ]);
});

test('a trail branches when one event leads to two others', () => {
  const portal = createPortal();
  assert.deepEqual(portal.trailPaths('drama'), [
    ['Drama Club', 'Improv Jam', 'Open Mic Night', 'Battle of Bands'],
    ['Drama Club', 'Improv Jam', 'Street Play Festival'],
  ]);

  const trail = portal.clubTrail('drama');
  assert.equal(trail.node.type, 'club');
  assert.equal(trail.children.length, 1);
  assert.equal(trail.children[0].children.length, 2);
  assert.equal(portal.clubTrail('nowhere'), null);
});

test('every event appears in the trail of the club that hosts it', () => {
  const portal = createPortal();
  for (const club of portal.clubs) {
    const onTrail = portal.trailPaths(club.id).flat();
    for (const event of portal.eventsOfClub(club.id)) assert.ok(onTrail.includes(event.name));
  }
});

test('the steps around an event come from its graph edges', () => {
  const portal = createPortal();
  const steps = portal.stepsAround(HACKATHON);
  assert.deepEqual(steps.before.map((event) => event.name), ['AI Workshop', 'Code Sprint']);
  assert.deepEqual(steps.after.map((event) => event.name), ['ML Seminar']);
});

test('the shortest connection between two nodes is a real chain of relationships', () => {
  const portal = createPortal();

  const direct = portal.connection('student:AI25042', 'club:ai');
  assert.deepEqual(direct.map((step) => step.name), ['Aarav Mehta', 'AI Club']);
  assert.equal(direct[1].label, 'member of');

  const chain = portal.connection('club:ai', 'event:731');
  assert.deepEqual(chain.map((step) => step.name), ['AI Club', 'ML Seminar']);
  assert.equal(chain[1].label, 'hosts');

  const far = portal.connection('club:quiz', 'event:663');
  assert.ok(far.length >= 2);
  for (let step = 1; step < far.length; step++) {
    assert.equal(portal.graph.hasEdge(far[step - 1].key, far[step].key, far[step].label), true);
  }

  assert.equal(portal.connection('club:ai', 'club:nowhere'), null);
});

test('a new student is connected to nothing until they join something', () => {
  const portal = createPortal();
  portal.addStudent({ id: 'CS25104', name: 'New Student' });

  assert.equal(portal.connection('student:CS25104', 'club:ai'), null);
  portal.joinClub('ai');
  assert.equal(portal.connection('student:CS25104', 'club:ai').length, 2);
});

test('breadth-first search counts how far the rest of the campus is', () => {
  const portal = createPortal();

  // One step from the AI Club: the 2 events it hosts and its 16 members.
  const fromClub = portal.distancesFrom('club:ai');
  assert.equal(fromClub[0], 18);
  assert.equal(fromClub.reduce((sum, count) => sum + count, 0), portal.graph.nodeCount - 1);

  portal.addStudent({ id: 'CS25104', name: 'New Student' });
  assert.deepEqual(portal.distancesFrom('student:CS25104'), []);
});

test('neighbours are grouped by relationship', () => {
  const portal = createPortal();
  const groups = portal.neighboursOf('event:407');
  const labels = groups.map((group) => group.label);

  assert.deepEqual(labels, ['hosted by', 'leads to', 'comes after', 'has attendee']);
  assert.equal(groups[0].nodes[0].name, 'Coding Club');
  assert.equal(groups[3].nodes.length, 14);
});

test('suggestions come from the graph and never include events already on your list', () => {
  const portal = createPortal();

  const suggested = portal.suggestedEvents();
  assert.equal(suggested.length, 4);
  for (let index = 1; index < suggested.length; index++) {
    assert.ok(suggested[index - 1].score >= suggested[index].score);
  }
  for (const { event } of suggested) assert.equal(portal.statusOf(event.id).state, 'none');

  assert.deepEqual(
    portal.nextOnTrail().map((step) => `${step.after.name} > ${step.event.name}`),
    ['Campus Photo Walk > Photo Editing Basics', 'AI Workshop > Hackathon'],
  );

  portal.register(HACKATHON);
  assert.deepEqual(
    portal.nextOnTrail().map((step) => step.event.name),
    ['Photo Editing Basics', 'ML Seminar'],
  );
  assert.deepEqual(portal.suggestedClubs().map((entry) => entry.club.name), ['Coding Club']);
});

// ----------------------------------------------------------------- students

test('signing in looks the student up by ID', () => {
  const portal = createPortal();
  portal.register(HACKATHON);

  const result = portal.signIn(' cs24014 ');
  assert.equal(result.ok, true);
  assert.equal(portal.student.name, 'Arjun Reddy');
  // A different student cannot undo the last student's actions.
  assert.equal(portal.canUndo, false);

  const unknown = portal.signIn('ZZ99999');
  assert.equal(unknown.ok, false);
  assert.equal(unknown.message, 'No student has the ID ZZ99999.');
  assert.equal(portal.student.name, 'Arjun Reddy');
});

test('a new student can be added and then registers like anyone else', () => {
  const portal = createPortal();

  assert.equal(portal.addStudent({ id: '123', name: 'Nobody' }).ok, false);
  assert.equal(portal.addStudent({ id: 'CS25104', name: ' ' }).ok, false);
  assert.match(portal.addStudent({ id: 'ai25042', name: 'Copy' }).message, /already belongs to Aarav Mehta/);
  assert.equal(portal.students.length, 60);

  const result = portal.addStudent({ id: 'cs25104', name: '  Isha   Rao ' });
  assert.equal(result.ok, true);
  assert.equal(portal.student.id, 'CS25104');
  assert.equal(portal.student.name, 'Isha Rao');
  assert.equal(portal.students.length, 61);
  assert.equal(portal.studentById('CS25104').name, 'Isha Rao');

  assert.equal(portal.register(HACKATHON).state, 'going');
  assert.equal(portal.register(AI_WORKSHOP).position, 5);
});

// ------------------------------------------------------------------- saving

test('a saved portal comes back exactly as it was', () => {
  const portal = createPortal();
  portal.addStudent({ id: 'CS25104', name: 'Isha Rao' });
  portal.register(HACKATHON);
  portal.register(AI_WORKSHOP);
  portal.joinClub('quiz');
  portal.viewEvent(731);
  portal.viewEvent(407);

  const saved = JSON.parse(JSON.stringify(portal.snapshot()));
  const restored = createPortal({ state: saved });

  assert.deepEqual(restored.snapshot(), portal.snapshot());
  assert.equal(restored.student.name, 'Isha Rao');
  assert.deepEqual(restored.recentlyViewed().map((event) => event.id), [407, 731]);
  assert.deepEqual(restored.undoHistory(), portal.undoHistory());

  // Undo still works after a reload.
  restored.undo();
  assert.equal(restored.isMember('quiz'), false);
});

test('saved data that does not add up is rejected', () => {
  const overfull = createSampleState();
  overfull.going[HACKATHON] = SAMPLE_STUDENTS.slice(0, 17).map((student) => student.id);
  assert.throws(() => createPortal({ state: overfull }), /Too many students/);

  const stranger = createSampleState();
  stranger.members.ai.push('ZZ00000');
  assert.throws(() => createPortal({ state: stranger }), /Unknown student/);

  const twice = createSampleState();
  twice.waiting[AI_WORKSHOP].push(twice.going[AI_WORKSHOP][0]);
  assert.throws(() => createPortal({ state: twice }), /listed twice/);

  const earlyLine = createSampleState();
  earlyLine.waiting[HACKATHON] = ['CS24014'];
  assert.throws(() => createPortal({ state: earlyLine }), /not full/);
});
