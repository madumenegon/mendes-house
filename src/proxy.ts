import { NextResponse, type NextRequest } from "next/server";

/** Só redireciona quem não tem o cookie de sessão. A assinatura do cookie
 * é conferida de verdade no servidor (src/lib/auth.ts) em cada página e ação. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/entrar")) return NextResponse.next();
  if (!request.cookies.get("mendes_sessao")?.value) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
