import { redirect } from "next/navigation";
import { mesDaUrl } from "../comum";

// os lançamentos agora ficam dentro do Realizado
export default async function LancamentosPage({ searchParams }: PageProps<"/financas/lancamentos">) {
  redirect(`/financas/realizado?mes=${mesDaUrl((await searchParams).mes)}`);
}
