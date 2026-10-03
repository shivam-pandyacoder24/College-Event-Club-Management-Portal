'use strict';

/** Small helpers shared by the pages. */

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Creates an element: h('button', { class: 'button', 'data-id': 7 }, 'Register')
 * Text children are added as text, never as HTML, so a name typed by a visitor is safe to show.
 */
function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  fill(element, attributes, children);
  return element;
}

/** The same as h, for the elements of an SVG drawing. */
function svg(tag, attributes = {}, ...children) {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  fill(element, attributes, children);
  return element;
}

function fill(element, attributes, children) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === false || child === null || child === undefined) continue;
    element.append(child);
  }
}

const lastDrawn = new WeakMap();

/**
 * Replaces a container's content, but only when the new content is different.
 * Leaving unchanged content alone means a button is never swapped out from
 * under a click, and keyboard focus stays on the same control after a redraw.
 */
function redraw(container, ...children) {
  const fresh = document.createElement('div');
  fresh.append(...children.flat(Infinity).filter(Boolean));

  const html = fresh.innerHTML;
  if (lastDrawn.get(container) === html) return;
  lastDrawn.set(container, html);

  const hadFocus = container.contains(document.activeElement);
  const selector = hadFocus ? focusSelector(document.activeElement) : null;
  container.replaceChildren(...fresh.childNodes);
  if (!hadFocus) return;

  // Put focus back on the same control, or on the container if that control is gone.
  const again = selector ? container.querySelector(selector) : null;
  if (again) {
    again.focus({ preventScroll: true });
  } else {
    container.setAttribute('tabindex', '-1');
    container.focus({ preventScroll: true });
  }
}

/** A selector that finds the same control again after its container is redrawn. */
function focusSelector(element) {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const { focus, action, id } = element.dataset;
  // data-focus names a control whose action changes, such as Register turning into Cancel registration.
  if (focus) return `[data-focus="${CSS.escape(focus)}"]`;
  if (!action) return null;
  return id === undefined
    ? `[data-action="${CSS.escape(action)}"]`
    : `[data-action="${CSS.escape(action)}"][data-id="${CSS.escape(id)}"]`;
}

/** plural(1, 'seat') -> "1 seat", plural(4, 'seat') -> "4 seats", plural(2, 'person', 'people') -> "2 people" */
function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "2:00 pm" */
function formatTime(date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`;
}

/** "Wed 7 Oct" */
function formatDay(date) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "Wed 7 Oct, 2:00 pm" */
function formatWhen(date) {
  return `${formatDay(date)}, ${formatTime(date)}`;
}

/** "today", "tomorrow" or "in 4 days", counted in whole days from the portal's today. */
function daysAway(date, today) {
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - today.getTime()) / 86400000,
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** "AI25042" -> "Artificial Intelligence, 2025 batch" */
function describeStudentId(id) {
  const department = DEPARTMENTS[id.slice(0, 2)] || `${id.slice(0, 2)} department`;
  return `${department}, 20${id.slice(2, 4)} batch`;
}
