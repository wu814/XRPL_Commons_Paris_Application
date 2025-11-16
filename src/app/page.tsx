"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { useRouter } from "next/navigation";
import usePageTitle from "@/hooks/usePageTitle";
import Button from "@/components/app/Button";
import { signInWithGoogle } from "@/lib/auth/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import GradientBackground from "@/components/background/GradientBackground";
import AnimatedBackground from "@/components/background/AnimatedBackground";

export default function Login() {
  const { status, user } = useSupabaseSession();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Set page title
  usePageTitle("YONA - Your DeFi Platform");

  useEffect(() => {
    if (status === "authenticated" && user) {
      // User is logged in, redirect to home (middleware will handle registration check)
      router.push("/home");
    }
  }, [status, user, router]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("Login error:", error);
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToLearnMore = () => {
    const element = document.getElementById("learn-more-section");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GradientBackground />
      <div className="relative z-10 flex min-h-screen flex-row items-center justify-center">
        <div className="flex flex-col items-center">
          <h1 className="mb-7 ml-2 text-6xl font-extrabold">YONA</h1>
          <h3 className="mb-7 text-6xl font-semibold">Control the Ledger</h3>
          <h3 className="mb-7 text-6xl font-semibold">Shape the Future.</h3>
          <Button
            variant="login"
            onClick={handleLogin}
            disabled={isLoading}
            className="mt-6 px-6 py-3 text-lg font-semibold"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Log in with Google"
            )}
          </Button>

          {/* Learn More Button */}
          <button
            onClick={scrollToLearnMore}
            className={
              "flex flex-row items-center pt-5 text-sm font-medium hover:underline"
            }
          >
            Learn More <ArrowDown className="ml-1 h-7 w-7 animate-bounce" />
          </button>
        </div>
      </div>
      <div
        id="learn-more-section"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-cyan-300/60 via-indigo-300/30 to-purple-300/30 px-8 py-16"
      >
        {/* Animated Background */}
        <AnimatedBackground />
      </div>
    </>
  );
}
