{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",

    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useDefineForClassFields": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["utils/*"]
    },

    "types": ["vite/client", "node"]
  },
  "include": [
    "src/**/*",
    "utils/**/*",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "env.d.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
