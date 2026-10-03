# Revisión humana y elegibilidad para calibración

[English](../EN/manual-task-review.md) · [Procedimiento](manual-task-calibration.md)

Observaciones conservadas: [ocho intentos guiados/fallidos que cubren las seis combinaciones](manual-task-rehearsal-review.md)
en `calibration-final-01`, con siete revisiones de ensayo aceptadas y cero
calibraciones elegibles. Se conservan la preparación fallida y una discrepancia
pendiente en la descripción humana de F03/G.

La finalización técnica, la aceptación humana y la elegibilidad para seleccionar
límites son decisiones separadas. Una persona registra su revisión tras cerrar
el intento y terminar la limpieza. El comando no ejecuta tareas ni crea eventos
de actividad humana.

## Corrección tras integrar la PR #41

Main `c59afcda3c7dab76e5a5b43948145c0fae328747` integró el controlador original
`21be955`. La asociación de paquetes (`28ce727`), el propósito de medición
(`81fc08a`) y la documentación humana posterior (`b31c92c`) estaban solo en la
rama local. `fix/manual-review-archive-binding` reutiliza esos commits con su
procedencia; no depende del helper de validación ignorado por Git. Antes de
reutilizarlos, regresiones sintéticas reprodujeron sobre ese main la aceptación
de un paquete ajeno y la ausencia del propósito en la CLI.

Validación restante en Codespaces, ejecutada por la persona desde esta rama:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
git status --short --branch
git rev-parse HEAD
make -C implementacion doctor
node --test implementacion/tests/unit/manual-task-reviews.test.mjs \
  implementacion/tests/unit/manual-tasks.test.mjs \
  implementacion/tests/unit/manual-calibration-session.test.mjs
make -C implementacion test

for task in \
  "$PWD/implementacion/evidence/manual-tasks/calibracion-54b7fa8-01/calibration/task-b069656237fc" \
  "$PWD/implementacion/evidence/manual-tasks/calibracion-pr41-01/calibration/task-c861ec432f94"
do
  python3 implementacion/scripts/manual-tasks.py status "$task" || break
done
```

Las pruebas usan fixtures sintéticos o comprobaciones criptográficas locales, no
tareas humanas. Para los registros históricos conservados, `status` verifica su
historial de revisión, hashes y asociación de tarea/paquete. Se espera: completado,
ensayo aceptado, elegibilidad falsa y aceptación original pendiente. Las revisiones
declaran `assistance: none`; la discrepancia documentada en el caso sigue pendiente
de aclaración humana. No se deduce ni modifica ninguna declaración.

Las revisiones y selecciones congeladas válidas conservan formato y hashes. Las
asociaciones inválidas fallan al volver a leerlas. El control de fuente vigente
sigue bloqueando planes antiguos tras cambios de código. Después de integrar esta
corrección, iniciar el [procedimiento de seis tareas](manual-task-calibration.md)
desde un checkout limpio fijado al commit integrado y una sesión/plan nuevos.
Conservar semilla, herramientas declaradas y exposición previa; realizar las seis
tareas sin IA, revisar cada intento y elegir tres límites totales compartidos por
R/G. Esta entrega no inicia la sesión ni elige límites.

## Revisar un intento conservado

Usar la tarea original bajo `implementacion/evidence/manual-tasks/`. Conservar
todos sus archivos, `SHA256SUMS.txt` final, el paquete original de la ejecución y
su archivo de suma. El comando los verifica y vincula la revisión a sus hashes.
Una preparación fallida sin paquete puede revisarse si dispone de sumas finales
y limpieza completada; sigue siendo inelegible.

La verificación comprueba las sumas externas/internas y la asociación con la tarea.
Cada archivo debe estar bajo la raíz de ejecución esperada, con rutas seguras y
sin ambigüedad. Un único `manual-task.json` en esa raíz debe coincidir con la tarea,
escenario, brazo, conjunto de datos e identidad completa de fuente/base de datos/
herramientas/entorno del registro sellado. La copia tomada durante la limpieza
puede diferir en operación en curso, estado de limpieza y eventos; no se exige
igualdad de todos los bytes con el registro final.

Estas comprobaciones se aplican también al cargar revisiones y selecciones
congeladas. Las revisiones válidas conservan su formato y referencias por hash.
Una revisión antigua con un paquete sustituido o sin registro de tarea ahora
falla aunque sus sumas sean correctas. Conservar la evidencia fallida; no modificar
registros, paquetes ni hashes de revisión para conseguir aceptación. El comando
no usa ni ejecuta código archivado.

Declaraciones obligatorias:

| Opción | Significado |
|---|---|
| `--reviewer` | Nombre/identificador no vacío de la persona revisora. |
| `--decision accepted\|rejected` | Decisión explícita, separada de la finalización técnica. |
| `--rationale` | Justificación no vacía: observaciones, exclusiones y asistencia pertinente. |
| `--purpose rehearsal\|calibration\|measurement` | Propósito declarado. `measurement` exige un conjunto de datos de medición y nunca permite seleccionar límites de calibración. |
| `--assistance none\|ai\|human\|ai-and-human\|unknown` | Ayuda durante la tarea. `none` declara uso sin ayuda de las herramientas convencionales; `unknown` es inelegible. |

La identidad y la asistencia son **declaraciones humanas**, no hechos autenticados.
Un resultado favorable no demuestra trabajo sin ayuda ni quién escribió un
comando. La auditoría de un asistente no es revisión humana. La persona debe
ejecutar su revisión; no pedir al asistente que la registre ni usar IA durante
tareas cronometradas.

### Ejemplo: ensayo guiado aceptado

`task-b069656237fc` es un ensayo guiado F11/G. Sus registros originales, evidencia
de limpieza, sumas, paquete y tres notas humanas siguen disponibles después de
liberar disco. Véase la [revisión histórica](cases/F11-F12-L06/record.md#ensayo-funcional-guiado-revisado-el-2026-10-03).
Francisco ya ha registrado una revisión explícita; véanse los [resultados confirmados](cases/F11-F12-L06/record.md#validación-humana-de-la-pr-41-2026-10-03).
Para corregirla, usar `--supersedes` con la ruta exacta de la revisión vigente y
explicar el cambio. Repetir sin cambios el ejemplo de primera revisión será rechazado.
La persona puede ejecutar lo siguiente después de revisar la evidencia. No se ha
ejecutado en su nombre. Se registra **la fecha actual de una nueva revisión**,
sin importar automáticamente ni retrotraer las notas anteriores.

```bash
MANUAL_TASK="$PWD/implementacion/evidence/manual-tasks/calibracion-54b7fa8-01/calibration/task-b069656237fc"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
read -r -p 'Tu nombre como revisor: ' MANUAL_REVIEWER
read -r -p 'Tu decisión (accepted/rejected): ' MANUAL_DECISION
read -r -p 'Propósito real (rehearsal/calibration/measurement): ' MANUAL_PURPOSE
read -r -p 'Ayuda real (none/ai/human/ai-and-human/unknown): ' MANUAL_ASSISTANCE
read -r -p 'Tu justificación basada en evidencia, incluida ayuda y exclusiones: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision "$MANUAL_DECISION" \
  --purpose "$MANUAL_PURPOSE" --assistance "$MANUAL_ASSISTANCE" \
  --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

La persona debe elegir e introducir las declaraciones; los comandos no las
deducen. Si declara `accepted`, propósito `rehearsal` y ayuda `ai`, la salida
esperada es `REVIEW_RECORDED <ruta>` y
`CALIBRATION_INELIGIBLE purpose:rehearsal, assistance:ai`.
El estado muestra `humanAcceptance: accepted`, `archivedHumanAcceptance: pending`,
`review.purpose: rehearsal`, `review.eligibleForCalibration: false`, motivos,
ruta y hash de revisión. Esta aceptación no aprueba límites, todos los escenarios
ni el piloto completo. Adaptar las declaraciones si no describen fielmente el intento.

### Ejemplo: calibración realmente realizada sin ayuda

Usar solo después de una calibración real sin ayuda, completada, limpiada y
revisada por la persona. Este ejemplo no acredita ninguna calibración elegible.

```bash
read -r -p 'Ruta TASK de calibración sin ayuda, completada y limpia: ' MANUAL_TASK
read -r -p 'Tu nombre como revisor: ' MANUAL_REVIEWER
read -r -p 'Tu justificación basada en evidencia: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision accepted \
  --purpose calibration --assistance none --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

Salida: `REVIEW_RECORDED <ruta>` y `CALIBRATION_ELIGIBLE` para una calibración
real, completada, limpia y con evidencia íntegra. El estado informa aceptación y
`review.eligibleForCalibration: true`. No elige ni congela límites. Para una
revisión negativa usar `--decision rejected`; conserva el intento y justificación
con el motivo `decision:rejected`.

### Revisar un intento de medición

Para una tarea cerrada y limpia cuyo conjunto de datos registrado sea
`measurement`, usar el propósito explícito de medición. No se acredita aquí una
medición real ni aceptación. Tras inspeccionar la evidencia, la persona declara:

```bash
read -r -p 'Ruta TASK de medición cerrada y limpia: ' MANUAL_TASK
read -r -p 'Tu nombre como revisor: ' MANUAL_REVIEWER
read -r -p 'Tu decisión (accepted/rejected): ' MANUAL_DECISION
read -r -p 'Ayuda real (none/ai/human/ai-and-human/unknown): ' MANUAL_ASSISTANCE
read -r -p 'Tu justificación basada en evidencia: ' MANUAL_REVIEW_REASON
python3 implementacion/scripts/manual-tasks.py review "$MANUAL_TASK" \
  --reviewer "$MANUAL_REVIEWER" --decision "$MANUAL_DECISION" \
  --purpose measurement --assistance "$MANUAL_ASSISTANCE" \
  --rationale "$MANUAL_REVIEW_REASON"
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
```

Salida para `accepted` y `none`: `REVIEW_RECORDED <ruta>` y
`CALIBRATION_INELIGIBLE purpose:measurement, dataset:measurement`. El estado muestra
la decisión declarada y `review.purpose: measurement`, con elegibilidad falsa.
Usar este propósito en un conjunto de calibración falla con
`Measurement review purpose requires a measurement task`. La prohibición de IA
en tareas medidas sigue vigente; declararla no autoriza su uso.

Las revisiones existentes conservan su propósito original. No se cambian
automáticamente; una revisión nueva exige `--supersedes` como se explica abajo.

El helper reenvía `review` y sus opciones a la tarea guardada:
`bash "$MANUAL_RUNNER" review ...`. Actualizar las copias antiguas del helper
para usar esta acción; guardar los inputs declarados antes de reemplazar la copia.

## Estado y siguiente acción permitida

`status` solo lee. Incluye `technicalStatus`, decisión efectiva, propósito,
asistencia, elegibilidad/motivos, ruta/hash de revisión y `nextAction`:

| Estado | Siguiente acción |
|---|---|
| `READY` | `start` cuando la persona esté preparada. |
| `REVIEW` | Investigar, editar entradas permitidas y `check` dentro del mismo reloj/ventana. |
| `COMPLETED` | `cleanup`; completar no concede aceptación. |
| Cerrado y con limpieza terminada | `review` humano explícito. |
| Revisado | Conservar evidencia; valorar elegibilidad antes de seleccionar límites. |

Las revisiones se guardan fuera de la tarea sellada en
`<sesión>/reviews/<task-id>/review-0001-<sha256>.json`. Permanecen intactos
`record.json`, `summary.json`, timestamps, sumas y paquetes históricos, incluido
su `humanAcceptance: pending`. Solo el valor efectivo mostrado incorpora la nueva
revisión. Notas de texto antiguas y metadatos ausentes no implican aceptación ni
elegibilidad en el nuevo mecanismo.

Otra revisión requiere `--supersedes '<ruta exacta de la revisión actual en status>'`
y todas las declaraciones. Recibe fecha y hash nuevos, enlaza su predecesora y
conserva decisiones previas. Una historia ausente, modificada o ambigua falla.
Restaurar originales dañados desde la copia conservada; no editar JSON de revisión,
recalcular su hash ni cambiar sumas antiguas para obtener elegibilidad.

## Congelar solo seis calibraciones elegibles

Usar el [comando freeze-limits](manual-task-calibration.md#tiempos-y-límites) con
exactamente una tarea de F03/R, F03/G, F10/R, F10/G, F11/R y F11/G. Cada una exige
revisión explícitamente aceptada, propósito de calibración, `assistance: none`,
finalización real, limpieza y evidencia íntegra. Se rechazan selecciones sin
revisión, rechazadas, guiadas, sintéticas, incompletas o duplicadas. Conservar
todos los intentos excluidos y sus motivos.

Siguen vigentes los requisitos del mismo plan, código/configuración actual y
base de datos. Puede revisarse historia desde un checkout posterior; **cambiar
código exige un plan nuevo y tareas nuevas sobre ese código para calibración
formal**. Una revisión no traslada calibraciones antiguas al código nuevo. La
persona elige tres límites y justificación: un límite total por escenario igual
para R y G.

La decisión congelada conserva rutas y hashes de cada registro y revisión.
Al cargar el plan se verifican de nuevo. Una revisión cambiada, ausente o
sustituida bloquea el uso posterior, incluso si también acepta el resultado.
Se rechazan planes antiguos sin vínculos a revisiones. Conservar su decisión y
crear otro plan; no modificar el plan congelado para adaptarlo a una revisión nueva.

Descargar la sesión con `reviews/`, registros finales, paquetes y sumas, y la
base identificada. Las revisiones posteriores a una descarga necesitan una nueva
copia externa. Estos hashes locales sin firma detectan cambios respecto a las
referencias conservadas; no aportan custodia independiente ni autenticación.

No cambian tiempos, oráculos, controles, versiones ni el piloto B. La línea A
no prueba cobertura negativa OIDC/GHCR. Francisco confirmó uso real del mecanismo
en dos ensayos F11/G aceptados; ambos siguen excluidos de calibración. Sus
declaraciones `assistance: none` contradicen evidencia de guía conservada o la
justificación de revisión; permanecen intactas hasta una aclaración/revisión humana
explícita. La exclusión observada es por propósito de ensayo. Véanse los
[resultados y evidencia](cases/F11-F12-L06/record.md#validación-humana-de-la-pr-41-2026-10-03).
Siguen pendientes las seis calibraciones, preparación de escenarios y aceptación
global del piloto; no se acredita ejecución de tareas medidas ni revisión real con
propósito `measurement`.
