"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface VASP {
  member_id: string;
  member_name: string;
}

interface VASPDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  dropdownBg?: string;
  className?: string;
}

// Map VASP names to icon files
const getVASPIcon = (name: string): string => {
  const iconMap: Record<string, string> = {
    "anchorage digital": "/vasp_icons/anchorage.png",
    archax: "/vasp_icons/archax.png",
    bitgo: "/vasp_icons/bitgo.png",
    coinpass: "/vasp_icons/coinpass.png",
    copper: "/vasp_icons/copper.png",
    gatehub: "/vasp_icons/gatehub.png",
  };
  
  const key = name.toLowerCase();
  return iconMap[key];
};

export default function VASPDropdown({
  value,
  onChange,
  disabledOptions = [],
  dropdownBg = "bg-color4",
  className = "",
}: VASPDropdownProps) {
  const [vasps, setVASPs] = useState<VASP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVASPs = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("members")
          .select("member_id, member_name")
          .eq("business_type", "VASP")
          .order("member_name");

        if (error) throw error;
        setVASPs(data || []);
      } catch (err) {
        console.error("Error fetching VASPs:", err);
        setError("Failed to load VASPs");
      } finally {
        setLoading(false);
      }
    };

    fetchVASPs();
  }, []);

  const selectedVASP = vasps.find((c) => c.member_id === value);

  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-transparent px-2 py-2 ${dropdownBg} ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray1" />
        <span className="ml-2 text-gray1">Loading VASPs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500 px-2 py-2 text-red-500 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className={`relative ${className || "w-full"}`}>
          <ListboxButton
            className={`mt-1 flex w-full gap-7 items-center justify-between rounded-lg border border-transparent px-2 py-2 focus:border-primary hover:border-gray2 outline-none ${dropdownBg}`}
          >
            <div className="flex items-center space-x-2">
              {selectedVASP ? (
                <>
                  <img
                    src={getVASPIcon(selectedVASP.member_name)}
                    alt={selectedVASP.member_name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span>{selectedVASP.member_name}</span>
                </>
              ) : (
                <span className="text-gray1">Select VASP</span>
              )}
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-gray1 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`} 
            />
          </ListboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray2 bg-color2 scrollbar-hide">
              {vasps.length === 0 ? (
                <div className="p-4 text-center text-gray1">
                  No VASPs available  
                </div>
              ) : (
                vasps.map((vasp) => {
                  const isDisabled = disabledOptions.includes(vasp.member_id);
                  return (
                    <ListboxOption
                      key={vasp.member_id}
                      value={vasp.member_id}
                      disabled={isDisabled}
                      className={({ focus, selected, disabled }) =>
                        `flex select-none items-center space-x-2 p-2 ${
                          disabled
                            ? "cursor-not-allowed opacity-30"
                            : focus
                              ? "cursor-pointer bg-color4"
                              : selected
                                ? "cursor-pointer bg-color3"
                                : ""
                        }`
                      }
                    >
                      <img
                        src={getVASPIcon(vasp.member_name)}
                        alt={vasp.member_name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span>{vasp.member_name}</span>
                    </ListboxOption>
                  );
                })
              )}
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}

