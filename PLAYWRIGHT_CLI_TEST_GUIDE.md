# Guía de Prueba con Playwright CLI

## Instalación (ya está instalada)
```bash
npm install -g playwright-cli
```

## Flujo de Prueba de Autenticación

### Paso 1: Abrir el login
```bash
playwright-cli open http://localhost:8081/login --headed
```

### Paso 2: Ver elementos disponibles
```bash
playwright-cli snapshot
```
Esto muestra los elementos interactivos con IDs (e1, e2, e3...)

### Paso 3: Llenar formulario de login
```bash
# Ajustar los IDs según el snapshot anterior
playwright-cli fill e1 "test@example.com"
playwright-cli fill e2 "password123"
```

### Paso 4: Click en "Ingresar"
```bash
playwright-cli click e3
```

### Paso 5: Verificar que el token se guardó
```bash
playwright-cli eval "localStorage.getItem('auth-token')"
```

**Debería mostrar:** Un string JWT (no `null` o `undefined`)

### Paso 6: Verificar estado de autenticación
```bash
playwright-cli eval "JSON.parse(localStorage.getItem('auth-store') || '{}').isAuthenticated"
```

**Debería mostrar:** `true`

### Paso 7: Navegar al dashboard
```bash
playwright-cli open http://localhost:8081/dashboard
```

### Paso 8: Verificar que no redirige
```bash
playwright-cli eval "window.location.pathname"
```

**Debería mostrar:** `/dashboard` (no `/login`)

### Paso 9: Tomar screenshot
```bash
playwright-cli screenshot
```

### Paso 10: Cerrar
```bash
playwright-cli close
```

---

## Comandos Útiles Adicionales

### Ver todo el localStorage
```bash
playwright-cli eval "JSON.stringify(localStorage, null, 2)"
```

### Ver cookies
```bash
playwright-cli eval "document.cookie"
```

### Ver el título de la página
```bash
playwright-cli eval "document.title"
```

### Resize ventana
```bash
playwright-cli resize 1920 1080
```

### Recargar página
```bash
playwright-cli eval "window.location.reload()"
```

---

## Si el Token No Se Guarda

1. Verificar que el login fue exitoso (código 200)
2. Verificar la respuesta del servidor:
   ```bash
   playwright-cli eval "JSON.parse(localStorage.getItem('auth-user') || '{}')"
   ```
3. Verificar errores en consola:
   ```bash
   playwright-cli eval "console.log('Test')"
   ```

---

## Generar Test Automático

Playwright CLI genera código TypeScript automáticamente. Después de hacer las interacciones manuales, podés copiar el código generado y guardarlo en un archivo de test.

## Documentación

- [Playwright CLI GitHub](https://github.com/microsoft/playwright-cli)
- [Comandos disponibles](https://github.com/microsoft/playwright-cli/blob/main/skills/playwright-cli/SKILL.md)
