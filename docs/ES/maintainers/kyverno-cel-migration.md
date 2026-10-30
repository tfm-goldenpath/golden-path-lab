# Compatibilidad CEL y selección de atestaciones

El [registro único de migración](../../EN/maintainers/kyverno-cel-migration.md)
contiene la matriz de equivalencia, versiones, fuentes, observaciones y pasos
pendientes. La rama parte de `e0fbe6490794b0da679777d465117a43bdb482ad`, después
de PR64. **La adopción CEL sigue bloqueada; la PR se reorienta a pruebas y documentación revisables por ese alcance.**

## Cierre de investigación y continuidad — 29 de octubre de 2026

La PR no activa una migración ni modifica productores, políticas o escenarios.
El hallazgo es dependencia del orden al seleccionar contenido autenticado en la
configuración probada; no es falsificación de firmas, ausencia de todo resultado
conforme ni una vulnerabilidad general demostrada de Kyverno. Se mantienen los
resultados originales y los NOT_EXECUTED. Una CI satisfactoria no aprueba la adopción.

Se inspeccionaron la issue [#18023](https://github.com/kyverno/kyverno/issues/18023)
y la implementación final de [#18049](https://github.com/kyverno/kyverno/pull/18049),
merge `edd8b239e393a611137a5d466d12cdc416331224`. La corrección está en main,
pero no en los tags oficiales 1.19.0, 1.19.1, 1.19.2 ni 1.19.2-rc.5 inspeccionados.
El archivo oficial del CLI, su miembro instalado, el checksum publicado y la
revisión compilada coinciden. No se ha identificado una publicación posterior
que contenga la corrección, ni se ha compilado o ejecutado un controlador propio.

La implementación final selecciona **una** declaración: elimina duplicados de
payload idéntico; prioriza tiempos verificados del bundle si todos los candidatos
los tienen; en su defecto usa fechas del contenido firmado si todos las aportan.
Si falta una fuente común, rechaza los candidatos múltiples. Un único candidato
puede carecer de fecha. Ante tiempos iguales elige por bytes del payload, incluso
si son contradictorios. No expone la colección ni incorpora por sí misma caducidad,
revocación, contexto de autorización o defensa frente a ocultar una declaración
más reciente. La asociación firma/bundle/resultado verificado se conserva; las
fechas declaradas por el emisor no equivalen a un reloj independiente. El registro
inglés detalla las rutas Rekor/TSA, fallbacks y casos no ejecutados.

La semántica actual de comprobar todas las declaraciones no es un estándar universal:
un FAIL histórico puede bloquear una recuperación legítima. “Algún PASS” permite
recuperar, pero también puede mantener permisos tras un FAIL posterior. Recomiendo
preparar **una autorización vigente, completa y explícita por contexto**, con
identidad actual protegida, sustitución autenticada, reglas de frescura y rechazo
de conflictos. Contexto incluye digest, predicado, autoridad/identidad, fuente,
revisión, constructor y versión esperada; PASS/checks son condiciones, no filtros
para ignorar un FAIL. El índice del registro no demuestra que no se ocultó una
autorización posterior. Esta es una recomendación pendiente, no un nuevo contrato.
La comparación y ejemplos de PASS/FAIL, fechas, versiones, duplicados y replay
están en la [decisión completa](../../EN/maintainers/kyverno-cel-migration.md#pending-product-decision-which-declarations-are-applicable).

El mismo reproducer incorpora `--selection-only`, sin otra colección de scripts:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
python3 -I -S implementacion/tests/integration/kyverno-cel-capabilities.py \
  --selection-only --admission \
  --output implementacion/evidence/environment/kyverno-cel/fresh-selection
```

Solo cambia el orden de referrers sobre **la misma referencia y bytes firmados**;
restaura el orden inicial y conserva controles positivos/negativos y caché deshabilitada.
`summary.json` separa funcionamiento del test, resultado observado, cumplimiento
del contrato y adopción. Reproducir el defecto produce
`COMPLETED / ORDER_DEPENDENCE_REPRODUCED / FAIL / BLOCKED`, salida 2.
El informe upstream está preparado en el registro inglés y **no se ha publicado**.

La ejecución de cierre conserva 15 observaciones: nueve CLI y seis peticiones
reales de admisión. CEL responde rechazo/aceptación/rechazo; la caracterización
CLI legacy rechaza los tres órdenes. El código ejecutado es `19c1094` más los dos
cambios registrados en probe/tests; su hash está en el registro inglés, separado
del commit documental posterior. Las 52 pruebas Python de políticas, Rego y
16 comprobaciones del motor activo pasaron. Se reutiliza la CI satisfactoria del
código previo sin atribuírsela a los cambios nuevos; la CI normal comprueba la PR.
El paquete compacto nuevo tiene 161.329 bytes, 138 entradas y SHA-256
`6111841999e99994ac7f3bff3f74723d0c5178624e03f5f84bf478692bc245d2`.
Se comprobaron hashes, retirada de recursos propios y directorios vacíos; los
paquetes anteriores y la DB permanecen intactos. No se repitió la entrega alojada.

Siguiente rama propuesta: **`design/attestation-selection-contract`**.
Revisión del mantenedor: **2 de noviembre de 2026**, o anuncio de 1.20 si ocurre
antes. Fuentes oficiales consultadas el 29 de octubre: [retirada de APIs](https://kyverno.io/docs/policy-types/overview/#deprecation-schedule-for-legacy-types)
y [soporte](https://kyverno.io/docs/installation/releases/#community-patch-support).
ClusterPolicy se retira en 1.20; el soporte comunitario de 1.19 termina con esa
publicación, estimada en noviembre, sin día garantizado. Salidas concretas:
validar una versión oficial con la capacidad necesaria; aprobar un contrato de
autorización vigente si mejora el producto; o evaluar una alternativa mantenida
antes del fin de soporte. No hay actualización automática ni retirada de políticas.

Migrar solo runtime a ValidatingPolicy podría adelantar trabajo comprobable, pero
mantendría las verificaciones de imagen legacy y añadiría inventario/RBAC/diagnósticos
mixtos. No resuelve la retirada de ClusterPolicy; se evalúa separadamente y no se
implementa aquí. La prioridad es resolver el contrato y la continuidad de soporte.

El propietario autoriza revisar la exclusividad de bundles en admisión. La
[decisión de arquitectura](../../EN/maintainers/kyverno-cel-migration.md#architecture-decision-canonical-bundles-official-admission-verification)
distingue el formato canónico de generación, verificación CI y conservación
(bundles modernos) de las representaciones que puede consumir el verificador
oficial. Consultar `.att` ya no bloquea por sí solo; tampoco demuestra soporte,
autenticación o aceptación. Es un cambio explícito del requisito anterior.
No se alteran los registros históricos ni se desarrolla un fork o verificador propio.

Siguen siendo obligatorios la firma independiente sign/v1, SBOM, procedencia y
resultados, autenticados y ligados al digest. Se mantienen las condiciones de
contenido, identidad exacta, certificados, confianza y transparencia alojada;
las excepciones locales no se trasladan a GitHub. Una firma clásica convencional
`.sig` no equivale a una atestación DSSE sign/v1 almacenada mediante `.att`.

La prueba ampliada compara formatos y atestaciones duplicadas en distinto orden,
con el motor oficial y firmas reales. La ruta legacy comprueba las condiciones
de todas las atestaciones autenticadas del tipo requerido. No se autoriza sustituir
esa semántica por seleccionar la última del registro. Los inventarios de bundles
por sí solos no demuestran ausencia para F07/F08/F13 si se admiten otras rutas.
Los errores de registro, permisos o confianza deben conservarse como errores de
integración, aunque el webhook muestre el mismo mensaje genérico de rechazo.

Se mantienen los pins: Kyverno CLI/controladores 1.19.2, chart 3.9.2 y Cosign CLI
3.1.4. El controlador incorpora la biblioteca Cosign 3.1.2, sigstore 1.10.9,
sigstore-go 1.3.0 y Rekor 1.5.3; actualizar el CLI no actualiza esas bibliotecas.

**Bloqueo reproducido: selección de contenido autenticado.** En Kyverno oficial
1.19.2, dos atestaciones de resultados auténticas, una conforme y otra no conforme,
producen rechazo o aceptación CEL según el orden del índice. Se ha observado
con CLI y admisión real mediante el actor restringido. La política legacy aislada
rechaza ambos órdenes y acepta los controles positivos. No se demuestra una firma
falsificada ni una imagen sin ningún resultado conforme: se demuestra una
relajación de la comprobación de todas las atestaciones autenticadas.

`revised-03` conserva 58 observaciones, incluidas 27 peticiones reales de admisión;
dos incumplen lo esperado (CLI y webhook aceptan el orden inverso). Los errores
HTTP 401/403/503 y desconexión bloquean como errores de integración, no como
detección correcta de F07/F08/F13. `revised-04` añade los positivos legacy:
34 observaciones CLI, con la misma divergencia. El registro inglés contiene la
matriz completa, hashes, versiones, diagnósticos y reproducción.

La recomendación es **no adoptar CEL con este motor**. La API inspeccionada solo
expone una carga autenticada por tipo; no permite comprobar la colección completa.
Una versión oficial deberá exponer esa colección o una comprobación equivalente.
La existencia del issue upstream cerrado #18023 no demuestra que 1.19.2 lo resuelva.
Se conservan como NOT_EXECUTED el clásico con transparencia válida, las pruebas
alojadas y la matriz completa de contratos, UPDATE, anotaciones y caché. No se
presentan las pruebas sintéticas como una entrega real o aceptación humana.

El renderer, los adaptadores, clasificadores y lectores históricos conservan su
comportamiento. ClusterPolicy sigue siendo la ruta activa: no se presenta una
migración parcial como completada ni se relaja la confianza. No se modifican
oráculos, escenarios, Actions ni el dashboard.

Con las herramientas fijadas, sin otro laboratorio activo y un directorio de
salida nuevo:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export GP_SOURCE_REPOSITORY=https://github.com/tfm-goldenpath/golden-path-lab
make -C implementacion setup-validation
make -C implementacion doctor
python3 -I -S implementacion/tests/integration/kyverno-cel-capabilities.py \
  --admission --output implementacion/evidence/environment/kyverno-cel/fresh-probe
```

El código **2** identifica ahora una expectativa de selección de contenido incumplida.
Consultar el formato clásico ya no determina ese código. El código 0 solo cubre
los casos ejecutados, no autoriza la migración ni acredita compatibilidad alojada. Un error del probe
o de infraestructura no cuenta como detección. Los predicados son sintéticos,
con firmas reales y registro local: no autorizan una entrega. La opción
`--admission` crea y retira un único kind; requiere al menos 8 GiB libres para
conservar la reserva de 3 GiB y el margen existente. No usa DB de Trivy.

No se han validado `deliver`, `demo`, `vulnerabilities` ni la vía B con una
migración CEL. Tampoco se afirma L01/L05, catálogo completo o aceptación humana.
Una futura validación alojada necesita autorización concreta y el SHA/ref exacto;
la ejecución de PR64 no sirve como evidencia CEL.

La suite compartida `make -C implementacion test` pasó, incluidas 51 pruebas
Python stdlib-only de políticas; no sustituye las integraciones CEL pendientes.
El paquete nuevo tiene 383.819 bytes y 606 entradas, con SHA-256
`88455c12d27cf65c2e768d684a5258e11dfef7b17b579d3db375bc5c77e44e3d`.
Sus archivos se compararon con los originales; el paquete anterior permanece
intacto. Se mantuvieron 4 cores / 16 GB / 32 GB, con 7,8 GiB libres observados
durante la admisión y 9,1 GiB tras limpieza. Se comprobó la ausencia del kind y
registro propios; no quedan directorios privados del probe. La DB y los tres
volúmenes previos se conservaron. Actualmente no hay cambio de producción que
revertir: el renderer activo sigue intacto.

Para adoptar la migración cuando se desbloquee, retira los recursos propios de
la preparación anterior mediante su coordinador, preserva su paquete y prepara
un laboratorio nuevo. Consulta `validatingpolicies.policies.kyverno.io` e
`imagevalidatingpolicies.policies.kyverno.io`, conserva estado/diagnósticos y
comprueba la ausencia de ClusterPolicy activas del Golden Path. Volver a una
revisión anterior exige otro entorno nuevo, sin mezclar preparaciones selladas.
No se automatiza una migración en caliente. La actualización general de Actions
queda como incremento separado.
