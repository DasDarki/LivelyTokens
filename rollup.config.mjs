import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import typescript from '@rollup/plugin-typescript';

export default {
  input: "src/index.ts",
  output: {
    dir: "dist/",
    format: "es",
    preserveModules: true,
    sourcemap: false
  },
  plugins: [
    typescript(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    terser()
  ]
};
