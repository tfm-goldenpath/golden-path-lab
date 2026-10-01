# Ensayos locales F13/F14 de autorización de resultados

[Oráculo](record.md) · [English](../../../EN/cases/F13-F14/runbook.md)

La demostración local incorpora F13 posterior a emisión y F14 sobre la imagen
`L01-update/`, inmediatamente después de su autorización normal. Cada ensayo
comprueba CI autorizado fresco, admisión dirigida independiente, restauración
exacta, nueva verificación, admisión con el actor restringido, rollout y HTTP del
mismo digest. Los ensayos anteriores siguen presentes y sus brechas de integración
no se consideran resueltas por esta implementación.

## Prerrequisitos y comandos

Seleccione **Golden Path - implementation** en devcontainer/Codespaces. Primero
deben pasar `doctor`, smoke y la prueba acotada de BuildKit. PR #26 documentó
bloqueos de versiones y DNS, no ejecución de F09/F10/L05. El primer intento encontró
npm 12.1.0 frente al pin 11.19.0. El reintento autorizado instaló npm 11.19.0, pero
doctor se detiene en kubectl v1.37.0 (exige v1.35.8). Docker CLI/daemon reportan
29.8.0-1 (exige 29.8.0) y Buildx v0.37.0 (exige v0.37.1). Solo se cambió npm;
no se modificaron las otras herramientas ni la red. Véase el
[registro del reintento](../../../../registros/f13_f14_results_authorization_ES.md#corrección-de-npm-y-reintento-local).

Ejecute desde la raíz tras resolver el entorno. El par de revisiones pertenece a
L05; cada ensayo de resultados mantiene su propio origen y digest sin cambios.

```bash
(
  set -euo pipefail
  export PATH="$PWD/implementacion/.tools/bin:$PATH"
  make -C implementacion doctor
  make -C implementacion test
  make -C implementacion smoke-env
  source implementacion/versions.env
  probe_dir=$(mktemp -d)
  probe_builder="gp-results-connectivity-$(date -u +%s)-$$"
  trap 'docker buildx rm "$probe_builder"; rm -rf -- "$probe_dir"' EXIT
  docker network inspect kind >/dev/null
  docker buildx create --name "$probe_builder" --driver docker-container \
    --driver-opt network=kind \
    --driver-opt "image=$(jq -r '.images.buildkit.reference' implementacion/tools.lock.json)"
  printf 'FROM %s\n' "$SERVICE_NODE_IMAGE" > "$probe_dir/Dockerfile"
  timeout --signal=TERM --kill-after=10s 60s docker buildx build \
    --builder "$probe_builder" --platform linux/amd64 --pull \
    --progress=plain --provenance=false "$probe_dir"
  GP_L05_FROM_COMMIT=7243334fe4ee7073801a86b25c90986b7d3c5ece \
  GP_L05_TO_COMMIT=fc58e220e2d3f38d13216b23e61ffc31271f112f \
  make -C implementacion demo
)
```

Deténgase ante cualquier fallo y conserve el log. No repita la demostración para
diagnosticar el bloqueo conocido. Se conserva el [diagnóstico previo](../../../../registros/f09_f10_l05_integration_validation_ES.md);
la conectividad de aquel intento no se ha vuelto a probar aquí.

## Atribución

CI y Kyverno exigen P1 (`golden-path-v1`) desde configuración de confianza. El
predicado recibido no selecciona la versión esperada. La función de preparación
emite P0 (`laboratory-results-p0-fixture`) con la clave autorizada y `--no-upload`.
P0 mantiene todos los controles exitosos y se identifica como política de fixture,
no como versión histórica o regulatoria. El actor de registro reproduce esos
bytes posteriormente. Son responsabilidades dentro del mismo proceso del
laboratorio, no identidades con aislamiento de seguridad.

La entrega inicial debe superar CI fresco y admisión con server dry-run. F13
retira solo el manifiesto de resultados; F14 lo sustituye por P0, sin ningún
referrer P1 disponible que pueda ocultar el fallo. Los blobs se conservan para
restaurar exactamente. La presencia conjunta de P0/P1 invalida el ensayo.

Solo exit 42 con `MISSING_RESULTS` o `RESULTS_POLICY_VERSION_MISMATCH`, recuperación
completa y evidencia ajena autenticada/válida permite atribuir el rechazo de CI.
F14 requiere autenticar el bundle exacto y que `RESULTS_POLICY_VERSION` sea la
única infracción. Firmas, firmantes, sujetos, origen, predicados, controles fallidos,
errores múltiples o fallos de recuperación son errores de integración. La ausencia
sigue siendo esperada antes de emitir resultados; la emisión normal exige pasar
los controles obligatorios.

Admisión debe identificar únicamente `tfm-results` / `require-results` o
`autogen-require-results`. F13 necesita además inventario aislado completo y
validación de los otros contratos. F14 exige el diagnóstico específico
`RESULTS_POLICY_VERSION`: firma genérica fallida, timeout, aceptación inesperada
o denegaciones adicionales no son detección. El formato exacto de ese diagnóstico
aún requiere validación en admisión real.

## Evidencia y recuperación

`L01-update/F13-admission/` y `F14-admission/` conservan originales, fixture,
plan, inventarios, confianza, políticas, caché, logs, atribución y recuperación.
Los prefijos `L01-update/CI-F13-admission-*` y `CI-F14-admission-*` contienen
inventarios y bytes consumidos por cada verificación fresca. `recovery.json`
retiene los estados original y de restauración. `result.json` solo se escribe
tras rechazo y recuperación legítima del mismo digest. Los fallos de recuperación
interrumpen la ejecución. `demo.sh` sigue siendo dueño de la limpieza compartida.

El paquete incluye esas carpetas y los registros F13/F14 de finalización.
`F13Preissuance` distingue la observación previa a emisión y readiness. Evidencia
parcial sin finalización es `INCOMPLETE`; no se deduce éxito de una carpeta. Se
excluyen claves privadas y credenciales.

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
```

Para conservar bundles P0/P1 y diagnósticos criptográficos offline, defina
`GP_BUNDLE_PROBE_EVIDENCE_DIR` como ruta absoluta nueva antes de `make test-bundles`.
Solo se conservan archivos públicos permitidos y el destino no debe existir.
Los predicados offline son sintéticos y no autorizan entregas.

Barreras locales reales y negativos hosted: **NOT_EXECUTED**. La ruta hosted normal
mantiene confianza y permisos; no se añaden mutaciones GHCR. Los ensayos dirigidos
no aumentan el catálogo de veinte casos ni son mediciones de campaña. Consulte la
[validación real](../../../../registros/f13_f14_results_authorization_ES.md).

Para prerrequisitos independientes, la suite existente y conservación de fallos/bases de datos, use la [validación del carril A](../../lane-a-validation.md). Los intentos locales actuales se detienen en doctor; no cierran las barreras de integración pendientes de este caso.

La admisión dirigida usa ahora CREATE de un Deployment nuevo con cero réplicas y nombre/selector aislados, CREATE positivo tras restauración y limpieza propia. Las pruebas del workload del mismo digest siguen separadas. Véase la [matriz y ejecución 36830599263](../../lane-a-validation.md); apply sin cambios o UPDATE previamente verificado no demuestra verificación nueva. Falta repetir la demo corregida.
