# ADR: selección explícita de la autorización de entrega

Estado: **propuesta pendiente de aprobación humana; implementación y adopción CEL
bloqueadas**. Fecha de referencia y consulta: **30 de octubre de 2026**.
Rama: `design/attestation-selection-contract`.
El [ADR canónico en inglés](../../EN/maintainers/attestation-selection-contract.md)
contiene la tabla completa de decisiones, funciones oficiales, hashes, pruebas y
plan. Esta explicación mantiene el mismo alcance; no modifica el contrato activo.

## Recomendación concreta

Autorizar una **entrega concreta** mediante cuatro declaraciones completas,
autenticadas y seleccionadas desde la configuración confiable de esa preparación.
Identificar cada una por el SHA-256 de los bytes exactos de su declaración firmada,
sin volver a serializar JSON. Reutilizar el coordinador, la verificación CI, los
recibos y el renderer existentes. No seleccionar por orden del registro, por
«algún PASS», por un identificador opaco sin comprobar unicidad o por la fecha mayor.

Separar dos necesidades:

- **A, ahora:** autorizar esa entrega con las evidencias y contexto elegidos por
  la administración. No necesita relojes, secuencias, caducidad ni un servicio nuevo.
- **B, posterior:** reevaluar, sustituir o revocar automáticamente una autorización
  previa. Necesita una fuente confiable de vigencia, reglas de actualización,
  caché y tratamiento de cargas ya ejecutándose. No la proporciona una lista de
  objetos en el registro.

Esto limita deliberadamente la recomendación más ambiciosa de autorización vigente
de la PR #65. Un FAIL nuevo publicado en el registro no revoca automáticamente una
preparación inmutable que todavía selecciona un PASS anterior. El producto debe
declararlo. Cambiar esa decisión requiere una preparación nueva y autorizada.
No se construye una plataforma de autorizaciones para completar la migración.

**Resultado de viabilidad:** ninguna versión oficial inspeccionada permite
implementar el contrato completo propuesto. #18049 todavía no está publicada y,
por sí sola, tampoco lo implementa. Se conservan ClusterPolicy, los productores,
los pins y `golden-path-v1`. La propuesta es revisable aunque la adopción siga
bloqueada; aprobar el diseño no demuestra compatibilidad del motor.

## Contexto y fronteras de confianza

El contexto esperado incluye repositorio de imagen y digest, cuatro tipos de
declaración, clave local o identidad alojada exacta/emisor/raíces, repositorio y
revisión de origen, versión del contrato/políticas y constructor/build type donde
ya se exigen. No se añade entorno/canal si no cambia una decisión real.

El operador autorizado selecciona fuente y configuración; el coordinador resuelve
el digest y CI autentica las evidencias exactas. La preparación registra sus cuatro
hashes y el renderer los incorpora como constantes protegidas. El solicitante de
un Pod o Deployment no puede cambiar esos valores, elegir otro contexto mediante
anotaciones ni escribir políticas, excepciones o confianza. La administración que
puede sustituir las políticas sigue siendo una autoridad confiable.

Flujo: **productor → evidencias firmadas → verificación CI y configuración confiable
con hashes → admisión independiente → decisión**. El diagrama del ADR distingue
administración/CI, registro no confiable y solicitante restringido. El recibo no
crea otra cadena criptográfica: siguen verificando las herramientas oficiales.

La admisión debe autenticar los mismos bytes cuyo hash compara; no basta una
anotación OCI o un campo firmado que afirme contener un hash. La selección precede
a evaluar PASS/FAIL. Las declaraciones de otro contexto no sustituyen la elegida.
No se mezclan campos de declaraciones diferentes.

Firma independiente sign/v1, SBOM, procedencia y resultados siguen siendo cuatro
requisitos. Se conservan CycloneDX y su validación completa de schemas en CI,
origen/revisión/build type/builder y los siete checks PASS de resultados. Las
comprobaciones parciales de admisión no demuestran inventario exhaustivo. No se
aplican reglas temporales de resultados al SBOM o a la procedencia.

## Alternativas y consecuencias

| Alternativa | Garantía y recuperación | Coste/límite |
| --- | --- | --- |
| Todas las declaraciones autenticadas aplicables cumplen | Rechaza contradicciones visibles; un FAIL antiguo puede impedir recuperación | No es un estándar universal; tampoco detecta declaraciones ocultas. IVP no expone la colección completa |
| Alguna declaración completa cumple | Permite recuperación tras FAIL sin combinar campos | Un PASS antiguo puede seguir autorizando tras un FAIL nuevo; no equivale a revocación |
| **Contenido exacto elegido desde preparación confiable** | La entrega requiere ese contenido completo; otro PASS auténtico no puede sustituirlo | Cuatro hashes y preparación nueva para cambios. Falta selección oficial de bytes autenticados antes de descartar candidatos |
| Autorización vigente por tiempo/sustitución | Permitiría revocar y recuperar según una autoridad vigente | Requiere estado confiable adicional y reglas temporales/concurrentes. Se difiere |

Ejemplos del contrato propuesto:

| Entrada | Decisión esperada |
| --- | --- |
| Las cuatro declaraciones seleccionadas son completas y conformes | Aceptar |
| Falta cualquiera; otra declaración intenta sustituirla | Bloquear; distinguir ausencia demostrada de error de recuperación |
| Digest, firmante, identidad, origen, revisión, builder o versión seleccionados incorrectos | Rechazar cuando esté aislado y demostrado; ambigüedad de verificación es error |
| Duplicados con bytes idénticos | Misma autorización, sin renovarla |
| Declaraciones distintas conformes o contradictorias, en ambos órdenes | Decidir exclusivamente sobre el contenido esperado; su ausencia bloquea aunque haya otro PASS |
| PASS antiguo y FAIL posterior sin cambiar la preparación | Se mantiene la selección; **no hay revocación automática** |
| FAIL y después recuperación autorizada | Solo aceptar tras preparación nueva con el nuevo contenido completo |
| Fechas ausentes, futuras o iguales | No ordenan autorizaciones; se mantienen las comprobaciones criptográficas temporales existentes |
| Mismo ID/secuencia con contenidos contradictorios | El hash de contenido los distingue; no se usa el ID/secuencia. Dos hashes esperados para un único requisito son configuración inválida |
| Otras fuentes/versiones, o declaraciones complementarias incompletas | No sustituyen ni se combinan para fabricar un PASS |
| Registro oculta la decisión posterior | No demuestra vigencia. Si se cambió el hash esperado y lo oculta, bloquear; si no cambió, la preparación conserva su alcance anterior |
| Publicación parcial, cambio concurrente o caché obsoleta | Bloquear entrega; no contar un error como detección satisfactoria |

El cambio de semántica requiere una versión sucesora de políticas —se propone
`golden-path-v2` para revisión— y un recibo de preparación versionado. No se cambia
ahora el formato del predicado ni se añaden IDs, fechas o secuencias. Una nueva URI
de predicado solo sería necesaria si cambia su schema. Las evidencias v1 no se
reescriben ni reinterpretan.

Los bundles modernos siguen siendo el formato canónico de generación, CI y
conservación. Otra representación oficial en admisión exige demostrar los cuatro
requisitos y el vínculo con el mismo contenido autenticado. Una firma clásica
convencional no es una atestación DSSE sign/v1 almacenada por el mecanismo clásico.
Ni observar una consulta clásica ni un rechazo local prueba compatibilidad alojada.

## Estado oficial y pruebas

Consulta directa iniciada a **2026-10-30T19:27:59Z**, fuentes fijadas recuperadas a
**19:28:59Z**, artefactos comprobados posteriormente ese día. La PR
[#65](https://github.com/tfm-goldenpath/golden-path-lab/pull/65) seguía abierta en
`f553b9eacad6ee6a4eb1ebcc0d8608315dd1793b`; esta rama parte de main
`e0fbe6490794b0da679777d465117a43bdb482ad` sin fusionar/copiar sus commits en la preparación inicial. Se usa
su [investigación fijada](https://github.com/tfm-goldenpath/golden-path-lab/blob/f553b9eacad6ee6a4eb1ebcc0d8608315dd1793b/docs/EN/maintainers/kyverno-cel-migration.md).
Después, #65 se fusionó en main `2b654f94e9c1bbb42ee3a6e75e788bc167407787`
a **2026-10-30T20:19:06Z**. La PR #66 incorpora ahora esa revisión para resolver
el solapamiento de TODO, conservando investigación y diseño. El
[documento de investigación](kyverno-cel-migration.md) y el reproducer ya existen
en esta rama; no se modifica la procedencia de las observaciones originales.
Tras sincronizar, el inventario cubre **519 rutas**; sus 10 pruebas, 174 enlaces
relativos, sintaxis Bash y comprobación del diff pasan. Runtime, tests y pins
coinciden con main actualizado.

- [Última estable](https://github.com/kyverno/kyverno/releases/tag/v1.19.2):
  **1.19.2**, chart **3.9.2**, Kubernetes fijado **1.35.8** dentro del rango
  oficial 1.33–1.35. CLI y controlador permanecen alineados en 1.19.2.
- [Soporte](https://kyverno.io/docs/installation/releases/): 1.19 sigue soportada
  hasta publicar 1.20; noviembre es una estimación. La
  [retirada anunciada](https://kyverno.io/docs/guides/migration-to-cel/) es en
  1.20, tras deprecar ClusterPolicy en 1.19. No se declara fin de soporte por una
  estimación ni se actualiza automáticamente.
- [#18049](https://github.com/kyverno/kyverno/pull/18049), merge `edd8b239`, sigue
  en main `a6ff05d6`, ausente de la release y de `release-1.19` inspeccionadas.
  Sus bytes finales seleccionan el más reciente, deduplican payloads idénticos y
  desempatan por bytes. No ofrecen selección exacta ni colección autenticada.
- Se comprobaron checksums/miembro del archivo CLI y metadatos del binario del
  controlador OCI oficial por digest. Ambos incorporan **Cosign 3.1.2**, sigstore
  **1.10.9**, sigstore-go **1.3.0**, Rekor **1.5.3** y rekor-tiles **2.3.0**.
  La CLI Cosign del laboratorio es **3.1.4**; no actualiza esas bibliotecas.
- #18049 prefiere tiempos de bundles si todos los tienen, o fechas firmadas si
  todos las tienen; si no, falla. Un singleton no necesita fecha. Mezcla categorías
  de pruebas temporales, no impone TTL/límite de futuro y fusiona candidatos entre
  autoridades por imagen/predicado. El ADR detalla la vinculación, deduplicación,
  fechas reconocidas, empates y diferencia local/alojada. Es análisis de código,
  **no ejecución del motor corregido**.

Se resolvió una incertidumbre nueva mediante el reproducer existente y un adaptador
pequeño conservado con la evidencia: `cosign.annotations` filtra anotaciones del
**sujeto firmado**, antes de seleccionar contenido. Son distintas de anotaciones
del Pod. Con una clave local y bundles nuevos, nueve evaluaciones CLI mostraron:

- PASS con ID esperado: acepta; ID incorrecto o ausente: rechaza.
- PASS esperado + FAIL de otro ID: acepta en ambos órdenes.
- FAIL esperado + PASS de otro ID: rechaza en ambos órdenes.
- PASS y FAIL del mismo ID: **rechaza/acepta según el orden**.

El experimento `annotations-02` terminó correctamente, pero la alternativa basada
solo en ID **no cumple**; adopción bloqueada, exit 2. No prueba el contrato de hashes
ni admisión real. `annotations-01` se conserva como error del adaptador anterior a
evaluar políticas; se corrigió la invocación de Cosign a `attest-blob --statement` y
la comprobación del mensaje de ausencia durante cleanup. No se oculta ese intento.

La investigación anterior conserva sus resultados y NOT_EXECUTED. No hay nueva
admisión Kubernetes, ejecución alojada, entrega, demo, vulnerabilidades o campaña.
La CI verifica regresiones del código, no adopción de la migración. Los fixtures
de investigación no se instalan desde las rutas normales.

## Límites, siguiente PR y reversión

El registro puede ocultar resultados posteriores; Rekor prueba inclusión, no
ausencia de revocación posterior. Una secuencia firmada necesita un mínimo esperado
conocido por otra vía; caducidad no equivale a revocación inmediata. Desempatar por
bytes no confiere autoridad. Denegar admisiones nuevas no retira Pods existentes.
La caché puede conservar permisos anteriores: mantenerla deshabilitada y probar
cambios de confianza/contexto/política antes de considerar habilitarla.

El único estado adicional de A reside en preparación/políticas existentes, bajo
administración. Su indisponibilidad o incoherencia bloquea la entrega. No se promete
atomicidad de una actualización concurrente de varias políticas; se serializa la
preparación y se utiliza un entorno nuevo. No se modifica en caliente un clúster.

Siguiente rama: **`feat/delivery-authorization-selection`**, solo después de aprobar
el contrato y demostrar una capacidad oficial de seleccionar/verificar los bytes
esperados. El ADR delimita los módulos, disponibilidad/RBAC/snapshots/diagnósticos,
matriz semántica y pruebas locales/alojadas requeridas. #18049 publicada por sí
sola no basta. Coste esperado: cuatro hashes por imagen y adaptación de módulos
existentes; el trabajo principal son las garantías del motor y las integraciones.

Si no existe una ruta oficial antes del fin de soporte, evaluar una sola alternativa
mantenida: [Sigstore policy-controller](https://docs.sigstore.dev/policy-controller/overview/)
para imágenes y ValidatingPolicy para runtime. Añade otro componente/políticas y
requiere demostrar selección exacta, bundles, sign/v1, identidad/transparencia,
caché y rechazo de tags. No se declara compatible ni se instala aquí. La migración
parcial de runtime con verificación legacy no soluciona la retirada de ClusterPolicy.

La revisión del **2 de noviembre de 2026 sigue próxima**, no vencida. Revisar antes
si se publica 1.20. El recordatorio existente del **30 de noviembre a las 09:00,
Europe/Madrid**, permanece intacto; no es la fecha confirmada de retirada.

Reversión futura: retirar únicamente el laboratorio propio mediante cleanup con
comprobación de propiedad, conservar su paquete y preparar **otro entorno** en la
revisión/pins/contrato anteriores. No mezclar políticas legacy/CEL, cambiar recibos
sellados ni presentar una revisión fuera de soporte como solución permanente.
En esta rama solo se revierten documentos. No hay merge, release ni envío upstream.

Validación documental inicial del diseño: 170 enlaces relativos, sintaxis Bash/JSON, inventario exacto
de 515 rutas, 10 pruebas existentes del inventario y `git diff --check` correctos.
Solo cambian seis archivos de documentación/inventario; CI comprobará el SHA final
sin convertir el resultado del experimento en compatibilidad. Revisión humana
pendiente; asistencia de OpenAI Codex.

Recursos: 4 cores / 16 GB / 32 GB, 9.1 GiB libres al inicio y 9.0 GiB al cierre,
reserva de 3 GiB conservada. Ambos registros temporales propios fueron retirados
con ausencia comprobada; no se crearon clústeres ni se copiaron DB/imágenes/históricos.
Se conservaron los volúmenes e imágenes preexistentes y el trabajo ajeno.
Paquete pequeño fuera de Git:
`implementacion/evidence/packages/attestation-selection-design-e0fbe64-20261030.tar.gz`,
849.839 bytes, 180 entradas, SHA-256
`42caf36666c2fea6d0bd60c9c9b1361e893dec3534b2a73bf7b6141148e2b47d`.
Se compararon todas sus entradas con los originales. No contiene claves privadas,
credenciales, binarios/capas del controlador ni DB de vulnerabilidades.
