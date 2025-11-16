"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  Transition,
} from "@headlessui/react";
import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

const availableAssets = [
  { id: "RLUSD", name: "RLUSD", avatar: "/asset_icons/RLUSD.png" },
  { id: "USDC", name: "USDC", avatar: "/asset_icons/USDC.png" },
];

interface AssetDropDownProps {
  value: string;
  onChange: (value: string) => void;
  disabledOptions?: string[];
  dropdownBg?: string;
  className?: string;
}

export default function AssetDropdown({
  value,
  onChange,
  disabledOptions = [],
  dropdownBg = "bg-color3",
  className = "",
}: AssetDropDownProps) {
  const selectedAsset = availableAssets.find((c) => c.id === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={`relative ${className || "w-full"}`}>
        <ListboxButton
          className={`mt-1 flex w-full gap-7 items-center justify-between rounded-lg border border-transparent px-2 py-2 focus:border-primary hover:border-gray2 outline-none ${dropdownBg}`}
        >
          {({ open }) => (
            <>
              <div className="flex items-center space-x-2">
                {selectedAsset ? (
                  <>
                    <img
                      src={selectedAsset.avatar}
                      alt={selectedAsset.name}
                      className="h-6 w-6 rounded-full"
                    />
                    <span>{selectedAsset.id}</span>
                  </>
                ) : (
                  <span className="text-gray1">Select</span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-gray1 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </>
          )}
        </ListboxButton>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray2 bg-color2 scrollbar-hide">
            {availableAssets.map((c) => {
              const isDisabled = disabledOptions.includes(c.id);
              return (
                <ListboxOption
                  key={c.id}
                  value={c.id}
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
                    src={c.avatar}
                    alt={c.name}
                    className="h-6 w-6 rounded-full"
                  />
                  <span>{c.id}</span>
                  <span className="text-gray1 text-xs">- {c.name}</span>
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        </Transition>
      </div>
    </Listbox>
  );
};

