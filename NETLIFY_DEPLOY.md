# 🚀 Netlify Deployment Guide

## 📋 Подготовка к деплою

### 1. Установка Netlify CLI
```bash
npm install
```

### 2. Авторизация в Netlify
```bash
npx netlify login
```

### 3. Связывание с сайтом
```bash
npx netlify link
```

## 🎯 Способы деплоя

### Через VS Code Tasks (Рекомендуется)
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. Выберите **"Deploy to Netlify"**
3. Задача автоматически соберет проект и задеплоит

### Через npm скрипты
```bash
# Продакшн деплой
npm run build:netlify

# Превью деплой
npm run deploy:preview
```

### Через Netlify CLI напрямую
```bash
# Сборка + деплой
npm run build
npx netlify deploy --prod --dir=build

# Только превью
npx netlify deploy --dir=build
```

## ⚙️ Конфигурация

### Файлы конфигурации:
- `netlify.toml` - основная конфигурация Netlify
- `public/_redirects` - редиректы для SPA
- `.vscode/tasks.json` - задачи VS Code

### Настройки в netlify.toml:
- **Build command**: `npm run build`
- **Publish directory**: `build`
- **Node version**: 18
- **SPA redirects**: настроены автоматически
- **Security headers**: добавлены
- **Caching**: настроен для статических файлов

## 🔧 Автоматический деплой

После связывания с GitHub репозиторием:
1. Каждый push в master автоматически деплоит сайт
2. Pull requests создают preview деплои
3. Netlify автоматически собирает проект

## 📱 Доступ к сайту

После деплоя сайт будет доступен по адресу:
- **Production**: `https://your-site-name.netlify.app`
- **Preview**: `https://deploy-preview-123--your-site-name.netlify.app`

## 🛠️ Troubleshooting

### Проблемы с путями
- Убедитесь, что `public/_redirects` содержит `/*    /index.html   200`

### Проблемы с билдом
- Проверьте, что все зависимости установлены
- Убедитесь, что Node.js версии 18+

### Проблемы с авторизацией
- Выполните `npx netlify logout` и `npx netlify login` заново
