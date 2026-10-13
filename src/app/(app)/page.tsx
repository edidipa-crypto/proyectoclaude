import { redirect } from "next/navigation";

import { HOME_BY_ROLE } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function Home() {
  const user = await requireUser();
  redirect(HOME_BY_ROLE[user.role]);
}
