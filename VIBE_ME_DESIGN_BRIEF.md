# VIBE ME - Design Brief para Diseñador

## 📱 Resumen Ejecutivo

**Vibe Me** es una aplicación social de presencia en tiempo real que conecta personas en lugares físicos (bares, clubs, restaurantes, eventos). A diferencia de apps de citas tradicionales, Vibe Me se enfoca en **dónde estás** y **qué estás buscando en este momento**, no en perfiles extensos.

**Concepto Central:** "Descubre quién está en tu misma vibra, cerca de ti, ahora mismo."

---

## 🎯 Problema que Resuelve

1. **Soledad social en lugares públicos** - Personas que están solas en un bar/club pero no saben cómo conocer gente
2. **Intenciones no claras** - No saber si alguien está abierto a conocer gente o prefiere estar solo
3. **Miedo al rechazo** - Sistema de "Vibes" que permite expresar interés sin confrontación directa
4. **Planificación de salidas** - Saber dónde está la "energía" antes de salir

---

## 👥 Público Objetivo

- **Edad:** 21-35 años
- **Perfil:** Personas socialmente activas, que frecuentan vida nocturna
- **Ubicación:** Zonas urbanas con vida nocturna activa
- **Comportamiento:** Usuarios de Instagram, Tinder, Bumble
- **Necesidad:** Conexiones auténticas en persona, no solo digitales

---

## 🎨 Identidad Visual Actual

### Paleta de Colores
```
FONDO PRINCIPAL:     #0D0D0D (Negro profundo)
FONDO SECUNDARIO:    #1A1A1A (Gris muy oscuro)
DORADO PRIMARIO:     #FFD700 (Oro brillante)
DORADO CLARO:        #FFE55C (Oro claro)
DORADO OSCURO:       #B8860B (Oro antiguo)
TEXTO PRIMARIO:      #F5F5F5 (Blanco cremoso)
TEXTO SECUNDARIO:    #A0A0A0 (Gris medio)
ACENTO ÉXITO:        #4CAF50 (Verde)
ACENTO ERROR:        #FF4D4F (Rojo)
```

### Estilo Visual
- **Tema:** Oscuro/Cinemático (estilo vida nocturna premium)
- **Tipografía:** Sans-serif moderna, pesos variados (300-700)
- **Iconografía:** Ionicons, estilo outline
- **Bordes:** Redondeados (12-28px radius)
- **Sombras:** Sutiles, con tinte dorado en elementos destacados

### Referencias de Diseño
- Tinder (flujo de match)
- Bumble (estilo premium, UX amigable)
- Apple (minimalismo, jerarquía clara)
- Clubhouse (indicadores de actividad en vivo)

---

## 📲 Pantallas Principales

### 1. LANDING / HOME (Sin login)
**Propósito:** Primera impresión, captar usuarios

**Elementos:**
- Video de fondo (vida nocturna, ambiente social)
- Logo "Vibe ME" centrado
- Pin de ubicación animado con ondas de radar
- Botón "CREATE ACCOUNT" (dorado, destacado)
- Link "Sign in" (secundario)
- Indicador "LIVE • SOCIAL RADAR"

**Estado actual:** Implementado, necesita refinamiento visual

---

### 2. LOGIN / REGISTRO
**Propósito:** Autenticación múltiple

**Métodos disponibles:**
- Google Sign-In
- Apple Sign-In (iOS)
- Teléfono + SMS
- Email + Password

**Elementos:**
- Logo en header
- Botones de auth social (Google negro con G, Apple negro)
- Botón de teléfono (dorado)
- Formulario de email (modal/expandible)
- Botón "Create Account" (gradiente dorado)

**Estado actual:** Funcional, diseño necesita ser más premium

---

### 3. EXPLORE (Tab principal)
**Propósito:** Descubrir lugares y personas cercanas

**Elementos:**
- Header con título "Explore" y subtítulo
- Barra de búsqueda
- Estado de presencia del usuario ("NO ESTÁS EN NINGÚN LUGAR")
- Filtros horizontales: All, Hot, Clubs, Bars, Restaurants
- Lista de lugares con:
  - Nombre del lugar
  - Tipo y distancia
  - Indicador de "energía social" (barra de progreso)
  - Número de personas presentes
  - Botón "Check In"
- FAB para escanear QR

**Estado actual:** Funcional, buen diseño

---

### 4. VIBES (Tab)
**Propósito:** Gestionar conexiones/matches

**Concepto de "Vibe":**
- Similar a un "like" pero contextual
- Incluye intención: "Quiero conocerte", "Tomemos algo", etc.
- Expira en 24h si no hay respuesta

**Elementos:**
- Contador de vibes recibidos/enviados
- Lista de vibes pendientes
- Chat temporal (24h después de match)
- Estados: Pendiente, Aceptado, Expirado

**Estado actual:** Funcional

---

### 5. PLACES / INVITACIONES (Tab)
**Propósito:** Crear y ver planes sociales

**Concepto "¿Quién para...?":**
- Usuario crea invitación: "¿Quién para unas cervezas en X lugar?"
- Otros pueden unirse
- Visible para personas cercanas

**Elementos:**
- Lista de invitaciones activas
- Botón para crear nueva invitación
- Detalle con asistentes confirmados

**Estado actual:** Funcional básico

---

### 6. PROFILE (Tab)
**Propósito:** Configuración y estadísticas

**Elementos:**
- Foto de perfil (con opción de editar)
- Nombre y estado
- Estadísticas: Vibes enviados, conexiones, lugares visitados
- Acceso a Settings

**Estado actual:** Funcional

---

### 7. SETTINGS
**Propósito:** Configuración de cuenta

**Secciones:**
- **CUENTA:** Premium, Editar Perfil, Mi Vibe Predeterminado, Mi Estado
- **PARA LOCALES:** Modo Business (generar QR)
- **SEGURIDAD:** Centro de Seguridad, Contacto de emergencia
- **PREMIUM:** Actualizar a PRO
- **PRIVACIDAD:** Modo Fantasma (ocultar ubicación)
- **ZONA DE PELIGRO:** Cerrar Sesión, Eliminar Cuenta

**Estado actual:** Funcional, buen diseño

---

### 8. PHONE AUTH
**Propósito:** Login con número de teléfono

**Flujo:**
1. Ingresar número con selector de país
2. Recibir código SMS
3. Verificar código (6 dígitos)

**Estado actual:** Necesita rediseño profesional

---

### 9. SEGURIDAD
**Propósito:** Funciones de seguridad personal

**Elementos:**
- Verificación de perfil (selfie)
- Contacto de emergencia
- Acciones rápidas (compartir ubicación, llamar contacto)

**Estado actual:** Implementado

---

### 10. PREMIUM / SUSCRIPCIÓN
**Propósito:** Monetización

**Planes:**
- **Básico (Gratis):** 5 vibes/día, check-in, chat 24h
- **Premium ($9.99/mes o $79.99/año):** Vibes ilimitados, modo fantasma, ver quién vio tu perfil

**Estado actual:** UI implementada, sin integración de pagos

---

## 🔄 Flujos Principales

### Flujo 1: Check-In en Lugar
```
Explore → Seleccionar lugar → Check In → Confirmar → 
Usuario aparece en el lugar → Otros pueden enviar Vibes
```

### Flujo 2: Enviar Vibe
```
Ver persona en lugar → Enviar Vibe → Seleccionar intención →
Agregar mensaje opcional → Enviar → Esperar respuesta (24h)
```

### Flujo 3: Match y Chat
```
Recibir Vibe → Ver perfil → Aceptar → 
Chat se abre (temporal 24h) → Conversar → 
Opcional: Extender chat (Premium)
```

### Flujo 4: Crear Invitación
```
Places → Crear invitación → "¿Quién para...?" →
Seleccionar lugar → Definir hora → Publicar →
Otros ven y se unen
```

---

## 🚀 Funcionalidades Especiales

### 1. Presencia en Tiempo Real
- GPS + Check-in manual
- QR en establecimientos
- Estado visible: "En X lugar desde hace Y minutos"

### 2. Modo Fantasma (Premium)
- Navegar sin ser visto
- No aparecer en el radar de otros

### 3. Vibes Contextuales
- No es solo un "like", incluye intención
- Tipos: Conocer, Tomar algo, Bailar, Networking, etc.

### 4. Chat Temporal
- 24 horas después de match
- Fomenta encuentro real, no conversación eterna

### 5. Seguridad
- Verificación por selfie
- Contacto de emergencia
- Compartir ubicación en tiempo real

---

## 📊 Métricas de Éxito (KPIs)

- Usuarios activos diarios (DAU)
- Check-ins por usuario/día
- Tasa de conversión Vibe → Match
- Tiempo promedio de respuesta a Vibes
- Retención a 7 días
- Conversión a Premium

---

## 🎯 Áreas que Necesitan Mejora de Diseño

### Prioridad Alta:
1. **Pantalla de Login** - Debe verse más premium, logos oficiales
2. **Pantalla de Teléfono** - Rediseño completo, más limpio
3. **Consistencia de botones** - Algunos tienen colores inconsistentes
4. **Animaciones** - Más feedback visual en acciones

### Prioridad Media:
5. **Onboarding** - No existe, usuario entra directo
6. **Empty states** - Mejorar estados vacíos (sin vibes, sin lugares)
7. **Notificaciones in-app** - Toasts/banners más elegantes

### Prioridad Baja:
8. **Modo claro** - Actualmente solo modo oscuro
9. **Accesibilidad** - Revisar contrastes y tamaños
10. **Tablet** - Optimizar para pantallas grandes

---

## 📁 Arquitectura Técnica (Para contexto)

```
Frontend: React Native + Expo
Backend: FastAPI (Python)
Database: MongoDB Atlas
Auth: Firebase
Hosting: Railway (backend) + EAS Build (app)
```

---

## 📞 Contacto

**Proyecto:** Vibe Me
**Versión actual:** MVP 1.0
**Estado:** En desarrollo activo

---

*Este documento fue generado para proporcionar contexto completo a diseñadores externos.*
