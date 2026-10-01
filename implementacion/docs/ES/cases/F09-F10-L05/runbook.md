# Familia de procedencia: F09 / F10 / L05

Desde la raíz, con Docker disponible:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

El reemplazo local conserva F05/F06/F07/F08/F11/F13 y añade F09/F10 en CI antes
de resultados, y en admisión dirigida después de emitir resultados válidos.
F09 retira solo procedencia. F10 prepara un fixture explícito de laboratorio,
firmado por la clave local confiable sin publicarlo todavía, que cambia solo el
repositorio de origen seleccionado. Simula un productor confiable defectuoso;
no representa acceso de un atacante a la clave. La evaluación negativa no firma.

CI exige inventario completo y estable y evidencias ajenas válidas. F10 autentica
exactamente el fixture recibido antes de comprobar contenido. Los diagnósticos
son `MISSING_PROVENANCE` y `PROVENANCE_REPOSITORY_UNAUTHORIZED` (salida 42).
Otros errores, incluidos firma, digest, formato, transporte o varias condiciones
fallidas, son errores de integración (salida 1).

La admisión dirigida usa el actor restringido, caché de verificación desactivada,
prueba positiva inicial y políticas/configuración/confianza sin cambios. Solo
puede rechazar la regla de procedencia; F10 debe identificar
`PROVENANCE_REPOSITORY`. Un error genérico de firmas no demuestra F10. Un mensaje
no reconocido detiene el ensayo. Recuperar restaura bytes e inventario exactos y
verifica de nuevo; los ensayos autorizados además admiten el mismo digest,
comprueban rollout y HTTP, guardando respuestas por ensayo. Se conservan fallos
originales y de recuperación. EXIT/INT/TERM activan recuperación; SIGKILL o pérdida
del host requieren intervención usando el respaldo.

## L05 con fuentes reales

Seleccionar ambos commits completos, en orden de ascendencia y alcanzables desde
el `main` local registrado. Sus árboles `services/quotes-node/src` deben diferir.
Este par histórico modifica `server.js` y sus pruebas:

```bash
GP_L05_FROM_COMMIT=7243334fe4ee7073801a86b25c90986b7d3c5ece \
GP_L05_TO_COMMIT=fc58e220e2d3f38d13216b23e61ffc31271f112f \
make -C implementacion demo
```

Se exportan blobs Git reales a almacenamiento temporal propio sin modificar HEAD,
índice ni cambios del usuario. Se registran commits, árboles, hashes y modos Git;
cambios de contenido o permisos mediante chmod
posteriores a la selección invalidan la construcción. Se mantiene la imagen Node
actual fijada por digest, pasada explícitamente al Dockerfile histórico. No se
reconstruye todo el entorno histórico.

Tras los ensayos existentes, `L05-from/` y `L05-to/` ejecutan pruebas de control y
de sus fuentes, construcción, análisis, firmas, procedencia y resultados nuevos.
Cada revisión se autoriza de forma exacta antes de su admisión. Se exigen digests
distintos, rollout y HTTP válidos. Las políticas cambian entre entregas legítimas,
nunca durante un ensayo de fallo/recuperación. Sin el par, L05 queda
`NOT_EXECUTED`. Un cambio solo de metadatos no basta.

El primer rollout L05 usa como predecesor el reemplazo L04 completado y saludable;
si falta ese resultado o falló, L05 se detiene antes de construir. El segundo usa
la primera entrega L05, no la imagen inicial conservada por el proceso padre.

La instalación inicial aplica políticas sin reiniciar el controlador. Una
actualización posterior de revisión exacta (L05) conserva el reinicio para renovar
la caché: Kyverno 1.19.1 no rellena `Ready.observedGeneration`. Las fuentes fijadas
y su secuencia de arranque están enlazadas en la guía EN. Nunca se reinicia durante
un ensayo de fallo/recuperación.

Ambas rutas esperan rollout y Pods Ready, no terminantes, pertenecientes a la
revisión actual del Deployment. Los EndpointSlices de `kyverno-svc` deben apuntar
a esos Pods en el puerto fijado. Se permiten hasta 30 observaciones separadas por
dos segundos para convergencia; errores de API o snapshots malformados detienen
el proceso. Este límite no incluye el tiempo de las peticiones API. Los logs se
leen por nombre de Pod, nunca mediante selección automática del Deployment.
Las políticas deben conservar UID, generación y especificación, y seguir Ready.

Un **dry-run de servidor** con el actor restringido comprueba la respuesta real:
al instalar exige el rechazo único y exacto por resultados ausentes; al actualizar
L05 exige aceptar la entrega ya autorizada. El primer dry-run no cuenta como otra
observación F13; sus inventarios y petición original siguen comprobándose.
No se reintentan errores webhook ni se atribuyen timeouts a detección de política.
La limpieza retiene Pods, EndpointSlices y logs por Pod posteriores al fallo.
Ver el [registro de corrección](../../../../registros/kyverno_readiness_fix_ES.md).

## Hosted y evidencia

CI y admisión exigen repositorio, revisión, tipo de construcción y constructor
coherentes. El constructor hosted es la identidad del workflow configurada;
se conservan certificados, OIDC, ref/digest, runner y transparencia.
F09/F10 hosted permanecen **NOT_EXECUTED**: no se añade mutación ni despacho remoto.
L05 hosted requiere dos ejecuciones manuales autorizadas, cada una en su revisión
Actions real, con sus IDs, `GITHUB_SHA`, digest, procedencia nativa, pruebas,
políticas, resultados y admisión/HTTP. Revisar ambos paquetes. Otro checkout dentro
de una ejecución no genera una nueva revisión nativa autenticada. L01/L03 del
mismo commit no demuestra L05.

El paquete incluye `L01-update/F09-CI`, `F10-CI`, `F09-admission`, `F10-admission`,
los informes del gate, `L05-source-authorization.json`, `L05-from/`, `L05-to/` y
`L05-result.json`. Excluye claves privadas, credenciales, estado y fuentes
exportadas temporales. Ver [oráculo](record.md), [guía EN](../../../EN/cases/F09-F10-L05/runbook.md)
y [validación](../../../../registros/f09_f10_l05_validation_EN.md). Son comprobaciones
funcionales, no datos de campaña; revisión humana pendiente.

`execution-summary.json` enumera estados registrados y rutas por escenario.
Archivos parciales sin registro final indican `INCOMPLETE`; sin registro,
`NOT_RECORDED`. No se infiere éxito. Se distinguen `NOT_EXECUTED` explícito y
`INVALID_RECORD` para registros malformados.

## Preflight del entorno antes de reintentar

El [preflight de main `80c12bc`](../../../../registros/f09_f10_l05_integration_validation_ES.md)
falló por versiones y reprodujo el timeout DNS de Docker Hub desde BuildKit en
kind. F09/F10/L05 siguen NOT_EXECUTED. Seleccionar **Golden Path - implementation**
al crear/reconstruir devcontainer o Codespace; consultar la
[guía de entorno](../../environment.md). Conservar primero la evidencia existente.
Tras resolver los requisitos con el propietario del entorno, ejecutar estos
comandos desde la raíz. Detenerse si falla una comprobación; no repetir el demo
ni aplicar automáticamente reglas históricas de firewall. La sonda usa la misma
imagen BuildKit y red que la entrega local; smoke-env no demuestra esa ruta.

```bash
# Run from the repository root in the selected devcontainer.
(
  set -euo pipefail
  export PATH="$PWD/implementacion/.tools/bin:$PATH"
  make -C implementacion doctor
  make -C implementacion smoke-env
  source implementacion/versions.env
  probe_dir=$(mktemp -d)
  probe_builder="gp-connectivity-$(date -u +%s)-$$"
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

Para prerrequisitos independientes, la suite existente y conservación de fallos/bases de datos, use la [validación del carril A](../../lane-a-validation.md). Los intentos locales actuales se detienen en doctor; no cierran las barreras de integración pendientes de este caso.
