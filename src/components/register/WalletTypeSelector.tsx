"use client";

export type WalletType = "SELF_HOST" | "VASP";

interface WalletTypeOption {
  value: WalletType;
  title: string;
  description: string;
  icon: string;
}

interface WalletTypeSelectorProps {
  value: WalletType | "";
  onChange: (value: WalletType) => void;
}

export default function WalletTypeSelector({ value, onChange }: WalletTypeSelectorProps) {
  const walletTypes: WalletTypeOption[] = [
    {
      value: "SELF_HOST",
      title: "Self Host",
      description: "Manage your own wallet with a self-hosted address",
      icon: "🔐"
    },
    {
      value: "VASP",
      title: "VASP",
      description: "Use a Virtual Asset Service Provider to manage your wallet",
      icon: "🏦"
    }
  ];

  return (
    <div>
      <label className="mb-3 block text-gray1 text-sm">
        Wallet Type <span className="text-red-500">*</span>
      </label>
      <div className="space-y-3">
        {walletTypes.map((type) => (
          <div
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:border-primary ${
              value === type.value
                ? "border-primary bg-primary/10"
                : "border-color6 bg-color4"
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{type.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary">{type.title}</h3>
                <p className="text-sm text-gray1">{type.description}</p>
              </div>
              <div className="flex-shrink-0">
                <div
                  className={`h-4 w-4 rounded-full border-2 ${
                    value === type.value
                      ? "border-primary bg-primary"
                      : "border-gray1"
                  }`}
                >
                  {value === type.value && (
                    <div className="h-full w-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

