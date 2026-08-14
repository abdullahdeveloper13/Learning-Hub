import React from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { signInWithSupabaseProvider } from "@/lib/supabase-auth";

export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  React.useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      localStorage.setItem("sf_token", token);
      setLocation("/dashboard");
      window.location.reload();
      return;
    }
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      const res = await login(values);
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${res.user.name}`,
      });
      // Redirect based on role
      if (res.user.role === 'admin') setLocation('/admin/dashboard');
      else if (res.user.role === 'instructor') setLocation('/instructor/dashboard');
      else setLocation('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
      });
    }
  };

  const onOAuthSignIn = async (provider: "google" | "github") => {
    try {
      await signInWithSupabaseProvider(provider);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `${provider === "google" ? "Google" : "GitHub"} sign-in unavailable`,
        description: error.message || "Supabase OAuth is not configured yet.",
      });
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl shadow-xl border">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold font-serif text-2xl">S</span>
            </div>
            <h2 className="text-3xl font-bold font-serif tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">Enter your details to sign in to your account</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" type="email" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-md font-semibold" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => onOAuthSignIn("google")}>
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => onOAuthSignIn("github")}>
              GitHub
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
