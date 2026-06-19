{
  "name": "genie-mvp",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "shared",
    "server",
    "extension"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=@genie/server",
    "dev:server": "npm run dev --workspace=@genie/server",
    "dev:extension": "npm run dev --workspace=@genie/extension",
    "build": "npm run build --workspace=@genie/extension",
    "build:extension": "npm run build --workspace=@genie/extension",
    "build:server": "npm run build --workspace=@genie/server",
    "start:server": "npm run start --workspace=@genie/server",
    "demo": "npm run dev --workspace=@genie/server"
  },
  "dependencies": {
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "esbuild": "^0.28.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5.9.3"
  }
}