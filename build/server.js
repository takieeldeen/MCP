"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const promises_1 = require("fs/promises");
const zod_1 = __importDefault(require("zod"));
const server = new mcp_js_1.McpServer({
    name: "test",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    },
});
server.tool("create-user", "Create a new user in the database", {
    name: zod_1.default.string(),
    email: zod_1.default.string(),
    address: zod_1.default.string(),
    phone: zod_1.default.string(),
}, {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async (params) => {
    try {
        const id = await createUser(params);
        return {
            content: [
                {
                    type: "text",
                    text: `User with ${id} id created successfully`,
                },
            ],
        };
    }
    catch (err) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to save user",
                },
            ],
        };
    }
});
server.resource("users", "users://all", {
    description: "All users in the database",
    title: "Users",
    mimeType: "application/json",
}, async (uri) => {
    const users = await import("./data/users.json", {
        with: { type: "json" },
    }).then((m) => m.default);
    return {
        contents: [
            {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(users, null, 2),
            },
        ],
    };
});
async function createUser(params) {
    const currentUsers = await import("./data/users.json", {
        with: { type: "json" },
    }).then((m) => m.default);
    const id = currentUsers.length + 1;
    currentUsers.push({ id, ...params });
    await (0, promises_1.writeFile)("./src/data/users.json", JSON.stringify(currentUsers, null, 2));
    return id;
}
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main();
