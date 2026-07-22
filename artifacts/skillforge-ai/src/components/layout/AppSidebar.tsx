import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  MessageSquare, 
  Sparkles, 
  Users, 
  BarChart, 
  Layers, 
  Bell, 
  Activity,
  PlusCircle,
  MessageCircle
} from "lucide-react";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  if (!user) return null;

  const role = user.role;

  const studentLinks = [
    { name: "My Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Certificates", href: "/certificates", icon: Award },
    { name: "Messages", href: "/messages", icon: MessageSquare },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "AI Tools", href: "/ai", icon: Sparkles },
  ];

  const instructorLinks = [
    { name: "Instructor Dashboard", href: "/instructor/dashboard", icon: BarChart },
    { name: "Manage Courses", href: "/instructor/courses", icon: BookOpen },
    { name: "Create Course", href: "/instructor/courses/new", icon: PlusCircle },
    { name: "Student Messages", href: "/instructor/messages", icon: MessageCircle },
  ];

  const adminLinks = [
    { name: "Platform Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Manage Users", href: "/admin/users", icon: Users },
    { name: "Manage Courses", href: "/admin/courses", icon: BookOpen },
    { name: "Categories", href: "/admin/categories", icon: Layers },
    { name: "Activity Logs", href: "/admin/logs", icon: Activity },
  ];

  const renderLinks = (links: any[]) => (
    <div className="space-y-1">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            location === link.href || location.startsWith(link.href + '/') && link.href !== '/'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <link.icon className="h-4 w-4" />
          {link.name}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="w-64 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden md:block shrink-0">
      <div className="p-4 space-y-6">
        
        {role === "admin" && (
          <div>
            <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admin
            </h4>
            {renderLinks(adminLinks)}
          </div>
        )}

        {(role === "instructor" || role === "admin") && (
          <div>
            <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Instructor
            </h4>
            {renderLinks(instructorLinks)}
          </div>
        )}

        {role === "student" && (
          <div>
          <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Student
          </h4>
          {renderLinks(studentLinks)}
          </div>
        )}
        
      </div>
    </div>
  );
}
