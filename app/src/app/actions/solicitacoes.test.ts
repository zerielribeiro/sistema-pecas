import { describe, it, expect, vi, beforeEach } from "vitest";
import { solicitarPeca, aprovarSolicitacao } from "./solicitacoes";
import * as authHelpers from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Mock auth helpers
vi.mock("@/lib/auth-helpers", () => ({
  requireGestor: vi.fn(),
  requireTecnico: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("solicitacoes actions", () => {
  const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(),
  };

  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("solicitarPeca", () => {
    beforeEach(() => {
      (authHelpers.requireTecnico as any).mockResolvedValue({
        supabase: mockSupabase,
        user: mockUser,
      });
    });

    it("should return error if there is already a pending request", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "req-1" }, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const result = await solicitarPeca("peca-1");

      expect(result.error).toBe("Você já possui uma solicitação pendente para esta peça.");
    });

    it("should return error if piece is not available", async () => {
      // First call (check pending): return null
      // Second call (check piece): return not available
      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { status: "DISTRIBUIDA" }, error: null }),
        };
      });

      const result = await solicitarPeca("peca-1");

      expect(result.error).toBe("Esta peça não está disponível para solicitação.");
    });

    it("should insert request on success", async () => {
        let callCount = 0;
        const insertMock = vi.fn().mockResolvedValue({ error: null });
        const singleMock = vi.fn();
        
        singleMock
          .mockResolvedValueOnce({ data: null, error: null }) // check pending
          .mockResolvedValueOnce({ data: { status: "EM_ESTOQUE_EMPRESA" }, error: null }); // check availability

        mockSupabase.from.mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: singleMock,
            };
          }
          return { insert: insertMock };
        });
  
        const result = await solicitarPeca("peca-1", "Por favor");
  
        expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
          peca_id: "peca-1",
          tecnico_id: "user-123",
          observacao: "Por favor",
          status: "PENDENTE",
        }));
        expect(revalidatePath).toHaveBeenCalled();
        expect(result.error).toBeUndefined();
      });

  });

  describe("aprovarSolicitacao", () => {
    beforeEach(() => {
      (authHelpers.requireGestor as any).mockResolvedValue({
        supabase: mockSupabase,
        user: { id: "gestor-123" },
      });
    });

    it("should call rpc with correct params", async () => {
      mockSupabase.rpc.mockResolvedValue({ error: null });

      const result = await aprovarSolicitacao("req-1");

      expect(mockSupabase.rpc).toHaveBeenCalledWith("aprovar_solicitacao", {
        p_solicitacao_id: "req-1",
        p_gestor_id: "gestor-123",
      });
      expect(result.error).toBeUndefined();
    });
  });
});
