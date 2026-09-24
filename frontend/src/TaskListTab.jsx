import { useState } from "react";
import BellBadge from "./components/BellBadge";
import DueDot from "./components/DueDot";
import SegmentedControl from "./components/SegmentedControl";
import UrgentTnTab from "./UrgentTnTab";
import FollowUpTab from "./FollowUpTab";
import TodoTab from "./TodoTab";
import TaskAssignedTab from "./TaskAssignedTab";

// The "Task List" tab (2026-09-25): everything someone has to keep track of or chase, in four
// sub-tabs -- Urgent TN (the original tab), Email / Gchat follow-ups, a personal To Do List, and
// Task Assigned (tasks handed to other users). Each sub-tab carries its own bell.
export default function TaskListTab({ me, refreshTick, notifCounts }) {
  const storageKey = `task-list-sub-${me.email}`;
  const [sub, setSubState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (["urgent", "followups", "todos", "tasks"].includes(saved)) return saved;
    } catch {
      /* private browsing / storage blocked -- start on Urgent TN */
    }
    return "urgent";
  });
  const setSub = (key) => {
    setSubState(key);
    try {
      localStorage.setItem(storageKey, key);
    } catch {
      /* the choice just won't persist */
    }
  };

  const n = notifCounts || {};
  // Red bell = needs an answer / reminder rang; amber dot = something is due within 2 days or overdue.
  const label = (text, count, dueSoon = 0) => (
    <>
      {text}
      <BellBadge count={count} />
      <DueDot count={dueSoon} />
    </>
  );

  return (
    <div className="space-y-3">
      <SegmentedControl
        options={[
          { key: "urgent", label: label("Urgent TN", (n.urgent_notify || 0) + (n.urgent_owner_updates || 0)) },
          { key: "followups", label: label("Email / Gchat", n.followups_notify || 0, n.followups_due_soon || 0) },
          { key: "tasks", label: label("Task Assigned", n.tasks_notify || 0, n.tasks_due_soon || 0) },
          { key: "todos", label: label("To Do List", n.todos_notify || 0, n.todos_due_soon || 0) },
        ]}
        value={sub}
        onChange={setSub}
      />
      {sub === "urgent" && <UrgentTnTab me={me} refreshTick={refreshTick} />}
      {sub === "followups" && <FollowUpTab me={me} refreshTick={refreshTick} />}
      {sub === "tasks" && <TaskAssignedTab me={me} refreshTick={refreshTick} />}
      {sub === "todos" && <TodoTab me={me} refreshTick={refreshTick} />}
    </div>
  );
}
