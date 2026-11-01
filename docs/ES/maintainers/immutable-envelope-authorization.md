# Autorización experimental por envoltorio inmutable — 1 de noviembre de 2026

**INCONCLUSIVE**. La selección mínima funciona, pero no se demuestra GO_LOCAL.
Las fuentes oficiales inspeccionadas no acreditan una combinación del controlador
con una versión de Kubernetes todavía mantenida. Eso no demuestra incompatibilidad
técnica. Se cierra esta investigación acotada sin activar una migración ni iniciar
otra cadena de PR documentales. [Informe canónico EN](../../EN/maintainers/immutable-envelope-authorization.md).

Rama exacta: `spike/inmutable-envelope-authorization`. Base actualizada:
`7ba200fd1119082b93d49dd80bee960e4709244b`, merge de PR #67. Esa fusión no acredita
adopción ni revisiones humanas no documentadas. Los dos archivos npm ajenos de la
raíz siguen sin seguimiento y no se modificaron.

## Qué objeto autoriza esta propuesta

En la ruta DSSE clásica, el digest expuesto corresponde al **blob de la capa OCI
que contiene el JSON del envoltorio DSSE**, con SHA-256 y media type
`application/vnd.dsse.envelope.v1+json`. Incluye su representación, payload y firmas.
No es el digest de imagen, del manifest OCI, del bundle canónico ni del statement
decodificado. Un archivo local solo comparte esa identidad si tiene exactamente
los bytes publicados. Las anotaciones, certificados y pruebas de transparencia
externas al envoltorio no forman parte de ese hash; siguen siendo obligaciones de
autenticación independientes.

Reempaquetar o volver a firmar puede exigir nueva preparación aunque el statement
sea idéntico. Ese coste es deliberado y diferente del contrato anterior de cuatro
hashes de statements. Se conservan su definición y el NO_GO de PR #67.
En la ruta nativa de bundles, el digest devuelto corresponde a un envoltorio
derivado y serializado por el verificador; no identifica los bytes del bundle
original. No se extrapola la asociación clásica a esa ruta.

La preparación confiable autentica el bundle canónico y vincula el blob de admisión
con su contenido y firmas, imagen, autoridad y contexto. El motor debe autenticar
y evaluar el mismo objeto del que obtiene el digest. La colección externa contiene
únicamente los candidatos que superaron la política interna. Se mantienen cuatro
requisitos independientes: sign/v1, SBOM, procedencia y resultados.

El administrador/coordinador sería propietario de las políticas y bindings;
el workload no podría cambiarlos mediante anotaciones, labels ni otra política.
Ese aislamiento por RBAC **no se ha ejecutado**. Se necesita comprobarlo antes de
adoptar la propuesta. Una configuración incompleta es error, no ausencia demostrada.

## Qué se ejecutó y qué falta

Se consultaron las fuentes oficiales el **2026-11-01 UTC**. La última publicación
sigue siendo policy-controller **0.15.1**, commit `cc75baab1d34d3bae47bde7bd934bf79e5ca3afc`.
El tester usa Cosign 3.0.5; el productor y verificador local usa el pin 3.1.4.
Se descargó y verificó el tester mediante checksum y firma keyless de su workflow
exacto, con certificado y transparencia, antes de ejecutarlo.

El último intento completó diez evaluaciones CLI reales:

| Caso | Resultado observado |
| --- | --- |
| Cuatro artefactos sintéticos seleccionados | Aceptación |
| Duplicado idéntico | Aceptación |
| PASS seleccionado con otro FAIL, ambos órdenes | Aceptación / aceptación |
| FAIL seleccionado con otro PASS, ambos órdenes | Rechazo externo / rechazo externo |
| Solo FAIL seleccionado | Rechazo interno; política externa no alcanzada |
| Falta el descriptor esperado en descubrimiento clásico, existe el reempaquetado | Rechazo por selección |
| Nueva preparación selecciona el reempaquetado | Aceptación |
| Firma real emitida por `cosign sign`, otros tres tipos sintéticos | Aceptación |

Cada permutación conserva imagen, política, firmas, contenido y conjunto completo
de candidatos; solo cambia el orden. Se conservan inventarios antes/después y bytes
de todos los envoltorios. Retirar el descriptor del inventario clásico no demuestra
la eliminación física del blob sin referencias ni ausencia en otros mecanismos.
Los intentos previos de nueve y diez evaluaciones también
se preservan. El código ejecutado final se identifica por SHA-256
`43950a52f9460e59b6edbfbbb926cc7b0874408f4830656af1a63ac72d4975b8`, sobre la base
más cambios sin commit; no se atribuye la ejecución a un commit posterior.

La tabla de soporte del controlador llega a Kubernetes 1.29. Su matriz E2E de la
versión publicada llega a 1.34, cuyo soporte terminó el 27 de octubre de 2026.
El chart oficial inspeccionado referencia otro controlador, 0.13.1. Ninguno de esos
hechos acredita la combinación requerida con una versión mantenida. No se creó un
clúster usando versiones EOL ni se supuso compatibilidad con el pin 1.35.8.

**NOT_EXECUTED:** contratos locales completos de SBOM/procedencia/resultados;
matriz completa de ausencias, sustitución, campos parciales, digest/firmante/contexto
incorrectos, corrupción nueva, configuración y fallos de integración; actor/RBAC;
Pod CREATE, Deployment CREATE/UPDATE y Pods generados; tags, namespaces/webhooks,
caché E1→E2, fallo cerrado, rollout y HTTP. La matriz completa y causas de suspensión
figuran en EN. Las pruebas unitarias de clasificación y conservación de resultados
no sustituyen esas ejecuciones. La corrupción criptográfica observada en PR #67
sigue siendo histórica.

La ruta nativa bundle con clave local continúa sin soporte en esta API. Solo se ha
demostrado la representación clásica adicional con clave local y la firma sign/v1
del productor real; no compatibilidad con todos los bundles. GitHub, certificados,
issuer, transparencia y procedencia nativa alojada permanecen **NOT_EXECUTED**.

## Integración, costes y decisión

Se conserva el orden: firma/SBOM/procedencia autenticadas → controles y ausencia
previa de resultados → emisión/verificación de resultados → binding completo →
admisión. No se emitió un PASS completo golden-path-v1 para suplir controles aún
no ejecutados. Los predicados `authorized:true` son fixtures de selección.
Los siete checks (`unitTests`, `manifestPolicy`, `workflowPolicy`,
`vulnerabilityPolicy`, `signature`, `sbom`, `provenance`), fuente y versión de
política deben proceder de una única declaración válida. Se mantienen repositorio,
revisión, build type y builder específicos de cada vía en procedencia, y CycloneDX
1.7 con componente principal y lista de componentes no vacía. La validación completa
CycloneDX en CI, los campos evaluados
en admisión y la exactitud del inventario son propiedades distintas.

Retirar un artefacto ya seleccionado no demuestra F13 previo a emisión. F13 sigue
pendiente de inventarios completos y estables, configuración válida, contrapartes
auténticas y rechazo atribuible. Un hash de resultados sin configurar no lo prueba.
La imagen inicial y cada digest de sustitución necesitan autorizaciones propias.

Esta propuesta autoriza una entrega concreta: un FAIL no seleccionado no revoca
automáticamente un PASS seleccionado. La recuperación requiere nuevo binding.
Difiere de las políticas activas que comprueban todos los contenidos aplicables.
No introduce revocación continua, relojes, ledger ni defensa frente al productor
autorizado comprometido. Conservar artefactos exactos y volver a preparar tras
reempaquetarlos son costes operativos adicionales.

Existe una dirección mantenible potencial mediante capacidades oficiales, pero
**no una implementación desbloqueada**. Falta primero acreditar una combinación
publicada con Kubernetes mantenido; después, completar los contratos locales y la
matriz de admisión ya definida. La validación alojada necesita autorización separada.
No se enviaron comentarios upstream ni workflows alojados manuales.

Tres registros propios secuenciales quedaron retirados; no hubo clúster, volumen
nuevo, construcción de imagen, DB de escáner ni instalación de controlador.
Se preservan las tres imágenes y tres volúmenes previos. Quedan aproximadamente
8,6 GiB y 1,69 millones de inodos libres en workspace/Docker. El binario temporal
se retiró después de verificar el paquete, comprobando su recibo y hash. EN contiene
el comando reproducible y checksum del paquete local de 268.811 bytes, cuyos 339
miembros se verificaron contra los originales. `doctor`, suite compartida, 14
regresiones del harness, inventario (525 rutas, diez pruebas), enlaces, ejemplos
y comprobación del diff pasaron; CI del commit final se enlaza en la PR.

La reversión consiste en dejar de invocar el modo experimental y conservar sus
evidencias; las rutas activas, pins, productores, demos y golden-path-v1 siguen
intactos. Codex realizó la investigación; revisión humana y adopción pendientes.
TODO sitúa `perf/codex-context-retrieval` inmediatamente después de este spike y
`spike/serena-repomix-evaluation` al final del roadmap. No se instalaron esas herramientas.
