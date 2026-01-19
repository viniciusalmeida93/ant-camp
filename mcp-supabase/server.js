#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const PROJECT_CWD = process.env.MCP_PROJECT_CWD || process.cwd();

async function run(cmd) {
  const { stdout, stderr } = await execAsync(cmd, {
    cwd: PROJECT_CWD,
    maxBuffer: 1024 * 1024 * 10,
    env: process.env,
  });
  return (stdout || "") + (stderr || "");
}

const server = new McpServer({
  name: "supabase-mcp",
  version: "1.0.0",
});

server.tool(
  "supabase_gen_types",
  {
    outFile: z.string().default("src/integrations/supabase/types.generated.ts"),
    schema: z.string().default("public"),
    projectId: z.string().default("jxuhmqctiyeheamhviob"),
  },
  async ({ outFile, schema, projectId }) => {
    await run(
      `npx supabase gen types typescript --project-id ${projectId} --schema ${schema} > ${outFile}`
    );
    return { content: [{ type: "text", text: `Types gerados em ${outFile}` }] };
  }
);

server.tool(
  "supabase_migration_new",
  { name: z.string() },
  async ({ name }) => {
    const out = await run(`npx supabase migration new ${name}`);
    return { content: [{ type: "text", text: out }] };
  }
);

server.tool(
  "supabase_db_push",
  {},
  async () => {
    const out = await run(`npx supabase db push`);
    return { content: [{ type: "text", text: out }] };
  }
);

server.tool(
  "supabase_functions_deploy",
  { name: z.string() },
  async ({ name }) => {
    const out = await run(`npx supabase functions deploy ${name}`);
    return { content: [{ type: "text", text: out }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
