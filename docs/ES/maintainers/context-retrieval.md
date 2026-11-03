# Piloto de recuperación de contexto — 2 de noviembre de 2026

**Decisión: evidencia insuficiente; conservar la navegación actual.** Se ejecutaron
18 sesiones independientes: 16 completas y dos timeouts anteriores al primer
comando o respuesta. Las respuestas completas cumplen la rúbrica en una revisión
asistida por **Codex**, pendiente de revisión humana. El mismo asistente preparó y puntuó la rúbrica;
la revisión no fue ciega. B no redujo de forma estable
la entrada ni el tiempo. Ninguna sesión C consultó el grafo opcional: la comprobación posterior del sandbox encontró además que el lanzador del venv
apuntaba a un Python no visible. **Las seis sesiones C quedan excluidas de la
comparación válida con grafo**, aunque cinco respondieron correctamente desde
el código. Se repararon el lanzador y el preflight después de medir, sin repetir
las sesiones ni sustituir observaciones.
No se acredita ahorro económico ni productividad y no se propone otra cadena
obligatoria de ensayos.

[Informe principal, cifras y reproducción](../../EN/maintainers/context-retrieval.md) ·
[Protocolo y rúbricas](../../../implementacion/tests/fixtures/context-retrieval/protocol.json) ·
[Ejecutor/analizador](../../../implementacion/tests/integration/context-retrieval.py) ·
[Pruebas sintéticas](../../../implementacion/tests/policies/test_context_retrieval.py) ·
[TODO](../../../implementacion/TODO.md)

Para quien entra al repositorio, las instrucciones y herramientas habituales
permanecen iguales. Se añade un ensayo explícito, sin servicio ni índice por
defecto y sin llamadas a modelos desde CI. `AGENTS.md`, pins globales, controles,
productores y demos no cambian. La investigación de admisión sigue
**INCONCLUSIVE**; la fusión de #68 no acredita adopción ni revisión humana.

## Protocolo ejecutado

La fuente común es `a6cda3203f0ab39ac5d37569d851ae35f9d4068c`: 464 archivos
versionados exportados desde Git y comprobados por SHA-256. Se excluyeron los
registros históricos, releases y evidencias de implementación; no se copiaron
cachés, dependencias ni archivos personales. Políticas, pruebas, documentación
y `.github` permanecieron dentro del alcance. Las nuevas rúbricas, respuestas,
herramientas, índices e informes quedaron fuera del corpus.

- A utiliza las instrucciones existentes y las herramientas disponibles. `rg`
  y `jq` ya estaban disponibles; no se forzaron lecturas completas ni búsquedas
  innecesarias para empeorar la referencia.
- B añade una guía breve: nombres/rutas primero, búsquedas acotadas, consultas
  selectivas de propietarios/callers/pruebas con jq, fragmentos pertinentes,
  comprobación de relaciones en código y alcance explícito de workflows,
  políticas y pruebas. Los datos generados se consultan solo cuando corresponde.
- C conserva B y añade únicamente acceso opcional a `graphify explain/path`.
  Las relaciones sugeridas no sustituyen la autoridad del código y sus pruebas.

Las tres preguntas examinan resultados, privilegios F11 y limpieza de
`delivery-v1`. Sus hechos imprescindibles, símbolos, relaciones, pruebas,
confusiones invalidantes y límites se congelaron directamente contra el código,
sin usar el grafo como verdad de referencia. Exactitud, cobertura y trazabilidad
puntúan 0–2 cada una; mencionar una ruta no basta. Las 16 respuestas completas
obtuvieron 2/2 en las tres dimensiones; los timeouts no tienen puntuación.

Configuración fija: **Codex 0.166.0, `gpt-6-astra`, razonamiento `high`**, autenticación
ChatGPT existente, rg 15.2.0, jq 1.7 y Python 3.14.2. No se cambiaron proveedor,
modelo, claves ni configuración personal. La identificación interna del modelo
servido no aparece independientemente en los eventos. Cada sesión fue nueva,
efímera, de lectura, sin web/delegación/hooks/plugins/apps, con acceso de comandos
restringido al corpus, grafo y rutas de ejecución. No se observaron lecturas de
respuestas ajenas; la auditoría de comandos no equivale a registrar cada syscall.

La prueba inicial, excluida, verificó la captura y que un archivo existente fuera
del corpus no devolvía contenido dentro del sandbox (ENOENT; no se afirma EACCES).
Reveló un problema de PATH del shell de inicio de Codespaces: las 18 mediciones
usaron `allow_login_shell=false`. El orden congelado fue ABC/BCA/CAB y después
CBA/ACB/BAC. Una sesión cada vez, 180 segundos, sin reintentos ni cargas pesadas
concurrentes. Q1-2-C y Q3-2-B agotaron el tiempo con solo los eventos de inicio;
la causa no está establecida ni se atribuye a Graphify.

## Interpretación y coste

La tabla EN conserva por pregunta/modo mediana y rango de entrada, número de
respuestas completas y tiempos **de todos los intentos**, incluidos los timeouts.
Las filas C son descriptivas de configuraciones inválidas; el analizador las
excluye. Quedan once respuestas completas A/B comparables.
Los totales conocidos de las 16 mediciones completas son 3.369.040 tokens de
entrada, 2.745.728 de entrada en caché, 25.447 de salida y 949 de razonamiento.
Los dos timeouts tienen consumo **null/NOT_AVAILABLE**, no cero. La prueba inicial
queda separada. La caché es un subconjunto de la entrada; no se suma. Tampoco se
suma razonamiento a salida. Una sesión nueva no garantiza caché vacía.

El analizador toma el agregado de `turn.completed.usage`, deduplica eventos
idénticos y rechaza terminales ambiguos; no suma snapshots acumulados. Tokens
separados de instrucciones/metadatos/resultados leídos: no expuestos, **null**;
están incluidos en los contadores de sesión. Consultas al grafo en C: cero.
Menores contadores en algunas preguntas no demuestran un beneficio del grafo.
No se convierten caracteres, presupuestos de Graphify o uso de suscripción en
facturación. El tamaño muestral y la latencia del proveedor limitan la conclusión.

Se verificó el wheel oficial `graphifyy==0.9.100` antes de ejecutarlo, con SHA-256
`64c5ed6f2dcc8c28b6a96c87023851c1644c16f55a87f45dbc9127119eb6e769`.
Release, tag, commit, paquete, dependencias resueltas y fuentes oficiales del
**2026-11-02** están enlazados en EN y conservados en los recibos. La procedencia
no demuestra una compilación reproducible del paquete desde el tag.

Se comprobaron en el paquete `GRAPHIFY_BACKEND=none`,
`GRAPHIFY_QUERY_LOG_DISABLE=1`, `--code-only`, `--no-cluster` y `--max-workers 2`.
No se instalaron extras, integraciones, skills ni hooks. No hubo LLM de extracción,
cloud, MCP, watcher, embeddings ni modelo local. Instalación: 8,64 s y entorno de
204 MiB; extracción: 9,11 s y 164.728 KiB RSS máximo; salida con cachés: 9,4 MiB.
Consulta independiente de coste: 0,50 s y 56.912 KiB. Actualización: 2,90 s y
71.852 KiB, además de 8,92 s para construir su referencia separada. El tiempo de
descarga del wheel no se capturó. Crear el venv costó otros 3,96 s; el tiempo de sesión incluye arranque del CLI,
latencia del modelo y comandos. La duración de consultas individuales no está
expuesta. La memoria de instalación es un máximo acumulado
de procesos hijos, no RSS aislado. Se conserva el intento fallido por ausencia de
`/usr/bin/time`, seguido de captura con Python.

Hay 2.704 nodos y 7.346 aristas, con referencias a 253 archivos. Se clasificaron
275 archivos de código, se omitieron 151 no-código y 30 quedaron sin clasificar;
no se afirma cobertura total. No se observaron nodos Rego; Makefile y Dockerfile
quedaron sin clasificar. Shell dinámico sigue incompleto. Una consulta de limpieza
solo mostró su definición y una relación de llamada; no toda la propiedad o
lógica de retirada. La actualización en una copia descartable detectó un archivo
cambiado, 274 iguales y el símbolo añadido. No cambió la fuente/índice del piloto.


## Corrección de validación de calidad — 3 de noviembre de 2026

El analizador admitía cualquier `quality` no nulo, incluso `{}` o una revisión
parcial. Ahora exige `accuracy`, `coverage` y `traceability` como enteros **0–2**,
sin booleanos, y una lista explícita `invalidating_confusions`. `[]` declara que
no se observó ninguna confusión invalidante de la pregunta; una lista no vacía
usa sus etiquetas del protocolo. Ausencia, formato incorrecto o etiquetas
desconocidas hacen incompleta/inválida la revisión. No se rellenan datos ausentes.

Se separan ejecución técnica, configuración, aislamiento y revisión completa.
`quality_satisfied` indica cumplimiento pleno: **2 en las tres dimensiones y
ninguna confusión invalidante declarada**. Una revisión incompleta deja este
resultado desconocido, salvo que un error invalidante explícito ya lo descarte.
`answer_acceptable` exige además ejecución técnica completa y configuración/
aislamiento válidos. No equivale a revisión humana ni aprobación de adopción.

`valid`/`n_valid` significan elegibilidad para comparar, no respuesta aceptable.
Una revisión completa desfavorable conserva tokens y tiempos en las estadísticas;
`n_acceptable` y `n_unfavorable` distinguen los resultados. Una comparación puede
estar completa y contener respuestas incorrectas. Revisiones inválidas/incompletas
impiden declararla completa. Cada intento conserva los motivos de revisión,
rechazo y exclusión; ni los timeouts ni C se rescatan por buenas puntuaciones.

El reanálisis offline conserva **todos los agregados previos y la elegibilidad**:
18 intentos, 16 completos técnicamente, 12 configuraciones válidas, 18 auditorías
de aislamiento válidas, 16 revisiones completas y 11 respuestas elegibles/
aceptables (A: 6, B: 5, C: 0). No hay respuestas elegibles desfavorables en los
registros históricos. Ambos timeouts tienen puntuaciones incompletas y las seis
configuraciones C siguen excluidas. La comparación permanece **INCOMPLETE**.
Las dieciséis revisiones ya tenían tres 2 y listas vacías explícitas: no se
inventó ni repitió ninguna revisión. Los 274 hashes originales y el paquete
histórico se verificaron sin cambios antes y después.

Solo se escribieron derivados en
`implementacion/evidence/raw/context-quality-reanalysis-20261103/`: `analysis.json`,
`comparison.json` y registros/hashes de validación. SHA-256 del análisis nuevo:
`d8081810eebfa6ce34d8fe66a75c5bd83fa07d4c94f1d443f2a898b97c58d9af`.
El comando EN usa `analyze --analysis-output` con un archivo nuevo y rechaza
sobrescribirlo; los registros, análisis y paquete históricos permanecen intactos.
Sin esa opción se conserva el comportamiento inicial del analizador.

Son 22 pruebas focalizadas sintéticas, incluidas revisiones vacías, parciales,
inválidas y completas favorables/desfavorables, errores invalidantes, estados
independientes y conservación de datos. Pasan doctor y la suite compartida, el
inventario de 530 rutas y sus 10 pruebas, enlaces locales y comprobación del diff.
No se ejecutaron modelos, instalaciones,
índices ni Kubernetes. Sigue habiendo **evidencia insuficiente para modificar la
navegación**, sin Graphify ni cambios en AGENTS. Las mediciones corregidas de C
siguen **NOT_EXECUTED**; comprobar el lanzador local no equivale a medir el modelo.

## Correcciones de robustez del ejecutor — 3 de noviembre de 2026

Se corrigen en la misma PR dos observaciones sobre
`21cbd04c292f3b9da8eb02cbeec092276d9558c1`. Son correcciones del ejecutor,
**no nuevas evidencias de rendimiento de navegación**. Se conserva la validación
anterior de las revisiones de calidad.

- **Interrupción después de crear el proceso:** `capture()` finaliza desde un
  `Popen()` satisfactorio, incluso durante stdin o el sondeo. Señala únicamente
  su grupo recién creado; mantiene el hijo directo sin recoger hasta enviar la
  señal para evitar reutilizar su PID, recoge su estado y comprueba la ausencia
  del grupo con una espera acotada. Un grupo ya ausente no evita recoger ni
  informar del hijo. Conserva stdout/stderr parciales y el recibo del proceso,
  separando recogida del hijo, ausencia del grupo y errores. La limpieza no
  demostrada queda `INCOMPLETE`; estado de salida/RSS no disponibles quedan null.
  Propaga la interrupción o excepción original tras finalizar; los errores
  secundarios no la sustituyen. `run()` conserva `result.json` con `INTERRUPTED`
  si el almacenamiento permite escribir, y no inicia otro intento tras Ctrl+C.
- **Eventos anidados malformados:** comprueba objetos, IDs/tipos como cadenas no
  vacías y texto de respuesta como cadena antes de consumirlos. Respeta campos
  opcionales; tipos de item desconocidos pero textuales quedan visibles para la
  auditoría de aislamiento. Conserva números de línea originales, incluidos
  duplicados malformados, y continúa con eventos válidos posteriores para retener
  diagnósticos y consumo observado. No modifica el JSONL original. Una salida
  normal con eventos malformados queda `INVALID_STREAM`; interrupción, timeout
  y error de ejecución conservan prioridad, con líneas malformadas y uso inválido
  independientes. Se escribe el resultado del intento y se mantiene la parada
  por autenticación/cuota, la deduplicación terminal y los tokens desconocidos.

Pasan 32 pruebas focalizadas sintéticas: wrapper aislado con hijo y nieto,
SIGINT durante sondeo y escritura stdin bloqueada, salida parcial, ambos recibos,
ausencia de otro intento y de workers propios; carrera de salida del hijo,
limpieza fallida sin ocultar la excepción, valores anidados inválidos y resultados
del coordinador. Solo el supervisor de prueba usa subreaping de Linux para recoger
nietos adoptados. El ejecutor informa de miembros residuales, incluso zombis,
como limpieza incompleta. Su alcance es el grupo creado, no un supervisor general;
no garantiza recibos sin almacenamiento escribible ni finalización tras SIGKILL.

El nuevo reanálisis offline queda en
`implementacion/evidence/raw/context-runner-robustness-20261103/`, con
`analysis.json`, `parser-replay.json`, `comparison.json`, código de reproducción
y logs. Los **19 streams originales** (18 intentos y smoke excluido) conservan
clasificación, consumo, respuestas y diagnósticos. El análisis es idéntico byte a
byte al anterior reanálisis de calidad, SHA-256
`d8081810eebfa6ce34d8fe66a75c5bd83fa07d4c94f1d443f2a898b97c58d9af`.
Se verifican los 274 archivos y miembros del paquete contra su manifiesto
histórico; paquete y hash originales permanecen intactos. Se conserva un fallo
inicial de verificación offline por correspondencia ambigua de sufijos y su
corrección mediante nombres exactos. Los recibos nuevos identifican sus propios
bytes; no se atribuyen las ejecuciones históricas al nuevo código.

Pasan 32 pruebas focalizadas, `doctor`, `make test`, inventario exacto, sus
10 pruebas, enlaces locales afectados y `git diff --check`. Doctor y suite usan
`PATH="$PWD/implementacion/.tools/bin:$PATH"`. Capacidad efectiva: 4 CPUs,
15 GiB RAM y aproximadamente 8,6 GiB libres en workspace, sobre la reserva de
3 GiB. Las regresiones de interrupción solo crean y retiran sus propios procesos
Python temporales.
No hubo sesiones de modelo, Graphify/índices, instalaciones ni Kubernetes.
La comparación sigue `INCOMPLETE`: 11 respuestas A/B elegibles/aceptables, dos
timeouts conservados y seis configuraciones C excluidas. Las revisiones completas
desfavorables siguen siendo observaciones; las incompletas no completan la
comparación. **Evidencia insuficiente para cambiar navegación; sin adopción de
Graphify ni cambios en AGENTS; C corregido con modelo sigue NOT_EXECUTED.**
Una prueba local del lanzador no es una medición con modelo. Asistencia de Codex;
revisión humana pendiente.

## Plazo de stdin y limpieza fatal — 3 de noviembre de 2026

Se corrigen en la misma PR las dos observaciones sobre
`2123f515ecd9affe97ed3cf3b6f0fe0fb9b2ad54`. `capture()` codifica el prompt como
bytes UTF-8 exactos en un archivo temporal gestionado por contexto, lo vacía al
archivo y rebobina antes de crear el hijo, y entrega ese descriptor como stdin.
Sin entrada mantiene DEVNULL. El padre no espera a que el hijo lea una tubería:
un hijo que no lee ya no bloquea el sondeo del plazo. Se conservan Unicode, bytes
y EOF; el archivo se cierra al terminar o ante excepción. La preparación precede
al plazo de ejecución; el tiempo transcurrido informado sigue incluyéndola.
Al timeout se pueden sumar 0,1 segundos de sondeo y hasta 2 segundos de espera
de limpieza, aparte de retrasos de planificación del sistema e I/O.

La limpieza no demostrada es fatal para **todos los callers de capture**, incluso
con salida cero del hijo: guarda el recibo veraz y lanza `CleanupIncomplete` con
`capture_result`. Una interrupción/excepción anterior mantiene prioridad y los
diagnósticos de limpieza quedan separados. El coordinador registra el intento
fallido no elegible antes de propagar; índice y preflight también se detienen.
Se mantiene el envío de señales antes de recoger al hijo directo, para evitar
señalar un identificador de grupo reutilizado.

Pasan 37 pruebas focalizadas sintéticas, incluyendo prompt de 2 MiB no leído con
timeout breve y sin intervención, entrega Unicode/EOF exacta, cierre del descriptor,
recibos de limpieza incompleta y parada de callers. Las simulaciones retiran
realmente el proceso propio antes de alterar el recibo; no dejan workers vivos
intencionadamente. Se mantienen las regresiones de interrupción, streams
malformados, carrera de salida y calidad desfavorable. Pasan doctor, suite
compartida, inventario/sus 10 pruebas, 10 enlaces locales afectados y diff checks.
Los nuevos registros y cualquier análisis derivado quedan separados del piloto
inmutable en `implementacion/evidence/raw/context-stdin-cleanup-20261103/`.

No hubo sesiones de modelo, instalación/índices de Graphify ni Kubernetes.
Estas correcciones no prueban rendimiento de navegación: **evidencia insuficiente
para cambiar navegación**, sin cambios en AGENTS ni adopción de Graphify; C
corregido sigue **NOT_EXECUTED**. Se conservan los límites anteriores de alcance
de limpieza, almacenamiento y SIGKILL. Revisión humana pendiente.

## Reproducción, conservación y revisión

La comprobación local posterior con los mismos permisos devolvió 127: el
symlink del Python del venv apuntaba fuera de las rutas visibles. Recrear solo
su intérprete con Python canónico y `--copies` permitió ejecutar la misma consulta.
No se afirma que esto causara la elección del modelo de no consultar el grafo.
Se conserva el fallo, los metadatos originales y la reparación; esta prueba local
no valida retrospectivamente C. El ejecutor final comprueba el acceso real al
grafo en el sandbox antes de llamar al modelo y bloquea si falla.

Los comandos canónicos EN usan `prepare → index → smoke → run → analyze`, una
salida nueva, wheel verificado y venv aislado. `--allow-model` es explícito.
La revisión de aislamiento de smoke debe completarse antes de `run`; las rúbricas
y trazas se revisan después. La validación ordinaria usa fixtures sintéticos y
nunca consume cuota ni construye un grafo. No se ejecutó Kubernetes ni integración
alojada: no son verificaciones pertinentes para esta herramienta de navegación.

Evidencia ignorada: `implementacion/evidence/raw/context-retrieval-20261102/` y
`implementacion/evidence/packages/context-retrieval-20261102.tar.gz`.
SHA-256: **b6c62a1ffd9896057c0fbd00b606ac8f6451f3f1504f86398665b3a4796932df**. Incluye originales, fallos, revisiones,
métricas, fuente/hashes, grafo público y recibos; excluye credenciales, binarios,
venv, caché del proveedor y directorios personales. Los hashes del código sin
commit realmente ejecutado permanecen separados de cambios posteriores del
analizador; no se atribuye el ensayo al futuro commit. Se requiere conservar el
paquete fuera del Codespace para custodia duradera; no se publicó externamente.

Workspace/Docker: de unos 8,7 a 8,6 GiB libres; temporal: de unos 109 a 108 GiB;
4 CPUs y 15 GiB reales de memoria. La reserva de 3 GiB se mantuvo. No había contenedores Docker;
las tres imágenes y tres volúmenes previos se conservaron. Se retiran solo
herramientas/índices/copias propios después de verificar el paquete. No hay
adopción que revertir: retirar archivos experimentales conserva el comportamiento
anterior; las observaciones históricas deben preservarse.

B queda como variante reproducible sin convertirse en instrucciones obligatorias.
Graphify no se incorpora a la imagen. TODO conserva la pareja propuesta con
`chore/github-actions-refresh`, la posterior de updater/intake y las dependencias
secuenciales de separación, consolidación, plantilla y Java. Serena/Repomix siguen
al final. Revisión humana y cualquier adopción posterior permanecen pendientes.
