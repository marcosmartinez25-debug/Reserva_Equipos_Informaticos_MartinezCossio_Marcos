import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,ts}'],
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      SESSION_SECRET: 'secreto-solo-para-las-pruebas-automaticas-1234'
    }
  }
});
