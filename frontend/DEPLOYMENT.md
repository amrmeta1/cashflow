# Tadfuq Platform - Deployment Guide

## 🚀 Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from frontend directory:**
```bash
cd frontend
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No**
   - Project name? **tadfuq-platform** (or your choice)
   - Directory? **./frontend** or **./** if already in frontend
   - Override settings? **No**

5. **Deploy to production:**
```bash
vercel --prod
```

---

### Option 2: Deploy via Vercel Dashboard

1. **Go to:** https://vercel.com/new

2. **Import Git Repository:**
   - Connect your GitHub/GitLab/Bitbucket account
   - Select the `tadfuq-platform` repository
   - Set root directory to `frontend`

3. **Configure Project:**
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Environment Variables (if needed):**
   - Add any required environment variables
   - Example: `NEXT_PUBLIC_API_URL`

5. **Click Deploy!**

---

## 🌐 Your Live URL

After deployment, you'll get a URL like:
- **Production:** `https://tadfuq-platform.vercel.app`
- **Preview:** `https://tadfuq-platform-xxx.vercel.app`

---

## 🔧 Environment Variables

If you need environment variables, create them in Vercel Dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add variables:
   - `NEXT_PUBLIC_API_URL` - Your backend API URL
   - `NEXTAUTH_SECRET` - Authentication secret
   - `NEXTAUTH_URL` - Your production URL

---

## 📦 Build Settings

**Vercel automatically detects Next.js and uses:**
- Node.js version: 18.x or 20.x
- Build command: `npm run build`
- Output directory: `.next`
- Install command: `npm install`

---

## 🔄 Automatic Deployments

Once connected to Git:
- **Push to main branch** → Automatic production deployment
- **Push to other branches** → Automatic preview deployment
- **Pull requests** → Preview deployments with unique URLs

---

## 🎯 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records:
   - Type: **A** or **CNAME**
   - Name: **@** or **www**
   - Value: Provided by Vercel

---

## ✅ Deployment Checklist

Before deploying, make sure:
- ✅ `npm run build` works locally
- ✅ All environment variables are set
- ✅ `.gitignore` includes `.env*.local`
- ✅ No hardcoded secrets in code
- ✅ All dependencies are in `package.json`

---

## 🐛 Troubleshooting

### Build fails?
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint
```

### Missing dependencies?
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Environment variables not working?
- Make sure they start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new variables

---

## 📊 Monitoring

Vercel provides:
- **Analytics** - Page views, performance metrics
- **Logs** - Build and runtime logs
- **Speed Insights** - Core Web Vitals
- **Error Tracking** - Runtime errors

---

## 🔒 Security

- All deployments use HTTPS by default
- Automatic SSL certificates
- DDoS protection included
- Edge network for fast global access

---

## 💰 Pricing

**Hobby Plan (Free):**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Perfect for this project!

**Pro Plan ($20/month):**
- More bandwidth
- Team collaboration
- Advanced analytics

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Community:** https://github.com/vercel/vercel/discussions

---

**Ready to deploy? Run:** `vercel --prod`
