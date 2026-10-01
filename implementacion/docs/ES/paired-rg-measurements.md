# Mediciones pareadas de entregas legítimas R/G

[English](../EN/paired-rg-measurements.md) · [Arquitectura](architecture.md) · [Contratos](delivery-contracts.md)

## Estado y alcance

Instrumentación implementada. El primer intento de desarrollo se detuvo al
preparar cachés; ambas entregas medidas, cuatro pares piloto y campaña siguen
**NOT_EXECUTED**. Revisión humana pendiente. El contribuyente informa que ambas
suites A pasaron en `36885654089`, revisión
`5ae6f84a01407789933bd36bcdb05250a6d6c4f5`; este incremento no reaudita ese paquete.
Las revisiones y fallos históricos permanecen en [la guía A](lane-a-validation.md).
No equivalen a mediciones B con OIDC/GHCR.

Cada brazo construye y publica una entrega legítima independiente. Se mantienen
los veinte identificadores y los comandos funcionales existentes. No se incluyen
inyecciones, recuperaciones, reemplazos L01 ni fixtures de vulnerabilidades.

| Control | R | G |
|---|---|---|
| Fuente actual, pruebas del servicio, base fijada, linux/amd64 | Sí | Sí |
| Construcción/publicación independiente, manifiesto por digest endurecido | Sí | Sí |
| Actor restringido, validación Kubernetes, CREATE nuevo | tfm-reference | tfm-golden protegido |
| Rollout, Pods Ready/digest y HTTP después del intervalo principal | Sí | Sí |
| Políticas tempranas, SBOM original, Trivy con base congelada | No | Sí |
| Firmas, procedencia GitHub nativa, resultados y verificación fresca | No | Sí |
| Admisión Kyverno de evidencias | No | Sí |

Se comparten runner Ubuntu efímero, Docker, cluster kind, red, repositorio GHCR y
controlador. Builders y digests son independientes. El job completo dispone de
contents:read, packages:write, id-token:write, attestations:write y actions:read;
R no usa firmas ni atestaciones. La secuencia no constituye aislamiento de
seguridad. El actor conserva sus permisos; `k` observa/administra recursos propios.

La identidad exacta autorizada es
`tfm-goldenpath/golden-path-lab/.github/workflows/paired-rg.yml@refs/heads/main`.
Se conservan emisor, builder nativo, origen, revisión y predicados existentes.
HEAD, SHA del workflow y fuente esperada deben coincidir, con árbol limpio.
No se suplanta `golden-path.yml` ni se aceptan patrones amplios.

## Preparación, cachés y tiempos

Dependencias, regresiones completas, infraestructura, descarga de base,
preparación/restauración de cachés y readiness quedan fuera de ambos intervalos.
Se reutilizan declaraciones/lockfiles e instalador B, verificando Node/npm,
herramientas de seguridad, kind, kubectl y Buildx. Docker cliente/daemon proceden
del runner; sus versiones efectivas y recursos se registran. No se afirma usar
el devcontainer fijado de A ni se cambia red o versiones para forzar éxito.

Readiness comprueba políticas, Pods/endpoints y denegación exacta de repositorio
mediante CREATE dry-run de una imagen base ajena al repositorio autorizado. Aún
no existe el candidato; no se precalienta su verificación. La caché de imágenes
de Kyverno sigue desactivada y el demo conserva su prueba de resultados ausentes.

El reloj monotónico empieza antes de las pruebas del servicio y termina al volver
el CREATE fresco. Incluye construcción, publicación, controles G y el paso
explícito de procedencia nativa, además de esperas entre pasos del workflow. El
coste de iniciar Python para registrar el retorno está incluido. UTC, nanosegundos
monotónicos y boot ID permiten continuidad entre prepare/native/finish. Se exige
NotFound real antes de crear. Admisión ausente conserva duración null; respuesta
inválida nunca es favorable. Rollout, HTTP, empaquetado y limpiezas tienen registros
separados. Una limpieza fallida excluye el par favorable, sin borrar observaciones.

Ambas cachés usan bytes de aplicación/paquetes de
`7243334fe4ee7073801a86b25c90986b7d3c5ece`, **Dockerfile actual**, misma base y
plataforma. Se retienen árboles/diff de aplicación, inputs, índices/hashes de
caché y logs BuildKit. Se eliminan builders de calentamiento y se crean vacíos
con importaciones locales separadas. Se comprueban hashes antes del cronómetro,
RUN de preparación base CACHED y COPY de aplicación DONE, no CACHED. Cambian
BUILD_COMMIT y etiqueta de brazo; no se afirma invalidación de una sola capa.
La procedencia autentica la fuente actual, nunca el warmup histórico. Se guarda
la receta reproducible; los bytes grandes de caché de build no se suben.

Una base Trivy congelada en el primer par de desarrollo se verifica antes/después del análisis y se
conserva en archivo limitado a DB/metadata/identidad/hashes. R registra identidad
sin escanear. G ejecuta imagen → SBOM original → informe real → política. Un
reintento reutiliza exactamente la misma base. Los pares siguientes restauran esa base con `database_run`; piloto requiere
un par exitoso de **desarrollo**, conservado de la misma fuente. El análisis rechaza bases
diferentes; no sustituya hallazgos ni relaje HIGH/CRITICAL. Caché de build, datos de vulnerabilidades y verificación son
condiciones distintas.

## Registros, clasificación y reintentos

Protocolo `paired-rg/v1`, definido en `measurements/protocol-v1.json`; registros
versionados incluyen plan, fuente, par/orden/intento, herramientas/políticas,
recursos/cachés/base/digest, tiempos, admisión, funcionalidad y referencias.
`paired-rg.py` coordina; shell reutiliza módulos; validación/estadística residen
en `paired_measurements.py`. No se trasladan políticas a YAML.

- **valid-favorable**: fases, admisión, funcionalidad y cachés completas; éxito de
  par requiere además limpieza y conservación.
- **valid-unfavorable**: rechazo de política atribuible del input legítimo; no
  entra como entrega rápida exitosa.
- **invalid**: violación documentada del protocolo/caché o causa externa revisada.
- **indeterminate**: ejecución ausente, parcial, malformada o sin atribución.
  Errores de transporte, certificados o evaluación no prueban rechazo de política.

No hay reintento automático. Como máximo uno de par completo por fallo externo
revisado: registro, red o pérdida de runner. Deben proporcionarse run original y
ruta del diagnóstico retenido. Se conserva la ruta normalizada en
`externalFailureReview.evidencePath`, relativa a `prior-attempt/`, junto al hash. Se registra al solicitante como revisor de la
causa, no como aceptación humana final; debe revisar realmente su contenido.
Mismos orden/fuente/plan/par/base y receta de cachés. No reintentar por lentitud,
resultado desfavorable ni con “Re-run jobs”. Sin base original conservada no es
posible restaurar condiciones mediante esta ruta. Los reintentos internos de
herramientas mantienen sus logs y forman parte de la duración correspondiente.

El análisis conserva intentos excluidos y calcula G−R, 100×(G−R)/R, medianas,
desviación absoluta mediana, rango y denominadores explícitos. No agrupa datasets,
fuentes o planes distintos. Minutos observados del job se agregan por separado,
incluyendo costes compartidos e intentos; no se inventan minutos facturados,
costes monetarios ni reparto modelado.

## Prueba manual de desarrollo, tras merge y autorización

Instrucciones preparadas, **no ejecutadas**. Desde la raíz:

```bash
git fetch origin main
TARGET=$(git rev-parse origin/main)
gh workflow run paired-rg.yml --repo tfm-goldenpath/golden-path-lab --ref main \
  -f dataset=development -f pair=1 -f order=RG -f expected_source="$TARGET"
gh run list --repo tfm-goldenpath/golden-path-lab --workflow paired-rg.yml --limit 5
RUN=<id-real-del-run>
gh run watch "$RUN" --repo tfm-goldenpath/golden-path-lab --exit-status
DEST="implementacion/evidence/measurements/download-$RUN"
gh run download "$RUN" --repo tfm-goldenpath/golden-path-lab \
  --name "paired-rg-$RUN" --dir "$DEST"
(cd "$DEST" && sha256sum -c SHA256SUMS.txt)
```

Preserve originales inmutables fuera del runner antes de caducidad (30 días).
Verifique checksums externos/internos de paquetes y archivos DB, además de
identidad. DB permite sólo `db/trivy.db`, `db/metadata.json`, `identity.json` y
hashes; NOT_CREATED no significa bytes requeridos desaparecidos. Nunca suba
`.tmp`, credenciales, claves privadas ni kubeconfigs. Fallos de preflight retienen
logs aunque no existan paquetes. Cancelación forzosa puede dejar registros
incompletos; no convertirlos en PASS.

Revise digests independientes, identidad nativa G, gates, NotFound/CREATE,
rollout/HTTP, cachés y limpiezas, incluyendo logs de Actions. Repita desarrollo
con `pair=2, order=GR, database_run=$RUN` en el mismo TARGET antes del piloto.

Para consumo, trabaje en copia de análisis y conserve hashes originales:

```bash
cp -a "$DEST" "$DEST-analysis"
gh api "repos/tfm-goldenpath/golden-path-lab/actions/runs/$RUN/jobs" > "$DEST-analysis/jobs.json"
JOB=$(jq -r '.jobs[] | select(.name=="pair") | .id' "$DEST-analysis/jobs.json")
python3 implementacion/scripts/paired-rg.py job-minutes \
  "$DEST-analysis/pair.json" "$DEST-analysis/jobs.json" --job-id "$JOB"
python3 implementacion/scripts/paired-rg.py analyze \
  "$DEST-analysis/pair.json" --output "$DEST-analysis/analysis-with-consumption.json"
```

La copia cambia deliberadamente; no reemplace el original. Incluya los archivos
pair.json de todos los intentos al calcular consumo. Un reintento autorizado
agrega `retry_of`, `external_cause` y `evidence` con la causa/ruta reales.

## Plan y revisión pendiente

```bash
make -C implementacion paired-plan
diff -u implementacion/measurements/pilot-plan-v1.json \
  implementacion/evidence/measurements/pilot-plan-v1.json
```

Semilla `paired-rg-pilot-v1-2026-10-01`; orden almacenado **GR, GR, RG, RG** para
pares 1–4 mediante orden SHA256 de cuatro posiciones balanceadas. Sólo regenerar
el plan no ejecuta entregas. Piloto requiere `-f database_run=<run-smoke-revisado>`. Fije fuente tras revisión de desarrollo y autorice
piloto por separado. Diez pares de campaña siguen provisionales; dispatch de
campaña deshabilitado. Calibración manual, releases y tesis quedan fuera.

Regresiones enfocadas y suite compartida de entorno/unidad/políticas/criptografía
offline pasan localmente. Fixtures sintéticos no prueban integración. No se han
ejecutado mediciones, escaneos ni admisiones del nuevo workflow. Doctor vuelve a rechazar kubectl 1.37.0 frente a 1.35.8. Pasan 45 pruebas Python
de medición, 47 Node enfocadas y nueve comprobaciones de política del workflow.
La suite compartida pasó 877 pruebas de servicio/unidad, entorno, 43 Python de
políticas, Conftest/Kyverno, Cosign offline y workflows estáticos. Cambios posteriores
de medición/empaquetado se comprobaron en la repetición enfocada. Los registros de validación se conservan localmente fuera de Git.

Asistencia: **OpenAI Codex / GPT-6**, implementación, pruebas y documentación.
Revisión humana y decisión final: **pendientes**.


### Seguimiento de revisión del PR #37

Se reprodujeron ambos fallos antes de corregirlos: faltaba la ruta del diagnóstico
revisado y se aceptaban bases de artefactos piloto. Ahora se conserva la ruta
normalizada y se exige un origen de desarrollo exitoso. Tres regresiones de
inicialización cubren ambos cambios y la reutilización válida de desarrollo.
La suite enfocada pasa; la evidencia de validación se conserva localmente fuera de Git.
GitHub Copilot aportó la revisión (modelo no divulgado); Github Copilot
implementó las correcciones. Revisión humana y smoke real siguen pendientes.

Segunda revisión del PR #37: bootstrap y la comprobación posterior al análisis
exigen el contrato de producción CycloneDX 1.7. Dos regresiones reprodujeron
la selección y comprobación incompatibles de 1.6; una invoca el renderer real.
Se restaura desde main la atribución histórica de A. GitHub Copilot revisó
(modelo no divulgado); Github Copilot / GPT-6 corrigió. La evidencia de validación se conserva localmente fuera de Git.
Revisión humana y smoke real pendientes.


## Primer intento de desarrollo: 36924958484

[Run 36924958484](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36924958484),
commit `6fc297929254ba4472d6b3b9f95ebaca667dd508`, pasó dependencias, regresiones
y readiness de admisión. Falló el primer calentamiento de caché: BuildKit no
halló `src/` ni `package-lock.json`. El archivo histórico estaba vacío porque
`git archive` se ejecutaba desde el subdirectorio de implementación. Es un defecto
de preparación, no rechazo de política ni fallo externo. Ninguna entrega inició
su cronómetro ni llegó a procedencia nativa/admisión. La limpieza pasó; el par
se conservó incompleto/indeterminado.

La corrección exporta el mismo árbol inmutable desde la raíz del repositorio.
Una regresión ejecuta los comandos reales desde `implementacion/` y compara
fuente/lockfile con el commit y Dockerfile actual. Falló antes de corregir; las
51 pruebas de medición pasan después. No se lanzó otro run y queda pendiente
completar una construcción de caché real.

Se verificaron 20 hashes externos, 42 internos de paquetes y el archivo permitido
de base congelada, sus checksums e identidad. Evidencia y logs se conservan
localmente fuera de Git. Tras revisión y merge, corresponde una nueva prueba de
desarrollo con la nueva fuente; este defecto no permite reintento por fallo externo.
OpenAI Codex / GPT-6 realizó diagnóstico y corrección. Aceptación humana pendiente.


El CI del PR #38, run `36926144447`, detectó un error de preparación de la prueba:
requería un commit histórico ausente en el checkout de profundidad 1. Ahora crea
historia Git sintética identificada y ejecuta los mismos comandos de producción.
Las 51 pruebas pasan en un clon de profundidad 1; restaurar el comando defectuoso
original sigue haciendo fallar la regresión. Se conservan la profundidad del CI y
la revisión real de calentamiento. Logs guardados localmente fuera de Git.
OpenAI Codex / GPT-6 corrigió la prueba; revisión humana y smoke real pendientes.
