import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    redirect("/dashboard");
  }

  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
