# 🚀 Guía de Despliegue - Complejo Triple Doble

## 📋 Resumen
- **Frontend**: React + Vite + Tailwind CSS → **Vercel**
- **Backend**: Supabase (ya desplegado en la nube)
- **Costo**: 100% GRATUITO

---

## ✅ Pre-requisitos
- [x] Proyecto en GitHub
- [x] Cuenta de Supabase configurada
- [x] Variables de entorno configuradas localmente

---

## 🔧 Paso 1: Preparar el repositorio

### 1.1 Verificar que todos los cambios estén guardados
```bash
git status
```

### 1.2 Agregar el archivo de configuración de Vercel
```bash
git add vercel.json DEPLOY.md
git commit -m "Add Vercel configuration for deployment"
git push origin main
```

**IMPORTANTE:** Asegúrate de que el archivo `.env` NO esté en el repositorio (debe estar en `.gitignore`)

---

## 🌐 Paso 2: Desplegar en Vercel

### 2.1 Crear cuenta en Vercel
1. Ve a: https://vercel.com
2. Click en **"Sign Up"**
3. Selecciona **"Continue with GitHub"**
4. Autoriza a Vercel para acceder a tus repositorios

### 2.2 Importar proyecto
1. En el dashboard de Vercel, click en **"Add New Project"**
2. Busca tu repositorio `TDP` en la lista
3. Click en **"Import"**

### 2.3 Configurar el proyecto
Vercel detectará automáticamente que es un proyecto Vite. La configuración debería verse así:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**NO cambies nada**, Vercel ya lo detectó correctamente.

### 2.4 Agregar Variables de Entorno
Click en **"Environment Variables"** y agrega:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | Tu URL de Supabase (ej: `https://xxxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Tu clave anónima de Supabase |

**¿Dónde encontrar estos valores?**
1. Ve a tu proyecto en: https://app.supabase.com
2. Click en ⚙️ **Settings** > **API**
3. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`

### 2.5 Desplegar
1. Click en **"Deploy"**
2. Espera 1-2 minutos mientras Vercel construye tu proyecto
3. ¡Listo! Tu sitio estará disponible en: `https://tu-proyecto.vercel.app`

---

## 🎉 ¡Despliegue Exitoso!

### Tu aplicación ahora está en:
```
https://tu-proyecto.vercel.app
```

### Características incluidas:
✅ HTTPS automático
✅ CDN global (super rápido en todo el mundo)
✅ Deploy automático en cada push a GitHub
✅ Preview deployments para cada Pull Request
✅ Variables de entorno seguras
✅ Dominio personalizado gratis (.vercel.app)

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas cambios:
```bash
git add .
git commit -m "Tu mensaje"
git push origin main
```

**Vercel desplegará automáticamente** los cambios en 1-2 minutos.

---

## 🎨 Dominio Personalizado (Opcional)

Si quieres usar tu propio dominio (ej: `tripledoble.com`):

1. En Vercel, ve a tu proyecto
2. Click en **"Settings"** > **"Domains"**
3. Agrega tu dominio
4. Sigue las instrucciones para configurar los DNS

---

## 🔐 Seguridad

### Variables de entorno protegidas
- ✅ Las variables de entorno solo son accesibles en build time
- ✅ Nunca se exponen en el código del cliente
- ✅ Están encriptadas en Vercel

### Headers de seguridad
El archivo `vercel.json` ya incluye:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

---

## 📊 Monitoreo

### Dashboard de Vercel
En https://vercel.com/dashboard puedes ver:
- Estado del deployment
- Logs en tiempo real
- Analytics de tráfico
- Errores en producción

---

## 🆘 Solución de Problemas

### Error: "Page not found" en rutas
✅ **Solucionado** con `vercel.json` que redirige todo a `index.html`

### Error: Variables de entorno no funcionan
- Verifica que empiecen con `VITE_`
- Asegúrate de haberlas agregado en Vercel Dashboard
- Haz un nuevo deploy después de agregar variables

### Error: Build falla
- Verifica que `npm run build` funcione localmente
- Revisa los logs en el dashboard de Vercel
- Verifica que todas las dependencias estén en `package.json`

---

## 📞 Recursos

- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Supabase Docs**: https://supabase.com/docs

---

## 💡 Tips Pro

### 1. Preview Deployments
Cada branch y Pull Request obtiene su propia URL de preview automáticamente.

### 2. Rollback instantáneo
En Vercel puedes volver a cualquier versión anterior con un click.

### 3. Edge Functions (futuro)
Si necesitas funciones serverless, Vercel las incluye gratis.

---

¡Felicidades! Tu aplicación está ahora en producción 🎉
