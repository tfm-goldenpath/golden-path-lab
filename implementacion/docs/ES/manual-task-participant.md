# Instrucciones del participante en tareas manuales

Usar estas instrucciones después de que el operador prepare la tarea asignada.
Ejecutar desde la raíz del repositorio; guardar el directorio indicado como
`MANUAL_TASK`. Consultar escenario, brazo y herramientas en `record.json`.

El objetivo es corregir la entrega conservando salud, versión de fuente y
cotización. Trabajar solo en la entrada asignada:

- F03: manifiestos de dependencia en `participant/source/`. Conservar el wrapper
  de ejecución y la prueba funcional inocua. Un build y escaneo reales deben
  validar corrección y umbral completo de vulnerabilidades.
- F10: selección de artefacto en `participant/image.txt`. El catálogo local
  autorizado está en `participant/authorized-artifact.txt`. Obtener evidencia
  autorizada con el artefacto; no editar declaraciones, claves, política o confianza.
- F11: privilegios prohibidos en `participant/manifest.json`. Conservar imagen
  y resto de ajustes; se sigue exigiendo funcionalidad HTTP.

Usar las mismas herramientas convencionales declaradas en R y G. R puede invocar
escáneres y verificadores manualmente. Desactivar asistencia IA durante la sesión.
Declarar conocimientos, intentos previos y exposición al otro brazo: no es ciego.

1. Ejecutar `python3 implementacion/scripts/manual-tasks.py start "$MANUAL_TASK"`.
   La ruta automática inicia el intervalo total; su final inicia la revisión humana.
2. Registrar `event "$MANUAL_TASK" investigate --note 'actividad real'` antes
   de investigar, usando el mismo prefijo del script. Revisar las salidas conservadas.
3. Invocar `tool "$MANUAL_TASK" scan`, `provenance` o `manifest` según corresponda.
   Se conservan comandos y detecciones verificables. Usar `event ... correct`,
   `wait` y `pause` con notas reales; marcar actividad de nuevo al retomarla.
4. Corregir con herramientas convencionales e invocar `check "$MANUAL_TASK"`.
   Valida la entrada sin repararla; los intentos fallidos permanecen registrados.
5. Invocar `status "$MANUAL_TASK"` y `cleanup "$MANUAL_TASK"` al terminar.
   Conservar el resultado aunque no se detecte o resuelva el problema.

Preparación y oráculos del operador quedan fuera del intervalo. La calibración
no tiene límite experimental; las tareas medidas posteriores usan el límite total
congelado. No reiniciar el reloj ni descartar un intento lento. Detenerse cuando
se agote la ventana. Usar `recover "$MANUAL_TASK"` tras interrumpirse el controlador
y conservar el intento incompleto antes de limpiar y preparar otra tarea.
