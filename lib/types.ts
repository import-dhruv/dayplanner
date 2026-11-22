export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type Status = "not_started" | "in_progress" | "in_review" | "completed" | "cancelled";
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly";

export interface User {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
  timezone: string;
  onboarded: boolean;
}

export interface Preferences {
  theme: "light" | "dark" | "system";
  weekStart: number;
  workStart: string;
  workEnd: string;
  defaultCalendarView: "day" | "week" | "month" | "agenda";
  defaultPage: string;
  reminderMinutes: number;
  showWeekends: boolean;
  compactMode: boolean;
  focusMessage: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  startDate: string | null;
  targetDate: string | null;
  notes: string;
  status: string;
  sortOrder: number;
}

export interface Tag { id: number; name: string; color: string }

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  kind: "subtask" | "checklist";
  sortOrder: number;
}

export interface Attachment {
  id: number;
  taskId: number;
  filename: string;
  url: string;
  size: number;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  categoryId: number | null;
  projectId: number | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  dueDate: string | null;
  dueTime: string | null;
  estimatedMinutes: number;
  actualMinutes: number;
  isAllDay: boolean;
  isDailyPriority: boolean;
  priorityRank: number | null;
  sortOrder: number;
  recurrence: Recurrence;
  recurrenceEndDate: string | null;
  reminderMinutes: number | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  subtasks: Subtask[];
  tagIds: number[];
  dependencyIds: number[];
  attachments: Attachment[];
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string;
  color: string;
  categoryId: number | null;
  projectId: number | null;
  taskId: number | null;
  recurrence: Recurrence;
  recurrenceEndDate: string | null;
  reminderMinutes: number | null;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  folder: string;
  tagNames: string[];
  isPinned: boolean;
  taskId: number | null;
  projectId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DailyReview {
  id: number;
  date: string;
  completedText: string;
  notCompletedText: string;
  achievements: string;
  moveToTomorrow: string;
  productivityRating: number;
  reflection: string;
  updatedAt: string | null;
}

export interface TimeEntry {
  id: number;
  taskId: number | null;
  minutes: number;
  note: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface Reminder {
  id: number;
  taskId: number | null;
  eventId: number | null;
  remindAt: string;
  minutesBefore: number;
  message: string;
  channel: string;
  isRead: boolean;
}

export interface BootstrapData {
  user: User;
  preferences: Preferences;
  categories: Category[];
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
  events: CalendarEvent[];
  notes: Note[];
  reviews: DailyReview[];
  timeEntries: TimeEntry[];
  reminders: Reminder[];
}

export interface SearchResult {
  kind: string;
  id: number;
  title: string;
  subtitle: string;
  href: string;
}

export interface Analytics {
  daily: { date: string; completed: number; created: number }[];
  weekly: { start: string; completed: number }[];
  monthly: { month: string; completed: number }[];
  byCategory: { name: string; minutes: number }[];
  byWeekday: { day: string; count: number }[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    trackedMinutes: number;
  };
}

export type TaskInput = Partial<Omit<Task, "id" | "subtasks" | "tagIds" | "attachments" | "createdAt" | "updatedAt" | "completedAt">> & {
  subtasks?: { title: string; isCompleted?: boolean; kind?: string }[];
  tagIds?: number[];
};

export type EventInput = Partial<Omit<CalendarEvent, "id">> & {
  startAt: string;
  endAt: string;
  title: string;
};
