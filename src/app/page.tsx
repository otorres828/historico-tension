import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthScreen from "@/components/AuthScreen";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthScreen />;
}
