import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "migrations");

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Add it to your .env before migrating.");
    process.exit(1);
  }

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      console.log(`Applying ${file} ...`);
      await client.query(sql);
    }
    console.log(`Done. Applied ${files.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
