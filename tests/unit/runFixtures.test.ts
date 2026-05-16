import { runFixtures } from '../runFixtures';

runFixtures(
  new URL('../fixtures/sample', import.meta.url),
  async (input) => input,
);
