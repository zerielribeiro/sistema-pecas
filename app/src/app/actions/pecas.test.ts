import { describe, it, expect, vi, beforeEach } from "vitest";
import { distribuirPecas, remanejarPeca } from "./pecas";
import * as authHelpers from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Mock auth helpers
vi.mock("@/lib/auth-helpers", () => ({
  requireGestor: vi.fn(),
  requireAuth: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("pecas actions", () => {
  const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(),
  };

  const mockUser = { id: "gestor-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    (authHelpers.requireGestor as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
      papel: "GESTOR",
    });
  });

  describe("distribuirPecas", () => {
    it("should return error if no pieces are selected", async () => {
      const result = await distribuirPecas([], "tecnico-123");
      expect(result.error).toBe("Nenhuma peça selecionada.");
    });

    it("should return error if no technician is selected", async () => {
      const result = await distribuirPecas(["peca-1"], "");
      expect(result.error).toBe("Nenhum técnico selecionado.");
    });

    it("should call rpc and revalidate paths on success", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await distribuirPecas(["peca-1", "peca-2"], "tecnico-123");

      expect(mockSupabase.rpc).toHaveBeenCalledWith("distribuir_pecas_lote", {
        p_peca_ids: ["peca-1", "peca-2"],
        p_tecnico_id: "tecnico-123",
        p_gestor_id: "gestor-123",
      });
      expect(revalidatePath).toHaveBeenCalled();
      expect(result.error).toBeUndefined();
    });

    it("should return error if rpc fails", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: { message: "RPC Error" } });

      const result = await distribuirPecas(["peca-1"], "tecnico-123");

      expect(result.error).toBe("RPC Error");
    });
  });

  describe("remanejarPeca", () => {
    it("should return error if piece is not found", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await remanejarPeca("peca-1", "ESTOQUE");

      expect(result.error).toBe("Peça não encontrada.");
    });

    it("should return error if piece status is not DISTRIBUIDA", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: "EM_ESTOQUE_EMPRESA" }, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await remanejarPeca("peca-1", "ESTOQUE");

      expect(result.error).toBe("Apenas peças distribuídas podem ser remanejadas.");
    });

    it("should update status and record movement on success (ESTOQUE)", async () => {
      const pecasMock = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { status: "DISTRIBUIDA", tecnico_atual_id: "tecnico-123" }, 
          error: null 
        }),
        then: vi.fn().mockImplementation(function(onFullfilled) {
          return Promise.resolve(onFullfilled({ error: null }));
        }),
      };

      const movimentacoesMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table) => {
        if (table === "pecas") return pecasMock;
        if (table === "movimentacoes") return movimentacoesMock;
      });

      const result = await remanejarPeca("peca-1", "ESTOQUE");

      expect(pecasMock.update).toHaveBeenCalled();
      expect(movimentacoesMock.insert).toHaveBeenCalled();
      expect(result.error).toBeUndefined();
    });

  });

});
