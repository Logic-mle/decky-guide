import { rollup } from "rollup";
import config from "../rollup.config.js";

const configurations = Array.isArray(config) ? config : [config];

for (const options of configurations) {
  const { output, ...input } = options;
  const bundle = await rollup(input);
  for (const target of Array.isArray(output) ? output : [output]) {
    await bundle.write(target);
  }
  await bundle.close();
}

// Some versions of the TypeScript Rollup plugin leave an idle worker handle
// under newer Node releases. All bundles are closed and written at this point.
process.exit(0);
