# Bundles de Cosign: validación local de la migración

[English](cosign_bundles_validation_EN.md) · [Guía de migración](../docs/ES/cosign-bundle-migration.md)

Fecha: 2026-09-27. Se valida el árbol de trabajo modificado de `feat/cosign-bundles`, basado en `9f1999ef8a1ee0b8b4c708625f1d0b663ad9173c`. No se presenta como una ejecución de la versión v0.1.0 sin modificar. La huella de fuentes de implementación capturada es `8d79c68d46569c826fb43d693c03dc767631c715f039021717642d3d2991cc0a`.

La documentación se actualizó después para recoger el resultado observado. La huella incluye `policies/README.md`, por lo que identifica la captura de la ejecución, no las ediciones documentales finales. No se modificaron fuentes ejecutables ni pruebas tras comenzar la ejecución final.

## Integración observada

`bash scripts/demo.sh local` terminó con código 0 en **run-De88fpWy**, con el recuperador estricto del inventario OCI. Se utilizaron las herramientas fijadas en un contenedor Linux AMD64 y Docker Engine 24.0.5 en el anfitrión. La opción explícita `GP_CGROUP_V1_COMPAT=1` permitió este anfitrión antiguo con cgroup v1. Es una prueba funcional de compatibilidad, no el entorno previsto para la campaña ni una medición de rendimiento.

| Comprobación | Observación |
| --- | --- |
| Evidencias nuevas | Un registro zot aislado y digests nuevos contenían bundles v0.3. Los bundles guardados superaron la verificación criptográfica directa; las firmas clásicas no podían aportar predicados bundle ausentes. |
| Recuperación estricta | Tres referencias antes y después del rechazo F13, cuatro tras la autorización y cuatro para la sustitución autorizada. Se recuperaron todos los manifiestos y blobs de bundles anunciados, comprobando tamaño, digest y estabilidad del segundo listado. |
| F13 | Solo rechazó `tfm-results`/`autogen-require-results`. Los inventarios anterior y posterior acreditaron la ausencia de resultados; los otros controles de evidencias de admisión pasaron. Tras añadir resultados válidos se admitió el mismo digest. |
| F11 | La política temprana rechazó la entrada privilegiada. La actualización dirigida fue rechazada exclusivamente por la regla de restricciones del contenedor en `allowPrivilegeEscalation`. |
| L01 | Pasaron la creación, disponibilidad y respuesta HTTP esperada. Una imagen distinta superó su propio análisis, firma, verificación de evidencias, admisión y despliegue. El identificador de imagen del Pod disponible coincidió con el digest de sustitución. |
| Perfil de admisión | Las cuatro políticas de evidencias utilizaron `SigstoreBundle`. La firma de imagen exigió por separado `https://sigstore.dev/cosign/sign/v1`. |
| Paquete | Se verificaron su SHA-256 y las 111 huellas internas. Se conservaron ocho bundles originales y dos copias de claves públicas de desarrollo. Se excluyeron credenciales, kubeconfig, claves privadas y estado interno. |
| Limpieza | La ejecución terminó correctamente y eliminó su directorio temporal de claves privadas y los recursos del laboratorio que había creado. |

Digest original: `sha256:76f160b8370624d2d45e982d909ca6e99303654b2f2cf1c27b79cebb933370a3`.

Digest de sustitución: `sha256:e4f1336f50574e526c8f8aa0b45d97d6c7b5c93154fa8fb92468febae2b16f32`.

El paquete es `evidence/packages/run-De88fpWy.tar.gz`, con SHA-256 `113113cc7857dbe15d29d0d6022fe612e1b02ddc388a8b41bdfd6159be059491`. Los archivos originales permanecen en `evidence/raw/run-De88fpWy/`; ambas carpetas generadas están excluidas de Git. Se conservan inventarios de descriptores OCI, bundles, CycloneDX original, resultados de verificadores, políticas aplicadas y pruebas del despliegue de ambas imágenes.

Las ejecuciones anteriores `run-MyEM7tG1` y `run-6AyCNm7h` superaron firma y admisión con bundles antes de incorporar la recuperación estricta en su orquestación. Se mantienen como observaciones de desarrollo; `run-De88fpWy` valida la protección completa de recuperación.

## Pruebas de regresión

`make test` pasó en el contenedor Linux con herramientas fijadas y la red deshabilitada:

- 6 pruebas de entorno y 247 de servicio, contratos, interpretación de evidencias, orquestación, clasificación y empaquetado.
- 15 pruebas Python de políticas y configuración, 52 decisiones Conftest, 9 comprobaciones con el motor Kyverno y 32 comprobaciones sobre archivos de entrada reales.
- 15 pasos de comprobación criptográfica con Cosign real: verificación válida de firma de imagen, SBOM y resultados, y rechazo de sustituciones por SBOM/resultados, firma alterada, digest diferente y clave de desarrollo no autorizada. El recuento incluye preparación; no equivale a quince escenarios del catálogo.

Las pruebas del recuperador contemplan una referencia ilegible o malformada, incoherencias de contenido y digest, paginación y alternativa por etiqueta, cambios de inventario y redirecciones HTTPS sin transferir credenciales. Interpretar JSON no autentica al registro. Las salidas se conservan localmente en `.tmp/bundle-tests-strict.log`, `.tmp/bundle-integration-strict.log` y el `run.log` empaquetado.

## Límites y aceptación pendiente

- Ejecutar la rama publicada en GitHub antes de aceptar la vía B: quedan por verificar en esta revisión la identidad OIDC real, certificado Fulcio y SCT, transparencia, procedencia nativa de GitHub, recuperación autenticada desde GHCR y consumo por Kyverno.
- Completar las pruebas negativas dirigidas de admisión del plan, incluida una imagen con SBOM, procedencia y resultados válidos, pero sin el predicado independiente de firma de imagen. La ejecución positiva, las pruebas de políticas y las sustituciones criptográficas no completan ese experimento F07 ni la campaña de veinte escenarios.
- Sigue visible la obsolescencia de `ClusterPolicy`. Esta migración elimina del recorrido activo los parámetros clásicos de Cosign y la adaptación de cadenas, pero no migra la API de políticas de Kyverno.
- La vía local emplea deliberadamente una clave de desarrollo sin marcas de transparencia pública. Su aviso es esperado y no acredita la transparencia alojada, que mantiene sus controles obligatorios.
- Fijar revisión y perfil de confianza tras validar el piloto. R/G deben utilizar esa revisión; R puede omitir los controles adicionales. Las repeticiones temporales del desarrollo clásico no se mezclan con las repeticiones de campaña con bundles.

Esta validación no creó commits, publicó cambios, modificó la release ni inició workflows alojados.
