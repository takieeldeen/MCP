"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const promises_1 = require("fs/promises");
const zod_1 = __importDefault(require("zod"));
console.log("environment variable");
console.log(process.env.PORT, "Environment variable");
const server = new mcp_js_1.McpServer({
    name: "test",
    version: "1.0.0",
    capabilities: {
        resources: true,
        tools: true,
        prompts: false,
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
server.tool("create-random-user", "Generate a random user and store in the database", {
    title: "Generate Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
}, async () => {
    const res = await server.server.request({
        method: "sampling/createMessage",
        params: {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: "Generate fake user data. The user should have a unique and realistic name (in Arabic), email, address (in Egypt), and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
                    },
                },
            ],
            maxTokens: 1024,
        },
    }, types_js_1.CreateMessageResultSchema);
    if (res.content.type !== "text") {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to generate user",
                },
            ],
        };
    }
    const newUser = JSON.parse(res.content.text
        .trim()
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim());
    try {
        const id = await createUser(newUser);
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
server.resource("user-details", new mcp_js_1.ResourceTemplate("users://{userId}/profile", { list: undefined }), {
    description: "Profile details of a user",
    title: "User Profile",
    mimeType: "application/json",
}, async (uri, { userId }) => {
    const users = await import("./data/users.json", {
        with: { type: "json" },
    }).then((m) => m.default);
    const user = users.find((user) => user.id === Number(userId));
    if (!user)
        return {
            contents: [
                {
                    uri: uri.href,
                    type: "text",
                    text: JSON.stringify({ error: "User not found" }),
                    mimeType: "application/json",
                },
            ],
        };
    return {
        contents: [
            {
                uri: uri.href,
                type: "text",
                text: JSON.stringify(user, null, 2),
                mimeType: "application/json",
            },
        ],
    };
});
server.prompt("create-fake-user", "Generate fake user data for a given name", {
    name: zod_1.default.string(),
}, ({ name }) => {
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Generate a fake user profile for the name ${name} with email, address, and phone number in JSON format.`,
                },
            },
        ],
    };
});
main();
