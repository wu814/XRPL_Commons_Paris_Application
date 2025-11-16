"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/app/Button";
import ErrorMdl from "@/components/app/ErrorMdl";
import SuccessMdl from "@/components/app/SuccessMdl";
import UsernameInput from "./UsernameInput";
import PasswordInput from "./PasswordInput";
import AccountTypeSelector, { AccountType } from "./AccountTypeSelector";
import WalletTypeSelector, { WalletType } from "./WalletTypeSelector";
import VASPDropdown from "./VASPDropdown";
import KYCProviderDropdown from "./KYCProviderDropdown";
import SelfHostAddressInput from "./SelfHostAddressInput";
import { refreshSessionToHome } from "@/lib/auth/client";

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  walletType: WalletType | "";
  member_id: string;
  kyc_provider_id: string;
  self_host_address: string;
}

interface Props {
  userId: string;
  userEmail: string;
}

export default function RegistrationForm({ userId, userEmail }: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    confirmPassword: "",
    accountType: "USER",
    walletType: "",
    member_id: "",
    kyc_provider_id: "",
    self_host_address: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // Navigation blocking
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFormSubmitted) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    const handlePopState = () => {
      if (
        !isFormSubmitted &&
        !window.confirm("Leave without completing registration?")
      ) {
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.history.pushState(null, "", window.location.pathname);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isFormSubmitted]);

  const updateField = (field: keyof FormData, value: string | AccountType | WalletType) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // Clear conditional fields when wallet type changes
      if (field === "walletType") {
        if (value === "VASP") {
          newData.kyc_provider_id = "";
          newData.self_host_address = "";
          // Clear related errors
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.kycProvider;
            delete newErrors.selfHostAddress;
            return newErrors;
          });
        } else if (value === "SELF_HOST") {
          newData.member_id = "";
          // Clear related errors
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.member;
            return newErrors;
          });
        }
      }
      
      return newData;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters long.";
    } else if (/\s/.test(formData.username)) {
      newErrors.username = "Username cannot contain spaces.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 5) {
      newErrors.password = "Password must be at least 5 characters long.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!formData.accountType) {
      newErrors.accountType = "Please select an account type.";
    }

    if (!formData.walletType) {
      newErrors.walletType = "Please select a wallet type.";
    }

    // Conditional validation based on wallet type
    if (formData.walletType === "VASP") {
      if (!formData.member_id) {
        newErrors.member = "Please select a VASP.";
      }
    } else if (formData.walletType === "SELF_HOST") {
      if (!formData.kyc_provider_id) {
        newErrors.kycProvider = "Please select a KYC provider.";
      }
      if (!formData.self_host_address.trim()) {
        newErrors.selfHostAddress = "Please enter your self-host address.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!userId) {
      setErrorMessage("No user session found. Please try logging in again.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Determine member_id based on wallet type
      const member_id = formData.walletType === "VASP" 
        ? formData.member_id 
        : formData.walletType === "SELF_HOST" 
          ? formData.kyc_provider_id 
          : null;

      const response = await fetch("/api/register/completeRegistration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          accountType: formData.accountType,
          password: formData.password, // Send plain text password - backend will hash it
          wallet_type: formData.walletType,
          self_host_address: formData.walletType === "SELF_HOST" ? formData.self_host_address : null,
          member_id: member_id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }

      setIsFormSubmitted(true);
      setSuccessMessage(
        "Account created successfully! Refreshing your session..."
      );

      // Force session refresh by signing in again
      await refreshSessionToHome();
      setTimeout(() => router.push("/home"), 1000);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-md rounded-lg bg-color3 p-6">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">
            Complete Your Registration
          </h1>
          <p className="text-gray1">
            Welcome! Please complete your account setup.
          </p>
          {userEmail && (
            <p className="mt-2 text-sm text-gray1">Email: {userEmail}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <UsernameInput
            value={formData.username}
            onChange={(value) => updateField("username", value)}
            error={errors.username}
            setError={(message) => {
              if (message) {
                setErrors((prev) => ({ ...prev, username: message }));
              } else {
                setErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors.username;
                  return newErrors;
                });
              }
            }}
          />

          <PasswordInput
            value={formData.password}
            onChange={(value) => updateField("password", value)}
            error={errors.password}
          />

          <div>
            <label className="mb-1 block text-gray1 text-sm">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              placeholder="Confirm your password"
              className={`bg-color4 w-full rounded-lg border p-2 hover:border-gray2 focus:border-primary focus:outline-none ${
                errors.confirmPassword ? "border-red-500" : "border-transparent"
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <AccountTypeSelector
            value={formData.accountType}
            onChange={(value) => updateField("accountType", value)}
          />
          {errors.accountType && (
            <p className="text-sm text-red-500">{errors.accountType}</p>
          )}

          <WalletTypeSelector
            value={formData.walletType}
            onChange={(value) => updateField("walletType", value)}
          />
          {errors.walletType && (
            <p className="text-sm text-red-500">{errors.walletType}</p>
          )}

          {formData.walletType === "VASP" && (
            <div className="mb-4">
              <label className="mb-1 block text-gray1 text-sm">
                VASP <span className="text-red-500">*</span>
              </label>
              <VASPDropdown
                value={formData.member_id}
                onChange={(value) => updateField("member_id", value)}
              />
              {errors.member && (
                <p className="text-sm text-red-500">{errors.member}</p>
              )}
            </div>
          )}

          {formData.walletType === "SELF_HOST" && (
            <>
              <div className="mb-4">
                <label className="mb-1 block text-gray1 text-sm">
                  KYC Provider <span className="text-red-500">*</span>
                </label>
                <KYCProviderDropdown
                  value={formData.kyc_provider_id}
                  onChange={(value) => updateField("kyc_provider_id", value)}
                />
                {errors.kycProvider && (
                  <p className="text-sm text-red-500">{errors.kycProvider}</p>
                )}
              </div>

              <SelfHostAddressInput
                value={formData.self_host_address}
                onChange={(value) => updateField("self_host_address", value)}
                error={errors.selfHostAddress}
              />
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="w-full mt-6"
          >
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </div>

      {errorMessage && (
        <ErrorMdl
          errorMessage={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {successMessage && (
        <SuccessMdl
          successMessage={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </>
  );
}
