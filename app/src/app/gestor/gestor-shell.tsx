"use client";

import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Zap, LogOut, LayoutDashboard, ArrowRightLeft, Package, History, Users, AlertTriangle, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ProfileSettings } from "@/components/profile-settings";

const gestorNav = [
  {
    href: "/gestor/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: "Visão geral e KPIs"
  },
  {
    href: "/gestor/distribuir",
    label: "Distribuir",
    icon: <ArrowRightLeft className="w-5 h-5" />,
    description: "Movimentação de estoque"
  },
  {
    href: "/gestor/pecas",
    label: "Peças",
    icon: <Package className="w-5 h-5" />,
    description: "Gestão do inventário"
  },
  {
    href: "/gestor/laboratorio",
    label: "Peças RMA",
    icon: <AlertTriangle className="w-5 h-5" />,
    description: "doa e Laboratório"
  },
  {
    href: "/gestor/historico",
    label: "Histórico",
    icon: <History className="w-5 h-5" />,
    description: "Log de atividades"
  },
  {
    href: "/gestor/usuarios",
    label: "Usuários",
    icon: <Users className="w-5 h-5" />,
    description: "Técnicos e acessos"
  },
];

export function GestorShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentName, setCurrentName] = useState(userName);
  const [currentEmail, setCurrentEmail] = useState(userEmail || "");

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 border-b border-border/40 bg-card/40 backdrop-blur-md sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-4">
          {/* Menu Sidebar Toggle */}
          <Sheet>
            <SheetTrigger asChild nativeButton={true}>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-accent transition-all active:scale-95">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-r border-border/40 bg-card/95 backdrop-blur-xl">
              <SheetHeader className="p-6 border-b border-border/40 bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shadow-primary/10">
                    <Zap className="w-6 h-6 text-primary fill-current" />
                  </div>
                  <SheetTitle className="text-xl font-black tracking-tighter">Gestor<span className="text-primary">RB</span></SheetTitle>
                </div>
              </SheetHeader>

              <nav className="p-4 space-y-1">
                {gestorNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <SheetClose key={item.href} asChild nativeButton={false}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all group border",
                          isActive
                            ? "bg-primary/10 text-primary border-primary/20 shadow-sm shadow-primary/5"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                          isActive ? "bg-primary/20" : "bg-muted/50"
                        )}>
                          {item.icon}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <span className="text-[10px] opacity-70 leading-none mt-0.5">{item.description}</span>
                        </div>
                      </Link>
                    </SheetClose>
                  );
                })}
              </nav>

              <div className="absolute bottom-6 left-6 right-6 pt-6 border-t border-border/40">
                <form action={logoutAction}>
                  <Button type="submit" variant="outline" className="w-full h-11 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/10 hover:border-red-500/40 transition-all">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-5 h-5 text-primary-foreground fill-current" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] uppercase tracking-[0.2em] font-black text-primary/80">Gestor</span>
              <span className="text-base font-black tracking-tighter text-foreground">RB</span>
            </div>
          </div>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2 leading-none">
            <span className="text-xs font-bold text-foreground">{currentName}</span>
            <span className="text-[10px] text-muted-foreground font-medium">GESTOR</span>
          </div>
          <ProfileSettings
            userName={currentName}
            userEmail={currentEmail}
            onProfileUpdate={(newName, newEmail) => {
              setCurrentName(newName);
              setCurrentEmail(newEmail);
            }}
          >
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-accent border border-border shadow-sm hover:bg-accent/80 transition-all cursor-pointer">
              <Users className="w-5 h-5 text-muted-foreground" />
            </Button>
          </ProfileSettings>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full min-h-full px-3 md:px-6 py-4 md:py-8 pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
