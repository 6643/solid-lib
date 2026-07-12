import { expect, test } from "bun:test";

import { APP_RUNTIME_MODULE, createBootstrapSource } from "../src/builder/bundle";

test("builder bootstrap mounts the root component with the configured mount id", () => {
  expect(createBootstrapSource({ rootComponentImportPath: "./src/_.tsx", mountId: "app" })).toBe(
    [
      `import { render as mount } from ${JSON.stringify(APP_RUNTIME_MODULE)};`,
      `import App from ${JSON.stringify("./src/_.tsx")};`,
      "",
      'let mountRoot = document.getElementById("app");',
      "",
      "if (!mountRoot) {",
      '  mountRoot = document.createElement("div");',
      '  mountRoot.id = "app";',
      "  document.body.append(mountRoot);",
      "}",
      "",
      "mount(() => <App />, mountRoot);",
    ].join("\n"),
  );
});

test("builder bootstrap JSON-escapes import paths to prevent source injection", () => {
  const source = createBootstrapSource({
    rootComponentImportPath: `./foo"; import "evil`,
    mountId: "app",
  });

  expect(source).toContain(`import App from ${JSON.stringify(`./foo"; import "evil`)}`);
  expect(source).not.toContain('from "./foo"; import "evil"');
});
