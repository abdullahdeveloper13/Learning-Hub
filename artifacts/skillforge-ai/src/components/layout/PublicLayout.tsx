import React from "react";
import { Header } from "./Header";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative selection:bg-primary/30">
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
      
      <footer className="border-t py-10 bg-card mt-auto">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold font-serif text-xs">S</span>
                </div>
                <span className="font-serif font-bold tracking-tight">SkillForge AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Intelligent learning management for ambitious professionals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Browse Courses</li>
                <li>AI Tools</li>
                <li>Pricing</li>
                <li>Enterprise</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Documentation</li>
                <li>Help Center</li>
                <li>API Reference</li>
                <li>Community</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About</li>
                <li>Careers</li>
                <li>Blog</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} SkillForge AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
