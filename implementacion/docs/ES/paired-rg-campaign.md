# Preparar una campaña automatizada de entregas legítimas

[English](../EN/paired-rg-campaign.md) · [Protocolo de medición](paired-rg-measurements.md)

## Alcance y decisiones pendientes

El soporte está implementado; la ejecución de campaña sigue **NOT_EXECUTED** y la
aceptación humana, pendiente. Diez pares balanceados son un ejemplo de borrador y
la recomendación provisional del piloto, no un tamaño muestral aprobado. Una
persona debe decidir cantidad, semilla/orden, preparación, fuente final y permisos
para publicar y ejecutar. Se mide una entrega legítima por brazo R/G en carril B;
no se evalúan los veinte escenarios. R/G identifica referencia/Golden Path y A/B,
ejecución local/alojada.

El piloto de cuatro pares y sus fallos históricos se conservan. Los
[ensayos manuales guiados](manual-task-rehearsal-review.md) siguen excluidos de la
calibración. La calibración manual, sus tres límites, la preparación de escenarios
y la aceptación global del piloto continúan siendo decisiones separadas.

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
python3 "$CLI" campaign-draft --seed example-unapproved-campaign-v1 \
  --pairs 10 --output "$CAMPAIGN/draft.json"
python3 "$CLI" campaign-inspect "$CAMPAIGN/draft.json"
```

Salida: `DRAFT`, diez posiciones (cinco RG y cinco GR), luego `NOT_AUTHORIZED`.
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
git fetch origin main
git switch main
git pull --ff-only origin main
TARGET=$(git rev-parse HEAD)
test "$TARGET" = "$(git rev-parse origin/main)"
test -z "$(git status --porcelain --untracked-files=no)"
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
gh run watch "$DEV_RG" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$DEV_RG" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_RG" --dir "$CAMPAIGN/originals/development-RG"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-RG"
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
gh run watch "$DEV_GR" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$DEV_GR" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$DEV_GR" --dir "$CAMPAIGN/originals/development-GR"
python3 "$CLI" verify-export "$CAMPAIGN/originals/development-GR"
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
autenticadas independientemente. El asistente no puede aportarlas. No hay
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
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$CAMPAIGN/originals/$RUN"
python3 "$CLI" verify-export "$CAMPAIGN/originals/$RUN"
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

Incluye explícitamente todos los intentos, también el original fallido cuando
haya reintento. Ejemplo con un run (repite `--artifact`/`--jobs` por los demás):

```bash
ANALYSIS="$CAMPAIGN/analysis-01"
python3 "$CLI" analyze --campaign-plan "$CAMPAIGN/control/frozen.json" \
  --artifact "$CAMPAIGN/originals/$RUN" --jobs "$CAMPAIGN/jobs/$RUN.json" \
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
