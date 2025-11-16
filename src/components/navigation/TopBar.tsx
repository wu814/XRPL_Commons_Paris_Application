"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bell, LogOut, Settings } from "lucide-react";
import Searchbar from "./Searchbar";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { signOut } from "@/lib/auth/client";

export default function Topbar() {
  const { session } = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  if (!session) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-20 bg-color2">
      <div className="flex items-center h-16 px-6">
        {/* Logo */}
        <div className="mr-8">
          <h1 className="text-3xl font-extrabold text-primary cursor-pointer" onClick={() => handleNavigation("/home")}>
            YONA
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center space-x-1 flex-1">
          {/* Home */}
          <button
            onClick={() => handleNavigation("/home")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isActive("/home")
                ? "text-white"
                : "text-gray1 hover:text-white"
            }`}
          >
            Home
          </button>

          {/* Transactions */}
          <button
            onClick={() => handleNavigation("/transactions")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isActive("/transactions")
                ? "text-white"
                : "text-gray1 hover:text-white"
            }`}
          >
            Transactions
          </button>

          {/* Friends */}
          <button
            onClick={() => handleNavigation("/friends")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isActive("/friends")
                ? "text-white"
                : "text-gray1 hover:text-white"
            }`}
          >
            Friends
          </button>
        </nav>

        {/* Right Side: Searchbar and Icons */}
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="w-80">
            <Searchbar />
          </div>

          {/* Settings Icon */}
          <button
            onClick={() => handleNavigation("/settings")}
            className="rounded-lg p-2 text-gray1 transition-colors hover:text-white"
          >
            <Settings className="h-6 w-6" />
          </button>

          {/* Notification Bell */}
          <button className="rounded-lg p-2 text-gray1 transition-colors hover:text-white">
            <Bell className="h-6 w-6" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="rounded-lg p-2 text-gray1 transition-colors hover:text-red-500"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
