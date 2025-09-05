import { runCommand } from "./terminal";

export async function createGitBranch(branchName: string) {
  try {
    await runCommand(`git checkout -b ${branchName} origin/main`);
    return { success: true, message: `✅ Branch ${branchName} created.` };
  } catch (err: any) {
    return {
      success: false,
      message: `Something went wrong while creating branch: ${err?.message}`,
    };
  }
}
