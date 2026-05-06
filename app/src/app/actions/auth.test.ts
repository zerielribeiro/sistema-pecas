import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProfileAction } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Mock supabase server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("auth actions", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
  };

  const mockUser = { id: "user-123", email: "old@email.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabase);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  });

  describe("updateProfileAction", () => {
    it("should allow password change", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

      const formData = new FormData();
      formData.append("nome", "User Name");
      formData.append("email", "user@email.com");
      formData.append("newPassword", "new-password-123");
      formData.append("confirmPassword", "new-password-123");

      const result = await updateProfileAction({}, formData);

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "new-password-123",
      });
      expect(result.success).toBe(true);
    });

    it("should return error if passwords don't match", async () => {
      const formData = new FormData();
      formData.append("nome", "User Name");
      formData.append("email", "user@email.com");
      formData.append("newPassword", "pass1");
      formData.append("confirmPassword", "pass2");

      const result = await updateProfileAction({}, formData);

      expect(result.error).toBe("As senhas não coincidem.");
      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("should NOT update anything else even if provided", async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });

      const formData = new FormData();
      formData.append("nome", "User Name");
      formData.append("email", "user@email.com");
      formData.append("newPassword", "new-password-123");
      formData.append("confirmPassword", "new-password-123");

      const result = await updateProfileAction({}, formData);

      // Should only call with password
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: "new-password-123",
      });
      // Verification that no other keys are in the object
      expect(Object.keys(mockSupabase.auth.updateUser.mock.calls[0][0])).toEqual(["password"]);
      expect(result.success).toBe(true);
    });
  });
});
