import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { writeFile } from "fs/promises";
import z from "zod";
import {
  addIssueComment,
  assignUserToIssue,
  changeIssueStatus,
  createFESubtask,
  getIssueDetails,
} from "./utils/jira";
const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: true,
    tools: true,
    prompts: false,
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
// Developing New Feature
server.tool(
  "init-feature",
  "Start Development of a new feature",
  {
    issueId: z.string(),
  },
  {
    title: "Create a New Feature ",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ issueId }) => {
    try {
      const targetIssue = await getIssueDetails(issueId);

      const FE_CHILD = targetIssue?.fields?.subtasks?.find(
        (subtask: any) => subtask?.fields?.summary?.toLowerCase() === "fe"
      );
      const HAS_FE_CHILD = !!FE_CHILD;
      if (HAS_FE_CHILD) {
        await changeIssueStatus(FE_CHILD?.key, "In Progress");
        await assignUserToIssue(FE_CHILD?.key);
      } else {
        const res = (await createFESubtask(issueId)) as any;
        await changeIssueStatus(res?.subtaskKey, "In Progress");
        await assignUserToIssue(res?.subtaskKey);
      }
      await changeIssueStatus(issueId, "In Progress");
      return {
        content: [
          {
            type: "text",
            text: "JIRA Issue Found and status will be converted to In Progress",
          },
        ],
      };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: "Something went wrong while updating your jira status",
          },
        ],
      };
    }
  }
);

// Creating a PR For a feature
server.tool(
  "create-pr",
  "Create a Pull request for the currently under development feature.",
  {
    issueId: z.string(),
  },
  {
    title: "Create a New Feature ",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ issueId }) => {
    await addIssueComment(issueId, "PR_CREATION");
    return {
      content: [
        {
          type: "text",
          text: "JIRA Issue Found and status will be converted to In Progress",
        },
      ],
    };
  }
);

server.tool(
  "create-branch",
  "Create a Branch for Development of a certain feature",
  {
    issueId: z.string(),
  },
  {
    title: "Create a Branch",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async ({ issueId }) => {
    try {
      return {
        content: [
          {
            type: "text",
            text: "Branch was created successfully using the issue id",
          },
        ],
      };
    } catch {
      return {
        content: [
          {
            type: "text",
            text: "Something went wrong while creating the new branch",
          },
        ],
      };
    }
  }
);

server.tool(
  "create-random-user",
  "Generate a random user and store in the database",
  {
    title: "Generate Random User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  async () => {
    const res = await server.server.request(
      {
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
      },
      CreateMessageResultSchema
    );
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
    const newUser = JSON.parse(
      res.content.text
        .trim()
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim()
    );
    console.log(newUser);
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
    console.log(users);
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

server.resource(
  "user-details",
  new ResourceTemplate("users://{userId}/profile", { list: undefined }),
  {
    description: "Profile details of a user",
    title: "User Profile",
    mimeType: "application/json",
  },
  async (uri, { userId }) => {
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
  }
);

server.prompt(
  "create-fake-user",
  "Generate fake user data for a given name",
  {
    name: z.string(),
  },
  ({ name }: { name: string }) => {
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
  }
);

main();
