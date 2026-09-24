import { useEffect, useState } from "react";
import { weeklyChanges } from "./changelog";
import { FEATURES } from "./features";

// "Unread" tracking for What's new (2026-09-25 feedback): a bell shows while there are updates
// the signed-in user hasn't opened What's new to read, and clears once they do. Kept in this
// browser (per email) -- it is only a reminder, not data worth a database table, so on a second
// device the bell simply shows again until What's new is opened there too.
//
// What counts: entries from this week and last week that THIS build ships and this user's role
// and scope can see (exactly what the What's new page lists) and whose id isn't in the seen list.
const RANK = { station: 0, region: 1, manager: 2, admin: 3 };
const EVENT = "whatsnew-changed";
const MAX_SEEN = 300;

export const entryId = (e) => `${e.date}|${e.title}`;

const keyFor = (me) => `whats-new-seen-${me.email}`;

function readSeen(me) {
  try {
    return new Set(JSON.parse(localStorage.getItem(keyFor(me)) || "[]"));
  } catch {
    return new Set();
  }
}

function recentEntries(me) {
  const rank = RANK[me.role] ?? 0;
  const wide = me.scope_type === "all" || (me.scope_values || []).length > 1;
  return weeklyChanges({ features: FEATURES, rank, wide })
    .slice(0, 2)
    .flatMap((w) => w.items);
}

export function unreadEntries(me) {
  if (!me?.email) return [];
  const seen = readSeen(me);
  return recentEntries(me).filter((e) => !seen.has(entryId(e)));
}

// Opening What's new counts as reading everything it currently lists.
export function markWhatsNewRead(me) {
  if (!me?.email) return;
  const seen = readSeen(me);
  recentEntries(me).forEach((e) => seen.add(entryId(e)));
  try {
    localStorage.setItem(keyFor(me), JSON.stringify([...seen].slice(-MAX_SEEN)));
  } catch {
    /* private browsing / storage blocked -- the bell just comes back next visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

// Number of unread updates for `me`, live: re-evaluates when What's new is opened anywhere in the app.
export function useWhatsNewUnread(me) {
  const email = me?.email;
  const role = me?.role;
  const scopeType = me?.scope_type;
  const scopeCount = (me?.scope_values || []).length;
  const [count, setCount] = useState(() => unreadEntries(me).length);
  useEffect(() => {
    const update = () => setCount(unreadEntries(me).length);
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, [email, role, scopeType, scopeCount]);
  return count;
}
