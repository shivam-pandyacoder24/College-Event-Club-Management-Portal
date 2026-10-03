'use strict';

/**
 * THE PORTAL
 * Everything the site can do, with no HTML in it: browsing events, joining
 * clubs, registering, waiting lists, undo and the connections between them.
 *
 * This file is where each data structure gets its job:
 *   Array            this.events             the event information
 *   Searching        listEvents              linear search (words), binary search (dates)
 *   Sorting          listEvents              merge sort and quick sort
 *   Linked list      this.members            each club's members, in joining order
 *   Stack            this.undoStack          undo for registrations and club changes
 *                    this.recent             recently viewed events
 *   Queue            this.waitingLists       the waiting list of each full event
 *   Tree 1           this.categories         event categories
 *   Tree 2           this.eventNumbers       binary search tree of event numbers
 *   Graph            this.graph              clubs, events and students, and how they connect
 *   Hashing          this.studentIndex       student ID -> student
 *                    this.eventIndex         event number -> event
 *
 * The same file runs in the browser and in the tests.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const ROOT_CATEGORY = 'all';
const RECENT_LIMIT = 6;

/** The labels on the graph's edges. Each relationship has one label per direction. */
const LINK = Object.freeze({
  HOSTS: 'hosts',
  HOSTED_BY: 'hosted by',
  LEADS_TO: 'leads to',
  COMES_AFTER: 'comes after',
  MEMBER_OF: 'member of',
  HAS_MEMBER: 'has member',
  REGISTERED_FOR: 'registered for',
  HAS_ATTENDEE: 'has attendee',
});

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
function ordinal(number) {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${number}th`;
  return `${number}${{ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th'}`;
}

/** The words in a piece of text, in lower case: "Five-a-side Football" -> five, a, side, football. */
function wordsOf(text) {
  return String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * True when every word typed is the start of some word in the text, so "photo"
 * finds "Photography Club". A word of one or two letters has to match a whole
 * word: "ai" finds "AI Club" but not "Main Gate" or "Open Air Theatre".
 */
function matchesWords(textWords, typedWords) {
  return typedWords.every((typed) =>
    textWords.some((word) => (typed.length <= 2 ? word === typed : word.startsWith(typed))),
  );
}

class Portal {
  /**
   * @param {object} options
   * @param {Array}  options.categories  [id, name, parent id] rows
   * @param {Array}  options.clubs
   * @param {Array}  options.events
   * @param {Array}  options.links       [event number, event number it leads to] pairs
   * @param {Array}  options.students    { id, name } records
   * @param {object} options.state       who is in which club and at which event (see snapshot)
   * @param {string} options.studentId   the student to sign in as
   * @param {Date}   [options.today]     the day event dates are counted from
   */
  constructor({ categories, clubs, events, links, students, state, studentId, today = new Date() }) {
    this.today = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // TREE 1: the categories.
    this.categories = new CategoryTree(ROOT_CATEGORY, 'All events');
    for (const [id, name, parentId] of categories) this.categories.add(id, name, parentId);

    // HASHING: students by student ID.
    this.students = [];
    this.studentIndex = new HashTable();
    this.addedStudents = [];
    for (const student of students) this.storeStudent(student);
    for (const student of state.added || []) {
      this.storeStudent(student);
      this.addedStudents.push({ id: student.id, name: student.name });
    }

    // Clubs, each with a LINKED LIST of members.
    this.clubs = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      focus: club.focus,
      tagline: club.tagline,
      meets: club.meets,
      searchWords: wordsOf(`${club.name} ${club.tagline}`),
    }));
    this.clubIndex = new HashTable();
    this.members = new HashTable();
    this.clubs.forEach((club, index) => {
      this.clubIndex.set(club.id, index);
      this.members.set(club.id, new LinkedList());
    });

    // ARRAY: the event information. Everything else refers to an event by its position here.
    this.events = events.map((event) => this.buildEvent(event));

    // HASHING and TREE 2: two ways from an event number to a position in the array.
    this.eventIndex = new HashTable();
    this.events.forEach((event, index) => this.eventIndex.set(event.id, index));
    const byNumber = mergeSort(
      this.events.map((event, index) => ({ key: event.id, value: index })),
      (a, b) => a.key - b.key,
    ).sorted;
    this.eventNumbers = BinarySearchTree.fromSorted(byNumber);

    // SORTING: one copy of the events kept in date order, ready for binary search.
    this.eventsByDate = mergeSort(this.events, (a, b) => a.startsAt - b.startsAt).sorted;

    // QUEUE: a waiting list for every event.
    this.waitingLists = new HashTable();
    for (const event of this.events) this.waitingLists.set(event.id, new Queue());

    // "AI25042|512" -> 'going' or 'waiting', so the answer to "am I registered?" is one lookup.
    this.registrations = new HashTable();

    // GRAPH: every club, event and student is a node.
    this.graph = new Graph();
    for (const club of this.clubs) this.graph.addNode(Portal.key('club', club.id));
    for (const student of this.students) this.graph.addNode(Portal.key('student', student.id));
    for (const event of this.events) {
      this.graph.connect(Portal.key('club', event.clubId), Portal.key('event', event.id), LINK.HOSTS, LINK.HOSTED_BY);
    }
    for (const [from, to] of links) {
      this.graph.connect(Portal.key('event', from), Portal.key('event', to), LINK.LEADS_TO, LINK.COMES_AFTER);
    }

    // STACKS.
    this.undoStack = new Stack();
    this.recent = new Stack();

    this.currentStudentId = null;
    this.restore(state, studentId);
  }

  // ------------------------------------------------------------ setting up

  /** Node names in the graph look like "club:ai", "event:512" and "student:AI25042". */
  static key(type, id) {
    return `${type}:${id}`;
  }

  static parseKey(key) {
    const colon = key.indexOf(':');
    return { type: key.slice(0, colon), id: key.slice(colon + 1) };
  }

  static registrationKey(studentId, eventId) {
    return `${studentId}|${eventId}`;
  }

  /** "ai25042 " -> "AI25042" */
  static cleanStudentId(text) {
    return String(text).replace(/\s+/g, '').toUpperCase();
  }

  buildEvent(event) {
    const [hours, minutes] = event.time.split(':').map(Number);
    const date = new Date(this.today.getTime());
    date.setDate(date.getDate() + event.day);
    date.setHours(hours, minutes, 0, 0);

    const club = this.clubById(event.club);
    const categoryNames = this.categories.pathTo(event.category).slice(1).map((node) => node.name);

    return {
      id: event.id,
      name: event.name,
      clubId: event.club,
      categoryId: event.category,
      date,
      startsAt: date.getTime(),
      venue: event.venue,
      seats: event.seats,
      taken: 0,
      about: event.about,
      tags: event.tags.slice(),
      categoryLabel: categoryNames.join(' / '),
      searchWords: wordsOf([event.name, club.name, event.venue, ...event.tags, ...categoryNames].join(' ')),
    };
  }

  storeStudent(student) {
    this.studentIndex.set(student.id, this.students.length);
    this.students.push({ id: student.id, name: student.name });
    if (this.graph) this.graph.addNode(Portal.key('student', student.id));
  }

  /** Fills the clubs, seats and waiting lists from saved lists of student IDs. */
  restore(state, studentId) {
    const known = (id) => {
      if (!this.studentIndex.has(id)) throw new Error(`Unknown student: ${id}`);
      return id;
    };

    for (const club of this.clubs) {
      for (const id of state.members[club.id] || []) this.enrol(known(id), club);
    }
    for (const event of this.events) {
      const going = state.going[event.id] || [];
      const waiting = state.waiting[event.id] || [];
      if (going.length > event.seats) throw new Error(`Too many students at event ${event.id}`);
      if (waiting.length > 0 && going.length < event.seats) {
        throw new Error(`Event ${event.id} has a waiting list but is not full`);
      }

      for (const id of going) this.seat(known(id), event);
      for (const id of waiting) {
        if (this.registrations.has(Portal.registrationKey(known(id), event.id))) {
          throw new Error(`Student ${id} is listed twice for event ${event.id}`);
        }
        this.waitingLists.get(event.id).enqueue(id);
        this.registrations.set(Portal.registrationKey(id, event.id), 'waiting');
      }
    }

    this.currentStudentId = known(state.student || studentId);
    for (const eventId of state.recent || []) {
      if (this.eventIndex.has(eventId)) this.recent.push(Number(eventId));
    }
    for (const action of state.undo || []) {
      const refersToSomethingReal =
        this.studentIndex.has(action.studentId) &&
        (action.eventId === undefined || this.eventIndex.has(action.eventId)) &&
        (action.clubId === undefined || this.clubIndex.has(action.clubId));
      if (!refersToSomethingReal) throw new Error('The saved undo history does not match the events');
      this.undoStack.push({ ...action });
    }
  }

  /** Everything needed to rebuild the portal later. This is what the browser saves. */
  snapshot() {
    const members = {};
    for (const club of this.clubs) members[club.id] = this.members.get(club.id).toArray();

    const going = {};
    const waiting = {};
    for (const event of this.events) {
      going[event.id] = this.attendeeIds(event.id);
      waiting[event.id] = this.waitingLists.get(event.id).toArray();
    }

    return {
      version: 1,
      student: this.currentStudentId,
      added: this.addedStudents.map((student) => ({ ...student })),
      members,
      going,
      waiting,
      // Stacks are saved bottom first, so pushing them back in order rebuilds them.
      recent: this.recent.toArray().reverse(),
      undo: this.undoStack.toArray().reverse(),
    };
  }

  // ---------------------------------------------------------------- lookups

  /** HASHING: one bucket to check, however many events there are. */
  eventByNumber(number) {
    const index = this.eventIndex.get(number);
    return index === undefined ? null : this.events[index];
  }

  clubById(id) {
    const index = this.clubIndex.get(id);
    return index === undefined ? null : this.clubs[index];
  }

  /** HASHING: student ID -> student. */
  studentById(id) {
    const index = this.studentIndex.get(id);
    return index === undefined ? null : this.students[index];
  }

  get student() {
    return this.studentById(this.currentStudentId);
  }

  /**
   * TREE 2: finds an event by number in the binary search tree.
   * Returns the event (or null), the numbers the search compared on the way,
   * and, when there is no such event, the nearest numbers on either side.
   */
  findEventNumber(number) {
    const result = this.eventNumbers.find(number);
    return {
      event: result.found ? this.events[result.value] : null,
      path: result.path,
      lower: result.found ? null : this.eventNumbers.floor(number),
      higher: result.found ? null : this.eventNumbers.ceiling(number),
    };
  }

  // -------------------------------------------------------------- categories

  /** TREE 1: the names from the root down to a category, for the breadcrumb. */
  categoryPath(categoryId) {
    return this.categories.pathTo(categoryId);
  }

  /** TREE 1: the top-level category an event belongs to, which sets its ticket colour. */
  topCategoryOf(categoryId) {
    const top = this.categories.topLevelOf(categoryId);
    return top === null ? ROOT_CATEGORY : top.id;
  }

  /** TREE 1: how many events sit in a category or anywhere below it. */
  countInCategory(categoryId) {
    const ids = this.categories.subtreeIds(categoryId);
    return this.events.filter((event) => ids.includes(event.categoryId)).length;
  }

  // ---------------------------------------------------------- browsing events

  /**
   * The events page. Narrows the events down in three steps, then sorts them.
   *
   *   when        'any', 'week' (next 7 days) or 'fortnight' (next 14 days)
   *   categoryId  a category from the tree; its whole subtree is included
   *   query       words typed into the search box
   *   sortBy      'date', 'popular', 'category' or 'name'
   *
   * `stats` reports the work each algorithm did, for the Data structures page.
   */
  listEvents({ when = 'any', categoryId = ROOT_CATEGORY, query = '', sortBy = 'date' } = {}) {
    const stats = { total: this.events.length, range: null, search: null, sort: null };
    let pool = this.eventsByDate;

    // SEARCHING (binary): the events are in date order, so a date range is two binary searches.
    if (when !== 'any') {
      const days = when === 'week' ? 7 : 14;
      const from = this.today.getTime();
      const range = sortedRange(pool, from, from + days * DAY_MS, (event) => event.startsAt);
      pool = range.found;
      stats.range = { days, steps: range.steps, found: range.found.length };
    }

    // TREE 1: keep the events in the chosen category's subtree.
    if (categoryId !== ROOT_CATEGORY) {
      const ids = this.categories.subtreeIds(categoryId);
      pool = pool.filter((event) => ids.includes(event.categoryId));
    }

    // SEARCHING (linear): every word typed must match a word in the event's text.
    const typed = wordsOf(query);
    if (typed.length > 0) {
      const search = linearSearch(pool, (event) => matchesWords(event.searchWords, typed));
      pool = search.found;
      stats.search = { comparisons: search.comparisons, found: search.found.length };
    }

    // SORTING. The pool is in date order at this point, and merge sort is stable,
    // so events that tie on popularity or category stay in date order.
    const orders = {
      date: { algorithm: 'Merge sort', sort: mergeSort, compare: (a, b) => a.startsAt - b.startsAt },
      popular: { algorithm: 'Merge sort', sort: mergeSort, compare: (a, b) => this.demand(b) - this.demand(a) },
      category: {
        algorithm: 'Merge sort',
        sort: mergeSort,
        compare: (a, b) => (a.categoryLabel < b.categoryLabel ? -1 : a.categoryLabel > b.categoryLabel ? 1 : 0),
      },
      name: {
        algorithm: 'Quick sort',
        sort: quickSort,
        compare: (a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1),
      },
    };
    const order = orders[sortBy] || orders.date;
    const result = order.sort(pool, order.compare);
    stats.sort = { algorithm: order.algorithm, comparisons: result.comparisons, items: pool.length };

    return { events: result.sorted, stats };
  }

  /** SEARCHING (linear): clubs whose name or tagline matches every word typed. */
  searchClubs(query) {
    const typed = wordsOf(query);
    if (typed.length === 0) return this.clubs.slice();
    return linearSearch(this.clubs, (club) => matchesWords(club.searchWords, typed)).found;
  }

  // ------------------------------------------------------- seats and waiting

  seatsLeft(event) {
    return event.seats - event.taken;
  }

  waitingCount(eventId) {
    return this.waitingLists.get(eventId).size;
  }

  /** How many students want this event: those with a seat plus those waiting for one. */
  demand(event) {
    return event.taken + this.waitingCount(event.id);
  }

  /**
   * Where a student stands with an event:
   * { state: 'going' }, { state: 'waiting', position } or { state: 'none' }.
   */
  statusOf(eventId, studentId = this.currentStudentId) {
    const state = this.registrations.get(Portal.registrationKey(studentId, eventId));
    if (state === 'waiting') {
      return { state, position: this.waitingLists.get(eventId).positionOf(studentId) };
    }
    return { state: state || 'none' };
  }

  /** Gives a student a seat. The graph edge is what "who is going" is read from. */
  seat(studentId, event) {
    const key = Portal.registrationKey(studentId, event.id);
    if (this.registrations.has(key)) throw new Error(`Student ${studentId} is listed twice for event ${event.id}`);

    this.registrations.set(key, 'going');
    this.graph.connect(
      Portal.key('student', studentId),
      Portal.key('event', event.id),
      LINK.REGISTERED_FOR,
      LINK.HAS_ATTENDEE,
    );
    event.taken++;
  }

  unseat(studentId, event) {
    this.registrations.delete(Portal.registrationKey(studentId, event.id));
    this.graph.disconnect(
      Portal.key('student', studentId),
      Portal.key('event', event.id),
      LINK.REGISTERED_FOR,
      LINK.HAS_ATTENDEE,
    );
    event.taken--;
  }

  /**
   * Registers the signed-in student. They get a seat if one is free. If the
   * event is full, they join the rear of its waiting list (QUEUE).
   */
  register(eventId) {
    const event = this.eventByNumber(eventId);
    if (event === null) return { ok: false, message: `There is no event ${eventId}.` };

    const studentId = this.currentStudentId;
    const key = Portal.registrationKey(studentId, event.id);
    if (this.registrations.has(key)) {
      return { ok: false, message: `You are already on the list for ${event.name}.` };
    }

    if (event.taken < event.seats) {
      this.seat(studentId, event);
      this.undoStack.push({ type: 'register', eventId: event.id, studentId });
      return { ok: true, state: 'going', message: `Registered for ${event.name}.` };
    }

    const line = this.waitingLists.get(event.id);
    line.enqueue(studentId);
    this.registrations.set(key, 'waiting');
    this.undoStack.push({ type: 'joinWaiting', eventId: event.id, studentId });
    return {
      ok: true,
      state: 'waiting',
      position: line.size,
      message: `Joined the waiting list for ${event.name}. You are ${ordinal(line.size)} in line.`,
    };
  }

  /**
   * Gives up the signed-in student's seat. If anyone is waiting, the student at
   * the front of the queue is dequeued and gets the seat.
   */
  cancelRegistration(eventId) {
    const event = this.eventByNumber(eventId);
    const studentId = this.currentStudentId;
    if (event === null || this.statusOf(eventId).state !== 'going') {
      return { ok: false, message: 'You are not registered for that event.' };
    }

    this.unseat(studentId, event);

    const line = this.waitingLists.get(event.id);
    let promoted = null;
    if (!line.isEmpty()) {
      promoted = line.dequeue();
      this.registrations.delete(Portal.registrationKey(promoted, event.id));
      this.seat(promoted, event);
    }

    this.undoStack.push({ type: 'cancel', eventId: event.id, studentId, promoted });
    const passedOn = promoted
      ? ` Your seat went to ${this.studentById(promoted).name}, who was first on the waiting list.`
      : '';
    return { ok: true, promoted, message: `Registration cancelled for ${event.name}.${passedOn}` };
  }

  /** Steps out of a waiting list. Everyone behind moves up one place. */
  leaveWaitingList(eventId) {
    const event = this.eventByNumber(eventId);
    const studentId = this.currentStudentId;
    const status = event === null ? { state: 'none' } : this.statusOf(eventId);
    if (status.state !== 'waiting') {
      return { ok: false, message: 'You are not on that waiting list.' };
    }

    this.waitingLists.get(event.id).remove(studentId);
    this.registrations.delete(Portal.registrationKey(studentId, event.id));
    this.undoStack.push({ type: 'leaveWaiting', eventId: event.id, studentId, position: status.position });
    return { ok: true, message: `Left the waiting list for ${event.name}.` };
  }

  /** GRAPH: the IDs of the students with a seat, read from the event's edges. */
  attendeeIds(eventId) {
    return this.graph
      .neighbours(Portal.key('event', eventId), LINK.HAS_ATTENDEE)
      .map((key) => Portal.parseKey(key).id);
  }

  attendeesOf(eventId) {
    return this.attendeeIds(eventId).map((id) => this.studentById(id));
  }

  /** QUEUE: the students waiting for a seat, front of the line first. */
  waitingFor(eventId) {
    return this.waitingLists.get(eventId).toArray().map((id) => this.studentById(id));
  }

  // -------------------------------------------------------------------- clubs

  enrol(studentId, club) {
    this.members.get(club.id).append(studentId);
    this.graph.connect(
      Portal.key('student', studentId),
      Portal.key('club', club.id),
      LINK.MEMBER_OF,
      LINK.HAS_MEMBER,
    );
  }

  isMember(clubId, studentId = this.currentStudentId) {
    return this.graph.hasEdge(Portal.key('student', studentId), Portal.key('club', clubId), LINK.MEMBER_OF);
  }

  memberCount(clubId) {
    return this.members.get(clubId).size;
  }

  /** LINKED LIST: a club's members from head to tail, which is the order they joined. */
  membersOf(clubId) {
    return this.members.get(clubId).toArray().map((id) => this.studentById(id));
  }

  /** LINKED LIST: the new member is appended at the tail. */
  joinClub(clubId) {
    const club = this.clubById(clubId);
    if (club === null) return { ok: false, message: 'There is no such club.' };
    if (this.isMember(clubId)) return { ok: false, message: `You are already a member of ${club.name}.` };

    this.enrol(this.currentStudentId, club);
    this.undoStack.push({ type: 'joinClub', clubId, studentId: this.currentStudentId });
    return { ok: true, message: `Joined ${club.name}.` };
  }

  /** LINKED LIST: the member's node is unlinked from wherever it is in the list. */
  leaveClub(clubId) {
    const club = this.clubById(clubId);
    const studentId = this.currentStudentId;
    if (club === null || !this.isMember(clubId)) {
      return { ok: false, message: 'You are not a member of that club.' };
    }

    const list = this.members.get(clubId);
    const index = list.indexOf((id) => id === studentId);
    list.remove((id) => id === studentId);
    this.graph.disconnect(
      Portal.key('student', studentId),
      Portal.key('club', clubId),
      LINK.MEMBER_OF,
      LINK.HAS_MEMBER,
    );
    this.undoStack.push({ type: 'leaveClub', clubId, studentId, index });
    return { ok: true, message: `Left ${club.name}.` };
  }

  /** GRAPH: the events a club hosts, soonest first. */
  eventsOfClub(clubId) {
    const events = this.graph
      .neighbours(Portal.key('club', clubId), LINK.HOSTS)
      .map((key) => this.eventByNumber(Portal.parseKey(key).id));
    return mergeSort(events, (a, b) => a.startsAt - b.startsAt).sorted;
  }

  // ------------------------------------------------------------ one student

  /** GRAPH: the events a student has a seat at, soonest first. */
  eventsOfStudent(studentId = this.currentStudentId) {
    const events = this.graph
      .neighbours(Portal.key('student', studentId), LINK.REGISTERED_FOR)
      .map((key) => this.eventByNumber(Portal.parseKey(key).id));
    return mergeSort(events, (a, b) => a.startsAt - b.startsAt).sorted;
  }

  /** The waiting lists a student is on, with their place in each. */
  waitingOfStudent(studentId = this.currentStudentId) {
    return this.eventsByDate
      .filter((event) => this.statusOf(event.id, studentId).state === 'waiting')
      .map((event) => ({ event, position: this.statusOf(event.id, studentId).position }));
  }

  /** GRAPH: the clubs a student belongs to. */
  clubsOfStudent(studentId = this.currentStudentId) {
    return this.graph
      .neighbours(Portal.key('student', studentId), LINK.MEMBER_OF)
      .map((key) => this.clubById(Portal.parseKey(key).id));
  }

  /** HASHING: signs in by student ID. Switching student starts a fresh undo history. */
  signIn(studentId) {
    const id = Portal.cleanStudentId(studentId);
    const student = this.studentById(id);
    if (student === null) return { ok: false, message: `No student has the ID ${id || 'you typed'}.` };

    this.currentStudentId = id;
    this.undoStack.clear();
    return { ok: true, student, message: `Signed in as ${student.name}.` };
  }

  /** HASHING: inserts a new student, then signs in as them. */
  addStudent({ id, name }) {
    const cleanId = Portal.cleanStudentId(id);
    const cleanName = String(name).replace(/\s+/g, ' ').trim();

    if (!/^[A-Z]{2}\d{5}$/.test(cleanId)) {
      return { ok: false, message: 'A student ID is two letters and five digits, such as CS25104.' };
    }
    if (cleanName.length < 2 || cleanName.length > 40) {
      return { ok: false, message: 'Enter a name between 2 and 40 characters long.' };
    }
    const taken = this.studentById(cleanId);
    if (taken !== null) return { ok: false, message: `${cleanId} already belongs to ${taken.name}.` };

    const student = { id: cleanId, name: cleanName };
    this.storeStudent(student);
    this.addedStudents.push({ ...student });
    return this.signIn(cleanId);
  }

  // --------------------------------------------------------------------- undo

  get canUndo() {
    return !this.undoStack.isEmpty();
  }

  /** What an entry on the undo stack did, in words. */
  describeAction(action) {
    const event = action.eventId === undefined ? null : this.eventByNumber(action.eventId);
    const club = action.clubId === undefined ? null : this.clubById(action.clubId);
    switch (action.type) {
      case 'register':
        return `Registered for ${event.name}`;
      case 'joinWaiting':
        return `Joined the waiting list for ${event.name}`;
      case 'cancel':
        return `Cancelled registration for ${event.name}`;
      case 'leaveWaiting':
        return `Left the waiting list for ${event.name}`;
      case 'joinClub':
        return `Joined ${club.name}`;
      case 'leaveClub':
        return `Left ${club.name}`;
      default:
        return 'Unknown action';
    }
  }

  /** STACK: the actions that can be undone, most recent first. */
  undoHistory() {
    return this.undoStack.toArray().map((action) => this.describeAction(action));
  }

  /**
   * STACK: pops the most recent action and reverses it, so the portal is
   * exactly as it was before that action. Actions can only be undone in the
   * reverse of the order they happened, which is what a stack gives.
   */
  undo() {
    const action = this.undoStack.pop();
    if (action === null) return { ok: false, message: 'There is nothing to undo.' };

    const { studentId } = action;
    const event = action.eventId === undefined ? null : this.eventByNumber(action.eventId);
    const club = action.clubId === undefined ? null : this.clubById(action.clubId);

    switch (action.type) {
      case 'register':
        this.unseat(studentId, event);
        return { ok: true, message: `Undone. You are no longer registered for ${event.name}.` };

      case 'joinWaiting':
        this.waitingLists.get(event.id).remove(studentId);
        this.registrations.delete(Portal.registrationKey(studentId, event.id));
        return { ok: true, message: `Undone. You are off the waiting list for ${event.name}.` };

      case 'cancel':
        // If the seat was passed on, that student goes back to the front of the line.
        if (action.promoted) {
          this.unseat(action.promoted, event);
          this.waitingLists.get(event.id).insertAt(1, action.promoted);
          this.registrations.set(Portal.registrationKey(action.promoted, event.id), 'waiting');
        }
        this.seat(studentId, event);
        return { ok: true, message: `Undone. You are registered for ${event.name} again.` };

      case 'leaveWaiting':
        this.waitingLists.get(event.id).insertAt(action.position, studentId);
        this.registrations.set(Portal.registrationKey(studentId, event.id), 'waiting');
        return {
          ok: true,
          message: `Undone. You are back on the waiting list for ${event.name}, ${ordinal(action.position)} in line.`,
        };

      case 'joinClub':
        this.members.get(club.id).remove((id) => id === studentId);
        this.graph.disconnect(
          Portal.key('student', studentId),
          Portal.key('club', club.id),
          LINK.MEMBER_OF,
          LINK.HAS_MEMBER,
        );
        return { ok: true, message: `Undone. You are no longer a member of ${club.name}.` };

      case 'leaveClub':
        this.members.get(club.id).insertAt(action.index, studentId);
        this.graph.connect(
          Portal.key('student', studentId),
          Portal.key('club', club.id),
          LINK.MEMBER_OF,
          LINK.HAS_MEMBER,
        );
        return { ok: true, message: `Undone. You are a member of ${club.name} again.` };

      default:
        return { ok: false, message: 'That action cannot be undone.' };
    }
  }

  // ---------------------------------------------------------- recently viewed

  /**
   * STACK: puts an event on top of the recently viewed stack.
   *
   * A stack can only be reached from the top, so an event that is already in
   * it is dug out with a second stack: pop entries across until the event
   * turns up, drop it, then pop everything back. The same trick removes the
   * oldest entry from the bottom when the stack grows past its limit.
   */
  viewEvent(eventId) {
    const event = this.eventByNumber(eventId);
    if (event === null) return;

    const held = new Stack();
    while (!this.recent.isEmpty() && this.recent.peek() !== event.id) held.push(this.recent.pop());
    if (!this.recent.isEmpty()) this.recent.pop();
    while (!held.isEmpty()) this.recent.push(held.pop());

    this.recent.push(event.id);

    if (this.recent.size > RECENT_LIMIT) {
      while (!this.recent.isEmpty()) held.push(this.recent.pop());
      held.pop(); // the oldest entry
      while (!held.isEmpty()) this.recent.push(held.pop());
    }
  }

  /** STACK: the events opened most recently, newest first. */
  recentlyViewed() {
    return this.recent.toArray().map((id) => this.eventByNumber(id));
  }

  // -------------------------------------------------------------- connections

  /** What a graph node stands for: { key, type, id, name, record }. */
  describe(key) {
    const { type, id } = Portal.parseKey(key);
    const record =
      type === 'club' ? this.clubById(id) : type === 'event' ? this.eventByNumber(id) : this.studentById(id);
    return record === null ? null : { key, type, id: record.id, name: record.name, record };
  }

  /**
   * GRAPH (depth-first search): a club's event trail.
   *
   * Starting at the club, the search follows "hosts" and "leads to" edges as
   * far as they go, trying earlier events first. The result is a tree:
   * { node, children }. For the AI Club it is one straight line,
   * AI Club > AI Workshop > Hackathon > ML Seminar.
   */
  clubTrail(clubId) {
    const startOf = (key) => this.eventByNumber(Portal.parseKey(key).id).startsAt;
    const soonestFirst = (edges) => mergeSort(edges, (a, b) => startOf(a.to) - startOf(b.to)).sorted;

    const tree = this.graph.depthFirstTree(
      Portal.key('club', clubId),
      [LINK.HOSTS, LINK.LEADS_TO],
      soonestFirst,
    );
    if (tree === null) return null;

    const decorate = (branch) => ({
      node: this.describe(branch.key),
      children: branch.children.map(decorate),
    });
    return decorate(tree);
  }

  /** The trail as lists of names, one list for each route from the club to an end of the trail. */
  trailPaths(clubId) {
    const paths = [];
    (function follow(branch, soFar) {
      const path = soFar.concat(branch.node.name);
      if (branch.children.length === 0) paths.push(path);
      for (const child of branch.children) follow(child, path);
    })(this.clubTrail(clubId), []);
    return paths;
  }

  /** GRAPH: the events that lead to this one, and the events it leads to. */
  stepsAround(eventId) {
    const key = Portal.key('event', eventId);
    const toEvents = (label) =>
      this.graph.neighbours(key, label).map((other) => this.eventByNumber(Portal.parseKey(other).id));
    return { before: toEvents(LINK.COMES_AFTER), after: toEvents(LINK.LEADS_TO) };
  }

  /**
   * GRAPH (breadth-first search): the shortest chain between any two clubs,
   * events or students. Returns [{ key, type, name, ..., label }], where label
   * is the relationship that leads to that step, or null when no chain exists.
   */
  connection(fromKey, toKey) {
    const path = this.graph.shortestPath(fromKey, toKey);
    if (path === null) return null;
    return path.map((step) => ({ ...this.describe(step.key), label: step.label }));
  }

  /**
   * GRAPH (breadth-first search): how much of the campus is one step from a
   * node, how much is two steps away, and so on. counts[0] is one step.
   */
  distancesFrom(key) {
    const counts = [];
    for (const { depth } of this.graph.breadthFirst(key)) {
      if (depth > 0) counts[depth - 1] = (counts[depth - 1] || 0) + 1;
    }
    return counts;
  }

  /** GRAPH: everything one step away from a node, grouped by relationship. */
  neighboursOf(key) {
    return Object.values(LINK)
      .map((label) => ({
        label,
        nodes: this.graph.neighbours(key, label).map((other) => this.describe(other)),
      }))
      .filter((group) => group.nodes.length > 0);
  }

  /**
   * GRAPH: events to suggest to a student, found by walking three edges:
   * me -> my events -> the other students going -> the other events they chose.
   * An event scores one point for each of those students who is going to it.
   */
  suggestedEvents(studentId = this.currentStudentId, limit = 4) {
    const me = Portal.key('student', studentId);
    const mine = this.graph.neighbours(me, LINK.REGISTERED_FOR);

    const companions = new HashTable();
    for (const event of mine) {
      for (const other of this.graph.neighbours(event, LINK.HAS_ATTENDEE)) {
        if (other !== me) companions.set(other, true);
      }
    }

    const scores = new HashTable();
    for (const companion of companions.keys()) {
      for (const event of this.graph.neighbours(companion, LINK.REGISTERED_FOR)) {
        const eventId = Portal.parseKey(event).id;
        if (this.registrations.has(Portal.registrationKey(studentId, eventId))) continue;
        scores.set(eventId, (scores.get(eventId) || 0) + 1);
      }
    }

    const ranked = mergeSort(
      scores.entries().map(([eventId, score]) => ({ event: this.eventByNumber(eventId), score })),
      (a, b) => b.score - a.score || a.event.startsAt - b.event.startsAt || a.event.id - b.event.id,
    ).sorted;
    return ranked.slice(0, limit);
  }

  /** GRAPH: events that follow on from one the student is registered for. */
  nextOnTrail(studentId = this.currentStudentId) {
    const steps = [];
    for (const event of this.eventsOfStudent(studentId)) {
      for (const next of this.stepsAround(event.id).after) {
        const listed = this.registrations.has(Portal.registrationKey(studentId, next.id));
        if (!listed && !steps.some((step) => step.event.id === next.id)) steps.push({ event: next, after: event });
      }
    }
    return steps;
  }

  /** GRAPH: clubs that host an event the student is going to, but that they have not joined. */
  suggestedClubs(studentId = this.currentStudentId) {
    const clubs = [];
    for (const event of this.eventsOfStudent(studentId)) {
      const already = this.isMember(event.clubId, studentId) || clubs.some((entry) => entry.club.id === event.clubId);
      if (!already) clubs.push({ club: this.clubById(event.clubId), because: event });
    }
    return clubs;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Portal, LINK, ROOT_CATEGORY, ordinal, wordsOf, matchesWords };
