export type WidgetSize = "small" | "medium" | "large";

export type DashboardWidget = {
  id: string;
  type: string;
  size: WidgetSize;
  visible: boolean;
  config: Record<string, unknown>;
};

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "tasks", type: "tasks", size: "medium", visible: true, config: {} },
  { id: "expenses", type: "expenses", size: "medium", visible: true, config: { range: "today" } },
  { id: "goals", type: "goals", size: "medium", visible: true, config: {} },
  { id: "journal", type: "journal", size: "medium", visible: true, config: {} },
  { id: "activity", type: "activity", size: "large", visible: true, config: {} },
  { id: "bookmarks", type: "bookmarks", size: "medium", visible: false, config: {} },
  { id: "analytics", type: "analytics", size: "large", visible: false, config: { range: "month" } },
];
