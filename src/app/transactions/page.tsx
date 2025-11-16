"use client";

import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import TransactionHistory from "@/components/transactions/TransactionHistory";
import usePageTitle from "@/hooks/usePageTitle";

export default function TransactionsPage() {
  const { user, status } = useSupabaseSession();

  usePageTitle("Transactions - YONA");

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray1">Please log in to view your transactions</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="container mx-auto max-w-6xl">
        <TransactionHistory />
      </div>
    </div>
  );
}

