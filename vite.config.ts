import { defineConfig } from 'vite';

export default defineConfig({
  // Cette ligne est le remède miracle : elle force les chemins relatifs (./)
  base: './', 
});