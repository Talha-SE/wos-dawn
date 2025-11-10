# WOS Dawn

A modern dark, glassmorphism web app for automated gift code redemption with login/signup, MongoDB Atlas, and a dashboard with Profile and Redeem tabs.

## Stack
- **Frontend**: Vite + React + TypeScript + TailwindCSS (dark + glass UI)
- **Backend**: Node.js + Express + TypeScript + Mongoose + JWT + node-cron
- **DB**: MongoDB Atlas

## Project structure
```
WOS-DAWN/
  server/
    src/
      config/ env.ts
      cron/ autoRedeem.ts
      db/ connection.ts
      middleware/ auth.ts
      models/ GiftCode.ts, User.ts
      routes/ admin.ts, auth.ts, gift.ts, user.ts
      index.ts
    .env.example
    package.json
    tsconfig.json
  client/
    src/
      components/ Button.tsx, Input.tsx, Sidebar.tsx
      pages/ Login.tsx, Signup.tsx, Dashboard.tsx, Profile.tsx, Redeem.tsx
      services/ api.ts
      state/ AuthContext.tsx
      App.tsx, main.tsx, index.css
    index.html
    package.json
    tailwind.config.js, postcss.config.js, tsconfig.json, vite.config.ts
    .env.example
```

## Backend setup
1. Create `server/.env` from example and fill values:
```
PORT=4000
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=<random-strong-secret>
ADMIN_EMAIL=your-admin@example.com
ENABLE_CRON=true
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority&appName=<app>
```

**For Admin Access**: Simply add your email to `ADMIN_EMAIL` in `.env` - that's it! See [ADMIN_SETUP_QUICK.md](ADMIN_SETUP_QUICK.md) for details.

2. Install and run:
```
# in server/
npm install
npm run dev
```

## Frontend setup
1. Optionally set `client/.env` if backend base URL differs:
```
VITE_API_URL=http://localhost:4000/api
```
2. Install and run:
```
# in client/
npm install
npm run dev
```
The app will be at http://localhost:5173

## Features
- Auth: signup/login with JWT
- Dashboard with collapsible left pane tabs (Profile, Redeem)
- Profile: set Game ID, toggle auto redemption, fetch in-game profile via backend proxy
- Redeem: view active codes from DB, redeem latest or manual code, save Game ID, toggle automation
- Admin: manage gift codes via header `x-admin-secret: <ADMIN_SECRET>`
- Cron: attempts redemption of latest active code every 15 minutes for users with automation enabled

## API overview
- `POST /api/auth/signup { email, password } -> { token, user }`
- `POST /api/auth/login { email, password } -> { token, user }`
- `GET /api/user/me` (Bearer)
- `PUT /api/user/me/game { gameId }` (Bearer)
- `PUT /api/user/me/automation { enabled }` (Bearer)
- `GET /api/user/me/profile` (Bearer) -> proxies to WOS player endpoint
- `GET /api/gift/codes` (Bearer)
- `POST /api/gift/redeem { code }` (Bearer) -> proxies to WOS gift_code endpoint
- `POST /api/gift/redeem/latest` (Bearer)
- Admin (requires header `x-admin-secret`):
  - `GET /api/admin/gift/codes/all`
  - `POST /api/admin/gift/codes { code, expiresAt?, active? }`
  - `PUT /api/admin/gift/codes/:id { expiresAt?, active? }`
  - `DELETE /api/admin/gift/codes/:id`

## External WOS endpoints
Configured in `server/.env` (defaults included):
- `WOS_PLAYER_URL=https://wos-giftcode-api.centurygame.com/api/player`
- `WOS_GIFT_URL=https://wos-giftcode-api.centurygame.com/api/gift_code`

Payloads currently assume `{ game_id, player_id }` for profile and `{ game_id, player_id, code }` for redemption. Adjust `server/src/services/wos.ts` if the API requires different fields.

## Notes
- Use a strong `JWT_SECRET` and a secure `ADMIN_SECRET`.
- Ensure a 3-node MongoDB Atlas cluster or higher for production reliability; enable IP access and SRV connection.
- Unique index on `User.email` is defined by schema.

## Build
- Backend: `npm run build` in `server/` -> `server/dist`
- Frontend: `npm run build` in `client/` -> `client/dist`

## License
MIT
