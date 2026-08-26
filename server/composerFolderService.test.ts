import { describe, expect, it, vi } from "vitest";
import { assignCompositionToComposerFolder } from "./composerFolderService";

describe("assignCompositionToComposerFolder", () => {
  it("persists the requested folder using the authenticated library owner and leaves analysis untouched", async () => {
    const composition = {
      id: 42,
      userId: 7,
      analysis: { composer: "Gibran Alcocer", title: "Idea 9" },
    } as any;
    const getCompositionById = vi.fn().mockResolvedValue(composition);
    const updateCompositionComposerFolder = vi.fn().mockResolvedValue(undefined);

    const result = await assignCompositionToComposerFolder(
      { id: 42, userId: 7, composer: "Frédéric Chopin" },
      { getCompositionById, updateCompositionComposerFolder },
    );

    expect(getCompositionById).toHaveBeenCalledWith(42, 7);
    expect(updateCompositionComposerFolder).toHaveBeenCalledWith(42, 7, "Frédéric Chopin");
    expect(composition.analysis).toEqual({ composer: "Gibran Alcocer", title: "Idea 9" });
    expect(result).toEqual({ success: true, id: 42, composer: "Frédéric Chopin" });
  });

  it("rejects moves for a composition outside the authenticated library", async () => {
    const updateCompositionComposerFolder = vi.fn();

    await expect(assignCompositionToComposerFolder(
      { id: 99, userId: 7, composer: "Claude Debussy" },
      {
        getCompositionById: vi.fn().mockResolvedValue(null),
        updateCompositionComposerFolder,
      },
    )).rejects.toThrow("Composition not found or access denied");

    expect(updateCompositionComposerFolder).not.toHaveBeenCalled();
  });
});
