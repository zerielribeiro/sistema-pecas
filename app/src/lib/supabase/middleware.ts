import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow login page for unauthenticated users
  if (pathname === "/login") {
    if (user) {
      // Logged in user on login page → redirect to their dashboard
      const { data: perfil } = await supabase
        .from("perfis")
        .select("papel")
        .eq("id", user.id)
        .single();

      const redirectUrl =
        perfil?.papel === "GESTOR" ? "/gestor/dashboard" : "/tecnico/estoque";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return supabaseResponse;
  }

  // Unauthenticated users → redirect to login
  if (!user && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control
  if (user) {
    const { data: perfil } = await supabase
      .from("perfis")
      .select("papel")
      .eq("id", user.id)
      .single();

    if (perfil) {
      // Technician trying to access manager routes
      if (pathname.startsWith("/gestor") && perfil.papel !== "GESTOR") {
        return NextResponse.redirect(
          new URL("/tecnico/estoque", request.url)
        );
      }
      // Manager trying to access technician routes
      if (pathname.startsWith("/tecnico") && perfil.papel !== "TECNICO") {
        return NextResponse.redirect(
          new URL("/gestor/dashboard", request.url)
        );
      }
    }
  }

  // Redirect root to appropriate dashboard
  if (pathname === "/") {
    if (user) {
      const { data: perfil } = await supabase
        .from("perfis")
        .select("papel")
        .eq("id", user.id)
        .single();

      const redirectUrl =
        perfil?.papel === "GESTOR" ? "/gestor/dashboard" : "/tecnico/estoque";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}
