import esbuild from 'esbuild';

const args = new Set(process.argv.slice(2));
const isProd = args.has('--prod');
const isWatch = args.has('--watch');

const watchLogPlugin = {
  name: 'watch-log',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd((result) => {
      const errors = result.errors.length;
      if (errors > 0) {
        console.log(`[watch] build failed with ${errors} error(s)`);
      } else {
        console.log('[watch] build finished');
      }
    });
  },
};

const config = {
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: isProd ? false : 'inline',
  minify: isProd,
  logLevel: 'info',
  plugins: isWatch ? [watchLogPlugin] : [],
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[watch] watching for changes…');
} else {
  await esbuild.build(config);
}
