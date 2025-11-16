"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface User {
  username: string;
}

export default function Searchbar() {
  const [searchText, setSearchText] = useState<string>("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [fetched, setFetched] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch users only once when input is focused
  const handleFocus = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .not('username', 'is', null)
        .order('username');
      
      if (error) throw new Error(`Failed to fetch users: ${error.message}`);
      setAllUsers(data || []);
      setFetched(true);
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Filter as user types
  useEffect(() => {
    if (searchText === "") {
      setFilteredUsers([]);
      return;
    }
    const filtered = allUsers.filter((user) =>
      user.username.toLowerCase().includes(searchText.toLowerCase()),
    );
    setFilteredUsers(filtered);
  }, [searchText, allUsers]);

  return (
    <div className="relative mx-4 flex-1">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-5 h-5 text-gray1" />
        </div>
        {loading && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Loader2 className="w-5 h-5 text-gray1 animate-spin" />
          </div>
        )}
        <input
          type="text"
          placeholder="Search users..."
          onFocus={handleFocus}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={`w-full pl-12 py-1.5 rounded-lg text-md border border-gray2 bg-color1 focus:border-primary focus:outline-none hover:border-primary ${
            loading ? "pr-12" : "pr-4"
          }`}
        />
      </div>
      {filteredUsers.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg bg-color4 border border-gray2 shadow-lg">
          {filteredUsers.map((user) => (
            <li key={user.username}>
              <Link
                href={`/user/${user.username}`}
                className="block px-4 py-2 text-sm hover:bg-color5 first:rounded-t-lg last:rounded-b-lg"
                onClick={() => setSearchText("")}
              >
                {user.username}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

