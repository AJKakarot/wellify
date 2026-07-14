"use client";

import { DashboardIcon, MealsIcon, PlusIcon, ChatIcon, ProgressIcon } from "./Icons";

interface BottomNavProps {
  active: "dashboard" | "meals" | "add" | "chat" | "progress";
}

const TABS = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", Icon: DashboardIcon },
  { key: "meals", label: "Meals", href: "/meals", Icon: MealsIcon },
  { key: "add", label: "Add", href: "/add", Icon: PlusIcon },
  { key: "chat", label: "Chat", href: "/chat", Icon: ChatIcon },
  { key: "progress", label: "Progress", href: "/progress", Icon: ProgressIcon },
] as const;

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-xl rounded-t-[2rem] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        if (tab.key === "add") {
          return (
            <a key={tab.key} className="flex flex-col items-center -mt-10" href={tab.href}>
              <div className="w-14 h-14 bg-primary-gradient rounded-full flex items-center justify-center text-white shadow-xl">
                <PlusIcon className="w-7 h-7" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold mt-1 text-primary">
                {tab.label}
              </span>
            </a>
          );
        }
        return (
          <a
            key={tab.key}
            className={`flex flex-col items-center transition-colors ${
              isActive ? "text-primary scale-105" : "text-stone-400 opacity-60 hover:text-primary"
            }`}
            href={tab.href}
          >
            <tab.Icon className="w-6 h-6" />
            <span className="text-[10px] uppercase tracking-widest font-bold mt-1">{tab.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
