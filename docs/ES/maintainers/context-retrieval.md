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
