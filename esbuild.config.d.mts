import type { BuildOptions } from 'esbuild';

// Hand-written declarations so TypeScript tests can import the build configs
// from this JS module (esbuild.config.mjs) without `allowJs`.
export declare const nodeConfig: BuildOptions;
export declare const webConfig: BuildOptions;
export declare function copyWasm(): void;
