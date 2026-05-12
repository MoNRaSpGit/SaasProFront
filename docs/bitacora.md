# Bitacora `frontend-camiones`

Fecha de actualizacion: 2026-05-12

## Cambio reciente

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
