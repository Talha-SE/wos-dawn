# Oracle VM – WOS Dawn Server: Update & Operations Guide

This guide contains the exact commands and paths you need on your Oracle Ubuntu VM to update the backend whenever you push new changes to GitHub, plus common ops commands (PM2, Nginx, SSL, DNS).

- VM user: `ubuntu`
- App root on VM: `~/apps/wos-dawn/server`
- Public API URL: `https://wos-dawn.duckdns.org`
- Process name: `wos-dawn-api`

---

## 0) SSH into the VM
```bash
ssh ubuntu@<YOUR_VM_PUBLIC_IP>
```

## 1) Pull latest server code from GitHub
The repo was cloned with sparse checkout for `server/` only.

```bash
cd ~/apps/wos-dawn
# See current branch and remotes
git status
git remote -v
# Fetch and pull latest from main
git fetch origin main
# Ensure sparse checkout is still only server/
git sparse-checkout set server
# Pull latest changes
git pull origin main

# Move into server folder
cd server
```

If you changed branches or need a clean reset:
```bash
cd ~/apps/wos-dawn
git fetch --all --prune
git checkout main
git reset --hard origin/main
git sparse-checkout set server
cd server
```

## 2) Environment file (.env)
Path on VM:
```
~/apps/wos-dawn/server/.env
```
Edit when needed (DB, secrets, CORS, etc.):
```bash
cd ~/apps/wos-dawn/server
nano .env
```
Important keys:
- `PORT=4000`
- `MONGODB_URI=...`
- `JWT_SECRET=...`
- `CORS_ORIGIN=https://wos-dawn.vercel.app` (client origin)
- `ENABLE_CRON=true`

Apply env changes with PM2 (see step 4):
```bash
pm2 restart wos-dawn-api --update-env
```

## 3) Install dependencies and build
```bash
cd ~/apps/wos-dawn/server
npm ci || npm install
npm run build
```

## 4) Restart the app with PM2
```bash
# Start first time (already done previously):
# pm2 start dist/index.js --name wos-dawn-api

# On updates
pm2 restart wos-dawn-api
# If you changed .env
pm2 restart wos-dawn-api --update-env

# Persist across reboots (one‑time setup already done, safe to re-run)
pm2 save
```

Common PM2 commands:
```bash
pm2 ls
pm2 logs wos-dawn-api --lines 100
pm2 monit
pm2 stop wos-dawn-api
pm2 delete wos-dawn-api
```

## 5) Nginx reverse proxy (HTTP/HTTPS)
Site config path:
```
/etc/nginx/sites-available/wos-dawn-api
```
Reload Nginx after any change:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6) SSL (Let’s Encrypt / Certbot)
Issue/renew certificate:
```bash
# One‑time issuance (already done)
sudo certbot --nginx -d wos-dawn.duckdns.org --redirect --agree-tos -m rtalha.aws@gmail.com -n

# Check auto-renew timer
sudo systemctl status certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

## 7) DNS (DuckDNS)
Updater script path:
```
~/duckdns/wos-dawn.sh
```
Run it manually if IP changed:
```bash
~/duckdns/wos-dawn.sh
```
Cron is set to update every 5 minutes. Verify DNS:
```bash
dig +short wos-dawn.duckdns.org @1.1.1.1
```

## 8) Firewall (UFW) & Oracle security list
Ubuntu UFW:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80/443
sudo ufw status
# optional direct app ports (generally keep closed)
sudo ufw delete allow 3000/tcp || true
sudo ufw delete allow 4000/tcp || true
```
OCI Console → Networking → Security List (or VNIC sec lists):
- Allow TCP 80 and 443 from `0.0.0.0/0`.

## 9) Health checks & quick tests
```bash
# Local loopback
curl -s -I http://127.0.0.1:4000/api/health

# Through Nginx HTTP
curl -s -I http://wos-dawn.duckdns.org/api/health

# Through HTTPS
curl -s -I https://wos-dawn.duckdns.org/api/health
```

## 10) Logs & troubleshooting
App logs:
```bash
pm2 logs wos-dawn-api --lines 200
```
Nginx logs:
```bash
sudo tail -n 200 /var/log/nginx/access.log
sudo tail -n 200 /var/log/nginx/error.log
```
Certbot:
```bash
sudo tail -n 50 /var/log/letsencrypt/letsencrypt.log
```

## 11) One‑shot full update sequence
Run these after pushing to GitHub:
```bash
cd ~/apps/wos-dawn
git fetch origin main
git pull origin main
cd server
npm ci || npm install
npm run build
pm2 restart wos-dawn-api --update-env
sudo nginx -t && sudo systemctl reload nginx
curl -s -I https://wos-dawn.duckdns.org/api/health
```

## 12) Rollback (to previous commit)
```bash
cd ~/apps/wos-dawn
git log --oneline -n 5
# choose a commit SHA, then:
git reset --hard <SHA>
cd server
npm ci || npm install
npm run build
pm2 restart wos-dawn-api --update-env
```

---

Tips:
- Never commit real secrets. Keep them only in `~/apps/wos-dawn/server/.env` and in Vercel project env.
- If the client origin changes, update `CORS_ORIGIN` in `.env` and restart with `--update-env`.
- Keep only ports 80/443 open publicly; route everything via Nginx.
