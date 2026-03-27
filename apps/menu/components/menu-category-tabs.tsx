"use client";

/**
 * MenuCategoryTabs — horizontal scroll-spy category tab bar.
 * Sticky below the header. Uses IntersectionObserver to update
 * the active tab as the user scrolls through category sections.
 */

import { useEffect, useRef } from "react";

export interface TabCategory {
  id: string;
  name: string;
}

interface MenuCategoryTabsProps {
  categories: TabCategory[];
  activeCategoryId: string | null;
  onTabClick: (categoryId: string) => void;
}

export function MenuCategoryTabs({
  categories,
  activeCategoryId,
  onTabClick,
}: MenuCategoryTabsProps) {
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Scroll the active tab into view when it changes via scroll-spy
  useEffect(() => {
    if (!activeCategoryId || !tabBarRef.current) return;
    const activeTab = tabBarRef.current.querySelector(
      `[data-tab="${activeCategoryId}"]`
    ) as HTMLElement | null;
    if (activeTab) {
      activeTab.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [activeCategoryId]);

  function handleClick(categoryId: string) {
    onTabClick(categoryId);
    // Scroll to the section
    const section = document.getElementById(`category-${categoryId}`);
    if (section) {
      const offset = 112; // header (64px) + tab bar (48px)
      const top = section.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  if (categories.length === 0) return null;

  return (
    <div
      ref={tabBarRef}
      className="sticky top-16 z-20 bg-white border-b border-stone-100 overflow-x-auto scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex min-w-max">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              data-tab={cat.id}
              type="button"
              onClick={() => handleClick(cat.id)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive
                  ? "border-[--color-primary] text-[--color-primary]"
                  : "border-transparent text-stone-500 hover:text-stone-700"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
