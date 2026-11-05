# Revisión del PR #24

Fecha: 2026-09-29. Inicio: `d337a3c7a2f80a931041c3023d4a6e57ecc589d5`.
Correcciones locales sin publicar. Asistencia real: **Github Copilot (GPT-6)**; los cinco
comentarios remotos proceden de **GitHub Copilot**. Revisión humana pendiente.
El [registro EN](pr24_review_EN.md) conserva enlaces, digests, resultados y límites.

CI **36631532871** pasó sobre el merge temporal
`2c8fd37fd66abe666312845eee42bddff09062d3` (PR `d337a3c` + main `38631e1`).
La integración **36631562615** pasó en **main `38631e1`**, anterior al PR:
5m22s del job, aproximadamente 5m28s del workflow. No valida F09/F10/L05 del PR.

Se descargó el artefacto y se comprobaron el digest ZIP publicado por GitHub,
el checksum del tar y sus **222 hashes internos**. Logs y registros respaldan
validación CycloneDX, cambio real L03, denegaciones F13/F11 y reemplazo/HTTP sano.
F05/F06/F07/F08 hosted figuran NOT_EXECUTED; F09/F10/L05 no existen en ese paquete
anterior. No se repitió independientemente la verificación criptográfica hosted.

Se corrigieron los cinco comentarios: modos Git y comprobación de chmod;
actualización de caché de admisión con reinicio del controlador propio y snapshots
estables; resumen por escenario sin inferir éxito de directorios; predecesor real
L04 para L05; revisión/decisión humana Pendiente, conservando la atribución Copilot.
Kyverno 1.19.1 no informa observedGeneration en Ready; la guía explica el mecanismo
basado en su secuencia de arranque fijada. Sus pruebas de orquestación son sintéticas.

TDD comprobado en `evidence/raw/pr24-review/`: antes de editar producción,
`02-red.log` registra 13 fallos entre 51 pruebas; `03-green.log` registra las
51 correctas. El intento sandbox anterior no cuenta como TDD. La suite compartida
pasó con 620 pruebas de servicio/unidad y las verificaciones de entorno, políticas
y Cosign. Las 56 pruebas focalizadas finales incluyen casos añadidos después.
Los resultados de integración local y límites finales constan en el registro EN.

El nuevo intento **`run-E1KEc3As` falló** por timeout DNS de BuildKit hacia Docker
Hub (`127.0.0.11:53`), tras pasar **622/622** pruebas y crear kind. No alcanzó
admisión, F09/F10 ni las entregas L05. Se verificaron el checksum y **14 hashes
internos** del paquete FAIL; la limpieza terminó sin contenedores restantes.
La actualización de caché sigue pendiente de validación Kubernetes real.

También se volvieron a validar los dos SBOM hosted contra sus esquemas y los
datos registrados de procedencia, L03 y rollout contra los validadores actuales.
Esto comprueba contenido, condicionado a la autenticación registrada; no repite
las firmas hosted ni equivale a ejecutar el PR en Actions.

No se publicaron commits, respuestas, PR ni workflows ni se cambiaron ajustes o
tesis. Ningún comentario remoto se marcó resuelto. Revisión y aceptación humanas
siguen pendientes.
