# Proyecto Jabón — Docker deployment

Estos son los archivos añadidos para desplegar la aplicación con Docker Compose.

Contenido creado:
- `apps/api/Dockerfile` — Dockerfile multi-stage para construir y servir el backend (Node.js).
- `Dockerfile` — Dockerfile para la app web (Vite) y servirla con Nginx.
- `nginx.conf` — configuración de Nginx para servir la SPA y proxear `/api` a `api:3000`.
- `docker-compose.yml` — orquesta `api` y `web` (nginx).

Pasos para ejecutar en la PC de origen

1. Abra PowerShell en la raíz del proyecto (donde está `docker-compose.yml`).

2. Construir y levantar los servicios:

```powershell
cd "C:\Users\DARIO\PROYECTOJABON\Soap Management Application"
docker compose up --build -d
```

3. Verifica que los servicios estén arriba:

```powershell
docker compose ps
docker compose logs -f api
docker compose logs -f web
```

4. Accede:
- Frontend: http://localhost/
- Backend API: http://localhost:3000/

Notas
- Si tu frontend utiliza `import.meta.env.VITE_API_URL`, el Dockerfile usa el arg `VITE_API_URL` con valor `http://api:3000` dentro de la red de Docker Compose.
- Si el backend usa archivos locales (sqlite, json), considera añadir volúmenes en `docker-compose.yml` para persistencia.
- Si tienes puertos en uso (80 o 3000), cámbialos en `docker-compose.yml`.
