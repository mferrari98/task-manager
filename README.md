# Task Manager

Un sistema simple de gestión de tareas con colaboración en tiempo real para redes locales.

## 📋 Características

- **Gestión de Tareas Completa**: Crear, editar, asignar y seguimiento de tareas
- **Colaboración en Tiempo Real**: Actualizaciones instantáneas entre usuarios
- **Roles de Usuario**: Administradores y trabajadores con permisos diferenciados
- **Seguimiento de Progreso**: Sistema de actualizaciones con comentarios y porcentajes
- **Interfaz Responsiva**: Funciona en desktop y dispositivos móviles
- **Acceso en Red Local**: Múltiples usuarios pueden colaborar desde diferentes dispositivos

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js (versión 14 o superior)
- Navegador web moderno

### Modo Desarrollo

Para desarrollo con recarga automática:
```bash
npm run dev
```

Esto usará `nodemon` para reiniciar automáticamente el servidor cuando haya cambios en el código.

### Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   # Si tienes el código, navega al directorio
   cd task-manager
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```

4. **Detener el servidor**
   ```bash
   npm stop
   # O usa el script directamente:
   ./stop.sh
   ```

5. **Acceder a la aplicación**
   - Abre tu navegador y visita: `http://localhost:3000`
   - Para acceso desde otros dispositivos en la red: `http://[TU-IP]:3000`

### Usuario por Defecto

- **Nombre de usuario**: `admin`
- **Rol**: Administrador

## 📖 Guía de Uso

### Para Administradores

1. **Gestión de Usuarios**: Crea y administra cuentas de trabajadores
2. **Asignación de Tareas**: Asigna tareas a miembros del equipo
3. **Supervisión**: Monitorea el progreso de todas las tareas
4. **Configuración**: Gestiona roles y permisos

### Para Trabajadores

1. **Ver Tareas**: Consulta todas las tareas y las asignadas a ti
2. **Actualizar Progreso**: Agrega comentarios y porcentajes de avance
3. **Colaboración**: Recibe notificaciones en tiempo real de cambios
4. **Auto-asignación**: Toma tareas no asignadas cuando sea necesario

## 🏗️ Arquitectura

### Backend
- **Node.js + Express.js**: Servidor web y API REST
- **SQLite3**: Base de datos relacional sin configuración
- **Socket.io**: Comunicación en tiempo real
- **Express-session**: Gestión de sesiones de usuario

### Frontend
- **HTML5 + CSS3**: Estructura y estilos modernos
- **Bootstrap 5**: Framework CSS para diseño responsivo
- **JavaScript ES6+**: Lógica de aplicación interactiva
- **Socket.io Client**: Actualizaciones en tiempo real

### Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **users**: Información de usuarios y roles
- **tasks**: Datos de tareas con asignación y estado
- **updates**: Historial de progreso y comentarios

## 📁 Estructura del Proyecto

```
task-manager/
├── backend/
│   ├── models/           # Modelos de datos y lógica de negocio
│   │   ├── database.js   # Conexión y configuración de SQLite
│   │   ├── User.js       # Modelo de usuario
│   │   └── Task.js       # Modelo de tarea
│   ├── api/              # Endpoints de la API REST
│   │   ├── auth.js       # Autenticación y sesiones
│   │   ├── tasks.js      # Gestión de tareas
│   │   └── users.js      # Gestión de usuarios
│   ├── middleware/       # Middleware de Express
│   │   └── auth.js       # Verificación de permisos
│   └── server.js         # Servidor principal y Socket.io
├── frontend/
│   ├── css/
│   │   └── style.css     # Estilos personalizados
│   ├── js/
│   │   └── app.js        # Aplicación frontend
│   └── index.html        # Interfaz principal
├── openspec/             # Especificaciones del proyecto
├── package.json          # Dependencias y scripts
└── README.md            # Esta documentación
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Puedes configurar el servidor usando variables de entorno:

```bash
# Puerto del servidor (default: 3000)
PORT=3000

# Secreto de sesión (cambia en producción)
SESSION_SECRET=tu-secreto-aqui

# Configuración de CORS
CORS_ORIGIN=*
```

### Personalización

1. **Modificar puerto**: Edita `package.json` o usa variable de entorno `PORT`
2. **Cambiar tema**: Modifica `frontend/css/style.css`
3. **Agregar funcionalidades**: Extiende los modelos y endpoints en `backend/`

## 🌐 Acceso en Red Local

### Encontrar tu IP

**Windows:**
```bash
ipconfig
```

**macOS/Linux:**
```bash
ifconfig
# o
ip addr show
```

### Acceso desde otros dispositivos

1. Asegúrate de que el firewall permita conexiones al puerto 3000
2. Conecta todos los dispositivos a la misma red
3. Usa la dirección IP del servidor: `http://[IP]:3000`

## 🔒 Consideraciones de Seguridad

- **Para producción**: Cambia el secreto de sesión en `backend/server.js`
- **Red local**: La aplicación está diseñada para uso en redes locales confiables
- **HTTPS**: Para producción adicional considera configurar HTTPS
- **Base de datos**: El archivo `tasks.db` se crea automáticamente en el directorio raíz

## 🛑 Detención del Servidor

El sistema incluye un cierre elegante para proteger los datos:

### Opción 1: Usar npm
```bash
npm stop
```

### Opción 2: Usar el script directamente
```bash
./stop.sh
```

### Opción 3: Ctrl+C (Terminal)
Si iniciaste el servidor en la terminal, puedes usar `Ctrl+C` para un cierre elegante.

El proceso de cierre elegante:
- Cierra conexiones HTTP activas
- Guarda cambios pendientes en la base de datos
- Cierra conexiones de la base de datos
- Notifica a clientes conectados
- Libera recursos del sistema

## 🐛 Solución de Problemas

### Problemas Comunes

1. **El servidor no inicia**
   - Verifica que Node.js esté instalado: `node --version`
   - Asegúrate de haber instalado dependencias: `npm install`
   - Revisa si el puerto 3000 está en uso

2. **No puedo acceder desde otros dispositivos**
   - Verifica la configuración del firewall
   - Confirma que todos los dispositivos están en la misma red
   - Usa la dirección IP correcta del servidor

3. **Los datos se pierden al reiniciar**
   - Esto es normal. Los datos persisten en el archivo `tasks.db`
   - No elimines este archivo si quieres conservar los datos

4. **Las actualizaciones en tiempo real no funcionan**
   - Verifica que WebSocket no esté bloqueado por el firewall
   - Abre la consola del navegador para ver errores de JavaScript

### Logs del Servidor

El servidor muestra información útil en la consola:
- Conexiones de usuarios
- Creación de base de datos
- Errores de la API

## 🤝 Contribuir

Este proyecto sigue las especificaciones definidas en el directorio `openspec/`. Para cambios importantes:

1. Revisa `openspec/AGENTS.md` para entender el flujo de trabajo
2. Crea nuevas propuestas usando `/openspec:proposal`
3. Implementa cambios aprobados con `/openspec:apply`

## 📄 Licencia

MIT License - Puedes usar y modificar este proyecto libremente.

## 🆘 Soporte

Si encuentras problemas:

1. Revisa esta documentación y la sección de solución de problemas
2. Consulta los logs del servidor para mensajes de error
3. Asegúrate de cumplir con los requisitos previos

---

**¡Disfruta colaborando en tu equipo con Task Manager!** 🎉