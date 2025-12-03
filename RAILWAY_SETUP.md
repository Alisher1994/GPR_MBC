# 🚂 Railway Setup Instructions

## ⚠️ Important: Add PostgreSQL Database

Your app is deployed but needs a database to work properly!

### Step 1: Add PostgreSQL

1. Go to your Railway project dashboard
2. Click **"New"** button
3. Select **"Database"**
4. Choose **"Add PostgreSQL"**
5. Wait for provisioning (~30 seconds)

### Step 2: Verify Environment Variables

Railway automatically creates `DATABASE_URL` when you add PostgreSQL.

Check your variables:
- `DATABASE_URL` - ✅ (auto-created by Railway)
- `JWT_SECRET` - Add: `construction-mvp-secret-2025`
- `NODE_ENV` - Add: `production`
- `PORT` - Add: `3000`

### Step 3: Redeploy

After adding PostgreSQL:
1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **"Redeploy"** or just wait for auto-redeploy

### Step 4: Check Health

Open your app URL and add `/api/health`:
```
https://your-app.railway.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected",
  "timestamp": "2025-12-03T..."
}
```

---

## 🎯 Quick Checklist

- [ ] PostgreSQL database added to Railway project
- [ ] Environment variables set (JWT_SECRET, NODE_ENV, PORT)
- [ ] App redeployed successfully
- [ ] Health endpoint shows "database": "connected"
- [ ] Can register new user
- [ ] Can login

---

## 🐛 Troubleshooting

### Database still shows "not configured"
- Check that PostgreSQL service is running in Railway
- Verify `DATABASE_URL` exists in environment variables
- Redeploy the application

### Connection refused error
- PostgreSQL is still provisioning - wait 1-2 minutes
- Check Railway service logs for PostgreSQL
- Ensure both services are in the same project

### App crashes on startup
- Check deployment logs in Railway
- Verify all environment variables are set
- Ensure PostgreSQL is fully provisioned

---

## 📚 Next Steps

Once database is connected:
1. Open your app URL
2. Register users:
   - Planner (role: planner)
   - Foreman (role: foreman)
   - Subcontractor (role: subcontractor)
3. Login as planner and upload XML file
4. Test the workflow!

---

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- GitHub Repo: https://github.com/Alisher1994/GPR_MBC
- Documentation: See START_HERE.md in repo
