"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGitBranch = createGitBranch;
const terminal_1 = require("./terminal");
async function createGitBranch(branchName) {
    try {
        await (0, terminal_1.runCommand)(`git checkout -b ${branchName} origin/main`);
        return { success: true, message: `✅ Branch ${branchName} created.` };
    }
    catch (err) {
        return {
            success: false,
            message: `Something went wrong while creating branch: ${err?.message}`,
        };
    }
}
