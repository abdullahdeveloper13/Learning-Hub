import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <h1 className="text-[120px] font-black leading-none text-muted">404</h1>
        <h2 className="text-3xl font-bold font-serif tracking-tight mt-4">Page not found</h2>
        <p className="text-muted-foreground mt-4 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Button asChild className="mt-8 h-12 px-8">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
