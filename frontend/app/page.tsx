import { redirect } from "next/navigation";

const DEV_SKIP_AUTH = process.env.NEXT_PUBLIC_DEV_SKIP_AUTH === "true";

export default function RootPage() {
  if (DEV_SKIP_AUTH) {
    redirect("/app/dashboard");
  }
  redirect("/home");
}
