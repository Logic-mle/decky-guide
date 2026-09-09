import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import ts from 'typescript';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const bundle = await rollup({
  input:'tests/preview/main.tsx',
  plugins:[
    { name:'mock-decky', resolveId(id) { if (id === '@decky/ui') return resolve('tests/preview/decky-ui.tsx'); } },
    replace({ preventAssignment:true, 'process.env.NODE_ENV':JSON.stringify('development') }),
    nodeResolve({ extensions:['.mjs','.js','.json','.ts','.tsx'] }), commonjs(),
    { name:'typescript-preview', transform(code,id) { if (/\.tsx?$/.test(id)) return ts.transpileModule(code,{ compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2020 } }).outputText; } },
  ],
});
await mkdir('out/preview', { recursive:true });
await bundle.write({ file:'out/preview/app.js', format:'iife' });
await bundle.close();
await writeFile('out/preview/index.html', '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Decky Guide · local preview</title><style>body{margin:0;background:#0e1620;font-family:Arial,"PingFang SC",sans-serif}button{cursor:pointer}</style><div id="root"></div><script src="app.js"></script>');
if (process.argv.includes('--serve')) {
  const { createServer } = await import('node:http');
  createServer(async (req,res) => {
    const name = req.url === '/app.js' ? 'app.js' : 'index.html';
    res.setHeader('Content-Type', name.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(await readFile(`out/preview/${name}`));
  }).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173 (mock Steam components)'));
}
