# Validación reproducible de integración del carril A

Esta entrada valida los escenarios locales existentes antes del ejecutor pareado
R/G. No añade escenarios, medidas ni excepciones. Ejecutar el devcontainer local
en GitHub sigue siendo **carril A**, con claves locales y un registro propio;
no demuestra OIDC alojado ni modificaciones en GHCR. La aceptación humana sigue
pendiente.

## Ejecución independiente

Use el [devcontainer fijado](../../../.devcontainer/implementacion/devcontainer.json)
y una referencia local `main` de origen fiable que contenga las revisiones L05.
El comando local registra esa referencia sin descargarla ni moverla:

```bash
make -C implementacion lane-a-validation LANE_A_SUITE=demo
make -C implementacion lane-a-validation LANE_A_SUITE=vulnerabilities
```

Cada intento imprime un directorio nuevo bajo `implementacion/evidence/lane-a/`.
Puede elegir uno con `LANE_A_OUTPUT=evidence/lane-a/mi-intento`, relativo a
`implementacion`; no reutilice intentos. La demo activa L05 con revisiones reales
`7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`. Conserva los controles de ascendencia,
cambio del árbol de aplicación y evidencia nueva para cada imagen. La otra suite
invoca `make vulnerabilities`: cuatro imágenes aisladas, comparación de la
corrección F03 y entregas positivas F03 reparada/L02. Un cambio en los datos de
vulnerabilidades que invalide una expectativa se registra como fallo, sin cambiar
el hallazgo, la gravedad ni la política.

Orden: identidad → versiones efectivas → `doctor` → `make test` (incluidos los
resultados estáticos F01/F02) → `smoke-env` → prueba acotada de BuildKit →
escenarios → auditoría de resultados requeridos → conservación. BuildKit usa la
imagen bloqueada, la red `kind` y `SERVICE_NODE_IMAGE`, con límite de 60 segundos
y 10 segundos de gracia para terminar. Smoke no demuestra esa conectividad.
Se elimina solo el builder temporal; se registran por separado el fallo original
y el de limpieza. No se aplican correcciones de firewall ni se eluden versiones.

Un prerrequisito fallido detiene su suite. Cada etapa es un proceso independiente,
con su salida y código; Make puede convertir el fallo de su hijo en código 2.
Un comando exitoso sin evidencia suficiente no produce PASS. `coverage.json`
registra escenario y barrera: F09/F10 en CI/admisión dirigida, F13/F14 después de
emitir evidencia, ambas revisiones L05, CREATE/UPDATE de runtime y análisis y
admisión positiva de vulnerabilidades. Los controles dirigidos y observaciones
compartidas no aumentan el denominador de veinte escenarios. La auditoría reutiliza
validadores existentes; no sustituye la revisión humana ni afirma reautenticar
independientemente todos los bundles conservados.

## Workflow manual y lanzador

El [workflow](../../../.github/workflows/lane-a-validation.yml) separa ambas suites
en una matriz con `fail-fast: false`, Ubuntu 24.04, `contents: read`, historial
completo y credenciales de checkout no persistidas. La preparación descarga
explícitamente `origin/main` de la URL fija del proyecto, establece y registra
`refs/heads/main`, sin mover el checkout. El historial completo por sí solo no
crea esa referencia local. No hay permisos OIDC ni publicación remota de imágenes;
`push: never` desactiva la publicación del devcontainer.

La revisión automatizada del lanzador examinó entradas, ejecución CLI, publicación
y variables de [devcontainers/ci](https://github.com/devcontainers/ci/tree/513af61f4de4f75d37e4438f184ba4358f0fc1ca),
fijado en `513af61f4de4f75d37e4438f184ba4358f0fc1ca` (v0.3; padre fuente
`00115d9fb3fc4a15dc9b460cce0af467b77dbe21`). Revisión humana pendiente.
Su instalación de respaldo usa una versión flotante: por eso el lock npm existente
incluye `@devcontainers/cli` 0.89.0 exacto e integridad. Se copia fuera del checkout
antes de arrancar para que el `npm ci` de postCreate no elimine el lanzador activo.
No se cambian las versiones ni la instalación de las herramientas del laboratorio.

`inheritEnv: false` solicita únicamente `CI=true`. La acción también monta y
transfiere sus cuatro archivos de comandos GitHub (`GITHUB_OUTPUT`, `GITHUB_ENV`,
`GITHUB_PATH`, `GITHUB_STEP_SUMMARY`). El orquestador los elimina del entorno de
los escenarios y usa un archivo temporal propio para capturar la identidad de la
ejecución. No transfiere tokens ni variables `GP_*` arbitrarias; permite
`GP_VULNERABILITY_DB` explícita para repetición local.

Tras autorización separada, ejecutar el workflow ya integrado en `main`:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref main
```

El workflow integrado se ejecutó correctamente en `36881119588`, revisado abajo.
No se lanzó otra ejecución durante esa revisión; las siguientes requieren
autorización separada.

## Descargar y conservar

Las etapas always conservan identidad, versiones, diagnósticos, estados,
resultados estáticos y paquetes originales con hashes, también en intentos fallidos.
La salida de construcción/postCreate del lanzador queda en el log nativo de Actions;
descárguelo también. No se suben `.tmp`, claves privadas ni kubeconfigs completos.

Cada snapshot identificado se conserva en un artefacto de base de datos separado:
solo `db/trivy.db`, `db/metadata.json`, `identity.json` y `SHA256SUMS.txt`, con hash
del archivo exterior. La identidad incluye hashes esperados/observados y origen.
La deriva produce fallo y conserva los bytes observados. `NOT_CREATED` indica
que no se adquirió ninguna base. Descargue ambos artefactos antes de sus 14 días
de caducidad:

```bash
RUN_ID=REEMPLAZAR_CON_ID_REAL
ATTEMPT=1
SUITE=demo # repetir para vulnerabilities
DEST="$PWD/saved/lane-a-$RUN_ID-$ATTEMPT/$SUITE"
gh run download "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --name "lane-a-$SUITE-$RUN_ID-$ATTEMPT" --dir "$DEST"
gh run download "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --name "lane-a-databases-$SUITE-$RUN_ID-$ATTEMPT" --dir "$DEST/databases"
gh run view "$RUN_ID" --repo tfm-goldenpath/golden-path-lab --log > "$DEST/actions.log"
(cd "$DEST" && sha256sum -c SHA256SUMS.txt)
(cd "$DEST/databases" && sha256sum -c ./*.tar.gz.sha256)
```

El manifiesto exterior espera la base bajo `databases/`. Si el índice es
`NOT_CREATED`, no hay archivo de base y el último comando no corresponde.
Extraiga un archivo verificado en un directorio privado nuevo, compruebe allí
`sha256sum -c SHA256SUMS.txt` y repita usando:

```bash
GP_VULNERABILITY_DB=/ruta/absoluta/base-preservada make -C implementacion lane-a-validation LANE_A_SUITE=vulnerabilities
```

Conserve revisión, lockfiles, imágenes/informes originales y base; los bytes de
la base solos no reproducen una imagen. Puede usar el mismo snapshot para la demo.
El análisis compartido copia y verifica un snapshot propio para cada ejecución.
No añada artefactos ni credenciales a Git.

## Observaciones de este incremento

Base `f71bec5`, rama `test/lane-a-integration-validation`. Los primeros intentos
no encontraron `kind` en PATH. Con `implementacion/.tools/bin` ya instalado,
ambas suites se detuvieron en kubectl **v1.37.0 frente a v1.35.8**: estado original
Make 2, conservación 0. Docker informa 29.8.0-1; Buildx 0.37.0 difiere del pin
0.37.1. No se cambiaron versiones. Pasan las pruebas compartidas con las herramientas
existentes en PATH: entorno, 823 pruebas de servicio/unidad, 43 de políticas Python,
Conftest/Kyverno reales, Cosign offline y casos estáticos F01/F02. El primer intento
sin ese PATH falló en cinco pruebas del evaluador; su log se conserva. También
pasan las regresiones enfocadas finales. Son comprobaciones separadas de los
intentos de integración bloqueados; véase [TODO](../../TODO.md).

Evidencia ignorada por Git: `evidence/lane-a/local-{demo,vulnerabilities}`,
`evidence/lane-a/local-{demo,vulnerabilities}-tools` y
`evidence/raw/lane-a-development/`. Smoke, BuildKit, escaneos reales de imágenes,
admisión y entregas L05: **NOT_EXECUTED** en este incremento. Se conservan los
fallos históricos y huecos pendientes. No se afirma aceptación completa ni OIDC.

Asistencia: Github Copilot, GPT-6 (identidad facilitada por la sesión), implementación,
regresiones, revisión automatizada del lanzador y documentación. Revisión humana
y decisión final pendientes. No se reconstruye una historia TDD retrospectiva.

### Primer intento en runner efímero: 36829165325

La [ejecución 36829165325](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36829165325),
en `6b9e303aebbc2b531a06b2e56625cbab7c1305ed`, construyó el devcontainer y
pasó `doctor` en ambos jobs. Ambos fallaron después en las pruebas compartidas:
`ModuleNotFoundError: No module named 'yaml'`. La nueva prueba del workflow
importaba PyYAML, ausente del entorno fijado; los paquetes locales habían ocultado
esa dependencia no declarada. El fallo del finalizador refleja el original.

La corrección reutiliza el parser YAML de Conftest ya fijado y ejecuta las
regresiones Python con `-S`, excluyendo paquetes externos del entorno local.
Conserva las aserciones, versiones, instalación, permisos y expectativas. La
reproducción sin esos paquetes falló antes del cambio; la prueba enfocada pasa
tras corregirlo. Revisión humana y repetición remota pendientes; el asistente no
ha despachado workflows.

Se verificaron los 28 hashes de cada artefacto descargado, incluido el índice de
base separado. Ambos registran `failedStage: shared-tests`, estado original 2,
conservación 0, escenarios `NOT_EXECUTED` y base `NOT_CREATED`. No se alcanzaron
smoke, BuildKit, escaneos de imágenes, admisión ni entregas L05. Evidencia y logs
locales: `evidence/raw/lane-a-run-36829165325/`, ignorados por Git. La inspección
confirma que el entorno fijado arranca en el runner; no elimina los fallos
históricos locales de versiones o red.

Validación local de la corrección: pasa la suite compartida completa (825 pruebas
de servicio/unidad, 43 de políticas Python, 62 decisiones Conftest, Kyverno, Cosign
offline y F01/F02 estáticos). Véase `shared-tests-fix.log` en el directorio anterior.
No demuestra que pasen los prerrequisitos restantes ni los escenarios de integración.

### Ejecución 36830599263: petición F14 sin cambios

La [ejecución 36830599263](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36830599263),
en `5255c7fbf43d5d158071396e9f5dd9e5c46e23fc`, pasó doctor, pruebas compartidas,
smoke y la prueba BuildKit en ambas suites. La suite de vulnerabilidades completó
su auditoría: imágenes reales F03/F04/L02, corrección y compatibilidad F03, límite
MEDIUM y admisión, rollout y HTTP de F03 reparada/L02. Es carril A, no evidencia OIDC.

La demo se detuvo en F14 después de emitir evidencia. CI atribuyó
`RESULTS_POLICY_VERSION_MISMATCH`, pero admisión devolvió
`deployment.apps/quotes-node unchanged` con código 0. F13 posterior a emisión ya
había rechazado y recuperado correctamente. F14 sigue siendo desfavorable; restaurar
correctamente no lo convierte en PASS. No se alcanzaron la admisión dirigida
posterior F05/F06/F08/F09/F10 ni L05. Hay registros de finalización F07 inicial,
runtime F11/F12/L06 y controles tempranos F05–F10; la demo completa no pasó.

Un apply sin cambios no demuestra una petición nueva al servidor. Además, el
[verificador Kyverno 1.19.1](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/engine/internal/imageverifier.go)
puede omitir imágenes sin cambios ya verificadas en el recurso anterior, incluso
sin caché de registro. Un UPDATE solo de metadatos no corrige esa barrera.

La corrección reutiliza `workload_admission_*` en F05/F06/F08/F09/F10/F13/F14:

| Paso | Operación y evidencia requerida |
| --- | --- |
| Preparación | Clonar el candidato como `admission-fxx` en `tfm-golden`, cero réplicas y selector aislado; misma imagen y configuración de contenedores. Exigir NotFound real inicial. |
| Control positivo | CREATE con dry-run de servidor mediante actor restringido y evidencia legítima. |
| Negativo | CREATE real de la misma petición tras alterar evidencia; diagnóstico exacto existente y NotFound real después del rechazo. |
| Recuperación | Restaurar y verificar evidencia original; CREATE real idéntico, conservar objeto devuelto, eliminar solo el objeto propio y demostrar ausencia. Se mantienen las comprobaciones separadas de rollout/HTTP del mismo digest. |

El objeto con cero réplicas no inicia Pods si se acepta inesperadamente y no entra
en el selector de quotes-node. Se conserva ese objeto desfavorable antes de la
limpieza; los fallos de limpieza impiden completar. No cambian política, confianza,
caché ni privilegios. La auditoría exige objeto CREATE con UID y limpieza, no una
respuesta `unchanged`. No se afirma reevaluación de evidencia modificada en UPDATE,
no se añaden IDs y se conserva el UPDATE real de plantilla de L06.

Inspección de artefactos: 74 hashes exteriores y 1.081 internos de la demo; 75 y
348 respectivamente para vulnerabilidades. Ambas bases separadas verificaron
hashes exteriores/interiores y lista exacta de archivos. Se inspeccionaron registros
originales, sin reautenticar independientemente todos los bundles firmados.
Evidencia, pruebas y descripción PR: `evidence/raw/lane-a-run-36830599263/`, ignorado
por Git. Falta repetir la demo remota con la corrección. Doctor local continúa
rechazando kubectl v1.37.0 frente a v1.35.8; no se lanzó integración local ni un
workflow por el asistente. Se conservan los fallos históricos de sus entornos.
Asistencia: OpenAI Codex / GPT-6; revisión humana y aceptación final pendientes.

Pruebas finales: pasan 842 pruebas de servicio/unidad, 43 de políticas Python,
62 decisiones Conftest, Kyverno, Cosign offline y F01/F02 estáticos. Se conserva
el fallo intermedio del harness F06, ya corregido. `shared-tests-final.log`
registra la suite compartida aprobada, no una repetición de integración real.

Seguimiento de la revisión del PR #34: GitHub Copilot (modelo no indicado)
detectó que la auditoría no comprobaba las respuestas originales de ausencia
inicial y del CREATE positivo con simulación en servidor. OpenAI Codex / GPT-6
añadió ambas comprobaciones y 11 regresiones para respuestas ausentes,
incorrectas o fallidas. Pasan las 30 pruebas de auditoría; los 11 casos nuevos
fallaban antes de la corrección. Registros: `copilot-red.log` y
`copilot-green.log` en el directorio de evidencia anterior. Son pruebas unitarias
sintéticas, no ejecuciones reales. Revisión humana y aceptación final pendientes.

La advertencia adicional de Copilot facilitada por el contribuidor afecta a la
evidencia del CREATE de recuperación. La auditoría exige un Deployment
`apps/v1` en `tfm-golden`, el nombre esperado y un UID de texto no vacío, la
etiqueta de propiedad de la petición, cero réplicas, selector y etiquetas de
Pods aislados, y la imagen esperada. OpenAI Codex / GPT-6 añadió 15 casos
sintéticos: 11 reprodujeron comprobaciones ausentes y cuatro confirmaron
rechazos existentes antes del cambio. Registros: `copilot-recovery-red.log` y
`copilot-recovery-green.log` en el mismo directorio ignorado de evidencia.
Revisión humana y validación real pendientes.
Pasan las 45 pruebas de auditoría tras esta corrección.

### Ejecución 36877044496: timeout del webhook en L05

La [ejecución 36877044496](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36877044496)
en `7548dcb119e3394718946ea59313ac1f830f7bf0` superó los prerrequisitos de demo
y llegó a L05-from. La simulación legítima falló por timeout de 30 segundos del
webhook `validate.kyverno.svc-fail`. Sigue siendo un fallo de integración; L05 no
completó ninguna entrega. GitHub indica éxito del trabajo de vulnerabilidades;
su paquete no se auditó independientemente en este seguimiento.

La captura marcaba el controlador nuevo como listo con `terminatingReplicas: 1`
y un Pod antiguo en eliminación. La comprobación ahora espera cero réplicas en
terminación y la desaparición de Pods de ReplicaSets anteriores, dentro del bucle
acotado existente. Corrige una carencia observada de preparación; las conexiones
obsoletas durante el reemplazo son una posible causa, no un diagnóstico probado.
Los errores del webhook siguen deteniendo la ejecución sin reintentos.

Evidencia ignorada por Git: `evidence/raw/lane-a-run-36877044496/`. Se verificaron
74 hashes exteriores, 1.814 interiores y la lista permitida y tres hashes del
archivo de base de datos. La auditoría offline acepta los fallos dirigidos tras
emisión, pero faltan registros finales/L05 y la reubicación invalida rutas de
Conftest runtime. No se modificaron originales ni se reautenticaron firmas.
Cinco regresiones reprodujeron la carencia; pasan las 33 pruebas enfocadas.
La captura real ahora devuelve PENDING. Doctor local sigue bloqueado por kubectl
v1.37.0 frente a v1.35.8; falta repetición real. Asistencia: OpenAI Codex / GPT-6;
revisión humana y aceptación pendientes. No se lanzó ningún workflow.
Pasa la suite compartida: 873 pruebas de servicio/unidad, 43 de políticas Python,
Conftest, Kyverno, Cosign offline y F01/F02 estáticos; registro `shared-tests.log`.

### Primera ejecución completa aprobada del carril A: 36881119588

Se revisaron [demo](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36881119588/job/110432829867)
y [vulnerabilidades](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36881119588/job/110432830289):
`.github/workflows/lane-a-validation.yml`, intento 1, `workflow_dispatch` sobre
`main`, commit **`b8eb603e7965e4d58cc9f58ec78f74971944a547`**. Es la ejecución
exitosa posterior al PR #35, no el primer intento ni el workflow del carril B.
Ambas suites tienen PASS y salidas originales/de conservación 0. Pasan las
27 etapas de demo y 26 de vulnerabilidades: doctor, pruebas compartidas, smoke,
BuildKit con configuración de entrega, escenarios, auditoría y limpieza. Cada
trabajo registra 873 pruebas de servicio/unidad, 43 Python, Conftest/Kyverno,
Cosign offline y F01/F02 estáticos; la evidencia de escenarios es independiente.

| Límite | Observación verificada |
| --- | --- |
| Demo `run-TxAlzChs` | Pasan las 27 filas de auditoría. F01/F02 son estáticos. F05/F06 (SBOM), F07/F08 (firma), F09/F10 (procedencia) rechazan por las causas previstas en sus límites CI/admisión, con restauración legítima. |
| F13/F14 | F13 previo a emisión permanece separado de F13 posterior a emisión y F14 con P0 auténtico. Rechazos atribuibles, restauración exacta, CREATE de recuperación, limpieza, rollout y HTTP correctos. |
| Runtime y entregas legítimas | F11/F12 rechazan CREATE de Deployment, UPDATE legal de plantilla y CREATE de Pod aislado; se comprueban NotFound real o estado deseado intacto. La etiqueta F12 resuelve al mismo digest. Pasan L01/L03/L04 y L06: CREATE compartido, generación 1 → 2, rollout/HTTP y limpieza del Pod positivo. |
| L05 | Se entregan las revisiones reales autorizadas `7243334fe4ee7073801a86b25c90986b7d3c5ece` → `fc58e220e2d3f38d13216b23e61ffc31271f112f`, con árboles de aplicación distintos, 10/11 hashes de archivos comprobados, evidencia nueva por digest, admisión, Pods listos y HTTP. |
| Vulnerabilidades `run-SeGfzbLB` | Pasan las 12 filas: cuatro imágenes construidas, SBOM CycloneDX originales y análisis Trivy reales con asociación de imagen/componente y política de producción. Las imágenes negativas no reciben resultados exitosos ni despliegue protegido. |

F03: `minimist@1.2.5`, CVE-2021-44906 CRITICAL, correcciones indicadas
`1.2.6, 0.2.4`; `1.2.8` elimina el hallazgo y deja el informe sin vulnerabilidades.
Coinciden comportamiento inocuo y HTTP antes/después; la imagen corregida completa
la entrega protegida. F04: `ip@2.0.1`, CVE-2024-29415 HIGH, sin versión npm
corregida según la instantánea y el [aviso revisado](https://github.com/advisories/GHSA-2p57-rm9w-gvfp),
sin afirmación universal. L02: `lodash.unset@4.5.2`, CVE-2026-2950 MEDIUM y
CVE-2025-13465 MEDIUM, sin HIGH/CRITICAL; firma, SBOM, procedencia, resultados,
admisión, rollout y HTTP correctos. No se observó desviación de las fixtures.

Evidencia ignorada por Git: `evidence/raw/lane-a-run-36881119588/`, incluidos
los logs Actions y ambos archivos separados de base de datos. Se verificaron
76/75 hashes exteriores y 1.960/348 interiores para demo/vulnerabilidades,
respectivamente; cada archivo DB cumple checksum exterior, lista exacta de
cuatro archivos y tres hashes internos. Coinciden cuatro registros DB de imagen
en demo y cinco de ejecución/imágenes en vulnerabilidades. Ninguna DB falta ni
está NOT_CREATED. El contenido `trivy.db` es idéntico en ambas suites:
`c39ee6b7f92119e7fadd7bc626d15ca8de69a56522529eeab027f6c9c433a27a`, esquema 2,
actualizado `2026-10-01T13:01:27.395440834Z`. Solo difiere la hora de descarga
en los metadatos; la identidad completa es constante dentro de cada suite.

La revisión repitió validadores sobre originales sin modificar, con alias
temporales para rutas absolutas eliminados después; reconstruyó ocho recibos
de análisis. Cuatro nuevos análisis offline de los SBOM originales reproducen
todos los resultados tras comparar en memoria la ruta reubicada. Se conservan
las salidas originales y la DB sigue intacta. No son nuevas construcciones ni
admisiones. Se reautenticaron 28 bundles distintos: 27 válidos y la variante F08
rechazada como corresponde; pasan 24 contratos positivos y los hashes de evidencia
referenciados por resultados firmados. Se verificó aislamiento/restauración en
14 límites, políticas y confianza pública constantes. El `state.json` privado
se excluye del paquete: sus hashes registrados no se pudieron recalcular aquí.
Los informes independientes se enumeran en la sección equivalente de la guía EN.

La evidencia permite **comenzar el desarrollo del ejecutor de medición R/G
emparejada**; no establece mediciones, repetibilidad estadística, calibración
manual ni aceptación de campaña. Revisión humana del lanzador/fuentes y aceptación
final pendientes. Se conservan fallos históricos y bloqueos locales de Codespaces;
el éxito no prueba la causa exacta del timeout anterior. No aporta cobertura OIDC
ni mutaciones GHCR del carril B. El denominador sigue siendo 20. No fue necesaria
reparación ni nueva suite de regresión; no se hizo push, merge, dispatch ni
infraestructura de medición. Asistencia: OpenAI Codex / GPT-6, auditoría y documentos.
