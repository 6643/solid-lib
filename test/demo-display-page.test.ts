import { expect, test } from "./harness/test.ts";
import { readText } from "./harness/io.ts";
import { join } from "node:path";

test("DisplayPage uses ListBox's function children API", async () => {
  const source = await readText(
    join(import.meta.dirname, "..", "demo", "src", "pages", "DisplayPage.tsx"),
  );

  expect(source).toContain("<ListBox");
  expect(source).toContain("changed={setListIndex}");
  expect(source).toContain("children={(item) => (");
});
