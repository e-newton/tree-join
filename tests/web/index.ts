// Entry point loaded by @vscode/test-web via `extensionTestsPath`. The web
// extension host calls the exported `run()`, which boots mocha in the browser
// worker and executes the bundled smoke suite.
// Registers the global `mocha` object (browser build); typed by @types/mocha.
import 'mocha/mocha';

export function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    mocha.setup({ ui: 'tdd', reporter: undefined, timeout: 60000 });

    // Pull the test suite into the bundle (registers its `suite`/`test` calls).
    import('./web.test')
      .then(() => {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} web smoke test(s) failed.`));
          } else {
            resolve();
          }
        });
      })
      .catch(reject);
  });
}
