import { open } from '@op-engineering/op-sqlite';
import type { DB } from '@op-engineering/op-sqlite';
import type { Task } from '../types';

let _db: DB | null = null;

function getDB(): DB {
  if (!_db) {
    _db = open({ name: 'nudgecore.db' });
  }
  return _db;
}

export function initDB(): void {
  const db = getDB();
  db.executeSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_at INTEGER,
      next_remind_at INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'phone'
    )
  `);
  db.executeSync(
    `CREATE INDEX IF NOT EXISTS idx_tasks_status_remind ON tasks (status, next_remind_at)`
  );
}

export async function insertTask(task: Task): Promise<void> {
  const db = getDB();
  await db.execute(
    `INSERT INTO tasks (id, title, description, due_at, next_remind_at, status, created_at, updated_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.description,
      task.due_at,
      task.next_remind_at,
      task.status,
      task.created_at,
      task.updated_at,
      task.source,
    ]
  );
}

export async function markTaskDone(id: string): Promise<void> {
  const db = getDB();
  await db.execute(
    `UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`,
    [Date.now(), id]
  );
}

export async function snoozeTask(id: string, nextRemindAt: number): Promise<void> {
  const db = getDB();
  await db.execute(
    `UPDATE tasks SET next_remind_at = ?, updated_at = ? WHERE id = ?`,
    [nextRemindAt, Date.now(), id]
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDB();
  await db.execute(`DELETE FROM tasks WHERE id = ?`, [id]);
}

export async function getPendingTasks(): Promise<Task[]> {
  const db = getDB();
  const result = await db.execute(
    `SELECT * FROM tasks WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return result.rows as unknown as Task[];
}

export async function getNextTask(): Promise<Task | null> {
  const db = getDB();
  const now = Date.now();

  // Priority 1: time-sensitive tasks that are due and not snoozed past now
  const dueResult = await db.execute(
    `SELECT * FROM tasks
     WHERE status = 'pending'
       AND due_at IS NOT NULL
       AND due_at <= ?
       AND (next_remind_at IS NULL OR next_remind_at <= ?)
     ORDER BY due_at ASC
     LIMIT 1`,
    [now, now]
  );
  if (dueResult.rows.length > 0) {
    return dueResult.rows[0] as unknown as Task;
  }

  // Priority 2: anytime tasks eligible now (not snoozed or snooze expired)
  const anytimeResult = await db.execute(
    `SELECT * FROM tasks
     WHERE status = 'pending'
       AND due_at IS NULL
       AND (next_remind_at IS NULL OR next_remind_at <= ?)`,
    [now]
  );
  if (anytimeResult.rows.length === 0) {
    return null;
  }

  const idx = Math.floor(Math.random() * anytimeResult.rows.length);
  return anytimeResult.rows[idx] as unknown as Task;
}
