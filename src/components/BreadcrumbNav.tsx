import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  url: string;
  active?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (url: string) => void;
}

export const BreadcrumbNav: React.FC<BreadcrumbNavProps> = ({ items, onNavigate }) => {
  return (
    <nav aria-label="Breadcrumb" className="px-4 py-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium overflow-x-auto select-none">
      <a
        href="/path"
        onClick={(e) => {
          e.preventDefault();
          onNavigate('/path');
        }}
        className="flex items-center gap-1 hover:text-duo-blue transition-colors rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="Home Reading Path"
      >
        <Home className="w-3.5 h-3.5 text-duo-blue shrink-0" />
        <span>Path</span>
      </a>

      {items.map((item, index) => {
        const isLast = index === items.length - 1 || item.active;
        return (
          <React.Fragment key={item.url + index}>
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" aria-current="page">
                {item.name}
              </span>
            ) : (
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.url);
                }}
                className="hover:text-duo-blue transition-colors rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 truncate max-w-[150px]"
              >
                {item.name}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
