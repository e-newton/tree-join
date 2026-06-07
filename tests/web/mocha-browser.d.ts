// mocha ships its browser build at `mocha/mocha` without type declarations.
// Importing it for its side effect (registering the global `mocha`) is enough.
declare module 'mocha/mocha';
