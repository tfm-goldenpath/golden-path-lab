# Ensayos guiados de tareas manuales — 2026-10-03

[English](../EN/manual-task-rehearsal-review.md) · [Procedimiento de revisión](manual-task-review.md)

## Resultado y decisiones humanas

La sesión `calibration-final-01` contiene **ocho intentos: siete completados
técnicamente y uno incompleto**. Francisco registró siete revisiones aceptadas
con `purpose: rehearsal` y `assistance: ai`. La preparación incompleta recibió
`rejected / calibration / ai`. Los ocho tienen limpieza completada y son
inelegibles para calibración. Los ensayos completados cubren F03/F10/F11 en R y G,
incluido un segundo intento F03/G. Se acredita cobertura funcional guiada,
**cero calibraciones elegibles** y ningún resultado de tareas medidas.

Son declaraciones humanas conservadas; esta auditoría no genera aceptación.
Los campos originales `humanAcceptance: pending` permanecen intactos; el estado
efectivo consulta las revisiones separadas. Aceptar los ensayos individuales no
establece aceptación final de la PR #42 ni del piloto global.

Código: `b4d056c65f156867d3c41e0102330fe8e3282ca4`, en la
[PR #42](https://github.com/tfm-goldenpath/golden-path-lab/pull/42).
Semilla: `manual-six-v1-2026-10-02`. Secuencia prevista:
F11/G, F11/R, F03/G, F03/R, F10/R, F10/G. Todos conservan la misma identidad de
plan/código/base/herramientas/entorno. Los intentos adicionales se mantienen;
el segundo F03/G más rápido no sustituye la observación anterior.

## Todos los intentos

Segundos conservados, redondeados a tres decimales. Detección mide desde el inicio
hasta la primera detección registrada; resolución, desde la detección hasta la
finalización validada. El tiempo no observado no se reconstruye como trabajo
humano. Estos intentos guiados y no independientes no se usan para comparar
rendimiento por pares ni elegir límites.

| Tarea | Escenario/brazo | Detección s | Resolución s | Total s | No observado s |
| --- | --- | ---: | ---: | ---: | ---: |
| `task-ac69a7358932` | F11/G | 17.245 | 745.048 | 762.292 | 372.840 |
| `task-f44e918fd305` | F11/R | 197.593 | 280.024 | 477.617 | 286.655 |
| `task-77b9599d3bca` | F03/G | 50.361 | 1224.275 | 1274.636 | 730.078 |
| `task-ba0bd6f29b3f` | F03/R, incompleto | — | — | — | — |
| `task-530013f5da12` | F03/G, discrepancia descrita abajo | 54.915 | 347.106 | 402.022 | 70.914 |
| `task-53709cb90dc4` | F03/R | 127.995 | 174.790 | 302.785 | 37.951 |
| `task-2726d279baf1` | F10/R | 99.324 | 116.935 | 216.258 | 26.967 |
| `task-c526fd8dd770` | F10/G | 18.224 | 127.549 | 145.774 | 18.337 |

La detección registrada es `automatic:manifest`, `automatic:scan` y
`automatic:provenance` en G; sus equivalentes `manual:` en R completado. R pudo
detectar el problema con las mismas herramientas convencionales. Siete recibos
finales registran `VALIDATED_COMPLETION`; las ocho limpiezas terminan con código 0.
Se conserva el primer `CORRECTION_REJECTED` de F11/G. F03/R
`task-ba0bd6f29b3f` falló con `No space left on device` durante preparación, antes
del cronómetro. Detección/resolución/total son nulos, no cero. La limpieza
posterior conservó un paquete válido; eso no convierte el intento en completado.

### Aclaración humana pendiente

`task-530013f5da12` es F03/G en el registro sellado y su paquete, con detección
`automatic:scan`. Su justificación humana aceptada describe F03/R y escaneo
manual. Se conserva la discrepancia y la revisión original. Solo Francisco puede
aclararla, mediante revisión que sustituya explícitamente a la anterior si
procede; no se cambia el brazo ni se edita el JSON. El propósito de ensayo y la
asistencia de IA ya lo excluyen de calibración. Esta auditoría refleja la decisión
existente sin resolver la descripción contradictoria en nombre del revisor.

## Evidencias conservadas y comprobaciones

Sesión original: `implementacion/evidence/manual-tasks/calibration-final-01/`.
Informe: `runner-reports/20261003T233102Z-92eaf109.json`, SHA-256
`e8927a8f64fcf36634ac9f76181258c8c76f1164199ef3db178da51ab954a6fd`.
SHA-256 del plan: `b901a2c9421915bfeda5f0f5d6276e4fb95fe81059234057b0654428747d4992`.

Auditoría de solo lectura: **pasan 373 hashes de tareas, ocho sumas externas,
2.369 hashes internos, pertenencia e identidades de los paquetes, ocho historiales
de revisión, correspondencia informe/plan y recibos de validación/limpieza**.
Se conservan los archivos y sus fechas de modificación. No se repiten firmas,
admisión, compilaciones, escaneos ni tareas humanas. Las pruebas sintéticas previas
siguen separadas de estas observaciones reales guiadas; no se repite la suite
compartida para este cambio exclusivamente documental.

Las correspondencias tarea/ejecución, tiempos exactos, revisores, fechas,
justificaciones y hashes están en
`implementacion/evidence/environment/calibration-final-01-review/audit.json`.
La copia descargable es
`implementacion/evidence/packages/calibration-final-01-review-20261003.tar.gz`
con su archivo `.sha256`. Contiene la sesión completa, ocho paquetes originales y
sumas, el ejecutor local exacto como referencia, registros de limpieza de disco,
este informe EN/ES, la auditoría y una copia de la base identificada. Excluye
estado privado y credenciales. No hace falta ejecutar código archivado para
inspeccionarla. Los originales brutos también permanecen en Codespaces.

Tras descargar ambos archivos, verificar en Linux/Codespaces:

```bash
sha256sum -c calibration-final-01-review-20261003.tar.gz.sha256
tar -xzf calibration-final-01-review-20261003.tar.gz
(
  cd calibration-final-01-review-20261003
  sha256sum -c SHA256SUMS.txt
)
```

Resultado esperado: `OK` para el paquete y cada archivo listado. Las referencias
absolutas originales dentro de JSON permanecen intactas; extraer no migra las
identidades a otro checkout. El usuario confirmó después que había descargado las
evidencias; no se ha verificado independientemente la copia externa. El paquete
descargado conserva el informe anterior a esa confirmación. Los hashes locales
detectan cambios, no autentican al revisor.

## Decisiones pendientes

Los tres `limitsSeconds` y `limitsReview` siguen sin fijar. La fórmula del margen
del 50% carece de entradas elegibles y no produce límites. No usar estos ensayos
para fijarlos ni ocultar intentos fallidos o más largos.

Tras integrar la corrección, la calibración formal exige un plan nuevo sobre el
código exacto integrado, seis tareas sin ayuda declarando conocimiento previo y
aprendizaje, revisiones humanas explícitas y selección humana de tres límites
compartidos R/G. Este cambio documental también cambia la identidad del código;
la sesión histórica conserva su commit original. Preparación de escenarios,
aceptación global del piloto y autorización de campaña siguen separadas y
pendientes. La línea A no acredita cobertura negativa OIDC/GHCR; el piloto
temporal completado de la línea B permanece sin cambios.

Contribución: OpenAI Codex auditó evidencias y preparó el informe y la actualización
de PR. Las decisiones registradas por Francisco corresponden a los ensayos
individuales; la revisión humana de este resumen y aceptación final de PR siguen
pendientes.
