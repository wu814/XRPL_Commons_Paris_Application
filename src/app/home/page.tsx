import {
  getCurrentUserFromAuthTable,
  checkUserRegistration,
} from "@/lib/auth/server";
import { redirect } from "next/navigation";
import PaymentMdl from "@/components/payment/PaymentMdl";
import { getUserByAuthId } from "@/services/userService";

export const metadata = {
  title: "Home - YONA",
};


export default async function HomePage() {
  const user = await getCurrentUserFromAuthTable();

  if (!user) {
    redirect("/");
  }

  const { needsRegistration } = await checkUserRegistration(user.id);

  if (needsRegistration) {
    redirect("/register");
  }

  // Get user profile data including username
  const userProfile = await getUserByAuthId(user.id);

  return (
    <div className="min-h-screen w-full bg-color1 p-2">
      <div className="pt-10 flex flex-col items-center gap-10">
        {userProfile?.username && (
            <h1 className="text-2xl text-center font-semibold text-white">
              Welcome, {userProfile.username}!
            </h1>
        )}
        <PaymentMdl />
      </div>
    </div>
  );
}
