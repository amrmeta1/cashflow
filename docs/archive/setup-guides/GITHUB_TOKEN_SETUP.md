# 🔑 إنشاء GitHub Token لربط Amplify

## الطريقة الأسرع (دقيقتان)

### **1. افتح GitHub Settings**
```
https://github.com/settings/tokens/new
```

### **2. املأ البيانات**

**Note:** `Amplify Deployment`

**Expiration:** `90 days`

**Select scopes:**
- ✅ `repo` (Full control of private repositories)
- ✅ `admin:repo_hook` (Full control of repository hooks)

### **3. اضغط "Generate token"**

### **4. انسخ Token**
سيظهر token مثل:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **انسخه الآن! لن تراه مرة أخرى**

---

## 🚀 بعد الحصول على Token

شغّل هذا الأمر (استبدل YOUR_TOKEN):

```bash
cd /Users/adam/Desktop/tad/tadfuq-platform

# ربط GitHub بـ Amplify
aws amplify create-branch \
  --app-id d1pdf5yf8mnktj \
  --branch-name refactor/monorepo-structure \
  --region me-south-1 \
  --stage PRODUCTION \
  --framework "Next.js - SSR" \
  --enable-auto-build \
  --build-spec "$(cat frontend/amplify.yml)"

# ثم ربط Repository
aws amplify update-app \
  --app-id d1pdf5yf8mnktj \
  --region me-south-1 \
  --repository https://github.com/amrmeta1/cashflow \
  --access-token YOUR_GITHUB_TOKEN_HERE
```

---

## ✅ أو استخدم Console (أسهل)

بدلاً من Token، استخدم Amplify Console:

1. افتح: https://console.aws.amazon.com/amplify/home?region=me-south-1#/d1pdf5yf8mnktj
2. اضغط "Connect branch"
3. اختر GitHub (سيفتح OAuth - لا يحتاج token)
4. اختر Repository و Branch
5. Save and deploy

**هذه الطريقة أسهل وأسرع!**

---

أي طريقة تفضل؟
