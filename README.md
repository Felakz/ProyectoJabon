# Proyecto Jabones - Monorepo

Base inicial para la app de costeo y producción de jabones.

Stack propuesto:
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Desktop: Tauri (preparado para empaquetar)
- Backend local: Node.js + Express + TypeScript (opcional dentro de Tauri)
- Persistencia: SQLite (local)

Carpeta principal:
- apps/web: frontend
- apps/api: backend API (local)
- packages/shared: tipos y lógica reutilizable

Instrucciones rápidas (instalación manual):

1. Instala dependencias desde la raíz (npm/pnpm/yarn) y en cada paquete.
2. Para desarrollo web:

```bash
cd apps/web
npm install
npm run dev
```

3. Backend:

```bash
cd apps/api
npm install
npm run dev
```

4. Tauri: seguir la guía oficial (requiere Rust + toolchain + WebView2 en Windows).
