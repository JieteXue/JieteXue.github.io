import { readFileSync, writeFileSync } from "node:fs";

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

export function writeText(path, text) {
  writeFileSync(path, text);
}
