# Calibración con inputs y rutas reutilizables

Calendario inmediato: usar la [validación automatizada de reparaciones](automated-remediation.md) para F03/F10/F11 × R/G. La comparación de esfuerzo humano y la calibración manual elegible se aplazan; la automatización no las completa. Se conservan ensayos históricos, formatos de revisión, campaña pareada separada de PR #43 y aceptación global del piloto pendiente.

[English](../EN/manual-calibration-session.md) · [Procedimiento y oráculos](manual-task-calibration.md)

El [fichero de comandos](../../scripts/manual-calibration-session.sh) prepara
**una tarea de calibración** por invocación: comprueba el entorno, crea o reutiliza
el plan y muestra el log en directo. Se detiene en `READY`. El inicio del reloj y
los eventos humanos siguen siendo acciones separadas.

## 1. Copia editable e inputs

Desde la raíz del repositorio, crear la copia una sola vez:

```bash
MANUAL_RUNNER="$PWD/implementacion/evidence/manual-tasks/calibration-session.sh"
mkdir -p "$(dirname "$MANUAL_RUNNER")"
if [[ ! -e "$MANUAL_RUNNER" ]]; then
  cp implementacion/scripts/manual-calibration-session.sh "$MANUAL_RUNNER"
fi
```

Editar **esa copia**, ignorada por Git. Editar el script original durante una
sesión cambiaría el código fijado en el plan. Sustituir las tres asignaciones
vacías al principio. Ejemplos que debes adaptar antes de ejecutar:

```bash
MANUAL_EDITOR=${MANUAL_EDITOR:-'Visual Studio Code 1.140.0 - Codespaces Desktop'}
MANUAL_PARTICIPANT=${MANUAL_PARTICIPANT:-'Francisco'}
MANUAL_KNOWLEDGE=${MANUAL_KNOWLEDGE:-'Autor del proyecto; conozco los controles; he observado preparaciones fallidas anteriores'}
```

Consultar la versión real en **Help → About**: `1.40.0` y `1.140.0` son diferentes.
El ejemplo no verifica tu editor. Declarar experiencia real, incluidos intentos
previos; no indicar `none` si ya conoces el proyecto o el escenario.

| Input | Valor inicial | Uso |
|---|---|---|
| `MANUAL_SESSION` | `calibracion-01` | Nombre de sesión; elegir otro sin usar si cambia código, base, semilla o editor. |
| `MANUAL_SCENARIO` | `F11` | Siguiente escenario: `F03`, `F10` o `F11`. |
| `MANUAL_ARM` | `G` | Siguiente brazo: `R` o `G`. |
| `MANUAL_KNOWLEDGE` | Obligatorio | Actualizar la exposición después de cada intento. |
| `MANUAL_DB` | `.tmp/vulnerability-selection/db-snapshot`, bajo `implementacion/` | Base congelada existente; el fichero no la descarga ni sustituye. |
| `MANUAL_SEED` | `manual-six-v1-2026-10-02` | Mantener la semilla acordada. |

También puedes definir variables de entorno. Tras limpiar la tarea anterior:

```bash
MANUAL_SCENARIO=F11 MANUAL_ARM=R bash "$MANUAL_RUNNER" prepare
```

Esto cambia esos dos inputs solo para esa invocación. Mantén el mismo nombre de
sesión en los comandos posteriores.

## 2. Preparar en una llamada

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh prepare
```

Salida: `PLAN_CREATED` o `PLAN_REUSED`, `TASK`, log de herramientas y, solo tras
preparación correcta, `READY; total timer has not started`. No ejecutar `plan`
por separado ni copiar IDs de tareas. `plan --reuse` comprueba código, base,
semilla y editor sin sobrescribir identidades; los cambios exigen otra sesión.
Si falta un input obligatorio, se detiene antes de preparar infraestructura.

La preparación puede tardar. `Ctrl-C` la interrumpe: conservar el intento, ejecutar
`cleanup` y revisar la causa antes de preparar otro. No hay reintento automático.
Otro `prepare` requiere limpiar la tarea anterior, incluso si quedó incompleta.

### Red de Codespaces tras un reinicio

La preparación comprueba automáticamente la conectividad de kind en Codespaces
y repone el par temporal solo si confirma el conflicto de forwarding. La
[guía de red](kind-network-firewall.md) explica alcance, evidencia y retirada.
Se ejecuta antes de construir la imagen, fuera del reloj de la tarea.

Tras actualizar este código, conservar y limpiar el intento anterior y usar otro
nombre de sesión. Ejemplo, con los tres inputs obligatorios ya configurados:

```bash
export MANUAL_SESSION=calibracion-red-01
bash implementacion/evidence/manual-tasks/calibration-session.sh prepare
```

Mantener ese `export` para `paths`, `start`, `status` y `cleanup` en esta terminal;
en otra, volver a exportarlo o fijarlo en la copia ignorada. Elegir otro nombre
sin usar si el ejemplo ya tiene un plan de código anterior. Esperar a `READY`
antes de ejecutar `start`. El intento fallido por DNS se conserva como evidencia;
no se puede reanudar como una tarea preparada.

## 3. Rutas guardadas e inicio

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh paths
bash implementacion/evidence/manual-tasks/calibration-session.sh start
```

`paths` muestra plan, tarea y `participant/`. Ejecutar `start` cuando estés listo:
inicia el reloj y rechaza tareas fuera de `READY`. Antes de crear infraestructura,
`prepare` guarda la ruta en `<sesión>/current-task.json`, incluso si luego falla.
Ese fichero es un selector; `record.json` conserva el estado real.

En otra terminal basta con ejecutar el mismo fichero. También puedes recuperar
la ruta para comandos externos:

```bash
MANUAL_TASK=$(jq -er '.taskDirectory' \
  implementacion/evidence/manual-tasks/calibracion-01/current-task.json)
```

## 4. Trabajo humano y cierre

Seguir las [instrucciones del participante](manual-task-participant.md). Estos
comandos se usan individualmente; **no ejecutarlos todos como un lote**. Registrar
notas y actividades solo cuando realmente ocurran:

Son pasos separados, con trabajo humano entre ellos. Las notas son ejemplos:
sustituirlas por una descripción de lo que realmente haces.

**Comenzar la investigación** y después revisar tú mismo la salida conservada:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh event investigate --note 'Describir tu investigación real'
bash implementacion/evidence/manual-tasks/calibration-session.sh tool manifest
```

Usar `manifest` para F11, `scan` para F03 y `provenance` para F10.

**Al comenzar la corrección elegida**, registrar el cambio de actividad:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh event correct --note 'Describir la corrección elegida'
```

Ahora realizar tú mismo la corrección en la entrada permitida de `participant/`,
con las herramientas declaradas. `event correct` solo registra una actividad;
no edita ninguna entrada. Usar `event wait` solo para esperas reales y `pause`
para descansos. Herramientas y comprobación ya registran su espera automáticamente;
marcar actividad de nuevo al retomarla. Desactivar IA durante la tarea humana.

**Después de editar realmente la entrada**, comprobarla:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh check
```

Leer el resultado antes de decidir el siguiente paso:

- `CORRECTION_REJECTED; task remains REVIEW`: abrir el fichero indicado por
  `CHECK_RESULT` y los diagnósticos que enlaza. Falta una finalización validada;
  continuar el trabajo humano con el mismo reloj/ventana. `check` no repara la entrada.
- `VALIDATED_COMPLETION`: pasan las comprobaciones de finalización.
- `INCOMPLETE` o `EXHAUSTED`: conservar el resultado y limpiar el intento.

**Cuando decidas terminar el intento**, ejecutar la limpieza por separado:

```bash
bash implementacion/evidence/manual-tasks/calibration-session.sh cleanup
```

Limpiar durante `REVIEW` cierra el intento sin resolver como `INCOMPLETE`; limpiar
recursos correctamente no valida una corrección. Conservarlo y preparar otro
intento si corresponde. Usar `recover` antes de limpiar solo tras terminar
abruptamente el controlador con una operación registrada. `humanAcceptance`
sigue en `pending`; completar la tarea y la revisión humana posterior son pasos
separados.

Después de `CLEANUP_COMPLETE`, conservar la evidencia, cambiar escenario/brazo y
actualizar conocimientos en la copia; repetir `prepare`. Cubrir F03/R, F03/G,
F10/R, F10/G, F11/R y F11/G. Los límites de calibración siguen sin fijar. El plan
conserva por separado el orden de las seis tareas medidas futuras. La preparación
no ejecuta la campaña ni establece aceptación humana.

## Revisión humana posterior

Usar el [comando de revisión y sus ejemplos](manual-task-review.md) tras cerrar
el intento y limpiar correctamente. El helper acepta `bash "$MANUAL_RUNNER" review`
con todas las opciones obligatorias y lo reenvía a la tarea guardada. `status`
muestra decisión efectiva, propósito, asistencia, elegibilidad/motivos y ruta.

La tarea/paquete sellados y las notas previas permanecen intactos. Su
`humanAcceptance: pending` conserva el snapshot histórico; solo la revisión
explícita de una persona actualiza el valor mostrado. Un ensayo guiado puede
aceptarse y seguir excluido de selección de límites. La falta de revisión no
implica aceptación.

READY → `start`; REVIEW → investigar/editar/`check`; COMPLETED → `cleanup`;
cerrado y limpio → `review` humano. Cambiar código requiere un plan nuevo para
calibración formal. El [ensayo F11/G revisado](cases/F11-F12-L06/record.md#ensayo-funcional-guiado-revisado-el-2026-10-03)
continúa excluido de selección de límites.
