export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_at: number | null;
  next_remind_at: number | null;
  status: TaskStatus;
  created_at: number;
  updated_at: number;
  source: string;
}
