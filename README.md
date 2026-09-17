# TamaGit - Backend

Backend (API REST) para **TamaGit**, una aplicacion movil estilo Tamagotchi que
conecta tu cuenta de GitHub, sincroniza tus repositorios y te permite crear una
mascota por cada proyecto.

Stack: **Node.js + Express 5 + Prisma ORM + PostgreSQL + GitHub OAuth (JWT)**.

- Repo frontend: [`jy2403/Tamagit`](https://github.com/jy2403/Tamagit)
- **Despliegue en produccion (Vercel):** https://tama-git-backend.vercel.app

> **Importante:** para usar la app **no hace falta desplegar este backend**.
> Ya esta en produccion en Vercel y el front apunta a esa URL por defecto.
> Este README describe como desarrollarlo o probarlo en local.

## Requisitos

- Node.js 20 o superior
- PostgreSQL (local o remoto, p. ej. Neon/Supabase)
- Una app OAuth de GitHub (Settings -> Developer settings -> OAuth Apps)

## Puesta en marcha local

```bash
npm install
cp .env.example .env   # completa los valores
npx prisma migrate dev # crea la base y aplica las migraciones
npm run dev            # servidor en http://localhost:3000
```

### Variables de entorno

Todas las variables viven en `.env` (ver `.env.example`):

| Variable                | Requerida | Descripcion |
| ----------------------- | --------- | ----------- |
| `DATABASE_URL`          | Si        | Cadena de conexion PostgreSQL de Prisma. |
| `JWT_SECRET`            | Si        | Secreto para firmar los tokens JWT. |
| `GITHUB_CLIENT_ID`      | Si        | Client ID de la app OAuth de GitHub. |
| `GITHUB_CLIENT_SECRET`  | Si        | Client Secret de la app OAuth de GitHub. |
| `GITHUB_CALLBACK_URL`   | No        | URL de callback de OAuth; si no, se infiere de la peticion. |
| `GITHUB_SCOPE`          | No        | Scopes de GitHub (default: `read:user user:email`). |
| `TAMAGIT_DEEP_LINK`     | No        | Deep link de la app (`tamagit://auth`) para redirigir tras el login. |
| `JWT_EXPIRES`           | No        | Expiracion del token (default: `30d`). |
| `PORT`                  | No        | Puerto local (default: `3000`). |

## Scripts utiles

```bash
npm run dev          # desarrollo con auto-reload
npm run db:migrate   # crear/aplicar migraciones (prisma migrate dev)
npm run db:deploy    # aplicar migraciones en produccion (prisma migrate deploy)
npm run token        # genera un token JWT para un usuario (npm run token <username>)
```

## Despliegue en Vercel

El `build` ya ejecuta `prisma migrate deploy && prisma generate`, y `start` levanta
el servidor con `node src/index.js`.

Configuracion en Vercel:

- **Build Command:** `npm run build`
- **Install Command:** `npm install`
- **Start Command:** `node src/index.js`

> Importante: cada vez que se agrega una migracion de Prisma hay que **redesplegar**
> el backend para que `prisma migrate deploy` la aplique a la base de produccion.
> Si una tabla o columna nueva no aparece en produccion, es porque falta redesplegar.

En Vercel tambien debes definir las variables del apartado anterior
(a excepcion de `PORT`).

## API (resumen)

| Metodo | Ruta                    | Protegida | Uso |
| ------ | ----------------------- | --------- | --- |
| GET    | `/auth/github/login`    | No        | Inicia OAuth con GitHub. |
| GET    | `/auth/github/callback` | No        | Callback de OAuth; devuelve `token` + `user`. |
| GET/POST | `/projects` `/projects/sync` | JWT | Lista/sincroniza repos como proyectos. |
| POST/GET | `/projects/:id/pet`   | JWT        | Crea/consulta la mascota del proyecto. |
| GET/PATCH/DELETE | `/pets/:id` | JWT  | CRUD de mascota (crear desde el proyecto). |
| POST/DELETE | `/pets/:petId/items(/:itemId)` | JWT (admin) | Inventario de items de la mascota. |
| GET | `/users` `/users/me` `/users/:id/pets` | Parcial | Usuarios y sus mascotas. |
| GET/POST/PATCH/DELETE | `/items` | JWT (admin) | CRUD de items (catalogo). |
| GET/POST/PATCH/DELETE | `/foods` | JWT (admin) | CRUD de comidas (catalogo). |
| GET | `/notifications` | JWT | Avisos del administrador. |

El usuario se identifica con el header `Authorization: Bearer <token>` (JWT devuelto
por el callback de OAuth).