import { NextResponse } from "next/server";
import { membroAtual } from "@/lib/auth";
import { TIPOS_IMAGEM, lerExtrato, lerFoto, type TipoImagem } from "@/lib/extrato";

export const maxDuration = 60;

/** Recebe PDF ou foto do extrato. Planilhas são lidas direto no navegador. */
export async function POST(req: Request) {
  if (!(await membroAtual())) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const fd = await req.formData();
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ erro: "Envie um arquivo." }, { status: 400 });
  if (arquivo.size > 15 * 1024 * 1024) return NextResponse.json({ erro: "Arquivo muito grande (máx. 15 MB)." }, { status: 400 });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const ehFoto = (TIPOS_IMAGEM as readonly string[]).includes(arquivo.type);
  try {
    if (ehFoto) return NextResponse.json(await lerFoto(bytes, arquivo.type as TipoImagem));
    if (arquivo.type.startsWith("image/")) {
      return NextResponse.json({ erro: "Formato de foto não suportado. Use JPG ou PNG (no iPhone, envie como “Mais compatível”)." }, { status: 400 });
    }
    return NextResponse.json(await lerExtrato(bytes));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { erro: ehFoto ? msg || "Não consegui ler esta foto." : `Não consegui ler este PDF${msg ? `: ${msg}` : ""}. Se for um PDF escaneado (foto), a leitura simples não funciona.` },
      { status: 422 }
    );
  }
}
