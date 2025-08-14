import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const serverCwdUrl = new URL("../../mcp-server/", import.meta.url);
  const serverCwd = fileURLToPath(serverCwdUrl);
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => typeof v === "string") as Array<[string, string]>
  );
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join("dist", "index.js")],
    cwd: serverCwd,
    env,
    stderr: "inherit"
  });

  const client = new Client({ name: "awesome-copilot-mcp-sample-client", version: "0.1.0" });
  await client.connect(transport);

  console.log("Connected to MCP server\n");

  // await client.callTool({ name: "set_repo", arguments: { repo: "github/awesome-copilot", branch: "main", maxItems: 20 } });

  const index = await client.callTool({ name: "build_index", arguments: { forceRefresh: true } });
  console.log(`Index call content present: ${Boolean(index?.content)}`);

  const search = await client.callTool({ name: "search", arguments: { query: "azure" } });
  console.log(`Search call returned content: ${Array.isArray(search?.content)}`);

  const getFirstPath = (res: any): string | undefined => {
    try {
      const txt = res?.content?.[0]?.text;
      if (!txt) return undefined;
      const arr = JSON.parse(txt);
      return Array.isArray(arr) && arr[0] ? arr[0].path : undefined;
    } catch { return undefined; }
  };

  const firstPath = getFirstPath(search);
  if (firstPath) {
    const preview = await client.callTool({ name: "preview", arguments: { path: firstPath } });
    const install = await client.callTool({ name: "install", arguments: { path: firstPath } });
    console.log(`Preview + Install responded (content present: ${Boolean(preview?.content && install?.content)})`);
  }

  const rate = await client.callTool({ name: "rate_limit" });
  console.log(`Rate limit call content present: ${Boolean(rate?.content)}`);

  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


