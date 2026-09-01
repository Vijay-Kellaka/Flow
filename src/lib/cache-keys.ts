export const cacheKeys = {
  dashboard: (userId: string) => `flow:dashboard:${userId}`,
  expenses: (userId: string, range = "all") => `flow:expenses:${userId}:${range}`,
  tasks: (userId: string) => `flow:tasks:${userId}`,
  goals: (userId: string) => `flow:goals:${userId}`,
  bookmarks: (userId: string) => `flow:bookmarks:${userId}`,
  activity: (userId: string) => `flow:activity:${userId}`,
};
