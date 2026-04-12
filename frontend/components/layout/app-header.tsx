"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { useData } from "@/lib/data-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AppHeader() {
  const { user } = useAuth();
  const { requests } = useData();
  const pathname = usePathname();

  const pendingRequests = requests.filter(
    (r) => r.status === "pending" && r.recipient.id === user?.id
  ).length;

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href?: string }[] = [];

    segments.forEach((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);

      if (segment === "projects" && segments[index + 1]) {
        label = "Projects";
      } else if (segments[index - 1] === "projects") {
        label = "Project Details";
      }

      const isProjectsIndex = segment === "projects";
      breadcrumbs.push({
        label,
        href: index < segments.length - 1 && !isProjectsIndex ? href : undefined,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-14 items-center gap-4 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
      <Link href="/invitations">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {pendingRequests > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 justify-center rounded-full p-0 text-xs"
            >
              {pendingRequests}
            </Badge>
          )}
        </Button>
      </Link>
    </header>
  );
}
