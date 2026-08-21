import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PortalShell({
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  children,
}: {
  title: string;
  subtitle: string;
  nav: Array<[string, ReactNode]>;
  active: string;
  onNavigate?: (label: string) => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`portal${menuOpen ? " portal-drawer-open" : ""}`}>
      {menuOpen && (
        <button
          className="portal-drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside>
        <div className="portal-mobile-head">
          <a href="/" className="portal-logo">
            <i>AR</i>
            <span>
              ASTER <b>&</b> ROW
            </span>
          </a>
          <button
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X />
          </button>
        </div>
        <a href="/" className="portal-logo portal-desktop-logo">
          <i>AR</i>
          <span>
            ASTER <b>&</b> ROW
          </span>
        </a>
        <div className="portal-nav">
          {nav.map(([label, icon]) => (
            <Link
              aria-label={label}
              to="/admin"
              search={{ tab: label }}
              preload="intent"
              onClick={() => {
                onNavigate?.(label);
                setMenuOpen(false);
              }}
              className={label === active ? "active" : ""}
              key={label}
            >
              {icon}
              <span>{label}</span>
              {label === active && <i />}
            </Link>
          ))}
        </div>
        <div className="portal-user">
          <div>MK</div>
          <span>
            <b>Maya Kapoor</b>
            <small>Store administrator</small>
          </span>
          <ChevronDown />
        </div>
      </aside>
      <div className="portal-main">
        <header>
          <button
            className="portal-menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="portal-tools">
            <label>
              <Search />
              <input placeholder="Search anything…" />
            </label>
            <button type="button" aria-label="Notifications">
              <Bell />
              <i />
            </button>
            <a href="/" title="View store" aria-label="View store">
              <ShoppingBag />
            </a>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
