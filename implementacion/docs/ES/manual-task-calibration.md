# Calibración humana de F03 F10 y F11

Calendario inmediato: usar la [validación automatizada de reparaciones](automated-remediation.md) para F03/F10/F11 × R/G. La comparación de esfuerzo humano y la calibración manual elegible se aplazan; la automatización no las completa. Se conservan ensayos históricos, formatos de revisión, campaña pareada separada de PR #43 y aceptación global del piloto pendiente.

[English](../EN/manual-task-calibration.md) · [Instrucciones del participante](manual-task-participant.md) · [Estado actual](../../TODO.md)

Este procedimiento prepara **seis tareas humanas en el carril A: F03/F10/F11
en R y G**. La implementación y las pruebas sintéticas no son calibración humana
ni aceptación de ejecución real. Las calibraciones elegibles y límites siguen
pendientes; el [ensayo guiado F11/G](manual-task-review.md#ejemplo-ensayo-guiado-aceptado)
tiene una aceptación limitada y separada. El [piloto temporal B terminado](paired-rg-pilot-review.md)
conserva su protocolo y resultados. Sus cuatro pares piloto y diez pares
provisionales de campaña no se aplican a estas seis tareas.

## Preparación del operador y oráculos existentes

La sesión fija fuente/configuración, base del escáner y herramientas
convencionales. El plan registra revisión Git, hashes de fuentes, lock de
herramientas, bytes de la base, editor declarado, semilla y secuencia. Se rechazan
cambios de fuente, base, orden o límites congelados. Cada tarea crea su propio
cluster kind, registro zot, builder y clave de desarrollo mediante los módulos
existentes. Recursos, perfil de confianza, historial de preparación y fixtures
son equivalentes entre brazos; nombres, claves y digests son independientes.
La clase de recursos debe coincidir con las preparaciones anteriores. Hay que
limpiar un intento antes de preparar otro. Esto no demuestra cobertura negativa
de OIDC/GHCR alojada.

La entrada es deliberadamente **posterior al build**: entradas, imágenes iniciales,
evidencias del fixture, base, disponibilidad de admisión y funcionalidad positiva
se preparan antes del inicio. El operador confirma el defecto y deja ausente el
Deployment medido. Sus comprobaciones no cuentan como detección del participante.
El builder es nuevo y después contiene la caché de esa preparación registrada;
no es el experimento de cachés preparadas del carril B.

| Escenario y registro | Problema preparado | Primer control aplicable de G | Corrección humana validada |
|---|---|---|---|
| [F03](../EN/cases/F03-F04-L02/record.md) | minimist 1.2.5 real con CVE-2021-44906 y corrección disponible en la base fijada | Análisis Trivy del SBOM y política de vulnerabilidades existentes | Editar manifiestos de dependencia; construir otra imagen y escanearla con la misma base. Objetivo ausente, umbral global HIGH/CRITICAL aprobado, comportamiento de dependencia y HTTP conservados. |
| [F10](cases/F09-F10-L05/record.md) | Fixture local etiquetado: procedencia auténtica para el digest, con solo el origen de repositorio no autorizado | Comprobación fresca de registro y criptografía existente | Obtener/seleccionar el artefacto autorizado ya preparado del catálogo local. Autenticar sus evidencias, admitirlo y comprobar su funcionamiento. Sin relajar políticas, volver a firmar ni reescribir declaraciones. |
| [F11](cases/F11-F12-L06/record.md) | Alteración válida para Kubernetes de `privileged=true` y `allowPrivilegeEscalation=true` | Política Conftest de manifiestos existente | Eliminar los ajustes prohibidos bajo el contrato de valores false explícitos; mantener imagen, resto del manifiesto y funcionalidad; entrega correcta. |

R inicia el despliegue de referencia sin las comprobaciones automáticas de
escáner, evidencias y políticas de G. Ambos brazos tienen las mismas herramientas
y requisitos funcionales. R puede detectar mediante escáneres/verificadores
invocados manualmente; se registran la acción y su resultado atribuible. Un código
no cero por sí solo no es detección. G conserva sus barreras posteriores y la
admisión cuando se alcanzan; un bloqueo temprano deja las posteriores sin ejecutar.

`operator/prepared.json` y el directorio raw contienen oráculos, identidades y
comprobaciones de preparación. Entregar al participante `participant/` y los
comandos, sin guiarlo por las soluciones del operador. Esta separación organiza
el procedimiento; no aísla permisos del sistema de archivos ni crea un estudio
ciego. Declarar conocimientos previos, intentos anteriores y exposición al otro
brazo. El aprendizaje y el catálogo suministrado de F10 limitan la generalización
a incidentes abiertos. Desactivar IA durante calibración y medición mantiene
comparables ambas sesiones.

## Comandos para la calibración

El [fichero de comandos de sesión](manual-calibration-session.md) ofrece inputs
editables, preparación en una llamada con log en directo y rutas guardadas para
los comandos posteriores. Evita recrear un plan o copiar IDs de tareas. Los
comandos explícitos siguientes siguen disponibles.

Desde la raíz del repositorio, en el devcontainer Linux fijado. Se prepara una
tarea por comando; no se lanza ninguna serie:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation
MANUAL_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot"
test -f "$MANUAL_DB/db/trivy.db"
MANUAL_PLAN="$PWD/implementacion/evidence/manual-tasks/session-01/plan.json"
read -r -p 'Nombre y versión del editor: ' MANUAL_EDITOR
python3 implementacion/scripts/manual-tasks.py plan \
  --seed manual-six-v1-2026-10-02 --output "$MANUAL_PLAN" \
  --database "$MANUAL_DB" --editor "$MANUAL_EDITOR"
```

Se reutiliza esa base sin cambiar sus bytes. Si falta, restaurar primero una base
conservada y revisada e indicar su directorio; no sustituirla silenciosamente por
una descarga reciente. La preparación rechaza cambios del objetivo F03 o ausencia
de corrección. Salida esperada: `PLAN_CREATED <ruta>`, secuencia de seis tareas y
`LIMITS_UNSET`. Conservar `plan.json` e `initial-plan.json`.
Para la semilla del ejemplo, la secuencia medida futura conservada es
`F11/G F11/R F03/G F03/R F10/R F10/G`. La calibración se registra por separado.

Crear el plan una sola vez. `ERROR: Plan already exists` lo conserva intacto:
reutilizar su ruta en `prepare` mientras coincidan las identidades del código,
configuración y base. Tras cambiar la implementación, conservar la sesión original
y crear un plan en otro directorio (por ejemplo `session-02/plan.json`), con la
misma semilla declarada y base. No sobrescribir el plan ni editar sus hashes.

El desarrollo inicial en `1b06e01` registró el desajuste kubectl 1.37.0/1.35.8.
Tras alinear las herramientas de Codespaces con las versiones ya fijadas, `doctor`
pasó durante la revisión de `8df21bf`. Conservar aquel fallo como evidencia histórica
y ejecutar `doctor` antes de cada sesión. La validación real del procedimiento y
la calibración humana siguen pendientes; comprobar el entorno no las demuestra.

```bash
read -r -p 'Identificador del participante: ' MANUAL_PARTICIPANT
read -r -p 'Conocimientos y exposición anteriores: ' MANUAL_KNOWLEDGE
python3 implementacion/scripts/manual-tasks.py prepare --plan "$MANUAL_PLAN" \
  --dataset calibration --scenario F03 --arm R \
  --participant "$MANUAL_PARTICIPANT" --prior-knowledge "$MANUAL_KNOWLEDGE"
read -r -p 'Pega la ruta TASK indicada: ' MANUAL_TASK
python3 implementacion/scripts/manual-tasks.py start "$MANUAL_TASK"
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" investigate \
  --note 'Inicio de revisión manual'
python3 implementacion/scripts/manual-tasks.py tool "$MANUAL_TASK" scan
```

Preparación correcta: `TASK <directorio>` y `READY; total timer has not started`.
La línea `TASK` por sí sola no demuestra que la preparación haya terminado.
Si falla, conservar el intento incompleto y ejecutar `cleanup` antes de preparar
otro. Puede faltar `operator/prepared.json`; no crearlo manualmente ni ejecutar
`start` con esa tarea anterior. Usar la nueva ruta solo después de `READY`.
Al terminar o bloquearse de forma atribuible la ruta automática, `start` imprime
`HUMAN_REVIEW_STARTED`. Leer `command.log` en el directorio de operación indicado;
`state-path.txt` apunta a las salidas completas de herramientas. Que R complete
su ruta no completa la tarea. Para F10 usar `tool ... provenance`; para F11,
`tool ... manifest`. Ambos brazos disponen de los mismos comandos. La detección
manual registra `manual:<herramienta>`; la ruta inicial G,
`automatic:<herramienta>`. El primer resultado atribuible recibe timestamp en
el control, sin introducir tiempos retrospectivos. Un reconocimiento anterior
sin evidencia de herramienta puede anotarse como actividad, pero no se convierte
silenciosamente en detección verificada anterior.

En cada calibración independiente, usar el mismo comando `prepare` con el
`--scenario` y `--arm` correspondientes y asignar su nueva ruta a `MANUAL_TASK`:

| Tareas de calibración | Sufijo del comando de control manual |
|---|---|
| `--scenario F03 --arm R` y `--scenario F03 --arm G` | `tool "$MANUAL_TASK" scan` |
| `--scenario F10 --arm R` y `--scenario F10 --arm G` | `tool "$MANUAL_TASK" provenance` |
| `--scenario F11 --arm R` y `--scenario F11 --arm G` | `tool "$MANUAL_TASK" manifest` |

```bash
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" investigate \
  --note 'Revisión de la salida conservada'
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" correct \
  --note 'Inicio de la corrección elegida'
# La persona edita únicamente la entrada permitida con herramientas declaradas.
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" wait \
  --note 'Espera real de un comando externo; describirlo aquí'
python3 implementacion/scripts/manual-tasks.py event "$MANUAL_TASK" correct \
  --note 'Reanudación de la corrección activa'
python3 implementacion/scripts/manual-tasks.py check "$MANUAL_TASK"
```

Leer el resultado antes de continuar. Ejecutar la limpieza por separado cuando
decidas terminar; limpiar durante `REVIEW` cierra el intento como `INCOMPLETE`.

```bash
python3 implementacion/scripts/manual-tasks.py status "$MANUAL_TASK"
python3 implementacion/scripts/manual-tasks.py cleanup "$MANUAL_TASK"
```

Usar `wait` solo ante una espera real y `pause` para descansos o intervalos sin
observación. Herramientas y verificación final cuentan automáticamente como espera;
registrar de nuevo la actividad al retomarla. `check` valida la entrada humana
sin repararla: F03 reconstruye y escanea, F10 consume el artefacto seleccionado y
F11 comprueba el manifiesto editado. Imprime:

- `VALIDATED_COMPLETION`: todas las comprobaciones requeridas pasan.
- `CORRECTION_REJECTED; task remains REVIEW`: una decisión respaldada por evidencia
  muestra que la corrección es insuficiente, incluida una incompatibilidad funcional
  observada. `CHECK_RESULT` indica la ruta con enlaces a los diagnósticos. Continuar
  con el mismo reloj/ventana; `event correct` solo registra la actividad.
- `INCOMPLETE`: un fallo de build, registro, transporte, perfil o evaluador impide
  validar. La evidencia ausente, malformada o inconsistente también cierra el
  intento; un código distinto de cero no basta para atribuir un rechazo.

Cada comprobación conserva su directorio, diagnósticos y código de salida.
`check-result.json` registra escenario, fase y resultado; un rechazo o finalización
enlaza su evidencia mediante ruta y SHA-256. Revisar diagnósticos y ejecutar
`cleanup` tras `INCOMPLETE`; no reintentar esa tarea. Conservarla antes de revisar
la causa y preparar otro intento. Si otra operación deja abierto un intento
ininterpretable, registrar `event "$MANUAL_TASK" abandon --note '<motivo observado>'`
y limpiar. Una corrección fallida por sí sola no invalida la tarea.
`cleanup` imprime `CLEANUP_COMPLETE`
tras empaquetar y observar ausentes cluster, registro, builder y material privado
propios. La comprobación conserva inventarios Docker, incluidos los contenedores
y volúmenes de caché del builder, sin invocar `buildx ls`, que puede recrear la
configuración Docker privada eliminada. Ante `CLEANUP_FAILED`, revisar esos
inventarios y logs de error antes de repetir la limpieza; un error de consulta no
demuestra ausencia. Repetir limpieza conserva el primer paquete y registra otra
operación.

Guardar la ruta y preparar la siguiente calibración con su escenario/brazo y
conocimientos actualizados. Cubrir las seis combinaciones; nunca reutilizar un
workspace corregido como entrada inicial del otro brazo. Ctrl-C durante un comando
detiene su grupo de procesos y conserva el intento incompleto. Tras terminar
abruptamente el controlador o reiniciar el sistema, usar `recover <tarea>` y
`cleanup`. Se comprueba la identidad de un proceso huérfano antes de detenerlo;
no se inventa cuándo terminó. Se exige una `runningOperation` registrada; si falta,
devuelve `ERROR: No recorded interrupted operation; task unchanged` y conserva
intacta la tarea sana en READY o REVIEW. Los huecos desconocidos conservan estado incompleto
y un límite inferior observado. No reiniciar la ruta interrumpida en el mismo intento.

## Revisión explícita después de limpiar

La [guía de revisión humana](manual-task-review.md) contiene comandos exactos y
un ejemplo de ensayo guiado y otro de calibración sin ayuda. `review` exige nombre,
decisión explícita, motivo, propósito y declaración de asistencia. Conserva las
revisiones fuera de la tarea sellada; `status` muestra decisión efectiva,
elegibilidad, motivos, ruta/hash y siguiente acción. Completar o limpiar no concede
aceptación; los archivos históricos pueden conservar `pending`.
Usar `--purpose measurement` al revisar una tarea de medición; incluso aceptada,
una medición sigue siendo inelegible para seleccionar límites de calibración.

## Tiempos y límites

El intervalo total monotónico comienza inmediatamente antes de invocar la ruta
automática preparada. La revisión humana comienza cuando ese proceso termina,
aceptado o bloqueado. Los eventos explícitos delimitan diagnóstico, corrección,
espera y tiempo sin observar; un terminal abierto no demuestra actividad. Se
conservan UTC e identidad de arranque junto a timestamps monotónicos. Un reinicio
no permite unir dos relojes.

- Latencia de detección: primera detección atribuible menos inicio total.
- Resolución: finalización validada menos detección.
- Duración total: finalización validada menos inicio, incluyendo automatización,
  trabajo activo y esperas; preparación y limpieza quedan fuera.
- Verificación se informa aparte y es un subconjunto de las esperas.

Las calibraciones van en `calibration/`, **sin límite experimental**. Después de
revisar y aceptar seis calibraciones elegibles sin ayuda, la persona responsable
elige un límite total por escenario,
idéntico para R y G, y registra su justificación:

```bash
# Asignar CAL_F03_R, CAL_F03_G, CAL_F10_R, CAL_F10_G, CAL_F11_R y CAL_F11_G
# a exactamente seis calibraciones aceptadas, elegibles y realizadas sin ayuda.
read -r -p 'Límite total F03, segundos: ' MANUAL_F03_LIMIT
read -r -p 'Límite total F10, segundos: ' MANUAL_F10_LIMIT
read -r -p 'Límite total F11, segundos: ' MANUAL_F11_LIMIT
read -r -p 'Revisor: ' MANUAL_REVIEWER
read -r -p 'Justificación basada en calibraciones: ' MANUAL_RATIONALE
python3 implementacion/scripts/manual-tasks.py freeze-limits --plan "$MANUAL_PLAN" \
  --limit "F03=$MANUAL_F03_LIMIT" --limit "F10=$MANUAL_F10_LIMIT" --limit "F11=$MANUAL_F11_LIMIT" \
  --calibration "$CAL_F03_R" --calibration "$CAL_F03_G" \
  --calibration "$CAL_F10_R" --calibration "$CAL_F10_G" \
  --calibration "$CAL_F11_R" --calibration "$CAL_F11_G" \
  --reviewer "$MANUAL_REVIEWER" --rationale "$MANUAL_RATIONALE"
```

El revisor y la justificación deben contener texto; se rechazan valores vacíos o
compuestos solo por espacios antes de registrar una decisión.
Salida: `LIMITS_FROZEN`. Se exige una calibración aceptada, elegible y sin ayuda
por escenario/brazo. Se rechazan selecciones sin revisión, rechazadas, ensayos,
sintéticas, incompletas, sin limpiar, con integridad inválida o duplicadas. Deben
coincidir plan, código, base, herramientas y entorno. `frozen-plan.json` conserva
ruta/hash de cada registro y revisión; una revisión cambiada o sustituida bloquea
su uso posterior. Las decisiones antiguas sin revisiones vinculadas se rechazan.
Véase [integridad y revisiones posteriores](manual-task-review.md).

En una sesión medida posterior autorizada por separado, usar `prepare --dataset
measurement` con el mismo plan y el siguiente escenario/brazo indicado. Se exige
la secuencia guardada y limpieza previa, con exactamente seis posiciones. La
semilla elige el orden RG/GR repetido y mezcla su asignación a escenarios: dos
pares usan ese orden y uno el inverso. Las tareas de cada par son consecutivas.
No se selecciona otro orden tras observar resultados.

El límite total también detiene comandos en ejecución. Se distinguen los
resultados censurados `not-detected-within-window` y
`detected-unresolved-within-window`. Los tiempos no observados quedan null y sus
límites inferiores se informan aparte. No son éxitos de tiempo cero ni intentos
automáticamente inválidos. Las comprobaciones tardías no completan la ventana.
Conservar intentos incompletos y exposición al aprendizaje antes de otra calibración.

## Conservación y aceptación

Conservar fuera de Codespaces la sesión, los directorios vinculados
`evidence/raw/run-*`, los paquetes `evidence/packages/run-*.tar.gz` con sus sumas
y la base congelada. Registros/eventos, solicitudes/logs y checksums quedan
ignorados por Git. Los paquetes seguros excluyen credenciales, claves privadas,
kubeconfig y estado raw; incluyen entradas de build y diagnósticos por operación.
No copiar `.tmp/private-*`. El sistema de archivos del mismo usuario no ofrece
custodia independiente ni aislamiento del participante.

El archivo del laboratorio incluye `operator/prepared.json` y `operations/` del
controlador propietario, junto a `manual-operations/` del laboratorio. Los enlaces
de eventos en `manual-task.json` se resuelven desde la raíz del archivo; los recibos
de detección y comprobación enlazan copias intactas de su evidencia en el mismo
directorio de operación. Se conservan los hashes. Si falta evidencia de un evento,
es insegura o ha cambiado, se detiene el empaquetado; los originales y cualquier
archivo anterior quedan disponibles para diagnóstico.

El archivo captura el estado durante la limpieza, antes de que el controlador
registre su salida. Conservar también el directorio final de la tarea: contiene
ese evento posterior y el log completo de limpieza. Un archivo anterior de
preparación fallida permanece intacto; el registro final conserva la recuperación
y limpieza posteriores.

La limpieza satisfactoria escribe `SHA256SUMS.txt` del directorio final de la tarea.
Verificar la copia con `(cd "$MANUAL_TASK" && sha256sum -c SHA256SUMS.txt)` antes
de revisarla; comprobar por separado las sumas del paquete seguro vinculado.
Conservar intactos los originales y analizar copias.

Lista humana:

1. Verificar versiones, base y fuente; declarar herramientas y conocimientos.
2. Preparar una tarea; separar oráculos e instrucciones del participante.
3. Iniciar con entradas intactas, sin IA, y marcar cambios reales de actividad/espera.
4. Conservar detección, todos los intentos y finalización validada o resultado
   incompleto/censurado; limpiar antes de preparar la siguiente tarea independiente.
5. Revisar las seis calibraciones antes de fijar los tres límites iguales entre brazos.
6. Conservar evidencias externamente; mantener separadas aceptación global del
   piloto y preparación de escenarios.

Asistencia: OpenAI Codex / GPT-6 implementó procedimiento y pruebas sintéticas.
Calibración humana, validación real del nuevo procedimiento y aceptación pendientes.

Base de desarrollo: main `fa4ed35d793a7257c13a335ad6b5ae208e79f60f`.
`make -C implementacion test` pasó: 896 casos de servicio/unidad, incluido el wrapper
de 29 casos Python sintéticos de tareas manuales, además de entorno, políticas,
Cosign offline y workflows. Se comprobaron sintaxis y enlaces locales.
Logs conservados en `evidence/raw/manual-task-development/`. Aquella validación
inicial registró el desajuste de entorno descrito arriba; el `doctor` posterior
satisfactorio no sustituye la validación real del procedimiento.

La [segunda revisión de Copilot en la PR #40](https://github.com/tfm-goldenpath/golden-path-lab/pull/40#pullrequestreview-5396408905)
identificó problemas de recuperación, exportación, texto de entorno obsoleto y
campos de revisión vacíos. Codex implementó correcciones y pruebas sintéticas;
el modelo de Copilot no fue indicado. Logs: `evidence/raw/manual-task-copilot-followup/`.
Revisión y aceptación humanas pendientes.
