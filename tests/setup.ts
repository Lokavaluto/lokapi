import { Buffer } from 'buffer'
import { afterAll, beforeAll } from 'vitest';

beforeAll(() => {
  // global.Buffer = Buffer
});

afterAll(() => {
  // delete global.Buffer
});

