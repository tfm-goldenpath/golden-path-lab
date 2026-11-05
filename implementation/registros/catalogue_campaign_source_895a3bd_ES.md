# Validación del catálogo sobre la fuente de campaña — intento bloqueado

[English](catalogue_campaign_source_895a3bd_EN.md) · [Índice de identidades/hashes](catalogue-campaign-source-895a3bd.json) · [Preparación](../docs/ES/evaluation-readiness.md)

El **5 de octubre de 2026**, la única ejecución autorizada **37342413975**, intento
1, falló en el prerrequisito de pruebas compartidas de ambas suites. **0/20
escenarios del catálogo ejecutados; los veinte siguen NOT_EXECUTED en este
intento.** Es un fallo de compatibilidad entre implementación y entorno, no un
rechazo de seguridad atribuible. No se repitió la ejecución ni se ensayó código
corregido.

**Publicación posterior:** [descargar ZIP con definición, análisis y evidencias](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-catalogue-37342413975-fix-b0d330e.zip)
y su [archivo SHA-256](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-catalogue-37342413975-fix-b0d330e.zip.sha256).
El [índice de publicación](lane-a-catalogue-publication-20261005.json) registra una
descarga nueva y comparación exacta de bytes. El ZIP separa el experimento fallido
del arreglo local confirmado como `b0d330e4aab84db752ddc87c67fa70f4982f600d`.
Las menciones inferiores a ausencia de commit/publicación son históricas.

## Identidad y alcance

| Elemento | Identidad registrada |
|---|---|
| Controles y ejecutor experimentales | `895a3bde79089b7544c1dad76a6cd8f48eede0a8` |
| Etiqueta GitHub, resuelta antes y después | `evidence-campaign-895a3bd-20261004`, referencia directa a ese SHA |
| Rama documental | `test/catalogue-campaign-source` |
| Main limpio y actualizado de partida | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Main descargado y registrado por ambos jobs | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Workflow / evento | `.github/workflows/lane-a-validation.yml` / `workflow_dispatch` |
| Ejecución | [37342413975](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975), intento 1, creada `2026-10-05T16:38:42Z`, actor `Xylons` |
| Demo | [job 111872525387](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975/job/111872525387), `failure` |
| Vulnerabilidades | [job 111872524933](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37342413975/job/111872524933), `failure` |

El `head_sha` y los dos `source.json` originales coinciden con el SHA experimental,
con árboles de trabajo limpios. El commit documental posterior no es la fuente
ensayada. Antes del lanzamiento se revisaron workflow, coordinador, ejecutor de
vulnerabilidades y oráculos operativos. No se cambiaron ejecutor, controles,
versiones, fixtures ni políticas para aquel lanzamiento. Los scripts de producción, pruebas, políticas
y configuración fijada no difieren entre la fuente experimental y la base de rama.

El comando ejecutado fue:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref evidence-campaign-895a3bd-20261004
```

GitHub CLI acepta rama o etiqueta mediante `--ref` ([manual oficial](https://cli.github.com/manual/gh_workflow_run)).
La primera solicitud, a las `16:37:57Z`, recibió HTTP 403 del token de integración
de Codespaces y no creó ningún run. El mismo comando autorizado utilizó después
la autenticación de usuario ya guardada, sin la sustitución del token de entorno.
Se contrastaron URL devuelta, hora, actor, ref y SHA con las listas anteriores y
posteriores: exactamente un run nuevo, `37342413975`. Se conserva la solicitud
rechazada; no fue un reintento de una observación experimental.

Este workflow aloja la **vía A** en Actions: confianza y registro locales, sin
cobertura de negativos OIDC/GHCR. No se lanzó `paired-rg.yml`. La campaña de diez
pares y la declaración de aceptación del 4 de octubre permanecen intactas.

## Fallo observado y propuesta acotada de corrección

Ambas suites conservan el mismo resultado:

| Observación | Demo | Vulnerabilidades |
|---|---|---|
| Lanzador, versiones efectivas, doctor | PASS | PASS |
| Etapas registradas | 17 PASS; shared-tests FAIL | 17 PASS; shared-tests FAIL |
| Pruebas compartidas de entorno | 6/6 PASS | 6/6 PASS |
| Pruebas de servicio/unidad | 928/930 PASS; 2 wrappers fallidos | 928/930 PASS; 2 wrappers fallidos |
| Salida original / conservación | 2 / 0 | 2 / 0 |
| Run de escenarios / ejecución | `null` / `NOT_EXECUTED` | `null` / `NOT_EXECUTED` |
| Base de datos | `NOT_CREATED`, snapshots vacíos | `NOT_CREATED`, snapshots vacíos |

`shared-tests.log` identifica `paired-campaign.test.mjs` y
`paired-measurements.test.mjs`, ambos con fixtures expresamente sintéticas. Sus
subprocesos Python registran, respectivamente, 37 pruebas con 12 fallos/6 errores
y 51 pruebas con un error. La excepción común es:

```text
TypeError: TarFile.extractall() got an unexpected keyword argument 'filter'
```

La llamada está en `restore_database()` de [paired-rg.py](../scripts/paired-rg.py),
línea 63 de la fuente experimental: `t.extractall(destination,filter='data')`.
Ambos inventarios registran `python3.11 3.11.2-6+deb12u8`. La documentación oficial
sitúa la incorporación del [argumento `filter`](https://docs.python.org/3.11/library/tarfile.html#tarfile.TarFile.extractall)
en 3.11.4; la excepción observada demuestra que la instalación carece de él.
[doctor](../scripts/check-environment.sh) comprueba la presencia de Python, pero
no esta capacidad de API. Su PASS no establecía esa compatibilidad.

El [Makefile](../Makefile) se detiene en `test-unit`. No alcanza las pruebas de
políticas posteriores, `test-bundles` offline ni `test-workflows` estático.
Ninguna suite llega a smoke, la prueba BuildKit, la exportación de fuentes L05,
el inicio de escenarios, análisis de imágenes, admisión, recuperación o auditoría
de resultados. Los nombres de escenarios y mensajes sintéticos de autorización
en pruebas unitarias no prueban ejecución del catálogo ni declaraciones humanas.
No existen `workflows/result.json`, `run.json`, `coverage.json` ni paquetes de
escenarios en los originales.

**Propuesta de seguimiento en la revisión inicial:** hacer compatible `restore_database()`
con el entorno fijado copiando únicamente sus cuatro miembros regulares ya
permitidos mediante `extractfile()` a un destino nuevo, propio y sin enlaces,
con creación exclusiva y conservando todos los hashes e identidades existentes.
Rechazar enlaces, miembros duplicados o adicionales y destinos inseguros; no
recurrir a extracción sin restricciones. Verificar las 37/51 regresiones existentes
y casos enfocados de destino inseguro/miembro duplicado dentro del devcontainer
exacto, y después la suite compartida completa. Añadir una regresión de capacidad
del entorno para que un Python más reciente del host no oculte la incompatibilidad.
Cualquier cambio y validación real posteriores tendrán otra fuente y necesitarán
su propia autorización; no podrán atribuirse a este run.

El usuario solicitó después la corrección. Su implementación y comprobaciones
locales se registran [por separado](lane_a_python_compatibility_ES.md); no se lanzó
otro workflow. Este run fallido y sus evidencias originales permanecen intactos.

El diagnóstico no invalida las observaciones temporales conservadas: aquel
workflow usa Python del runner Ubuntu, mientras este ejecuta dentro del
devcontainer fijado. Sí identifica una carencia de compatibilidad en la fuente
común. Los checks favorables históricos se reutilizan como registro; no se han
repetido ni reinterpretado como éxito de este intento.

## Matriz de veinte escenarios

**D** designa el job demo anterior; **V**, el de vulnerabilidades. Todas las filas
corresponden a `37342413975`, intento 1, controles/ejecutor `895a3bd` (SHA completo
arriba). `D/V: fallo previo` remite concretamente a `result.json`, `stages.json`,
`shared-tests.log` originales de esa suite y a la ausencia de salidas de escenarios.
Las entradas son las **previstas, no alteraciones aplicadas**. No proceden
asociaciones imagen/resultados firmados porque no se produjo ninguna imagen ni
resultado de escenario. No se ejercitó recuperación legítima.

| ID | Entrada / alteración prevista | Resultado esperado | Control / fase prevista | Resultado observado y evidencia concreta | Barreras adicionales | Estado técnico / límite |
|---|---|---|---|---|---|---|
| F01 | Workflow inerte: `pull_request_target` y checkout del head externo | Solo DENY `PULL_REQUEST_TARGET`; contraparte legítima aceptada | Conftest estático previo a merge | D y V: fallo previo; falta `workflows/result.json` | Evaluación estática no alcanzada; el fixture nunca se ejecuta | NOT_EXECUTED; las unitarias no sustituyen el ensayo estático |
| F02 | Workflow inerte: sustituir SHA de checkout por etiqueta mutable | Solo DENY `ACTION_SHA`; contraparte legítima aceptada | Conftest estático previo a merge | D y V: fallo previo; falta `workflows/result.json` | Evaluación estática no alcanzada; sin ataque a etiqueta remota | NOT_EXECUTED; entrada solo estática |
| F03 | `minimist@1.2.5`; reparación conocida `1.2.8` | Bloquear CVE-2021-44906 CRITICAL; reparación elimina objetivo y pasa umbral/HTTP | SBOM/Trivy/Conftest reales tras build; entrega corregida | V: fallo previo; sin imagen, escaneo ni `F03-completed.json` | Comparación, autorización/admisión/HTTP no alcanzados | NOT_EXECUTED; sin observación de hallazgos ni deriva DB |
| F04 | `ip@2.0.1` | Bloquear CVE-2024-29415 HIGH con oráculo sin arreglo ligado al snapshot | SBOM/Trivy/Conftest reales tras build | V: fallo previo; sin imagen, escaneo ni `F04-completed.json` | Autorizar/desplegar negativo está prohibido por diseño; ensayo no alcanzado | NOT_EXECUTED; no afirma ausencia universal de arreglo |
| F05 | Retirar solo atestación SBOM del registro propio | Rechazo por ausencia y recuperación exacta | CI fresco; CREATE dirigido de admisión SBOM | D: fallo previo; falta `F05-completed.json` | Autenticación, admisión y recuperación legítima no alcanzadas | NOT_EXECUTED; negativo B sigue no soportado |
| F06 | SBOM donante auténtico sin modificar para otro digest | Rechazar sujeto ajeno; restaurar original | Sujeto en CI fresco; admisión SBOM dirigida | D: fallo previo; falta `F06-completed.json` | Autenticación donante, checks destino y recuperación no alcanzados | NOT_EXECUTED; sin inferir verificadores posteriores |
| F07 | Retirar solo predicado de firma independiente | Rechazar ausencia pese a otras evidencias; aceptar restauración | CI fresco; admisión de firma | D: fallo previo; faltan `F07-completed.json` y `F07-CI-completed.json` | Ambas barreras y control positivo del mismo digest no alcanzados | NOT_EXECUTED; sin prueba de mutación GHCR |
| F08 | Alterar solo valor de firma del bundle de imagen | Rechazo criptográfico atribuible y restauración original | Cosign fresco en CI; admisión de firma dirigida | D: fallo previo; falta `F08-completed.json` | Comparación criptográfica y recuperación no alcanzadas | NOT_EXECUTED; error previo no detecta firma |
| F09 | Retirar solo atestación de procedencia | Rechazar ausencia y recuperar exactamente | CI fresco; admisión de procedencia dirigida | D: fallo previo; falta `F09-completed.json` | Consulta completa, autenticación no objetivo y recuperación no alcanzadas | NOT_EXECUTED; error de consulta no prueba ausencia |
| F10 | Procedencia local auténtica con repositorio no autorizado | Rechazo de origen; aceptar entrega original restaurada | Contenido autenticado en CI; admisión de procedencia | D: fallo previo; falta `F10-completed.json` | Autenticación del fixture, admisión y recuperación no alcanzadas | NOT_EXECUTED; sin negativo B |
| F11 | Activar conjuntamente `privileged` y `allowPrivilegeEscalation` | Denegaciones exactas PRIVILEGED/ESCALATION y regla runtime única | Conftest; CREATE/UPDATE Deployment y CREATE Pod | D: fallo previo; falta `F11-completed.json` | Tres operaciones, ausencia/estado y contraparte legal no alcanzados | NOT_EXECUTED; alteración coordinada de dos campos |
| F12 | Sustituir digest por su etiqueta mutable original | DENY DIGEST y rechazo por repositorio/digest autorizado | Conftest; CREATE/UPDATE Deployment y CREATE Pod | D: fallo previo; falta `F12-completed.json` | Resolución antes/después y estado intacto no alcanzados | NOT_EXECUTED; sin afirmación de procedencia/firma |
| F13 | Antes de emisión: resultados ausentes; después: retirar solo resultados | Rechazo atribuible por ausencia; aceptar restauración | Admisión previa; CI y CREATE dirigido posteriores | D: fallo previo; faltan `F13-after-denial.json` y `F13-completed.json` | Dos observaciones y recuperación exacta no alcanzadas | NOT_EXECUTED; ambas siguen siendo un escenario |
| F14 | Replay P0 autenticado y etiquetado bajo P1 fiable | `RESULTS_POLICY_VERSION_MISMATCH`; solo regla de resultados | CI autorizado y CREATE aislado nuevo | D: fallo previo; falta `F14-completed.json` | Autenticación P0, restauración y CREATE positivo no alcanzados | NOT_EXECUTED; P0 es fixture de laboratorio |
| L01 | Imagen legítima inicial y reemplazo con evidencia propia | Ambas admitidas, listas y funcionales | CI, admisión, rollout y HTTP | D: fallo previo; falta `L01-image-update.json` | Entregas inicial/reemplazo no alcanzadas | NOT_EXECUTED; reemplazo del mismo commit no es evolución funcional |
| L02 | `lodash.unset@4.5.2`, objetivo MEDIUM previsto | CVE-2026-2950 MEDIUM, sin HIGH/CRITICAL; entrega protegida | Escaneo/umbral, evidencia fresca, admisión y HTTP | V: fallo previo; falta `L02-result.json` | Hallazgos, autorización y entrega no alcanzados | NOT_EXECUTED; sin comparación DB ni fixture B soportado |
| L03 | Añadir componente conocido `is-number@7.0.0` al reemplazo | Aceptar SBOM fresco ligado y comportamiento constante | CI SBOM, admisión y HTTP | D: fallo previo; falta `L03-result.json` | Componente/esquema/sujeto y entrega no alcanzados | NOT_EXECUTED; comparte L01/L04; no prueba completitud |
| L04 | Firma independiente válida tras verificación fresca | Aceptar entrega firmada autorizada | Gate CI, resultados, admisión y HTTP | D: fallo previo; falta `L04-result.json` | Criptografía fresca y reemplazo compartido no alcanzados | NOT_EXECUTED; observación compartida L01/L03 |
| L05 | Revisiones autorizadas `7243334` → `fc58e22` (SHAs completos abajo) | Árboles diferentes y dos entregas saludables con evidencia propia | Fuente, CI, admisión y HTTP en ambas | D: fallo previo; faltan `l05-source.log` y `L05-result.json` | Revisión local solo de ascendencia; exportación/entregas no alcanzadas | NOT_EXECUTED; dos entradas de aplicación conservadas; par B sin ejecutar |
| L06 | Actualización legal de anotación de plantilla con misma imagen | Cambio real de generación, digest listo, HTTP y limpieza Pod | CREATE compartido L01; UPDATE plantilla y Pod positivo | D: fallo previo; falta `L06-result.json` | CREATE, UPDATE, rollout y limpieza no alcanzados | NOT_EXECUTED; CREATE compartido no añade muestra |

L05 conserva `7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`. Se comprobó que ambas son antecesoras
del main registrado. Son entradas necesarias de aplicación para el ejecutor en
`895a3bd`; no deben sustituirse por su SHA. Ninguna entrega se ejecutó. L01/L03/L04,
CREATE de L06 y recuperaciones compartidas no añaden escenarios ni muestras.

## Bases, integridad y conservación

Los dos artefactos de bases solo contienen `index.json`, `NOT_CREATED` y snapshots
vacíos. No existe base real de suite ni hash que comparar. El [índice de campaña](paired-rg-campaign-895a3bd.json)
identifica el desarrollo `37199309814` como origen de su base:

- `trivy.db`: `f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`.
- `metadata.json`: `b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.

Son identificadores históricos reutilizados, sin nueva verificación de aquella
base. Coincidencia/diferencia **no procede**; no significa «idénticas». El workflow
A sin cambios adquiriría bases nuevas tras los prerrequisitos; no reutilizó el
snapshot de campaña. Este intento no permite evaluar hallazgos, severidades ni
deriva de fixtures F03/F04/L02. Compartir fuente no establece igualdad de bases,
confianza, Python del host, cachés ni condiciones experimentales.

Originales en el directorio ignorado
`implementacion/evidence/raw/catalogue-campaign-source-20261005/originals/`;
informes y utilidades de revisión nuevos bajo `derived/`. Se conservan los cuatro
ZIP originales, exportaciones de ambas suites e índices DB, ZIP nativo de logs
Actions, representación CLI de logs, metadatos run/jobs/artefactos, solicitudes y
respuestas de lanzamiento y comprobantes de etiqueta/main/listas de runs.
Los artefactos caducan el **19 de octubre de 2026**; el índice detalla horas y hashes.
Falta conservar la copia fuera de Codespaces; no se publicó otra release.

Comprobaciones realizadas ahora:

- Los cuatro SHA-256 ZIP coinciden con GitHub; pasan los CRC de todos los ZIP,
  incluido el de logs nativos.
- Pasan **28 hashes exteriores por suite (56 total)**, incluido su índice DB
  separado. El auditor existente `paired-rg.py::verify_export` verifica también
  pertenencia exacta al manifiesto, seguridad de rutas y hashes sin ejecutar pares.
- Coinciden asociaciones run/job/artefacto/fuente, árbol limpio, main y cinco
  archivos de configuración por suite con objetos Git experimentales. Los 18
  registros de etapa por suite concuerdan con logs: 17 PASS y un FAIL.
- No existen paquetes de escenarios: hashes interiores de paquetes, asociaciones
  escenario/imagen/resultados y reautenticación de bundles **no proceden**. No se
  alcanzaron auditor de cobertura ni etapa Cosign real; no se anotan como PASS.
- La inspección textual no encontró patrones de claves privadas ni tokens GitHub.
  Los originales no se añaden a Git. Sus 84 archivos tienen manifiesto separado.
- Se comprobaron espacio e inodos antes de descargar/extraer, entre suites y tras
  conservar, con reserva de 3 GiB/20.000 inodos. Quedaban unos 6,54 GiB y
  1,76 millones de inodos. No fue necesaria ninguna limpieza ni eliminación.

Informes derivados: `verified-downloads.json`, `failure-review.json`,
`storage-checks.jsonl` y `ORIGINALS-SHA256SUMS.txt`. Es una revisión automatizada
nueva de integridad/fallo. Las revisiones criptográficas A1 y resultados de campaña
siguen siendo observaciones anteriores; no rellenan la evidencia ausente de este run.

La revisión documental inicial pasó: 238 enlaces locales, diez bloques Bash,
sintaxis de comandos de publicación sin ejecutarlos, JSON/hashes, cuatro matrices
EN/ES de veinte filas y `git diff --check`, sobre ocho archivos de documentos
e índice. La corrección posterior tiene su propio registro de comprobaciones;
las pruebas locales no sustituyen el fallo remoto.

## Entrega y efecto sobre la evaluación

**No puede cerrarse** la limitación de catálogo completo sobre fuente de campaña.
La evidencia identifica por qué este intento autorizado no lo alcanzó. Ensayos
funcionales, reparaciones mediante scripts, piloto de cuatro pares y campaña de
diez pares siguen separados. Quedan pendientes esfuerzo humano, evaluación
económica, negativos B no soportados y revisión/aceptación humana de esta evidencia.
La [declaración del 4 de octubre](evaluation_acceptance_20261004_ES.md) conserva
su fecha y alcance reducido; esta observación posterior no la modifica.

Párrafo propuesto para la memoria, **sin editarla en esta tarea**:

> El 5 de octubre se intentó repetir el catálogo funcional sobre la misma fuente
> de implementación de la campaña temporal (`895a3bd`, run `37342413975`). Ambas
> suites se detuvieron en las pruebas compartidas por una incompatibilidad de
> la API de extracción de archivos con el Python del entorno fijado, antes de
> ejecutar los veinte escenarios o adquirir bases de vulnerabilidades. Por tanto,
> sigue pendiente la validación funcional completa sobre esa fuente; se añade el
> diagnóstico del intento y su evidencia conservada, sin ampliar la cobertura ni
> alterar la aceptación del alcance reducido del 4 de octubre. La evaluación
> humana y económica y los negativos alojados no soportados permanecen pendientes.

No se hizo commit, push, PR remota, merge, release ni cambio de configuración.
El título inicial de documentación era `test: validate the scenario catalogue on the measured campaign source`.
La entrega posterior de la corrección describe el arreglo y conserva el resultado
experimental bloqueado y su cobertura pendiente.

| Actividad | Asistencia | Revisión humana | Decisión |
|---|---|---|---|
| Lanzamiento autorizado, conservación, diagnóstico automatizado y documentos EN/ES | OpenAI Codex / GPT-6 | Pendiente | Ejecución FAIL; integridad/conservación PASS; aceptación de evidencia nueva pendiente |
