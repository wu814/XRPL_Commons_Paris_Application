"use client";

interface SelfHostAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function SelfHostAddressInput({
  value,
  onChange,
  error,
}: SelfHostAddressInputProps) {
  return (
    <div>
      <label className="mb-1 block text-gray1 text-sm">
        Self Host Address <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your self-host address"
        className={`bg-color4 w-full rounded-lg border p-2 hover:border-gray2 focus:border-primary focus:outline-none ${
          error ? "border-red-500" : "border-transparent"
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

