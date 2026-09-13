"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  FileText,
  LogOut,
  type LucideIcon,
} from "lucide-react";

const dashboardLinks: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { label: "Documents", href: "/dashboard/documents", icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);

  function handleLogout() {
    sessionStorage.removeItem("token");
    router.push("/login");
  }

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className={`${
        collapsed ? "w-20" : "w-56"
      } h-screen sticky top-0 bg-[#B1C9DC] flex flex-col p-4 shrink-0 transition-all duration-200`}
    >
      <div className="flex items-center justify-center mb-4">
        <Image
          src="/engsoc-logo.png"
          alt="EngSoc Dashboard"
          width={38}
          height={38}
          className="shrink-0 rounded-md"
        />
      </div>

      <nav className="flex flex-col flex-1 mt-2">
        <NavGroup
          links={dashboardLinks}
          pathname={pathname}
          collapsed={collapsed}
        />
      </nav>

      <button
        onClick={handleLogout}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-600 hover:text-slate-900 text-left transition-colors ${
          collapsed ? "justify-center" : ""
        }`}
        aria-label="Logout"
      >
        <LogOut className="h-5 w-5 shrink-0 text-white" />
        {!collapsed && "Logout"}
      </button>
    </aside>
  );
}

// Components for SideBar

function NavLink({
  label,
  href,
  icon: Icon,
  active,
  collapsed,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-[#8fafc5] text-slate-900"
          : "text-slate-700 hover:bg-[#9ab8cb] hover:text-slate-900"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0 text-white" />
      {!collapsed && label}
    </Link>
  );
}

function NavGroup({
  links,
  pathname,
  collapsed,
}: {
  links: { label: string; href: string; icon: LucideIcon }[];
  pathname: string;
  collapsed: boolean;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      {links.map(({ label, href, icon }) => (
        <NavLink
          key={href}
          label={label}
          href={href}
          icon={icon}
          active={pathname === href}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}
