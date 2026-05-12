# Bitacora `frontend-camiones`

Fecha de actualizacion: 2026-05-11

## Cambio reciente

En la pantalla de `Viaje` se agrego soporte para cargar:

- valor por kilometro
- calculo automatico del total del viaje

## Alcance actual

El flujo nuevo permite:

- ingresar kilometros
- ingresar tarifa por km
- ver el total antes de guardar
- mostrar tarifa y total dentro de `Registro`

## Persistencia actual

Para no cambiar contrato de base ni endpoints en este corte:

- el origen del viaje
- la tarifa por km
- el total calculado

se guardan dentro de `notes` del viaje.

## Compatibilidad

Los viajes viejos que no tengan tarifa guardada:

- siguen visibles
- no muestran total hasta tener ese dato
