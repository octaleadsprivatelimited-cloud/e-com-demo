import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useStorefrontConfig } from "@/lib/storefront-config";

export function PortalShell({
  title,
  subtitle,
  nav,
  active,
  onNavigate,
  portalPath = "/admin",
  userName = "Maya Kapoor",
  userRole = "Store administrator",
  children,
}: {
  title: string;
  subtitle: string;
  nav: Array<[string, ReactNode]>;
  active: string;
  onNavigate?: (label: string) => void;
  portalPath?: "/admin" | "/account";
  userName?: string;
  userRole?: string;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const storefront = useStorefrontConfig();
  const storeInitials = storefront.storeName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userInitials = userName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const brand = (
    <>
      {storefront.logoUrl ? (
        <img src={storefront.logoUrl} alt={storefront.storeName} />
      ) : (
        <>
          <i>{storeInitials}</i>
          <span>{storefront.storeName}</span>
        </>
      )}
    </>
  );
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
            {brand}
          </a>
          <button
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X />
          </button>
        </div>
        <a href="/" className="portal-logo portal-desktop-logo">
          {brand}
        </a>
        <div className="portal-nav">
          {nav.map(([label, icon]) => (
            <Link
              aria-label={label}
              to={portalPath}
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
          <div>{userInitials}</div>
          <span>
            <b>{userName}</b>
            <small>{userRole}</small>
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
