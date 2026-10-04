# Preparar una campaña automatizada de entregas legítimas

[English](../EN/paired-rg-campaign.md) · [Protocolo de medición](paired-rg-measurements.md)

## Alcance y decisiones pendientes

La [campaña autorizada de diez pares](paired-rg-campaign-results.md) en `895a3bd`
terminó con 10/10 pares favorables y revisión técnica automatizada. Revisión humana
de resultados y aceptación global pendientes; plan/evidencias publicados por
separado. El procedimiento inferior se aplica a una campaña **nueva**: cantidad,
semilla/orden, preparación, fuente y acciones remotas requieren autorización propia.
La aprobación registrada no preaprueba otra muestra. Se mide una entrega legítima por brazo R/G en carril B;
no se evalúan los veinte escenarios. R/G identifica referencia/Golden Path y A/B,
ejecución local/alojada.

El piloto de cuatro pares y sus fallos históricos se conservan. Los
[ensayos manuales guiados](manual-task-rehearsal-review.md) siguen excluidos de la
calibración. La medición de esfuerzo humano, la calibración manual elegible y sus
límites están aplazados en el alcance reducido. Preparación funcional, aceptación
global y autorización de campaña siguen separadas. Consultar la [matriz de veinte
escenarios](evaluation-readiness.md).

`paired-rg.py` coordina los mismos módulos y pasos explícitos de provenance nativa.
`paired_campaign.py` valida planes y declaraciones; `paired_measurements.py`
conserva medición y estadística. No cambian temporizadores, cachés, versiones,
firma, confianza ni admisión. `campaign.enabled` significa soporte implementado,
no autorización humana.

## 1. Preparar un borrador sin aprobar

Desde la raíz del repositorio, elige un directorio nuevo ignorado por Git:

```bash
CAMPAIGN="$PWD/implementacion/evidence/measurements/campaign-draft-01"
CLI="$PWD/implementacion/scripts/paired-rg.py"
read -r -p 'Cantidad par propuesta (10 es provisional): ' CAMPAIGN_PAIRS
read -r -p 'Semilla determinista propuesta: ' CAMPAIGN_SEED
python3 "$CLI" campaign-draft --seed "$CAMPAIGN_SEED" \
  --pairs "$CAMPAIGN_PAIRS" --output "$CAMPAIGN/draft.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/draft.json"
```

Salida: `DRAFT`, cantidad propuesta balanceada RG/GR y `NOT_AUTHORIZED`.
Diez no está preseleccionado ni aprobado.
La cantidad explícita debe ser par entre 2 y 1000; el documento congelado tiene
además un máximo de 60 000 bytes para la entrada del workflow. Estos límites son
técnicos, no recomendaciones estadísticas. Se ordenan posiciones etiquetadas y
balanceadas por SHA256(semilla:posición), ascendente. Se conservan y verifican
semilla, algoritmo, cantidad y secuencia. Cambiar cantidad/orden requiere otro
borrador; no se sobrescriben archivos existentes.

## 2. Validar la fuente final integrada y conservar desarrollo RG/GR nuevo

Espera a que **todas las PR de preparación estén integradas**. No edites un archivo
versionado para insertar su propio SHA. Actualiza main y comprueba la revisión:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
test -z "$(git status --porcelain)"
git fetch origin main
git switch main
git pull --ff-only origin main
TARGET=$(git rev-parse HEAD)
test "$TARGET" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain)"
df -h . /var/lib/docker
make -C implementacion doctor
make -C implementacion test
```

Los comandos siguientes requieren **autorización separada para desarrollo alojado**.
RG obtiene/exporta la base. Espera, descarga y revisa antes de lanzar GR:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=1 -f order=RG -f expected_source="$TARGET"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'ID real de desarrollo RG: ' DEV_RG
WATCH_STATUS=0
gh run watch "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$DEV_RG" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_RG" --dir "$CAMPAIGN/originals/development-RG"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-RG"
mkdir -p "$CAMPAIGN/logs"
gh run view "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$DEV_RG.log"
```

Revisa hashes externos/internos, bytes/identidad de la base, imágenes
independientes, reutilización/reconstrucción de caché, provenance nativa/firmas,
admisión nueva, rollout/HTTP, extremos de tiempo y limpieza. Un job verde o un
checksum correcto no sustituye esa revisión. Descarga originales fuera de
Codespaces antes de que caduquen. Tras revisarlo y manteniendo la misma fuente:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=2 -f order=GR -f expected_source="$TARGET" \
  -f database_run="$DEV_RG"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'ID real de desarrollo GR: ' DEV_GR
WATCH_STATUS=0
gh run watch "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$DEV_GR" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_GR" --dir "$CAMPAIGN/originals/development-GR"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-GR"
mkdir -p "$CAMPAIGN/logs"
gh run view "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$DEV_GR.log"
```

Revisa también GR, incluida la provenance nativa en primera posición. Estos runs
no cuentan como campaña. La base histórica del piloto `36926824792` corresponde a
otra fuente. Si la instrumentación impide interpretar resultados, conserva el
fallo, detente y corrige/integra antes de preparar un nuevo plan. Un defecto de
código no justifica el reintento reservado para fallos externos.

## 3. Vincular, inspeccionar y congelar mediante declaración humana explícita

La vinculación comprueba desarrollo RG/GR correcto en la fuente limpia final,
asociación y hashes de paquetes, imágenes independientes y la misma base
conservada. GR debe identificar RG como origen de su base.

```bash
python3 "$CLI" campaign-bind --draft "$CAMPAIGN/draft.json" \
  --expected-source "$TARGET" \
  --development-rg "$CAMPAIGN/originals/development-RG" \
  --development-gr "$CAMPAIGN/originals/development-GR" \
  --output "$CAMPAIGN/bound.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/bound.json"
```

Salida: `BOUND_PENDING_HUMAN_AUTHORIZATION`, luego `NOT_AUTHORIZED`. Se vinculan
SHA fuente, árbol de implementación, workflow exacto, hashes de protocolo,
versiones/herramientas, fuente de precalentamiento, base y registros/manifiestos
de ambos runs. La validación automática no constituye aprobación.

Solo después de revisar personalmente el plan y decidir autorizar su cantidad,
orden, fuente y base, la persona puede ejecutar:

```bash
read -r -p 'Tu nombre como revisor: ' CAMPAIGN_REVIEWER
read -r -p 'Tu decisión, alcance y justificación: ' CAMPAIGN_REASON
python3 "$CLI" campaign-freeze --plan "$CAMPAIGN/bound.json" \
  --reviewer "$CAMPAIGN_REVIEWER" --rationale "$CAMPAIGN_REASON" \
  --authorize --output "$CAMPAIGN/control"
python3 "$CLI" campaign-inspect "$CAMPAIGN/control/frozen.json"
PLAN_ID=$(python3 "$CLI" campaign-inspect "$CAMPAIGN/control/frozen.json" --identity-only)
```

Genera `authorization.json` separado con hora UTC, `plan.json`, `frozen.json` y
hashes. Salida: `FROZEN_CONTROL_ID` y `HUMAN_DECLARATION_RECORDED; no workflow
dispatched`. Identidad del revisor y autorización son declaraciones humanas no
autenticadas independientemente. Un asistente puede registrar la declaración
aportada explícitamente si se le instruye; nunca inventa revisor, razón o decisión. No hay
sobrescritura ni aceptación implícita. Usa la identidad canónica impresa, no el
hash de bytes del JSON formateado. Cambiar fuente/configuración requiere un plan
y comprobaciones de desarrollo nuevos.

## 4. Publicar el plan revisado sin ejecutar entregas

Con autorización para esta operación remota de evidencia, usa el mismo workflow:

```bash
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair=1 -f order=RG -f expected_source="$TARGET" \
  -F publish_plan=@"$CAMPAIGN/control/frozen.json" -f plan_identity="$PLAN_ID"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'ID real de publicación del plan: ' PLAN_RUN
gh run watch "$PLAN_RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$PLAN_RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-plan-$PLAN_RUN" --dir "$CAMPAIGN/published-plan"
python3 "$CLI" verify-export "$CAMPAIGN/published-plan"
```

`publish_plan` no vacío selecciona un job separado con permisos de lectura de
contents/actions. Omite el job de entrega; los campos obligatorios pair/order no
se usan en este modo. Comprueba identidad nativa main/fuente, declaración humana,
metadatos de los dos runs de desarrollo y sus exportaciones. Publica el control
exacto y un recibo de validación automática separado. No construye, firma ni
despliega imágenes. La retención es de 30 días; conserva una copia externa.
El tiempo de este job es preparación separada, no tiempo de entrega.

## 5. Ejecutar un par autorizado por separado, revisar y después continuar

No automatices un bucle de diez runs. Selecciona la siguiente posición revisada
y obtén su orden del plan. Para el primer intento de una posición:

```bash
read -r -p 'Siguiente posición autorizada: ' PAIR
ORDER=$(jq -er --argjson pair "$PAIR" '.pairs[] | select(.pair == $pair) | .order' "$CAMPAIGN/control/plan.json")
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair="$PAIR" -f order="$ORDER" -f expected_source="$TARGET" \
  -f database_run="$DEV_RG" -f plan_run="$PLAN_RUN" -f plan_identity="$PLAN_ID"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
read -r -p 'ID real del par: ' RUN
WATCH_STATUS=0
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status || WATCH_STATUS=$?
printf 'Workflow watch exit: %s\n' "$WATCH_STATUS"
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$CAMPAIGN/originals/campaign/$RUN"
python3 "$CLI" verify-export "$CAMPAIGN/originals/campaign/$RUN"
mkdir -p "$CAMPAIGN/logs"
gh run view "$RUN" --repo tfm-goldenpath/golden-path-lab --log > "$CAMPAIGN/logs/$RUN.log"
mkdir -p "$CAMPAIGN/jobs"
gh api "repos/tfm-goldenpath/golden-path-lab/actions/runs/$RUN/jobs" > "$CAMPAIGN/jobs/$RUN.json"
```

Aunque `watch` falle, conserva/descarga el intento y diagnostícalo; debe aparecer
en el análisis. Revisa los mismos límites de evidencia que en desarrollo antes
del siguiente par. El workflow verifica publicación, fuente, orden, autorización
y base antes de crear infraestructura. No hay servicio central de reserva de
posiciones entre runs: un duplicado accidental queda visible y excluido de las
estadísticas, sin seleccionar el más rápido.

Solo se permite un reintento del par completo por fallo externo documentado y
revisado. Conserva plan/fuente/orden y especifica `retry_of=<run-original>`,
`external_cause` real y ruta `evidence` del diagnóstico conservado. **Omite
`database_run`**: el reintento restaura su base original. Conserva ambos artefactos
y el recibo de revisión. No uses “Re-run jobs”, no reintentes por lentitud/control
desfavorable ni una segunda vez. Si faltan la base idéntica o instrumentación
interpretable, detente sin eludir las comprobaciones.

Solo tras revisar el fallo externo y autorizar ese único reintento:

```bash
read -r -p 'ID del run original fallido: ' RETRY_OF
read -r -p 'Causa revisada (registry-outage/network-outage/runner-loss): ' CAUSE
read -r -p 'Ruta relativa del diagnóstico conservado: ' DIAGNOSTIC
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=campaign -f pair="$PAIR" -f order="$ORDER" -f expected_source="$TARGET" \
  -f plan_run="$PLAN_RUN" -f plan_identity="$PLAN_ID" \
  -f retry_of="$RETRY_OF" -f external_cause="$CAUSE" -f evidence="$DIAGNOSTIC"
```

Espera, descarga e inspecciona el nuevo run con los comandos anteriores antes de
continuar. Conserva el ID original y su consumo de job en el análisis.

## 6. Analizar originales sin mezclarlos ni modificarlos

Incluye todos los intentos, también originales fallidos y reintentos. El bloque
selecciona cada directorio conservado de campaña; contrastar ese inventario con
la lista de runs antes de interpretar la cobertura:

```bash
ANALYSIS="$CAMPAIGN/analysis-01"
ARTIFACT_ARGS=()
JOB_ARGS=()
for ORIGINAL in "$CAMPAIGN"/originals/campaign/*; do
  test -d "$ORIGINAL" || continue
  ARTIFACT_ARGS+=(--artifact "$ORIGINAL")
  RUN_ID=$(basename "$ORIGINAL")
  if test -f "$ORIGINAL/pair.json" && test -f "$CAMPAIGN/jobs/$RUN_ID.json"; then
    JOB_ARGS+=(--jobs "$CAMPAIGN/jobs/$RUN_ID.json")
  fi
done
python3 "$CLI" analyze --campaign-plan "$CAMPAIGN/control/frozen.json" \
  "${ARTIFACT_ARGS[@]}" "${JOB_ARGS[@]}" \
  --evidence-output "$ANALYSIS" --output "$ANALYSIS/analysis.json"
(cd "$ANALYSIS" && sha256sum -c SHA256SUMS.txt)
tar -czf "$CAMPAIGN/analysis-01.tar.gz" -C "$CAMPAIGN" analysis-01
(cd "$CAMPAIGN" && sha256sum analysis-01.tar.gz > analysis-01.tar.gz.sha256)
```

Sin `--artifact` produce un informe vacío y parcial. Con posiciones ausentes,
indica `PARTIAL`; observarlas todas no implica aceptación humana ni todos los
resultados favorables. Muestra posiciones previstas/observadas, ausentes,
duplicadas, reintentos y no resueltas; tiempos R/G, clasificaciones/exclusiones,
denominadores incluidos/excluidos, G−R, sobrecoste relativo, medianas, MAD y rango.
Los duplicados siguen como filas excluidas. Desarrollo/piloto conservan su rechazo
de duplicados. Mezclar dataset, plan, autorización, fuente o base provoca rechazo.

Se verifican paquetes externos/internos, asociación de observaciones y bytes de
la base conservada. Una exportación con fallos pero sin identidad de par aparece
en `unfinalizedArtifacts`, sin inventar tiempos ni posición. Si una cancelación
impidió generar un manifiesto completo, conserva sus logs fuera de las entradas
verificadas y la posición como ausente hasta revisión. No se infiere limpieza o
éxito a partir de datos ausentes.

Los metadatos de jobs de pares completados aportan minutos observados de Actions;
sin metadatos, el total queda desconocido. Repetir un run no duplica su consumo.
Los jobs de publicación/preparación se informan aparte; minutos facturados y
gasto monetario permanecen null. No se reparte preparación entre temporizadores.

La exportación incluye control exacto, registros originales de pares/fallos sin
cambiar bytes, manifiestos, diagnósticos de reintento, metadatos de jobs y análisis
derivado con checksums. Conserva los archivos originales de brazos y base junto
a ella: el análisis no sustituye esas evidencias. No se modifica ningún registro
histórico, revisión humana ni límite de tareas manuales.

## Contribución y entrega

Pasan 26 regresiones sintéticas de campaña y 51 existentes de medición. Pasan
`doctor` y `make test`: seis pruebas de entorno, 929 de servicio/unidad (incluidos
wrappers Python), 43 Python de políticas, Conftest/Kyverno, Cosign offline y
workflows locales. La repetición enfocada final cubre los últimos cambios de las comprobaciones del
análisis. Los 20 bloques Bash nuevos EN/ES tienen sintaxis válida
y resuelven 168 enlaces locales de ocho guías. No se ejecutaron publicación
alojada del plan, desarrollo RG/GR en la futura fuente final, entrega Kubernetes
de campaña ni campaña. Las pruebas etiquetadas sustituyen las llamadas remotas
de publicación/descarga; ese comportamiento exige validación autorizada posterior.

OpenAI Codex implementó contratos, integración del coordinador/workflow, pruebas
explícitamente sintéticas e instrucciones EN/ES. Revisión y aceptación humanas
pendientes. TODO y `evidence/environment/paired-rg-campaign/` recogen validación
local; las pruebas sintéticas no demuestran publicación alojada, desarrollo en
fuente final ni ejecución de campaña.

## Entrega final y archivos incompletos

Los comandos se contrastaron con CLI e inputs del workflow; este incremento no
los ejecutó como validación alojada. Detenerse si falla fuente/entorno.
`WATCH_STATUS` conserva el resultado fallido mientras permite descargar evidencia;
una descarga correcta no autoriza pasar a GR ni a la posición siguiente. Revisar
RG y GR exitosos sobre fuente final antes de vincular. Los logs quedan fuera del
original inmutable: añadir archivos dentro rompe su manifiesto. Comprobar espacio
antes de cada descarga y conservar copia externa; no borrar originales para que
quepa el siguiente intento.

La verificación admite brazo sin iniciar, build fallido/incompleto o imagen que
no alcanzó admisión sin exigir campos imagen/inicio/final aún no producidos.
Exige identidad/configuración/base, coincidencia completa archivo/brazo y coherencia
de fases; rechaza éxito falso. Admisión interrumpida sin respuesta registrada
conserva duración desconocida aunque el trap cerrara su fase. El análisis mantiene
clasificación y motivos de exclusión; tiempos ausentes quedan null.

El bucle de análisis incluye cada directorio de `originals/campaign/`, también
originales fallidos y reintentos; no apartar ninguno para mejorar resultados.
Exportaciones sin finalizar con fallo registrado quedan en `unfinalizedArtifacts`;
si una cancelación impidió el manifiesto, conservar logs nativos aparte y comunicar
la posición ausente. Los metadatos de consumo deben corresponder a jobs terminados;
omitir los incompletos/no disponibles sin inventar consumo. El análisis no sustituye
archivos originales de brazos/base. No mezclar desarrollo, piloto, reparación ni
ensayos funcionales con observaciones de campaña.

La [preparación de evaluación](evaluation-readiness.md) contiene matriz de veinte
filas, procedencia de revisión, esfuerzo humano aplazado y alineación futura de tesis.

Solo la clasificación derivada por el finalizador puede diferir del checkpoint
archivado, y debe coincidir con su recálculo desde los mismos hechos (por ejemplo,
fallo de caché antes del temporizador). Un paquete de bootstrap anterior a arm-init
se conserva como preparación si ni par ni archivo declaran observación del brazo;
no aporta duración ni éxito. Los demás campos y su presencia deben coincidir.
