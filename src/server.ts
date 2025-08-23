import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFile } from "fs";
import { writeFile } from "fs/promises";
import z from "zod";
const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

server.tool(
  "create-user",
  "Create a new user in the database",
  {
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async (params) => {
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
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to save user",
          },
        ],
      };
    }
  }
);

server.resource(
  "users",
  "users://all",
  {
    description: "All users in the database",
    title: "Users",
    mimeType: "application/json",
  },
  async (uri) => {
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
  }
);

async function createUser(params: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) {
  const currentUsers = await import("./data/users.json", {
    with: { type: "json" },
  }).then((m) => m.default);
  const id = currentUsers.length + 1;
  currentUsers.push({ id, ...params });
  await writeFile(
    "./src/data/users.json",
    JSON.stringify(currentUsers, null, 2)
  );
  return id;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
