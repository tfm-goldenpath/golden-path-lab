# Validación automatizada de reparaciones F03/F10/F11

El alcance actual y los requisitos de fuente final se consolidan en la
[matriz de veinte escenarios](evaluation-readiness.md). La medición de esfuerzo
humano y calibración manual elegible están aplazadas; las observaciones históricas
conservan su fuente y revisión originales.

[English](../EN/automated-remediation.md) · [Arquitectura](architecture.md) · [Trabajo actual](../../TODO.md)

Esta evaluación técnica separada en carril A sustituye provisionalmente las seis
tareas manuales en el calendario inmediato. **La evaluación de esfuerzo humano se
aplaza; la automatización no la completa.** No mide diagnóstico humano, esfuerzo
manual, productividad ni descubrimiento autónomo de una reparación. Conserva los
ensayos guiados, sus formatos de revisión y la campaña pareada independiente de
PR #43. Aceptación global del piloto, calibración/límites humanos y autorización
de campaña alojada siguen pendientes por separado.

## Un comando en Codespaces

Desde la raíz, usar el entorno fijado y la base existente. Si falta, restaurar la
base conservada; no descargar otra para obtener un resultado favorable. Preparación
del entorno y dependencias, si aún no se ha realizado:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation
export MANUAL_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot"
test -f "$MANUAL_DB/db/trivy.db"
```

Un único comando crea el plan y prepara, ejecuta, diagnostica, repara, comprueba,
limpia y evalúa seis tareas independientes, secuencialmente:

```bash
python3 implementacion/scripts/automated-remediation.py run \
  --session automated-six-01 --database "$MANUAL_DB" --seed automated-six-v1
```

No solicita notas de actividad, edición ni revisiones. La semilla conserva el
orden determinista existente: dos pares de escenarios usan un orden R/G y uno
el opuesto. Cada posición tiene entrada defectuosa original y laboratorio propios.
Nunca se repite automáticamente un intento fallido; la siguiente combinación
solo puede empezar después de limpiar correctamente la anterior.

El límite operativo es **por operación externa**, incluida preparación y limpieza:
F03 = 1800 s, F10 = 1800 s, F11 = 1200 s, iguales para R/G. Son límites de
seguridad, no límites calibrados de tareas humanas. Se conservan temporizadores,
versiones, confianza, políticas y umbral de vulnerabilidades existentes.

Antes de preparar y entre tareas, se exigen **6 GiB libres** tanto en el sistema
de archivos del workspace como en el de Docker. Es una reserva conservadora, no
una garantía contra agotamiento durante el build. La falta de espacio o un error
al consultar Docker detiene la sesión con motivo e informe parcial. No se hace
prune global ni se borra evidencia anterior. Las tareas secuenciales reutilizan
los bytes de la base canónica, comprobando identidad antes/después del escaneo;
no crean seis copias. Trivy puede conservar caché junto a esos bytes. Guardar
también la base fuera de Codespaces.

## Detección y reparaciones acotadas

| Escenario | Detección exigida | Reparación y comprobación |
|---|---|---|
| F03 | Escaneo real del SBOM original atribuye CVE-2021-44906 en minimist 1.2.5 con la base congelada y política de producción. | Solo package.json y package-lock.json: minimist 1.2.8 con la entrada del fixture reparado. Conservar identidad del paquete, Dockerfile y exercise.cjs. Exigir imagen nueva, misma base, ausencia del hallazgo, umbral HIGH/CRITICAL completo y comportamiento de dependencia/HTTP conservado. |
| F10 | Gate de procedencia fresco y autenticado atribuye únicamente el repositorio no autorizado. | Copiar la referencia del authorized-artifact.txt de solo lectura de esta tarea a image.txt. No editar declaraciones, firmas, claves, catálogo ni políticas; verificar y desplegar el artefacto autorizado. |
| F11 | Conftest atribuye ambos privilegios prohibidos. | Solo privileged y allowPrivilegeEscalation del contenedor quotes-node pasan a false. Conservar imagen y demás ajustes; comprobar entrega y HTTP. |

G exige detección en su ruta de entrega inicial; ningún diagnóstico adicional
puede compensar su ausencia. R termina la entrega de referencia antes de que el
script invoque scan, provenance o manifest. Su mecanismo es `scripted:*`, no
descubrimiento humano. Errores de registro, certificado, transporte, evaluador o
infraestructura no prueban rechazo de política. Un exit exitoso tampoco prueba
corrección. Se conservan las correcciones rechazadas; no se aplica otra reparación.

## Estado, continuación e intervención

```bash
python3 implementacion/scripts/automated-remediation.py status --session automated-six-01
python3 implementacion/scripts/automated-remediation.py report --session automated-six-01
python3 implementacion/scripts/automated-remediation.py run --session automated-six-01
```

Ctrl+C/SIGTERM detiene el grupo de procesos registrado e intenta limpiar recursos
propios. Tras perder el controlador o reiniciar, se comprueba la identidad de
proceso antes de recuperar. El final desconocido permanece desconocido y no se
repite esa fase. La continuación solo avanza desde fases verificadas o después
de un intento cerrado y limpio. La deriva de fuente/base bloquea trabajo nuevo
y aún intenta limpiar. Una fuente nueva necesita otra sesión, sin editar hashes
históricos. Tras inspeccionar una limpieza fallida, solicitar explícitamente su
repetición segura:

```bash
python3 implementacion/scripts/automated-remediation.py run \
  --session automated-six-01 --retry-cleanup
```

La ejecución normal no necesita una persona. Si alguien toma el control de una
tarea abierta, detener el runner y registrar el hecho antes de editar, indicando
posición y motivo reales:

```bash
python3 implementacion/scripts/automated-remediation.py intervention \
  --session automated-six-01 --position 1 --note 'Motivo real de la intervención humana'
```

Esto cierra el intento como incompleto, lo excluye de resultados totalmente
desatendidos y limpia su laboratorio. No inventa reparación ni finalización y
no modifica intentos sellados. Ediciones no registradas incumplen los hashes de
original/reparación y nunca producen una validación desatendida favorable. Una
limpieza terminada a la fuerza puede necesitar recuperación y repetición explícita;
un error no demuestra ausencia de recursos.

## Evidencia e interpretación

La sesión está en `evidence/manual-tasks/<session>/`; las tareas, en
`automated-validation/task-*`. Se conservan nombres internos y esquema compartido
`manual-task/v1` por compatibilidad. La identidad está en los registros:

```json
{
  "executionMode": "scripted",
  "dataset": "automated-validation",
  "actor": "automation",
  "humanAcceptance": "pending",
  "eligibleForHumanCalibration": false
}
```

Se mantiene en tareas, solicitudes, recibos, archivos e informes. No se generan
actividad humana ni `HUMAN_REVIEW_STARTED`; las solicitudes dicen
`scripted-requested`. Una revisión humana posterior no permite calibrar, medir
esfuerzo humano ni congelar límites con estos registros. El runner nunca invoca
review, asigna un revisor ni acepta resultados en nombre de una persona.

`report.json` y `report.md` incluyen las seis posiciones, detección esperada y
observada, transformación con tiempos/hashes, finalización, limpieza, integridad,
tiempos automáticos reales, interrupciones y fallos pendientes. `VALIDATED`,
integridad y aceptación humana son decisiones distintas. Exit 0 exige 6/6;
cobertura parcial, desfavorable, interrumpida o no ejecutada devuelve 2. Invocación
o plan inválidos devuelven 1. Se puede regenerar el informe histórico sin exigir
la fuente actual; se conservan originales e historial de invocaciones.

Guardar la sesión completa, `initial-plan.json`, originales, reparaciones,
operaciones/checksums/informes, directorios `evidence/raw/run-*`, paquetes seguros
`evidence/packages/run-*.tar.gz` con sidecars y base canónica. Los paquetes usan
las exclusiones de secretos existentes y conservan contenido original en JSON y
recibos de build. Son snapshots anteriores al exit final de limpieza: guardar
también el directorio final de tarea. Los hashes no establecen custodia independiente.

Ejemplo de fila **no ejecutada**, ilustrativo y sin afirmar éxito:

| Combinación | Esperada | Observada | Reparación | Finalización | Limpieza | Integridad | Evaluación |
|---|---|---|---|---|---|---|---|
| F03/G | automatic:scan | unproven | NOT_EXECUTED | NOT_EXECUTED | NOT_EXECUTED | NOT_VERIFIED | NOT_EXECUTED |

La [entrega de desarrollo](../../registros/automated-remediation-validation.md)
recoge comprobaciones reales y descripción propuesta del PR. Las pruebas
sintéticas validan contratos y secuencia; la integración exige una ejecución real.

## Ejecución local observada

El 2026-10-04, `automated-six-01` sobre el commit sin cambios
`ea790781990766a3cb20bae5a302e1175edd3bd0`, semilla `automated-six-v1`,
terminó con **6/6 VALIDATED** y exit 0. Orden: F10/G, F10/R, F03/G, F03/R,
F11/R, F11/G. Pasaron detección esperada, reparación acotada, finalización,
limpieza e integridad de cada paquete. No hubo reintentos, interrupciones ni
intervenciones humanas. La invocación duró 2501.060 s (41,68 minutos), incluidas
preparación y limpieza; los tiempos por operación y tarea se conservan aparte.

Antes de ejecutar, la eliminación autorizada de dos copias redundantes verificadas
de la base liberó unos 2,70 GiB. Se conservaron evidencias anteriores y la base
canónica congelada; no hubo poda global de Docker. Quedaron unos 7,5 GiB libres,
sin contenedores, volúmenes, clústeres kind ni builders propios pendientes.
La prueba inicial de espacio NOT_EXECUTED permanece como observación separada.

El [registro de resultados](../../registros/automated-remediation-validation.md)
conserva identidades de fuente/base, las seis tareas/ejecuciones, checksums de
informes/paquetes y tiempos. Este éxito local sigue siendo evidencia técnica
automatizada provisional: esfuerzo humano aplazado, aceptación humana pendiente
y campaña alojada por pares y aceptación global del piloto separadas. Para
otra ejecución después de cambiar la fuente, usar una sesión nueva y conservar
esta sesión sellada.
