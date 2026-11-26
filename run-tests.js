import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { run } from "node:test";
import { spec } from "node:test/reporters";

function findTestFiles(dir) {
  let results = [];
  try {
    const list = readdirSync(dir);
    for (const file of list) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== "node_modules" && file !== ".git" && file !== "dist") {
          results = results.concat(findTestFiles(fullPath));
        }
      } else if (file.endsWith(".test.js")) {
        results.push(fullPath);
      }
    }
  } catch (err) {}
  return results;
}

const testFiles = findTestFiles("tests").concat(findTestFiles("packages"));
console.log(`Discovered ${testFiles.length} test files across monorepo:`);
testFiles.forEach((f) => console.log(` - ${f}`));

run({ files: testFiles })
  .compose(new spec())
  .pipe(process.stdout);
