import { NextResponse } from "next/server";
import { membroAtual } from "@/lib/auth";
import { lerExtrato } from "@/lib/extrato";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await membroAtual())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const fd = await req.formData();
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: "Envie um arquivo PDF." }, { status: 400 });
  if (arquivo.size > 15 * 1024 * 1024) return NextResponse.json({ erro: "PDF muito grande (máx. 15 MB)." }, { status: 400 });
  try {
    const resultado = await lerExtrato(new Uint8Array(await arquivo.arrayBuffer()));
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json(
      { erro: `Não consegui ler este PDF${e instanceof Error ? `: ${e.message}` : ""}. Se for um PDF escaneado (foto), a leitura simples não funciona.` },
      { status: 422 }
    );
  }
}
