# 🚀 Deployment Guide - Free Options (No Vercel)

## Quick Start Options

### Option 1: Netlify (Frontend) + Render (Backend) - Easiest

#### Frontend (Netlify):
1. **Push to GitHub**: Upload your code to GitHub
2. **Connect Netlify**: 
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repo
   - Build settings:
     - Build command: `cd frontend && npm run build`
     - Publish directory: `frontend/build`
3. **Get URL**: Your site will be at `your-app.netlify.app`

#### Backend (Render):
1. **Connect Render**:
   - Go to [render.com](https://render.com)
   - Click "New Web Service"
   - Connect your GitHub repo
   - Settings:
     - Build Command: `cd backend && npm install`
     - Start Command: `cd backend && node index.js`
     - Environment: Node
2. **Get URL**: Your API will be at `your-app.onrender.com`

#### Update Config:
```javascript
// In frontend/src/config.js
export const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.onrender.com'  // Your Render backend URL
  : 'http://localhost:4000';
```

### Option 2: Railway (Full Stack) - Most Flexible

1. **Connect Railway**:
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repo
   - Railway will auto-detect your services

2. **Configure Services**:
   - Backend: Use the `render.yaml` file
   - Frontend: Deploy as static site

3. **Get URLs**: Both services get `.railway.app` domains

### Option 3: Fly.io (Full Stack) - Most Control

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Deploy Backend**:
   ```bash
   cd backend
   fly launch
   fly deploy
   ```

3. **Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   fly launch
   fly deploy
   ```

## Free Domain Options

### 1. Freenom (Free Domains)
- **Domains**: `.tk`, `.ml`, `.ga`, `.cf`, `.gq`
- **Cost**: Free for 12 months
- **Steps**:
  1. Go to [freenom.com](https://freenom.com)
  2. Search for your desired domain
  3. Register for free
  4. Point to your hosting provider

### 2. InfinityFree (Free Hosting + Domain)
- **Domains**: `.epizy.com`, `.rf.gd`, `.rf.gd`
- **Cost**: Completely free
- **Steps**:
  1. Go to [infinityfree.net](https://infinityfree.net)
  2. Create account
  3. Get free subdomain
  4. Upload your files

### 3. 000webhost (Free Hosting)
- **Domains**: `.000webhostapp.com`
- **Cost**: Free
- **Steps**:
  1. Go to [000webhost.com](https://000webhost.com)
  2. Create account
  3. Get free subdomain

## Environment Variables

### For Production:
```bash
# Backend
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com

# Frontend
REACT_APP_API_URL=https://your-backend-domain.com
```

## Custom Domain Setup

### Netlify:
1. Go to Site Settings > Domain Management
2. Click "Add custom domain"
3. Enter your domain
4. Update DNS records as instructed

### Render:
1. Go to your service dashboard
2. Click "Settings" > "Custom Domains"
3. Add your domain
4. Update DNS records

## SSL/HTTPS

All these platforms provide **free SSL certificates** automatically:
- ✅ Netlify
- ✅ Render  
- ✅ Railway
- ✅ Fly.io
- ✅ Heroku

## Cost Comparison

| Platform | Frontend | Backend | Custom Domain | SSL | Total Cost |
|----------|----------|---------|---------------|-----|------------|
| Netlify + Render | Free | Free | Free | Free | **$0** |
| Railway | Free | Free | Free | Free | **$0** |
| Fly.io | Free | Free | Free | Free | **$0** |
| Heroku | Free | Free | Free | Free | **$0** |

## Recommended Setup

**For beginners**: Netlify + Render
**For developers**: Railway
**For control**: Fly.io

## Next Steps

1. Choose your preferred platform
2. Update the `API_URL` in `frontend/src/config.js`
3. Deploy backend first
4. Deploy frontend
5. Test the connection
6. Add custom domain (optional)

## Troubleshooting

### CORS Issues:
Add to your backend:
```javascript
app.use(cors({
  origin: ['https://your-frontend-domain.com', 'http://localhost:3000']
}));
```

### Build Errors:
- Check Node.js version compatibility
- Ensure all dependencies are in `package.json`
- Verify build commands are correct

### API Connection Issues:
- Verify the `API_URL` is correct
- Check if backend is running
- Ensure CORS is configured properly 