# Viabilidad de selección en motores oficiales — 1 de noviembre de 2026

**NO_GO para los cuatro hashes de declaraciones exactas del [ADR](attestation-selection-contract.md).**
El [informe canónico EN](../../EN/maintainers/admission-selection-feasibility.md)
conserva fuentes fijadas, matriz completa, comandos de reproducción, hashes y
fronteras. Rama `spike/admission-selection-feasibility`, base actualizada
`8a2cfd0fe08b999bb11e987e15aed5485e13e4f4`. Los archivos npm ajenos se conservan.
Las fusiones de #65/#66 no aprueban el contrato ni su adopción.

| Frontera | Resultado |
| --- | --- |
| Ejecución | Inspección oficial y segundo intento CLI completados; cinco evaluaciones y alteración real de bytes firmados; primer intento fallido conservado |
| Capacidad observada | policy-controller puede exigir digests de sobres entre objetos autenticados y evaluados individualmente |
| Contrato ensayado | **FAIL / NO_GO**: identificar el sobre no equivale a identificar los bytes exactos de su declaración firmada |
| Viabilidad local | Registro, firmas locales y tester oficial funcionan; no se crea clúster tras fallar la puerta semántica |
| Admisión, actor restringido, Pod/Deployment CREATE/UPDATE, rollout y HTTP | **NOT_EXECUTED** |
| Identidad GitHub de entrega, certificados y transparencia | **NOT_EXECUTED**; verificar la publicación del tester es una comprobación distinta |
| Adopción | **BLOCKED**; revisión humana y decisión del producto pendientes |

La consulta del **1 de noviembre de 2026 UTC** sigue encontrando Kyverno **1.19.2**
como última release. Su API expone un contenido por tipo, no una colección de
declaraciones exactas ni su selección por hash. #18049 continúa fuera del artefacto
publicado; el selector de desarrollo elige por fecha. Falla la puerta 1: se reutiliza
la investigación anterior sin repetir sus nueve evaluaciones por identificador.
La rama 1.19 sigue soportada hasta publicar 1.20; noviembre es una estimación.

La única alternativa inspeccionada es **Sigstore policy-controller 0.15.1**,
commit `cc75baab1d34d3bae47bde7bd934bf79e5ca3afc`. Rego/CUE recibe una declaración
deserializada y vuelta a serializar; la política externa recibe metadatos y el
digest del sobre, sin los bytes originales. Ese digest procede del mismo objeto
cuya firma y contenido se evaluaron: es una asociación útil, pero no implementa
por sí misma la identidad propuesta. La vía de bundles modernos exige keyless;
el fixture local usa DSSE clásico y requiere los cuatro tipos, incluido sign/v1.
Una firma clásica convencional no sustituye ese predicado independiente.

La vía indirecta parecía suficiente para justificar la puerta 2. El
[adaptador conservado en Git](../../../implementacion/tests/integration/admission-selection-feasibility.py)
reutiliza el reproducer existente; publica todos los candidatos y deja la decisión
al tester oficial. No hay verificador propio, fork ni filtro del harness.

| Caso mínimo | Esperado por identidad de declaración | Observado CLI |
| --- | --- | --- |
| Cuatro declaraciones sintéticas seleccionadas | Aceptar | Acepta |
| Duplicado de los mismos bytes firmados en otro formato de sobre, ambos órdenes | Aceptar en ambos | Acepta en ambos |
| Solo queda el sobre reformateado; los bytes firmados esperados siguen presentes | Aceptar | **Rechaza por selección** |
| Control: cambiar solo el digest protegido del sobre | Aceptar | Acepta; demuestra autenticación y evaluación de esa representación |
| Alterar bytes de `authorized:true` sin volver a firmar | Fallo de autenticación | Cosign rechaza; el original verifica |

El rechazo decisivo no es una ausencia, error de registro o fallo de firma. El
motor había autenticado y evaluado los cuatro tipos y rechazó la condición externa
de selección. Declaración y firmas permanecieron idénticas; cambió únicamente el
JSON exterior del sobre. Los originales, entradas reales a la política, hashes y
permutación están conservados. Falla la puerta 2; no se instala Kubernetes.
Los predicados son mínimos y sintéticos: no prueban los siete checks de resultados,
schemas completos ni ejecuciones F07/F08/F13 o del catálogo académico.

La matriz completa del informe EN mantiene los resultados requeridos para PASS/FAIL
contradictorios en ambos órdenes, E ausente con otro PASS, dos contenidos distintos
conformes, ausencia individual de cada tipo, hash/digest/autoridad incorrectos,
campos complementarios, anotaciones, E1/E2 y fallos de transporte/permisos.
Esos casos quedan **NOT_EXECUTED al fallar la puerta 2**. El control de cambio de
digest del sobre no se presenta como prueba E1/E2. Los errores de integración se
distinguen mediante regresiones del harness; no hubo inyección real de red.

El intento 01 falló antes de evaluar políticas por un marcador de formato clásico
omitido. Se corrigió siguiendo Cosign, sin relajar autenticación. Su comprobador de
limpieza esperaba otra capitalización del mensaje de ausencia; se conserva el
recibo fallido y se confirmó después la ausencia de ambos registros por ID.
El intento 02 ejecutó la base más código sin commit, hash
`4edf2b89994275dde0f2b174cc4c23d719d6e38cd12f9fb93e5df7cc70ca2c2f`;
no se atribuye a un commit posterior.
El harness final solo añade después la creación del directorio temporal para un
checkout limpio, hash `99aac08514e3e6c6b7e93ef4411729696bf0dc0cd1397ee31ed676fa6e007da6`.
La suite compartida final comprueba ese ajuste; no se repite el motor tras su NO_GO.

`doctor` falló inicialmente por PATH; pasó al usar las herramientas fijadas ya
existentes en `implementacion/.tools/bin`. El tester descargado se verificó contra
el checksum y la firma de su workflow exacto, conservando también el intento de
verificación con identidad incorrecta. No se compiló, no se descargaron DB, no se
ejecutaron scans ni se hizo limpieza global. El informe EN enlaza instrucciones
reproducibles, validación final y paquete local con checksum; claves, credenciales,
binarios y capas no se incluyen. Las políticas, productores, pins, workflows y
`golden-path-v1` permanecen intactos.
Se crearon dos registros secuenciales y ambos están ausentes; ningún clúster ni
volumen nuevo. Quedan aproximadamente 8,6 GiB libres en el disco de 32 GiB y más
de 1,69 millones de inodos. Las tres imágenes y tres volúmenes previos se conservan;
el tester temporal descargado en `/tmp` se retiró comprobando su hash.

Para una futura propuesta aprobada, `prepared` podría fijar las tres primeras
declaraciones; el hash de resultados solo existe **después** de los controles y
su emisión. Un cuarto hash sin configurar no demuestra F13. Hacen falta un
diagnóstico válido de preautorización, otras tres evidencias auténticas, inventarios
completos y estables antes/después, rechazo atribuible exclusivamente a resultados
y posterior control positivo de la misma imagen. Después se congelaría el vínculo
completo para `authorized`. No se emiten resultados antes de tiempo ni se exige
como prerrequisito la admisión que esos resultados habilitarán.

El código de policy-controller registra Pod/Deployment CREATE/UPDATE, con
excepciones para reducción de réplicas, borrado y estado. La instalación por defecto
resuelve tags: no demuestra rechazo de solicitudes con tag. Quedan sin ejecutar
RBAC del actor, políticas/webhooks efectivos, caché del controlador y vía alojada.
La CLI usa `NoCache`; un proceso nuevo por evaluación. ValidatingPolicy podría
complementar runtime, pero no recuperar bytes que el verificador no expone.

Se cierran **estos dos candidatos publicados** para el contrato de cuatro hashes.
La revisión concreta propuesta es elegir entre una identidad de **artefacto de
sobre firmado inmutable**, vinculada explícitamente a sus bytes de declaración y
que requiera nueva preparación al reempaquetar/volver a firmar, o esperar una API
oficial que exponga los bytes/hash autenticados antes de seleccionar. La primera
opción cambia disponibilidad y semántica de representación; no se adopta aquí.
Ambas deben conservar cuatro requisitos independientes, imagen/autoridad exactas,
contenido del mismo objeto y la matriz completa local/alojada.

El alcance A no cambia: otro FAIL posterior no revoca E=PASS. Cambiar E requiere
una preparación administrativa nueva; no hay relojes, ledger ni revocación continua.
**`feat/delivery-authorization-selection` sigue bloqueada.** Revisión humana pendiente;
el recordatorio del 30 de noviembre permanece intacto.
