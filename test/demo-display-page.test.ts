import { expect, test } from "bun:test";
import { join } from "node:path";

test("DisplayPage uses ListBox's function children API", async () => {
  const source = await Bun.file(join(import.meta.dir, "..", "demo", "src", "pages", "DisplayPage.tsx")).text();

  expect(source).toContain("<ListBox");
  expect(source).toContain("changed={setListIndex}");
  expect(source).toContain("children={(item) => (");
});
