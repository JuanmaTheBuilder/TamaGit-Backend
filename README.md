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
npm run db:seed      # carga assets y prendas de ejemplo para la demo
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
| POST | `/pets/:petId/items/:itemId/equip` | JWT | Equipa una prenda (respetando un item por slot). |
| POST | `/pets/:petId/items/:itemId/unequip` | JWT | Desequipa una prenda. |
| GET | `/users` `/users/me` `/users/:id/pets` | Parcial | Usuarios y sus mascotas. |
| GET/POST/PATCH/DELETE | `/items` | JWT (admin) | CRUD de items (catalogo). |
| GET/POST/PATCH/DELETE | `/foods` | JWT (admin) | CRUD de comidas (catalogo). |
| GET | `/notifications` | JWT | Avisos del administrador. |

El usuario se identifica con el header `Authorization: Bearer <token>` (JWT devuelto
por el callback de OAuth).

## Cosméticos (assets, slots y equipar)

El backend soporta prendas cosméticas para las mascotas mediante los siguientes conceptos:

- **`Asset`**: recurso 3D (por ejemplo un archivo `.glb`) usado por las prendas o por el modelo base de la mascota.
- **`Slot`**: enum de Prisma con los valores `HEAD`, `BODY` y `LEGS`. Cada prenda (`Item`) puede pertenecer a un slot; si no tiene slot, no es equipable.
- **`PetItem.equipped`**: indica si una prenda del inventario de una mascota está puesta.
- **`Pet.modelAssetId`**: asset del modelo 3D base de la mascota.
- **`Item.assetId` + `Item.imageUrl`**: cada prenda puede tener un asset 3D y, como respaldo, una imagen 2D.

### Regla de negocio en el servidor

Solo se permite **una prenda equipada por slot** por mascota. Al equipar una prenda en un slot que ya tiene otra equipada, la anterior se desequipa automáticamente. El slot de la prenda y el slot objetivo deben coincidir; un item sin slot no es equipable.

### Endpoints

- `POST /pets/:petId/items/:itemId/equip` — equipa una prenda del inventario de la mascota.
- `POST /pets/:petId/items/:itemId/unequip` — desequipa una prenda.

Ambos endpoints requieren que el usuario sea el dueño de la mascota o un administrador.

### Ejemplo de uso para la demo

Obtén un token con:

```bash
npm run token <tu_usuario_de_github>
```

Luego, asumiendo que ya existe una mascota (`$PET_ID`) y que se han asignado items al inventario (puedes crearlos con `npm run db:seed`):

```bash
# 1. Equipar el primer sombrero (slot HEAD)
curl -X POST https://tama-git-backend.vercel.app/pets/$PET_ID/items/$HAT_1_ID/equip \
  -H "Authorization: Bearer $TOKEN"

# 2. Equipar otro sombrero: el primero se desequipa automaticamente
#    porque comparten el slot HEAD
curl -X POST https://tama-git-backend.vercel.app/pets/$PET_ID/items/$HAT_2_ID/equip \
  -H "Authorization: Bearer $TOKEN"

# 3. Ver el JSON de apariencia: especie, color y prendas equipadas
curl https://tama-git-backend.vercel.app/pets/$PET_ID \
  -H "Authorization: Bearer $TOKEN"
```

La respuesta de `GET /pets/:id` incluye el array `items` con cada `PetItem`, su campo `equipped` y el `slot` del item, lo que permite construir el endpoint de apariencia.