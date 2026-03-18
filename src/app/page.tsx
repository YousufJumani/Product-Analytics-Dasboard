import { redirect } from "next/navigation";

export default async function HomePage() {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  if (demoModeEnabled) {
    redirect("/dashboard");
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
