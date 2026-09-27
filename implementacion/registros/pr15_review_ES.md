# PR #15: revisión y recomendación de versiones

[English](pr15_review_EN.md) · [Guía de migración](../docs/ES/cosign-bundle-migration.md)

Fecha: 2026-09-27. Se revisó la [PR #15](https://github.com/tfm-goldenpath/golden-path-lab/pull/15) en `82728c5c0fd69bbc9bff9007239a895f6467826c`. Las correcciones son cambios locales posteriores; la ejecución alojada anterior no las valida. Este registro no publica respuestas, resuelve conversaciones, sube código ni crea hitos o etiquetas.

## Resolución de los comentarios

| Comentario | Valoración | Acción |
| --- | --- | --- |
| [El parser rechaza la firma de imagen](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470375) | Falso positivo para la firma de imágenes de Cosign 3.1.3. Los dos bundles alojados reales contienen DSSE y `cosign/sign/v1`, y superan el parser estricto. | Mantener el requisito DSSE. No aceptar otra representación solo para silenciar el comentario. |
| [Firma y verificación incompatibles](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470391) | Falso positivo: esta firma de imagen produce un bundle de atestación, distinto de `messageSignature` en `sign-blob`. | Conservar la correspondencia entre productor, verificación y admisión. Añadir un comentario con la fuente de la versión fijada. |
| [Exclusión de claves privadas cifradas](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470404) | El ejemplo ya se excluía: la expresión original reconoce `ENCRYPTED PRIVATE KEY` y `ENCRYPTED COSIGN PRIVATE KEY`. Sí existía otra debilidad: el nombre permitido de clave pública no limitaba su contenido. | Exigir un único bloque PEM `PUBLIC KEY`, Base64 canónico no vacío y ausencia de texto o bloques adicionales. Ampliar la detección de cabeceras privadas con puntuación. Es control estructural del archivo, no autenticación ni detección general de secretos. |
| [Configuración OCI sin comprobar](https://github.com/tfm-goldenpath/golden-path-lab/pull/15#discussion_r4115470414) | Válido para candidatos Sigstore: antes una configuración ausente o malformada podía coexistir con un inventario satisfactorio. | Validar y recuperar el blob con límites de tamaño, digest y transporte; comprobar el contrato de configuración vacía fijado y conservar su digest/tamaño. Reutilizar bytes idénticos ya verificados dentro de una recuperación. Los artefactos ajenos a Sigstore se clasifican por manifiesto, fuera de la validación de contenido bundle. |

La [firma de imagen fijada](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign.go#L158-L225) crea una declaración in-toto y llama a `NewAttestationBundle`. La [construcción DSSE](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go#L364-L388) y el [predicado de firma](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/types/predicate.go#L19) respaldan el contrato. La [firma de blobs con PlainData](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign_blob.go#L110-L125) utiliza otro recorrido.

## Evidencia alojada existente

La [ejecución 36321115827](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36321115827), intento 1, ejecutó el commit revisado de `feat/cosign-bundles`: L01 admitió creación y sustitución, F13 rechazó resultados ausentes y F11 rechazó escalada de privilegios, por sus reglas previstas. GHCR utilizó la alternativa soportada de índice de referencias por etiqueta. Se mantuvieron identidad/emisor exactos, confianza del certificado y transparencia pública.

El paquete `run-HWj6gVNb.tar.gz` coincidió con SHA-256 `4e579ed9603b6715d27a5aa60a7ba1b23b1dc3645c106221774e42a70b1cf6c7`; coincidieron sus 103 hashes internos. Los ocho bundles conservados —firma, SBOM, procedencia y resultados de ambas imágenes— superaron otra verificación Cosign con la copia conservada de confianza, digest, predicado, identidad exacta de la rama y emisor OIDC GitHub esperados.

El job duró 4m31s frente a 3m05s en la [base de main 36316243657](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36316243657). Verificación/admisión pasó de 90s a 161s. Son observaciones funcionales: cambiaron las regiones de los runners y se mezclan criptografía, red y despliegue. No constituyen una estimación experimental de la sobrecarga intrínseca del formato.

## Aceptación de las correcciones

Verificación local satisfactoria: **270 pruebas Node** de servicio, entorno y unidades/contratos, incluidas 24 de inventario y 21 de empaquetado; también **15 pruebas Python** de políticas/configuración. Las suites modificadas añaden diecisiete pruebas. Se utilizó Node 24.18.0 y Python 3.10.0 en Windows; no se repitieron los motores externos Conftest/Kyverno ni la integración completa. `git diff --check` superado.

Un intento de solo lectura contra las dos imágenes GHCR publicadas se detuvo en la primera con HTTP 403 al leer referencias con las credenciales locales disponibles. No llegó a validar la configuración. El auxiliar se detuvo correctamente; no demuestra incompatibilidad de configuración ni una integración satisfactoria. No se relajaron restricciones de acceso.

- Publicar la corrección revisada y repetir integración local/alojada en su revisión exacta, conservando evidencia nueva. Los bundles anteriores no validan la nueva recuperación de configuración.
- Completar F07 dirigido: SBOM, procedencia y resultados válidos, sin firma independiente de imagen. Exigir rechazo atribuible a la política de firma; errores de red o confianza son fallos de integración.
- Tras el merge, validar el commit resultante de `main` antes de publicar versión. Conservar v0.1.0 y las observaciones anteriores.

## Secuencia de hitos recomendada

| Hito | Alcance y cierre | Versión |
| --- | --- | --- |
| Repository baseline | Base clásica ya publicada; mantener sus PR históricos. Trasladar #15 y cerrar cuando no quede trabajo de esa base. | Conservar v0.1.0. |
| Bundle migration — v0.2.0 | PR #15, correcciones, F07 dirigido e integración de la revisión adoptada. | Etiquetar el commit verificado tras merge como v0.2.0; mantener la designación pre-release de GitHub mientras el laboratorio sea experimental. |
| Scenario coverage and pilot | Veinte escenarios operativos mediante PR pequeñas por familia de controles; mediciones R/G, cuatro parejas piloto, seis tareas manuales de calibración y parámetros fijados. El cierre exige evidencia interpretable, no resultados siempre favorables. | Provisionalmente v0.3.0 para la revisión fijada de campaña. |
| Evaluation campaign and results | Campaña sobre revisión fijada, conservación de datos y análisis reproducible. Separar correcciones posteriores. | Asociar resultados a la etiqueta fijada; nueva revisión/etiqueta si cambian las entradas ejecutables. |

El incremento menor distingue el cambio de contrato de evidencias y consumidores durante 0.x. Es una convención del proyecto, no prueba de estabilidad ni una obligación de SemVer. [Versionado semántico](https://semver.org/spec/v2.0.0.html).

Priorizar las familias de controles acordadas y el piloto. Automatización de releases, migración de API Kyverno, analizadores adicionales y escenarios opcionales siguen siendo trabajo separado salvo un bloqueo de compatibilidad concreto.
