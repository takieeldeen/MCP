import { input, select } from "@inquirer/prompts";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const client = new Client(
  {
    name: "jira-github-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      sampling: {},
    },
  }
);

// Client Transport
const transport = new StdioClientTransport({
  command: "node",
  args: ["--env-file=.env", "build/server.js"],
  stderr: "ignore",
});

// Main function
async function main() {
  await client.connect(transport);
  const [{ tools }, { propmts }, { resources }, { resourceTemplates }] =
    await Promise.all([
      client.listTools(),
      client.listResources(),
      client.listResourceTemplates(),
      client.listPrompts(),
    ]);
  console.log("You are connected!");
  while (true) {
    const option = await select({
      message: "What would you like me to do?",
      choices: ["Query", "Tools", "Resources", "Prompts"],
    });

    switch (option) {
      case "Tools":
        const toolName = await select({
          message: "Select your tool",
          choices: tools.map((tool) => ({
            name: tool.annotations?.title || tool.name,
            value: tool.name,
            description: tool.description,
          })),
        });

        const tool = tools.find((tool) => tool.name === toolName);
        if (!tool) {
          console.log(`Tool Not Found`);
        } else {
          await handleTool(tool);
        }
    }
  }
}

async function handleTool(tool: Tool) {
  const args: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    tool.inputSchema.properties ?? {}
  )) {
    args[key] = await input({
      message: `Please enter the value for ${key} (${
        (value as { type: string }).type
      })`,
    });
  }
  const res = await client.callTool({
    name: tool.name,
    arguments: args,
  });

  console.log((res.content as [{ text: string }])[0].text);
}

main();
