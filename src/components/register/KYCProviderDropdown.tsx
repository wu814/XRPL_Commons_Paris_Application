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

interface KYCProvider {
  member_id: string;
  member_name: string;
}

interface KYCProviderDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  dropdownBg?: string;
  className?: string;
}

// Map KYC provider names to icon files
const getKYCProviderIcon = (name: string): string => {
  const iconMap: Record<string, string> = {
    idenfy: "/kyc_provider_icons/idenfy.png",
    seon: "/kyc_provider_icons/seon.png",
  };
  
  const key = name.toLowerCase();
  return iconMap[key] || "/kyc_provider_icons/idenfy.png"; // Default icon
};

export default function KYCProviderDropdown({
  value,
  onChange,
  disabledOptions = [],
  dropdownBg = "bg-color4",
  className = "",
}: KYCProviderDropdownProps) {
  const [kycProviders, setKYCProviders] = useState<KYCProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKYCProviders = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("members")
          .select("member_id, member_name")
          .eq("business_type", "KYC_PROVIDER")
          .order("member_name");

        if (error) throw error;
        console.log("KYC Providers:", data); // Added for debugging
        setKYCProviders(data || []);
      } catch (err) {
        console.error("Error fetching KYC providers:", err);
        setError("Failed to load KYC providers");
      } finally {
        setLoading(false);
      }
    };

    fetchKYCProviders();
  }, []);

  const selectedKYCProvider = kycProviders.find((p) => p.member_id === value);

  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-lg border border-transparent px-2 py-2 ${dropdownBg} ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray1" />
        <span className="ml-2 text-gray1">Loading KYC providers...</span>
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
              {selectedKYCProvider ? (
                <>
                  <img
                    src={getKYCProviderIcon(selectedKYCProvider.member_name)}
                    alt={selectedKYCProvider.member_name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  <span>{selectedKYCProvider.member_name}</span>
                </>
              ) : (
                <span className="text-gray1">Select KYC Provider</span>
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
              {kycProviders.length === 0 ? (
                <div className="p-4 text-center text-gray1">
                  No KYC providers available  
                </div>
              ) : (
                kycProviders.map((provider) => {
                  const isDisabled = disabledOptions.includes(provider.member_id);
                  return (
                    <ListboxOption
                      key={provider.member_id}
                      value={provider.member_id}
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
                        src={getKYCProviderIcon(provider.member_name)}
                        alt={provider.member_name}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span>{provider.member_name}</span>
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

