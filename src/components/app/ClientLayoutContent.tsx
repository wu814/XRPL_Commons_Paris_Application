"use client";

import Topbar from "@/components/navigation/TopBar";
import { usePathname } from "next/navigation";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

interface ClientLayoutContentProps {
  children: React.ReactNode;
}

export default function ClientLayoutContent({ children }: ClientLayoutContentProps) {
  const { session, status } = useSupabaseSession();
  const pathname = usePathname();
  
  // Don't show sidebar/topbar on splash page, register page, or when not authenticated
  const showNavigation = session && pathname !== "/" && pathname !== "/register";
  
  return (
    <div className="min-h-screen bg-color1 text-white">
      {showNavigation && <Topbar />}
      <div className={`${showNavigation ? "pt-16" : ""} overflow-y-auto scrollbar-hide`}>

      {children}
      </div>
    </div>
  );
}

