'use strict';

/**
 * Starts the site: builds the portal, shows the page named in the address
 * bar, and turns clicks and typing into calls on the portal.
 */

const STORAGE_KEY = 'noticeboard.v1';
const TOAST_MS = 8000;

const PAGE_TITLES = {
  events: 'Events',
  clubs: 'Clubs',
  club: 'Club',
  registrations: 'My registrations',
  connections: 'Connections',
  structures: 'Data structures',
};

/** What the visitor has chosen on each page. The portal itself knows nothing about the screen. */
const ui = {
  route: 'events',
  clubId: null,
  openEventId: null,
  filters: { when: 'any', categoryId: ROOT_CATEGORY, query: '', sortBy: 'date' },
  numberLookup: null,
  clubQuery: '',
  connect: { from: 'club:drama', to: 'event:407', explore: 'club:ai' },
  structures: { word: 'workshop', clubId: 'ai', queueEventId: 512, number: 407, studentId: '' },
};

let portal;
let toastTimer = null;

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------- saving

function buildPortal(state) {
  return new Portal({
    categories: SAMPLE_CATEGORIES,
    clubs: SAMPLE_CLUBS,
    events: SAMPLE_EVENTS,
    links: SAMPLE_EVENT_LINKS,
    students: SAMPLE_STUDENTS,
    state,
    studentId: DEMO_STUDENT.id,
  });
}

/** Rebuilds the portal from what this browser saved, or from the sample data. */
function loadPortal() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.version === 1) return buildPortal(saved);
  } catch (error) {
    // Storage is unavailable, or what was saved no longer fits the events. Start again from the sample.
  }
  return buildPortal(createSampleState());
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portal.snapshot()));
  } catch (error) {
    // The site still works without storage. Changes just will not survive a reload.
  }
}

// ------------------------------------------------------------------ drawing

function readRoute() {
  const [name, id] = location.hash.replace(/^#/, '').split('/');
  if (name === 'club' && id) return { route: 'club', clubId: id };
  if (Object.hasOwn(PAGE_TITLES, name) && name !== 'club') return { route: name, clubId: null };
  return { route: 'events', clubId: null };
}

function showRoute({ moveFocus = true } = {}) {
  Object.assign(ui, readRoute());

  for (const section of document.querySelectorAll('[data-view]')) {
    section.hidden = section.dataset.view !== ui.route;
  }
  for (const link of document.querySelectorAll('[data-nav]')) {
    const current = link.dataset.nav === (ui.route === 'club' ? 'clubs' : ui.route);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  render();

  const club = ui.route === 'club' ? portal.clubById(ui.clubId) : null;
  document.title = `${club ? club.name : PAGE_TITLES[ui.route]} | Noticeboard`;

  if (moveFocus) {
    window.scrollTo(0, 0);
    $('main').focus({ preventScroll: true });
  }
}

function render() {
  const student = portal.student;
  redraw($('who-name'), student.name);
  redraw($('who-id'), student.id);

  const mine = portal.eventsOfStudent().length + portal.waitingOfStudent().length;
  redraw($('nav-count'), mine > 0 ? String(mine) : null);

  const pages = {
    events: renderEventsView,
    clubs: renderClubsView,
    club: renderClubPage,
    registrations: renderRegistrationsView,
    connections: renderConnectionsView,
    structures: renderStructuresView,
  };
  pages[ui.route](portal, ui);

  if (ui.openEventId !== null) {
    redraw($('event-sheet'), renderEventSheet(portal, portal.eventByNumber(ui.openEventId)));
  }
}

// ------------------------------------------------------------------- toasts

/** Shows a short message at the bottom of the screen, with an Undo button when there is something to undo. */
function toast(message, undoable) {
  const box = $('toast');
  const undo = $('toast-undo');
  if (document.activeElement === undo && !undoable) $('toast-text').focus();

  // An open dialog covers the rest of the page, so the toast has to sit inside it to be seen and used.
  const host = document.querySelector('dialog[open]') || document.body;
  if (box.parentElement !== host) host.append(box);

  $('toast-text').textContent = message;
  undo.hidden = !undoable;
  box.classList.add('is-showing');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, TOAST_MS);
}

function hideToast() {
  // Leave it up while someone is using it.
  if ($('toast').contains(document.activeElement)) {
    toastTimer = setTimeout(hideToast, TOAST_MS);
    return;
  }
  dismissToast();
}

/** Takes the toast down at once. A dialog that opens would otherwise leave it stranded behind the dimmed page. */
function dismissToast() {
  clearTimeout(toastTimer);
  $('toast').classList.remove('is-showing');
  $('toast-undo').hidden = true;
}

/** Saves, redraws and reports the outcome of something the visitor did. */
function finish(result, undoable = true) {
  save();
  render();
  toast(result.message, undoable && result.ok);
}

// ------------------------------------------------------------------ dialogs

function openEvent(eventId) {
  const event = portal.eventByNumber(eventId);
  if (event === null) return;

  portal.viewEvent(event.id);
  save();
  ui.openEventId = event.id;
  render();

  const dialog = $('event-dialog');
  if (!dialog.open) {
    dismissToast();
    dialog.showModal();
  }
  dialog.scrollTop = 0;
}

function openStudentDialog() {
  $('sign-in-note').textContent = '';
  $('add-student-note').textContent = '';
  redraw($('student-current'), `${portal.student.name}, ${portal.student.id}`);

  // A few students to try, picked from the array by position.
  const samples = [10, 27, 32, 53, 0].map((index) => portal.students[index]).filter((student) => student.id !== portal.currentStudentId);
  redraw(
    $('sample-ids'),
    samples.slice(0, 4).map((student) =>
      h('button', { type: 'button', class: 'chip', 'data-action': 'sign-in-as', 'data-id': student.id }, student.id, h('span', { class: 'chip__note' }, student.name)),
    ),
  );

  dismissToast();
  $('student-dialog').showModal();
  $('sign-in-id').focus();
}

function closeDialogs() {
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
}

function signIn(result) {
  if (!result.ok) return false;
  ui.structures.studentId = portal.currentStudentId;
  $('try-student').value = portal.currentStudentId;
  closeDialogs();
  finish(result, false);
  return true;
}

// ------------------------------------------------------------------ actions

const actions = {
  'open-event': (element) => openEvent(Number(element.dataset.id)),
  register: (element) => finish(portal.register(Number(element.dataset.id))),
  'cancel-registration': (element) => finish(portal.cancelRegistration(Number(element.dataset.id))),
  'leave-waiting': (element) => finish(portal.leaveWaitingList(Number(element.dataset.id))),
  'join-club': (element) => finish(portal.joinClub(element.dataset.id)),
  'leave-club': (element) => finish(portal.leaveClub(element.dataset.id)),
  undo: () => finish(portal.undo(), false),

  'pick-category': (element) => {
    ui.filters.categoryId = element.dataset.id;
    setCategoriesOpen(false);
    render();
  },
  'toggle-categories': () => setCategoriesOpen($('categories').dataset.open !== 'true'),
  'clear-filters': () => {
    ui.filters = { when: 'any', categoryId: ROOT_CATEGORY, query: '', sortBy: ui.filters.sortBy };
    $('search-input').value = '';
    $('when-select').value = 'any';
    render();
    $('search-input').focus();
  },
  'clear-club-search': () => {
    ui.clubQuery = '';
    $('club-search').value = '';
    render();
    $('club-search').focus();
  },

  'open-student': openStudentDialog,
  'sign-in-as': (element) => signIn(portal.signIn(element.dataset.id)),
  'close-dialog': closeDialogs,

  'explore-node': (element) => {
    ui.connect.explore = element.dataset.key;
    render();
    $('explore-title').scrollIntoView({ block: 'start', behavior: 'auto' });
    $('explore-node').focus({ preventScroll: true });
  },

  jump: (element) => {
    const target = $(element.dataset.target);
    target.scrollIntoView({ block: 'start', behavior: 'auto' });
    target.focus({ preventScroll: true });
  },

  'reset-data': () => {
    const sure = window.confirm(
      'Put the sample data back? Your registrations, clubs and any student you added will be cleared from this browser.',
    );
    if (!sure) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Nothing was saved, so there is nothing to remove.
    }
    portal = buildPortal(createSampleState());
    ui.openEventId = null;
    ui.numberLookup = null;
    ui.structures.studentId = portal.currentStudentId;
    $('try-student').value = portal.currentStudentId;
    render();
    toast('The sample data is back.', false);
  },
};

function setCategoriesOpen(open) {
  $('categories').dataset.open = String(open);
  $('categories-toggle').setAttribute('aria-expanded', String(open));
}

// ------------------------------------------------------------------- wiring

function wire() {
  document.addEventListener('click', (event) => {
    const element = event.target.closest('[data-action]');
    if (element === null) return;
    const action = actions[element.dataset.action];
    if (action) action(element);
  });

  window.addEventListener('hashchange', () => {
    closeDialogs();
    showRoute();
  });

  // Events page.
  $('events-toolbar').addEventListener('submit', (event) => event.preventDefault());
  $('search-input').addEventListener('input', (event) => {
    ui.filters.query = event.target.value;
    render();
  });
  $('when-select').addEventListener('change', (event) => {
    ui.filters.when = event.target.value;
    render();
  });
  $('sort-select').addEventListener('change', (event) => {
    ui.filters.sortBy = event.target.value;
    render();
  });
  $('number-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const typed = $('number-input').value.trim();
    if (!/^\d+$/.test(typed)) {
      ui.numberLookup = null;
      redraw($('number-result'), 'Enter an event number, such as 512.');
      return;
    }
    const number = Number(typed);
    ui.numberLookup = { number, ...portal.findEventNumber(number) };
    if (ui.numberLookup.event !== null) openEvent(number);
    else render();
  });

  // Clubs page.
  $('club-search-form').addEventListener('submit', (event) => event.preventDefault());
  $('club-search').addEventListener('input', (event) => {
    ui.clubQuery = event.target.value;
    render();
  });

  // Connections page.
  for (const [id, field] of [
    ['connect-from', 'from'],
    ['connect-to', 'to'],
    ['explore-node', 'explore'],
  ]) {
    $(id).addEventListener('change', (event) => {
      ui.connect[field] = event.target.value;
      render();
    });
  }
  $('connect-form').addEventListener('submit', (event) => event.preventDefault());

  // Data structures page.
  for (const form of document.querySelectorAll('.try')) form.addEventListener('submit', (event) => event.preventDefault());
  $('try-word').addEventListener('input', (event) => {
    ui.structures.word = event.target.value;
    render();
  });
  $('list-club').addEventListener('change', (event) => {
    ui.structures.clubId = event.target.value;
    render();
  });
  $('queue-event').addEventListener('change', (event) => {
    ui.structures.queueEventId = Number(event.target.value);
    render();
  });
  $('try-number').addEventListener('input', (event) => {
    const typed = event.target.value.trim();
    ui.structures.number = /^\d+$/.test(typed) ? Number(typed) : null;
    render();
  });
  $('try-student').addEventListener('input', (event) => {
    ui.structures.studentId = event.target.value;
    render();
  });

  // Switching student.
  $('sign-in-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const result = portal.signIn($('sign-in-id').value);
    if (signIn(result)) $('sign-in-id').value = '';
    else $('sign-in-note').textContent = result.message;
  });
  $('add-student-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const result = portal.addStudent({ id: $('new-student-id').value, name: $('new-student-name').value });
    if (signIn(result)) event.target.reset();
    else $('add-student-note').textContent = result.message;
  });

  // Dialogs: a click on the dimmed area outside the box closes it.
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('close', () => document.body.append($('toast')));
  }
  $('event-dialog').addEventListener('close', () => {
    ui.openEventId = null;
  });
}

function start() {
  portal = loadPortal();
  ui.structures.studentId = portal.currentStudentId;
  $('try-student').value = portal.currentStudentId;

  wire();
  showRoute({ moveFocus: false });
}

start();
