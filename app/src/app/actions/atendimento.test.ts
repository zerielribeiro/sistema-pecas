import { describe, it, expect, vi, beforeEach } from "vitest";
import { registrarAtendimentoEBaixa } from "./atendimento";
import * as authHelpers from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Mock auth helpers
vi.mock("@/lib/auth-helpers", () => ({
  requireAuth: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("atendimento actions", () => {
  const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(),
  };

  const mockUser = { id: "tech-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    (authHelpers.requireAuth as any).mockResolvedValue({
      supabase: mockSupabase,
      user: mockUser,
    });
  });

  describe("registrarAtendimentoEBaixa", () => {
    it("should create atendimento and call registrar_baixa for each piece", async () => {
      const atendimentoChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "atend-1" }, error: null }),
      };
      mockSupabase.from.mockReturnValue(atendimentoChain);
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await registrarAtendimentoEBaixa(
        ["peca-1", "peca-2"],
        "CHAMADO-001",
        "Local A",
        "Descricao",
        ["foto1.jpg", "foto2.jpg"]
      );

      expect(atendimentoChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        numero_chamado: "CHAMADO-001",
        tecnico_id: "tech-123",
      }));
      
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("registrar_baixa", expect.objectContaining({
        p_peca_id: "peca-1",
        p_atendimento_id: "atend-1",
        p_foto_url: "foto1.jpg,foto2.jpg",
      }));

      expect(revalidatePath).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should return error if atendimento creation fails", async () => {
      const atendimentoChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } }),
      };
      mockSupabase.from.mockReturnValue(atendimentoChain);

      const result = await registrarAtendimentoEBaixa(
        ["peca-1"],
        "CHAMADO-001",
        "Local A",
        "Descricao",
        []
      );

      expect(result.error).toBe("Erro ao registrar os dados do chamado.");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });
  });
});
