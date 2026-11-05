import assert from "node:assert/strict";
import { test } from "node:test";
import { isPreviewableInBrowser } from "./file-types.ts";

test("inline preview allows documents and plain text", () => {
  for (const name of ["a.pdf", "a.txt", "a.md", "a.csv", "a.json"]) {
    assert.equal(isPreviewableInBrowser(name), true, name);
  }
});

test("inline preview refuses types that could execute in our origin", () => {
  for (const name of ["a.html", "a.htm", "a.svg", "a.js", "a.xml", "a.png", "a.mp4", "a"]) {
    assert.equal(isPreviewableInBrowser(name), false, name);
  }
});
