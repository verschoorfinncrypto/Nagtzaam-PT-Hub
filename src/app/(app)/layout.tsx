import { Shell } from "@/components/Shell";
import { requireUser, viewingTrainer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, viewer] = await Promise.all([requireUser(), viewingTrainer()]);
  return (
    <Shell user={user} viewer={viewer}>
      {children}
    </Shell>
  );
}
