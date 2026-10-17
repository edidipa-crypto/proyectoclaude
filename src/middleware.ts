import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Clave de acceso para la maqueta publicada. Si DEMO_PASSWORD está definida,
// el navegador pide usuario y clave antes de mostrar cualquier página.
// En local (sin la variable) no pide nada. Se retira cuando llegue Supabase Auth.
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.DEMO_USER ?? "dieselpro";
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    if (u === user && rest.join(":") === password) return NextResponse.next();
  }

  return new NextResponse("Se requiere usuario y clave", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="DieselPro", charset="UTF-8"' },
  });
}

export const config = {
  // Todo menos el healthcheck (lo usa la plataforma) y los archivos estáticos.
  // Las API de n8n tienen su propio token.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico).*)"],
};
