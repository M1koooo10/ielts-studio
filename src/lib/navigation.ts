import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ClipboardList,
  LibraryBig,
  NotebookTabs,
  Gamepad2,
  ChartNoAxesColumnIncreasing,
  BookMarked,
  Sparkles,
  Settings2,
  Headphones,
  Mic,
  PenLine,
} from "lucide-react";

export const navGroups = [
  {
    title: "Подготовка",
    items: [
      { href: "/", label: "Обзор", icon: LayoutDashboard },
      { href: "/study-plan", label: "Учебный план", icon: CalendarDays },
      { href: "/practice", label: "Практика", icon: BookOpen },
      { href: "/mock-tests", label: "Пробные тесты", icon: ClipboardList },
    ],
  },
  {
    title: "Инструменты",
    items: [
      { href: "/grammar", label: "Grammar Lab", icon: LibraryBig },
      { href: "/ai-tutor", label: "AI Tutor", icon: Sparkles },
      { href: "/vocabulary", label: "Словарь", icon: NotebookTabs },
      { href: "/arcade", label: "Аркада", icon: Gamepad2 },
    ],
  },
  {
    title: "Прогресс",
    items: [
      {
        href: "/analytics",
        label: "Аналитика",
        icon: ChartNoAxesColumnIncreasing,
      },
      { href: "/mistakes", label: "Работа над ошибками", icon: BookMarked },
    ],
  },
];
export const settingsNav = {
  href: "/settings",
  label: "Настройки",
  icon: Settings2,
};
export const skills = [
  { key: "reading", title: "Reading", label: "Чтение", icon: BookOpen },
  {
    key: "listening",
    title: "Listening",
    label: "Аудирование",
    icon: Headphones,
  },
  { key: "writing", title: "Writing", label: "Письмо", icon: PenLine },
  { key: "speaking", title: "Speaking", label: "Устная речь", icon: Mic },
] as const;
export const flatNav = [...navGroups.flatMap((g) => g.items), settingsNav];
