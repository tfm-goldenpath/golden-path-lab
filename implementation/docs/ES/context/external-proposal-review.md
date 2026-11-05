# Revisión de la propuesta externa y reutilización

[Documentación en español](../README.md)

**Documento contextual en español.** Conserva la revisión del antecedente externo; no es una guía operativa ni un resultado de validación del repositorio actual. Para ejecutar el laboratorio, utiliza la [guía principal en inglés](../../EN/cases/L01-F13/runbook.md) o su [apoyo en español](../cases/L01-F13/runbook.md).

La revisión estática analiza la propuesta de implementación utilizada como antecedente técnico. El análisis se limita a su contenido; no atribuye resultados de ejecución a la propuesta.

## Valoración

La propuesta sirve como **referencia de organización y ejemplos iniciales**, pero no como implementación lista para ejecutar. Parte de decisiones anteriores y contiene marcadores de posición, integraciones incompletas y un conductor de evaluación con operaciones remotas ajenas al procedimiento de evaluación. La base nueva reutiliza ideas de diseño; no copia ni activa su código ejecutable.

Este contraste se conserva como antecedente de la preparación del prototipo. Las decisiones, la memoria y el catálogo de veinte escenarios pertenecen al [repositorio de la memoria](https://github.com/tfm-goldenpath/golden-path). No se realizaron pruebas funcionales de la propuesta externa para este contraste: las conclusiones siguientes se basan en su contenido y no sustituyen los registros de ejecución del prototipo.

## Elementos útiles y adaptación necesaria

| Elemento de origen | Aportación aprovechable | Tratamiento en la nueva base |
|---|---|---|
| `README.md` y separación de componentes | Dos vías local/alojada, servicio sintético y evidencias relacionadas con el flujo. | Conservar el planteamiento; aplicar el orden incremental acordado y el servicio Node obligatorio. |
| `versions.env` | Inventario central de herramientas. | Registrar versiones efectivas por incremento. El original contiene `TODO`; no se considera fijado. |
| `.devcontainer/devcontainer.json` | Entorno repetible y capacidad de contenedores en Codespaces. | Usar un devcontainer mínimo con Node, Docker, kind y kubectl; incorporar las demás herramientas por incrementos. |
| `policy/chart_test.rego` | Entrada válida y modificaciones puntuales mediante `json.patch`, con aserciones sobre una regla concreta. | Reutilizar el patrón de prueba positiva/negativa con las reglas del corpus vigente. El archivo no demuestra por sí mismo que se siguiera TDD. |
| `policy/workflow.rego` y `policy/chart.rego` | Ejemplos de controles sobre referencias de Actions, privilegios y digests de manifiestos. | Reescribir/adaptar con ámbitos, formatos y pruebas explícitos; incorporar solo los comportamientos necesarios. |
| `.pre-commit-config.yaml` | Adelantar a local comprobaciones que se repiten en CI. | Añadir hooks después de tener comandos y reglas probados. No instalar el archivo original. |
| `.github/workflows/golden-path.yml` | Workflow reutilizable, construcción y generación de evidencias. | Preparar de nuevo la integración por incrementos, usando Trivy y manteniendo la identidad del artefacto en todas las fases. |
| `scripts/kind-up.sh` y `scripts/zot-up.sh` | Separación entre clúster local y registro. | Reutilizar el objetivo; comprobar versiones, alcance de recursos y conectividad antes de crear scripts propios. |
| `extras/OPTIONAL_observability.md` | Correlación mediante commit, ejecución y digest; resumen legible del motivo de rechazo. | Incorporar esos identificadores en las evidencias. Grafana, trazas y estimaciones horarias del ejemplo no pasan a ser requisitos ni resultados. |

## Problemas que impiden usarla directamente

### 1. Evaluación con cambios remotos automáticos y atribución insuficiente

`scripts/run-faults.sh` crea ramas y commits, hace `git push`, crea PR y contiene `gh pr merge --squash --admin`. La fusión administrativa de cambios no forma parte del procedimiento de evaluación y no se incorpora al conductor del laboratorio.

La alteración específica de cada fallo sigue pendiente: el script escribe un marcador en lugar de implementar la inyección. Clasifica resultados buscando textos genéricos, selecciona la ejecución más reciente de `main` sin vinculación suficiente con el cambio y considera cualquier error de `kubectl apply` como detección. Esas operaciones no bastan para atribuir un rechazo a la regla esperada y pueden confundir fallos externos con eficacia del control.

**Acción:** implementar más adelante un conductor ajustado al catálogo, con preparación real del caso, correlación por ejecución/artefacto, causa de rechazo y clasificación explícita. Ninguna evaluación necesita importar la fusión administrativa automática del ejemplo.

### 2. Versiones y dependencias todavía no resueltas

`versions.env` tiene versiones `TODO`. `.devcontainer/setup.sh` sustituye pendientes por `latest` en parte de las instalaciones y emplea instaladores descargados; las referencias y verificaciones no constituyen un conjunto fijado. Los Dockerfiles contienen digests de ceros, y junto al Dockerfile Node no aparecen los archivos de aplicación que este necesita copiar.

**Acción:** elegir versiones al implementar cada incremento, verificar origen/integridad y registrar las efectivas. No tratar marcadores como valores ejecutables ni declarar reproducibilidad completa por disponer de una lista de herramientas.

### 3. El objeto analizado y el publicado no quedan demostrados como idénticos

El workflow construye y carga una imagen para el análisis y luego realiza otra construcción para publicarla. La caché puede ahorrar trabajo, pero no acredita por sí sola que ambas salidas sean el mismo objeto. También referencia rutas/bundles de ejemplo que deben adaptarse, como `yourorg` y un bundle de políticas no configurado.

**Acción:** definir un recorrido donde SBOM, análisis, firma, procedencia y autorización se vinculen al objeto entregado, comprobando digests. Verificar además la relación entre índice OCI, manifiesto ejecutable y evidencias de la única plataforma obligatoria.

### 4. Las políticas de admisión no completan el modelo de confianza acordado

`kyverno/verify-images.yaml` contiene identidades de ejemplo y comodines, una comprobación de procedencia basada en `buildType` no vacío y un filtro de imágenes limitado a `ghcr.io/yourorg/*`. Ese filtro no demuestra el rechazo de cualquier imagen externa al patrón: el ejemplo del README sobre `nginx:latest` requiere una regla que cubra y rechace también el origen no autorizado. Falta la atestación de resultados adoptada después.

**Acción:** configurar identidades y atributos explícitos, rechazo de orígenes no autorizados y comprobaciones de todas las evidencias obligatorias. Verificar ámbito del namespace, operaciones y cargas pertinentes. La sintaxis/API concreta se elegirá según la versión de Kyverno validada; esta revisión no afirma que todo uso de `ClusterPolicy` sea inválido.

### 5. Riesgo de mezclar reglas para entradas distintas

Los ejemplos Rego comparten `package main` y los hooks cargan todo `policy/`. La regla de Dockerfile que rechaza ausencia de `USER` no se limita explícitamente a ese formato: al evaluar una entrada de workflow o manifiesto sin instrucciones Dockerfile puede producir un rechazo ajeno al control buscado. La presencia de un `USER` en cualquier etapa tampoco demuestra el usuario efectivo de la etapa final de una construcción multietapa.

Las reglas de manifiestos toman como referencia `spec.template.spec`; es necesario comprobar los otros recursos que entren en el ámbito, incluidos Pods, en lugar de presumir cobertura por semejanza. Las reglas de workflows también requieren concretar formas de llamada y permisos que pretenden cubrir.

**Acción:** separar carga/ámbito de políticas según formato y escribir pruebas que demuestren aceptación de entradas válidas, rechazo específico y ausencia de interferencias entre familias.

### 6. Controles y corpus de una versión anterior

`faults/fault-corpus.yaml` contiene 30 entradas C1–C6; entre ellas aparecen Java, excepciones de vulnerabilidad y un caso moderado descrito como no detectado. La base vigente tiene 20 escenarios F01–F14/L01–L06 y distingue aceptación legítima de un fallo no detectado. El catálogo antiguo no debe reemplazar al actual.

El workflow usa Syft + Grype; `waivers/` incorpora excepciones; `mutation/` añade umbrales de mutación obligatorios y Java. Todo ello contradice o amplía las decisiones actuales: Trivy, bloqueo de altas/críticas sin excepciones, Java opcional y ausencia de mutación obligatoria.

**Acción:** conservar esos elementos como antecedentes/alternativas y emplear el catálogo vigente. Los paquetes/CVE se elegirán por viabilidad comprobada, sin trasladar identificadores ilustrativos a la campaña.

### 7. Informes que infieren más de lo que sus datos acreditan

`scripts/results_to_sankey.py` transforma automáticamente «no detectado» en «alcanzó la carga». La ausencia de una detección registrada no acredita despliegue o ejecución de una carga. Además, presupone identificadores del corpus antiguo. `.devcontainer/doctor.sh` aporta diagnóstico de herramientas, pero no sustituye una prueba del recorrido completo.

**Acción:** conservar los datos observados y distinguir aceptación de API, creación de Pod y estado de ejecución, así como errores e indeterminados. Crear figuras a partir de esa clasificación validada, sin deducir resultados que no se hayan medido.

### 8. Automatización local con efectos que deben acotarse

`scripts/zot-up.sh` elimina un contenedor de nombre fijo antes de recrearlo y usa una imagen mutable; los scripts del entorno crean recursos e instalan componentes sin resolver todavía todos los valores de la campaña. No se han ejecutado. Los hooks fuerzan modificar simultáneamente el archivo de prueba, una condición que no prueba el orden TDD y puede exigir ediciones innecesarias.

**Acción:** desarrollar automatizaciones mínimas solo cuando su recurso objetivo, versión y comprobación estén definidos. Registrar el ciclo TDD real y usar los hooks para comprobaciones útiles y repetibles.

## Decisiones de reutilización

La base adopta el orden incremental, las dos vías de entrega, las pruebas con variación controlada y la correlación de evidencias. El entorno inicial utiliza versiones fijadas en `versions.env`, un devcontainer propio y una prueba operativa independiente del corpus. Las políticas, los workflows y el conductor de evaluación se desarrollan por incrementos a partir de las decisiones vigentes.

Las afirmaciones regulatorias y de estándares del README externo no se trasladan como cumplimiento acreditado. La memoria vigente mantiene las fuentes y los límites de esa correspondencia, que deberán revisarse al consolidar el texto final.

## Inventario de archivos consultados

Las sumas SHA-256 siguientes identifican el material de esta revisión estática; no certifican su seguridad ni un resultado de ejecución. Identifican los archivos de propuesta utilizados como referencia.

| Archivo relativo a la propuesta externa | SHA-256 |
|---|---|
| `.devcontainer/devcontainer.json` | `327de7c262a0d515febb38ea44c1a967260ee0fed6902e4bb84198b0c43052db` |
| `.devcontainer/doctor.sh` | `d0600539b57787bf811d6d0b399b94feca59171a88b07ecefd27888a7804e9cc` |
| `.devcontainer/setup.sh` | `33025e5acb56a3b71b13e6b6252cf95f112c7028c9bc15ce4ffa57e527349c98` |
| `.github/workflows/golden-path.yml` | `1bcb9cfa3b85ba93fbb89e2d62b986d78b5d185117ca1467d8053d48fcfe7680` |
| `.pre-commit-config.yaml` | `26d5291b0553f97bf3691db9f8505ab21747f02858f3f7db7952bc4ed109d801` |
| `extras/OPTIONAL_observability.md` | `bd9a8585fc3642d7f5016014ace528f92a8dae8d05a6f375fa9769d6b3550542` |
| `faults/fault-corpus.yaml` | `0606453065b51d2810438b639bc8092859117a4328e5f6353ca39e0541f91e4c` |
| `kyverno/verify-images.yaml` | `b9a4499be002df51c5964b178e8a590306475e30222d3428b46b4f078380a0f5` |
| `mutation/pitest-pom-snippet.xml` | `2624f32724a0ea83a64715a424d095ec7e359405b3e60269e848689877c5dc6c` |
| `mutation/stryker.config.json` | `741ca85f94e2e49029f1995f2ae442f592b0e14364bab41fc3b7fff4639135da` |
| `policy/chart.rego` | `8d5dcdcb107195350c2e8ff3ba2447840d6820a6dbe95d0ff561f82bf0744d41` |
| `policy/chart_test.rego` | `0f81bf10b621918945f063b9affb5dfdacadd9a9d33809c79c4ac03867d6573b` |
| `policy/dockerfile.rego` | `33ad2ea08b8fe3843fb706b1b5555f79bc7077f6428aabb570e40cb2a3af8fc6` |
| `policy/workflow.rego` | `bcb6c4dd692b78c4a6ff53b6b57dd70fec7561ac4fd98d968a0831b65ddd7a5f` |
| `README.md` | `891f055d019cbc70701a37f4f9a01cc6442c2a973fbfbc7159fa63779dff7036` |
| `scripts/kind-up.sh` | `f7e595482298b8c7face8ddfcf1ea26ada9d1e604087272f4bd71f1b9d3c4900` |
| `scripts/results_to_sankey.py` | `61ee9e90eb8d18e7fb3b74097045fd82f811bca59fdc62993705df6f1f8111c5` |
| `scripts/run-faults.sh` | `9382c5c86574298bf67c9e50b368058ee8342a6ed700fa66b038b27bb98082e2` |
| `scripts/waivers-to-grype.sh` | `1bebc8efcf9ca29e425f760b73d2ec66c3ef0c960734ab98a73003c864679283` |
| `scripts/zot-up.sh` | `4664bd369bdb3bc65f112d554c3dfa07d01f7b54f72480125f83dba38b76a9c5` |
| `services/claims-java/Dockerfile` | `5ec47234d7cbd2e84fc4bf0e9c22a2e812f791c5038ccceab0a67a1b10bb400d` |
| `services/quotes-node/Dockerfile` | `3d58fa34237ff3b6dc26e4145bbbe98522577c38ac24a4109b146db3d02039fa` |
| `versions.env` | `d20b17ad8b111b90e711bc0f497f2bd568b64006c6c0d63585e9fbeb463cb5e7` |
| `waivers/waivers.yaml` | `ca32b12be07e7ecd65754dfad021fabf9e718af9242bd8c48e89d34c8c75599d` |

Total: 24 archivos de propuesta inventariados.
