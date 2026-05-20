# Bitacora `frontend-camiones`

Fecha de actualizacion: 2026-05-20

## Cambio reciente

En el login de `camiones` se agrega opcion `Recordarme`.

Comportamiento:

- si el usuario marca `Recordarme`, la sesion queda persistida en `localStorage`
- si no la marca, la sesion vive solo durante la sesion del navegador
- la cuenta tambien puede quedar recordada en el dispositivo
- no se guarda la contrasena en texto plano

Objetivo:

- evitar que el cliente tenga que loguearse cada vez
- mantener un nivel razonable de seguridad en el dispositivo

## Cambio reciente

La pantalla de acceso deja de depender solo de botones con credenciales precargadas.

Queda asi:

- login clasico por `Cuenta` y `Contrasena`
- acceso principal pensado para clientes reales como `lamilagrosa`
- boton secundario `Entrar como invitado`

Regla de este corte:

- `Entrar` lleva al tenant real asignado al usuario autenticado
- `Entrar como invitado` mantiene el tenant limpio de demo para grabaciones y pruebas

Tambien se endurece la sesion del frontend:

- almacenamiento local con namespace propio de `frontend-camiones`
- rechazo de sesiones que no pertenezcan a `camiones`
- rechazo de refresh que vuelva con otro tenant distinto al que inicio sesion

## Cambio reciente

En `Registro` se simplifico la accion sobre cada viaje:

- se saco el boton `Editar`
- ahora el acceso principal queda como `Mostrar viaje`
- ese boton abre el modal completo del viaje y desde ahi mismo se puede corregir:
  - origen
  - destino
  - fecha
  - kilometros
  - tarifa
  - estado
  - cobro parcial

Tambien se limpio la tarjeta resumida del viaje:

- ya no repite tarifa y total en el listado expandido
- prioriza mostrar de donde a donde va el viaje
- el detalle completo queda concentrado dentro del modal

## Cambio anterior

En `Registro` los viajes ahora se agrupan por cliente y no por cliente + fecha.

Eso deja el comportamiento esperado por operacion:

- si existe `Juan Perez`, todos sus viajes quedan dentro del mismo bloque
- si se crea otro viaje para `Juan Perez`, no aparece otra tarjeta separada por fecha
- cada viaje sigue mostrando su propia fecha dentro del detalle expandido

Tambien se ajusto el guardado visual de clientes:

- si backend devuelve un cliente ya existente por nombre normalizado, el frontend reemplaza el optimista y no deja duplicados visibles

Ademas se alinea con la regla nueva de backend:

- diferencias solo de espacios o mayusculas no deben generar otro cliente aparte

En este corte `camiones` paso de un flujo simple de pago/no pago a un flujo mas operativo.

Cambios principales en `Registro`:

- los viajes nuevos arrancan en estado `confirmed`
- desde `Editar registro` ahora se puede pasar un viaje a:
  - `confirmed`
  - `pending`
  - `paid`
- si el viaje queda en `pending`, se puede cargar monto cobrado parcial
- el registro muestra:
  - total del viaje
  - cobrado
  - pendiente

Tambien se corrigio la logica visual de pestañas:

- `Todos` ahora muestra solo viajes `confirmed`
- `Pendientes` muestra solo viajes `pending`
- `Pagados` muestra solo viajes `paid`

En `Pagados` se agrego:

- boton `Eliminar`
- modal de confirmacion
- borrado real del viaje pago via API

Tambien se ajusto el modal de `Editar registro` para mobile:

- ahora tiene scroll propio
- ya no queda cortado cuando el contenido supera el alto de pantalla

## Cambio anterior

En la pantalla de `Viaje` se agrego soporte para cargar:

- valor por kilometro
- calculo automatico del total del viaje

Tambien se dejo el frontend listo como `PWA` base:

- `manifest.webmanifest`
- `service worker`
- registro automatico en produccion
- iconos propios del modulo
- icono PWA tomado de `Camion.png` compartido por el cliente

## Alcance actual

El flujo nuevo permite:

- ingresar kilometros
- ingresar tarifa por km
- ver el total antes de guardar
- mostrar tarifa y total dentro de `Registro`
- editar estado del viaje
- registrar cobro parcial
- separar confirmados, pendientes y pagos por pestaña
- eliminar viajes pagos desde `Pagados`

## Persistencia actual

Persistencia vigente en este corte:

- el origen del viaje
- la tarifa por km
- el total calculado
- compatibilidad de lectura de cobro parcial en `notes`

se guardan dentro de `notes` del viaje.

Ademas:

- el estado del viaje se persiste en backend
- el cobro parcial se persiste por API y backend
- los viajes pagos se pueden borrar solo desde flujo confirmado por modal

## Compatibilidad

Los viajes viejos que no tengan tarifa guardada:

- siguen visibles
- no muestran total hasta tener ese dato

Los viajes creados antes de este cambio:

- se reinterpretan como `confirmed` si venian del uso viejo de `pending`
- siguen pudiendo abrirse desde `Editar registro`
