import { getCompositionById, updateCompositionComposerFolder } from "./db";

type ComposerFolderDependencies = {
  getCompositionById: typeof getCompositionById;
  updateCompositionComposerFolder: typeof updateCompositionComposerFolder;
};

const liveDependencies: ComposerFolderDependencies = {
  getCompositionById,
  updateCompositionComposerFolder,
};

/**
 * Reassign a composition to a composer folder. The lookup is owner-scoped before
 * the update, so a caller can never move someone else's score.
 */
export async function assignCompositionToComposerFolder(
  input: { id: number; userId: number; composer: string },
  dependencies: ComposerFolderDependencies = liveDependencies,
) {
  const composition = await dependencies.getCompositionById(input.id, input.userId);
  if (!composition) throw new Error("Composition not found or access denied");

  await dependencies.updateCompositionComposerFolder(composition.id, input.userId, input.composer);
  return { success: true as const, id: composition.id, composer: input.composer };
}
