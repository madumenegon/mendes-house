import { Nav } from "@/components/Nav";
import { AutoRefresh } from "@/components/AutoRefresh";
import { exigirMembro } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const membro = await exigirMembro();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Nav membro={membro} />
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8">{children}</main>
      <AutoRefresh />
    </div>
  );
}
