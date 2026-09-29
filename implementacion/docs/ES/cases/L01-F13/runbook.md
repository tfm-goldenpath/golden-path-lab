# Guía de ejecución: entrega legítima y ausencia de autorización de resultados

[Documentación en español](../../README.md)

[Guía principal en inglés](../../../EN/cases/L01-F13/runbook.md). Los comandos, los identificadores y la salida del programa son los mismos en ambos idiomas.

La primera demostración integra `quotes-node`, registro de imágenes, políticas tempranas, análisis de vulnerabilidades, SBOM, firmas, procedencia y admisión en Kubernetes. Combina **L01**, entrega legítima completa, con **F13**, ausencia de la atestación obligatoria de resultados. La [ficha del ensayo](README.md) describe su oráculo y sus límites.

Las salidas indicadas son **resultados esperados**. Una prueba unitaria satisfactoria no acredita la integración Docker/Kubernetes, y la vía local no acredita la identidad OIDC de GitHub. El resultado observado de cada ejecución queda en sus evidencias.

El perfil bundle superó la compatibilidad local y la [validación alojada de OIDC/SCT/transparencia en `82728c5`](../../../../registros/pr15_review_ES.md); F07 dirigido local pasó después en `run-xFGRe6X1`; F07 alojado sigue pendiente (consulta el registro F07 enlazado abajo). Los resultados clásicos anteriores no acreditan esta representación.

## 1. Abrir el entorno correcto

La estructura del repositorio debe conservar estas posiciones:

```text
raíz del repositorio/
├── .devcontainer/implementacion/devcontainer.json
├── .github/workflows/
│   └── golden-path.yml
└── implementacion/
    ├── .devcontainer/
    ├── services/quotes-node/
    ├── scripts/
    ├── policies/
    ├── evidence/
    └── Makefile
```

En GitHub Codespaces, selecciona la configuración **Golden Path - implementation**, situada en `.devcontainer/implementacion/`. En VS Code, abre la raíz del repositorio, ejecuta **Dev Containers: Reopen in Container** y selecciona esa misma configuración. Si abres únicamente la carpeta `implementacion`, su configuración interna permite desarrollar localmente, pero los workflows de GitHub deben permanecer en `.github/workflows` de la raíz del repositorio.

Los siguientes comandos se ejecutan en la terminal **Linux del devcontainer**, desde la raíz del repositorio. Si la terminal ya está en `implementacion/`, omite `cd implementacion`. No son comandos para PowerShell ni para ejecutar todo el laboratorio directamente en Git Bash de Windows.

```bash
cd implementacion
make doctor
make test
```

`make doctor` debe confirmar la disponibilidad del entorno. `make test` ejecuta las comprobaciones automatizadas del servicio y de los contratos/políticas incorporados. Un fallo en esta preparación debe resolverse antes de interpretar un resultado como aceptación o rechazo de seguridad.

El contenedor requiere Docker disponible, arquitectura `linux/amd64`, acceso a las descargas y recursos suficientes para kind, Kyverno, el registro y el analizador. La configuración solicita al menos 2 CPU, 8 GB de memoria y 32 GB de almacenamiento. La cuota efectiva de Codespaces depende de la cuenta y del uso acumulado; la condición de estudiante no garantiza capacidad ilimitada. En Codespaces, detén el espacio cuando termines para evitar consumir horas innecesariamente.

### Comprobar cgroups antes de crear kind

El entorno preferido utiliza **cgroup v2**, el mecanismo del kernel con el que se gestionan los recursos de los contenedores. Se puede consultar el motor utilizado por el laboratorio con:

```bash
docker info --format '{{.CgroupVersion}}'
```

El valor esperado es `2`. Si devuelve `1`, la primera opción es utilizar un anfitrión Docker compatible con cgroup v2. Para diagnosticar un entorno antiguo existe una opción explícita, limitada a esta demostración:

```bash
GP_CGROUP_V1_COMPAT=1 make demo
```

Esta opción configura `failCgroupV1: false` en el kubelet de los nodos **temporales de kind** y conserva la configuración en las evidencias. Kubernetes documenta que ese parámetro controla la negativa del kubelet a arrancar sobre cgroup v1; no es una política de admisión. El ajuste no migra ni cambia la configuración del anfitrión y no desactiva las firmas, los análisis ni las reglas de Kyverno. Su ejecución sigue sujeta a los mismos criterios L01/F13/F11, pero debe identificarse como diagnóstico de compatibilidad, separado de una campaña sobre cgroup v2. No se aplica automáticamente a `make smoke-env`. [Referencia de configuración del kubelet](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/).

## 2. Ejecutar la demostración local completa: vía A

```bash
make demo
```

Esta entrada utiliza `scripts/demo.sh` para preparar un laboratorio aislado con **kind, zot y claves locales de desarrollo**. Construye primero una imagen `linux/amd64` compartida por la referencia y la vía protegida, y prepara otra para el UPDATE legítimo de L01. Ambas usan el mismo commit fuente; el fixture L03 añade `is-number@7.0.0` fijado a la segunda imagen sin cambiar el comportamiento de la aplicación. Las claves de desarrollo no se guardan en Git ni son identidades válidas para la vía GitHub.

La imagen de ejecución de `quotes-node` usa **Node 24.21.0 sobre Alpine 3.23**, fijada por digest en `SERVICE_NODE_IMAGE`, separada de la imagen Debian del devcontainer. Esta rama `main` de Alpine conserva soporte y aparece en los metadatos de fin de soporte de Trivy 0.74.0; véase la [decisión de compatibilidad](../../environment.md). El servicio no tiene dependencias npm de producción; por ello su Dockerfile retira npm, npx y Yarn de la imagen entregada y conserva el runtime Node necesario. Trivy sigue analizando la imagen resultante y sus componentes: esta reducción no implica ausencia de vulnerabilidades ni elimina el umbral HIGH/CRITICAL.

Cuando se ejecuta una copia local fuera de un repositorio Git, el campo de commit utiliza cuarenta ceros como **sentinela de commit no disponible**. La procedencia local lo indica mediante `gitCommitAvailable: false` y conserva `sourceSnapshotSha256`, calculado sobre los archivos de origen seleccionados por el script. Esa huella permite relacionar esa copia de trabajo con la ejecución; no representa un commit real, no cubre automáticamente todos los archivos del repositorio y no acredita procedencia GitHub. En la vía B se utiliza el commit real de la ejecución alojada. Los [contratos de entrega](../../delivery-contracts.md) detallan las diferencias.

La secuencia observable esperada es:

1. El servicio y las políticas superan sus comprobaciones previas.
2. La misma imagen identificada por digest funciona en el namespace de referencia R.
3. G valida los manifiestos, analiza esa imagen con Trivy y comprueba la regla de vulnerabilidades HIGH/CRITICAL. Genera el CycloneDX original y el informe separado.
4. G firma la imagen y produce/verifica las evidencias de SBOM y procedencia correspondientes a la vía local.
5. Antes de emitir el resumen de resultados, se comprueba su ausencia para F13 y se realiza un ensayo dirigido de la barrera posterior: Kyverno en `tfm-golden` debe rechazar la petición por esa atestación ausente, manteniendo válidas las demás evidencias. El ensayo dirigido no cuenta como un escenario adicional.
6. Tras verificar los controles previos, se emite y firma el resumen satisfactorio. L01 debe ser admitido y el servicio desplegado debe responder con el resultado funcional esperado.
7. F11 se comprueba como entrada prohibida en la política temprana y mediante una actualización dirigida en admisión. Después, L01 aplica otro digest con su propio informe Trivy, SBOM, firma, procedencia y resultados firmados. El UPDATE debe superar la admisión, completar el despliegue y dejar Pods preparados que informen del nuevo digest en ejecución y conserven la cotización de referencia. Comprueba una sustitución de imagen, no una actualización funcional.
8. Se conservan los diagnósticos y el paquete de evidencias; el laboratorio temporal se retira.

El resumen esperado es `== PASS: L01 accepted; F13 and F11 rejected. Evidence: <directorio-de-evidencias> ==`, seguido de la salida de limpieza y empaquetado. El marcador representa el directorio real de esa ejecución. Se conserva en inglés para coincidir con la salida del programa.

F13 es una prueba negativa: **su rechazo por la regla prevista es el resultado correcto del test**. Un error de red, una descarga fallida, un webhook no disponible o una firma diferente no demuestran F13 y hacen fallar la demostración. Si Trivy detecta HIGH/CRITICAL, el flujo G se detiene; no se omite ese control para forzar una demostración satisfactoria.

La respuesta legítima de la cotización es:

```json
{"currency":"EUR","premiumCents":1000,"tariffVersion":"demo-v1"}
```

Corresponde a `POST /quotes` con `{"insuredAmountCents":100000,"coverage":"basic"}`. También deben responder `GET /healthz` con `{"status":"ok"}` y `GET /version` con el nombre, la versión y el commit de construcción. El ensayo comprueba el servicio desplegado: ejecutar únicamente sus pruebas Node no sustituye la admisión ni la descarga por digest.

## 3. Ejecutar solo el recorrido de referencia

```bash
make reference
```

R utiliza la misma API y construcción funcional, con despliegue en su namespace de referencia. No exige las políticas experimentales ni las evidencias que autorizan G. Persisten los controles ordinarios de Kubernetes y las comprobaciones funcionales: R no representa un equipo sin automatización.

Tras superar el piloto bundle, fija la revisión y el perfil adoptados antes de medir la campaña. No mezcles tiempos de desarrollo clásico con mediciones de campaña bundle; la metodología de veinte escenarios permanece igual.

La comparación inicial R/G reutiliza el mismo digest. La sustitución posterior de L01 emplea un segundo digest solo en G. **No es una pareja de la campaña temporal**: la construcción adicional de UPDATE no proporciona construcciones independientes de referencia y protegida. Los tiempos del ensayo sirven para diagnóstico; no se presentarán como la sobrecarga experimental definitiva.

## 4. Ejecutar la integración real de GitHub: vía B

Publica tú mismo el contenido en tu repositorio, conservando `.github/workflows` en su raíz. No basta con subir esa carpeta dentro de `implementacion/`. Comprueba que GitHub Actions está habilitado y que las políticas del repositorio u organización permiten los permisos declarados por el workflow y la publicación en GHCR.

1. Abre **Actions** en GitHub.
2. Selecciona **Golden Path GitHub integration**, definido en `.github/workflows/golden-path.yml`.
3. Usa **Run workflow** sobre la revisión que deseas probar. El workflow manual debe existir en la rama predeterminada para aparecer en la interfaz de ejecución.
4. Revisa la preparación de los dos digests, los dos pasos de procedencia nativa con `actions/attest` y la finalización. La sustitución utiliza `update_image` y `update_digest` de la preparación y necesita su propia procedencia verificada.
5. Descarga el artefacto **`golden-path-<run-id>-<attempt>`** y conserva una copia fuera de Codespaces. El workflow configura una retención de 14 días; la copia local evita depender de esa caducidad.

El runner crea su propio clúster kind. **No necesita acceder al API del clúster del Codespace**. Publica en GHCR, firma mediante la identidad OIDC del workflow y genera procedencia alojada como bundle de Sigstore. La admisión debe verificar el emisor y la identidad autorizados, el digest y los predicados aplicables. La preparación local usa un contrato de procedencia de laboratorio; no sustituye esta prueba de emisión y consumo reales.

No se introducen tokens personales en los archivos del proyecto. Los permisos mínimos del job de entrega permiten publicación de paquetes, identidad OIDC y atestaciones; una política organizativa que los impida debe diagnosticarse como preparación del entorno. Las credenciales transitorias de acceso a GHCR no deben acabar en el paquete de evidencias.

La disponibilidad de atestaciones y las cuotas de Actions dependen de la visibilidad y del plan del repositorio. La base está orientada al repositorio público previsto para el TFM; no se deduce que cualquier combinación de repositorio privado y plan disponga de las mismas prestaciones. Usar una firma keyless o `actions/attest` **no acredita por sí solo SLSA Build L3**. Esta demostración comprueba propiedades concretas y conserva sus límites.

`act` puede ayudar a revisar pasos compatibles de workflows. No proporciona la identidad OIDC ni los servicios alojados de GitHub y, por tanto, no cierra la vía B. Para la primera prueba local completa se utiliza `make demo`.

### Probar el candidato bundle antes de fusionarlo

Cuando el workflow manual está registrado en la rama predeterminada, una nueva ejecución puede seleccionar el workflow y el código de una rama de corrección publicada. No es necesario fusionar primero la corrección. Estos comandos se pueden ejecutar desde **Git Bash en Windows** con GitHub CLI autenticado: solicitan una ejecución alojada, no ejecutan el laboratorio en Windows. Crea y publica tú mismo `feat/cosign-bundles` antes de usar este ejemplo, o sustituye el nombre por el de la rama real. [Ejecución manual en GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), [selección de la referencia](https://cli.github.com/manual/gh_workflow_run).

```bash
gh workflow run golden-path.yml \
  --repo tfm-goldenpath/golden-path-lab \
  --ref feat/cosign-bundles
```

Identifica la nueva ejecución y comprueba que `headBranch` y `headSha` corresponden a la rama y al commit de la corrección que quieres validar. Si todavía no aparece, repite el comando de consulta; no lances otra ejecución solo para actualizar la lista.

```bash
gh run list \
  --repo tfm-goldenpath/golden-path-lab \
  --workflow golden-path.yml \
  --branch feat/cosign-bundles \
  --event workflow_dispatch \
  --limit 10 \
  --json databaseId,headSha,headBranch,status,conclusion,url
```

Sustituye `RUN_ID` por el `databaseId` numérico de esa ejecución y espera a que termine. El comando devuelve un código de error si la ejecución falla; conserva ese resultado.

```bash
gh run watch RUN_ID \
  --repo tfm-goldenpath/golden-path-lab \
  --exit-status
```

Una vez terminada, descarga cualquier artefacto generado aunque el resultado haya sido desfavorable. Sustituye `RUN_ID` tanto en el comando como en el destino. Esta carpeta queda fuera del repositorio; al paquete se le aplican las indicaciones de custodia del apartado siguiente.

```bash
gh run download RUN_ID \
  --repo tfm-goldenpath/golden-path-lab \
  --dir "$HOME/golden-path-evidence/run-RUN_ID"
```

Un fallo temprano puede impedir que se genere un artefacto; conserva entonces la URL y los registros de la ejecución. Referencias de CLI para [consultar](https://cli.github.com/manual/gh_run_list), [seguir](https://cli.github.com/manual/gh_run_watch) y [descargar](https://cli.github.com/manual/gh_run_download) ejecuciones.

No uses **Re-run jobs** sobre una ejecución antigua de `main` para probar una corrección recién publicada: la repetición conserva el commit y la referencia originales. Inicia una nueva ejecución sobre la rama de corrección. [Comportamiento de las repeticiones en GitHub](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).

El clúster temporal autoriza la identidad exacta del workflow de la rama seleccionada, por ejemplo `https://github.com/tfm-goldenpath/golden-path-lab/.github/workflows/golden-path.yml@refs/heads/feat/cosign-bundles`, y su commit de origen. No utiliza un comodín ni presenta esa rama como una entrega aprobada para producción. El workflow actual no referencia ningún entorno de GitHub; los permisos del repositorio y de la organización siguen siendo aplicables. Publica en el paquete GHCR compartido, con una etiqueta de imagen y un digest propios de cada ejecución; la limpieza no elimina esas imágenes remotas ni sus evidencias. Después de revisar y fusionar la corrección, valida por separado la revisión resultante de `main`.

### Compatibilidad y aceptación del perfil bundle

Esta rama utiliza el candidato descrito en la [guía de migración](../../cosign-bundle-migration.md), manteniendo Cosign 3.1.3 y Kyverno 1.19.1. Todas las reglas de evidencias usan `SigstoreBundle`; `tfm-signature` exige de forma independiente `https://sigstore.dev/cosign/sign/v1`. El recorrido activo no completa anotaciones clásicas de cadena ni reintenta silenciosamente la verificación clásica.

A usa `local-signing-config.json` sin servicios públicos de firma/transparencia y `local-trusted-root.json` sin CA ni registros alojados; la clave pública de desarrollo aporta la confianza. Solo A permite verificación sin registro/SCT y acceso HTTP al registro aislado. B conserva `sigstore-trusted-root.json` autenticado, identidad y emisor GitHub exactos, confianza del certificado y transparencia/evidencia temporal exigidas. No copies las excepciones de A para conseguir un resultado satisfactorio en B.

La [ejecución clásica 36310983700](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36310983700) validó el UPDATE anterior que solo cambiaba una anotación. La [ejecución clásica 36314305654](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36314305654), en `4f8fe77`, superó L01/F13/F11 y la sustitución de imagen con evidencias propias; sus artefactos se auditaron. La versión publicada v0.1.0 apunta a `9f1999e` e incluye ese cambio. Ninguna ejecución clásica valida este candidato bundle ni otro commit.

Inicia una ejecución nueva en el commit publicado de `feat/cosign-bundles` y comprueba su `headSha` antes de interpretar el resultado. La aceptación exige rechazo de F13 **únicamente** por resultados ausentes, admisión de L01 tras emitirlos, rechazo de F11 y sustitución preparada con su propio digest y evidencias verificadas. Además, los criterios de migración deben mostrar que otros bundles válidos no sustituyen al predicado de firma independiente y que se rechazan alteraciones, confianza no autorizada y digests ajenos. Conserva los fallos de recuperación, firma, procedencia o red como errores de integración.

La [ejecución local bundle `run-De88fpWy`](../../../../registros/cosign_bundles_validation_ES.md) terminó con PASS, herramientas fijadas, zot/kind nuevos y recuperación estricta del inventario: rechazos atribuidos de F13/F11, admisión de L01 y sustitución por otro digest verificado con despliegue completado. El anfitrión usó Docker Engine 24.0.5/cgroup v1 con `GP_CGROUP_V1_COMPAT=1` explícito. Es evidencia de compatibilidad, no el entorno de campaña ni una medición temporal. El intento utilizó el árbol de trabajo modificado sobre `9f1999e`, identificado por la huella fuente del registro enlazado. La validación alojada pasó después en `82728c5`. F07 dirigido local pasó en `run-xFGRe6X1`; F07 alojado sigue pendiente (consulta el registro F07 enlazado abajo). Conserva bundles originales, salidas de verificación y políticas que permitan comprobar el perfil utilizado.

El verificador bundle de Kyverno 1.19.1 puede mostrar `no matching signatures found` tanto por un predicado ausente como por fallos de confianza. Por ello, F13 exige un único rechazo identificado de `tfm-results`/`require-results` (incluida su regla generada para Deployment), inventarios válidos exclusivamente de bundles obtenidos antes y después, revalidando el original previo antes de la petición, resultados ausentes y predicados de firma/SBOM/procedencia presentes para el mismo digest. Las demás políticas deben superar la admisión y L01 debe admitir después ese mismo digest tras emitir resultados antes de considerar satisfactorio el intento completo. Analizar el inventario aporta evidencia estructural, no autentica firmas. Reglas adicionales, inventarios malformados o inaccesibles y errores de verificación ajenos hacen fallar la prueba.

Conserva `F13-inventory-consistency.json`, que compara los conjuntos estrictos de descriptores anteriores y posteriores. Falla ante descriptores añadidos, eliminados o cambiados e ignora el orden. Utiliza un digest nuevo con un único publicador controlado y sin cambios de evidencias durante la petición. No es una garantía atómica del registro ni excluye cambios transitorios entre observaciones; sigue siendo obligatoria la admisión L01 posterior del mismo digest.

El [recuperador estricto del inventario](../../../../scripts/download-bundle-inventory.mjs) elimina la suposición de que una descarga Cosign satisfactoria contiene todos los bundles. Recupera referencias OCI en modo de solo lectura, con paginación/alternativa acotadas; comprueba digests y tamaños de manifiestos/blobs, valida todos los bundles esperados y exige una segunda lista coincidente. Un inventario ilegible, malformado, no admitido o cambiante detiene la prueba, sin interpretar datos omitidos como resultados ausentes. HTTP queda limitado a A; GHCR utiliza permiso de lectura para el repositorio fijado. Conserva `registry-inventory-before-results.json`, `registry-inventory-after-denial.json` y `registry-inventory-authorized.json` con sus arrays de bundles. Integridad de recuperación y confianza criptográfica son comprobaciones distintas; véase la [justificación de la migración](../../cosign-bundle-migration.md#recuperación-estricta-del-inventario-del-registro).

## 5. Evidencias y limpieza

Para cada imagen, conserva `image.bundle.json`, `sbom.bundle.json`, `results.bundle.json` y, en A, `provenance.bundle.json`, junto con las salidas satisfactorias de los verificadores Cosign/GitHub. La procedencia nativa de B queda en los inventarios completos. Conserva `attestation-inventory-before-results.json` para F13 y `bundle-inventory-authorized.json` tras autorizar. `evidence-profile.json` identifica `sigstore-bundle-v0.3`, digest, fase y predicados; sus comprobaciones estructurales no verifican criptografía. Incluye CycloneDX original y material de confianza. Un intento fallido puede carecer de archivos de etapas no alcanzadas; documenta ese fallo. La instantánea posterior es `attestation-inventory-after-denial.json`; conserva `bundle-profile-before-results.json`, `bundle-profile-after-denial.json`, `F13-early.json` y `F13-after-denial.json` junto al registro original de admisión. Se conserva `development-public-key.pem` para reproducir la verificación local; las claves privadas quedan excluidas.

Los resultados de ejecución se guardan bajo `evidence/raw/` y los paquetes bajo `evidence/packages/`. Ambas rutas están excluidas de Git. Conserva el identificador de ejecución y la referencia inmutable de imagen para relacionar informes, firmas, respuesta de admisión y prueba HTTP.

Dentro de cada ejecución, `L01-update/` conserva la construcción de sustitución, los informes y atestaciones de esa imagen, el diagnóstico de admisión, el Deployment y los Pods. `L01-image-update.json`, en el directorio padre, registra las referencias original y nueva, la generación observada del Deployment y los identificadores de imagen de los Pods preparados; `result.json` lo incluye como `legitimateUpdate`. El paquete de evaluación incorpora las evidencias de ambas imágenes.

El paquete debe permitir distinguir al menos:

- Entrega legítima aceptada y cotización comprobada.
- F13 rechazado por ausencia del resumen obligatorio, con el resto de condiciones preparadas.
- Un fallo técnico o un control previo que impidió alcanzar la prueba.

La limpieza automática se ejecuta al terminar y también cuando se produce un error controlado. Si interrumpes el proceso o queda algún recurso del laboratorio, puedes solicitar su limpieza usando **la carpeta real de esa ejecución**, nunca una carpeta ajena:

```bash
GP_STATE_DIR=evidence/raw/run-IDENTIFICADOR bash scripts/demo.sh local cleanup
```

Sustituye `run-IDENTIFICADOR` por el nombre indicado por la ejecución. La limpieza retira los recursos temporales identificados del laboratorio; las evidencias se conservan para revisar el diagnóstico. No elimines manualmente clústeres, redes o contenedores ajenos para liberar espacio.

Los informes de vulnerabilidades y SBOM pueden revelar componentes y versiones. Revísalos antes de compartirlos y aplica la custodia adecuada al entorno real. Este laboratorio no incorpora cifrado ni un servicio de custodia adicional, de acuerdo con su alcance.

## 6. Interpretar problemas frecuentes

| Observación | Qué significa y cómo actuar |
|---|---|
| Docker no responde o kind no inicia | Problema de entorno; revisa que estás dentro del devcontainer y que el servicio Docker dispone de recursos. No es rechazo de F13. |
| El diagnóstico informa de cgroup v1 | Usa preferentemente un anfitrión con cgroup v2; la opción explícita de compatibilidad anterior sirve para un diagnóstico identificado, sin modificar el anfitrión ni omitir controles. |
| No puede descargar una herramienta, una imagen o la base de Trivy | Revisa conectividad, cuotas y el diagnóstico conservado. No omitas la comprobación de integridad de la descarga. |
| Trivy encuentra HIGH/CRITICAL | G debe detenerse. Revisa la base o los componentes y prepara una nueva entrega; no cambies el umbral para obtener PASS. |
| F13 se acepta | Falla el requisito: revisa la aplicación de la política, su ámbito y la ausencia real de la atestación en ese digest. |
| F13 se rechaza por firma, procedencia o red | La prueba no ha aislado la condición esperada. Primero resuelve esa causa; no cuentes el rechazo como éxito. |
| F13 se rechaza correctamente pero L01 no se admite | Revisa emisión, publicación y verificación del resumen, identidad, commit y versión de política; conserva ambas respuestas. |
| Se admite la sustitución de L01 pero falla la comprobación del despliegue | Revisa `L01-update/deployment.json`, `pods.json` y los diagnósticos funcionales. Los Pods anteriores, el digest antiguo o la preparación incompleta no satisfacen el oráculo UPDATE. |
| GitHub no muestra Run workflow | Comprueba la ubicación raíz, la presencia del workflow manual en la rama predeterminada y que Actions está habilitado. |
| GHCR o la atestación rechazan permisos | Revisa permisos del job y restricciones de organización/repositorio. No añadas credenciales de larga duración al código como solución rápida. |

## Admisión local F07

`make demo` ejecuta F13 → autorización normal → copia/eliminación/rechazo/
restauración exacta F07 local → L01 con el mismo digest y pruebas HTTP → F11 →
sustitución L01 verificada de forma independiente. Consulta el
[registro operativo](../../../EN/cases/F07/record.md) para observaciones reales y
criterios de aceptación pendientes.

Conserva `F07/before.json`, `negative.json`, `after-denial.json`, `restored.json`,
las copias OCI, `*.verify.txt`, `*.statement.json`, `controller.json`,
`admission.log`, `admission.json`, `attribution.json` y `recovery.json`.
`F07/result.json` conserva pendiente el control positivo. `F07-completed.json`
solo se escribe tras superar admisión/pruebas HTTP y comprobar el digest original
en Deployment/Pods listos (`F07/L01-*.json`). `result.json` incluye la finalización
solo cuando también pasan F11 y la sustitución. Un fallo posterior conserva las
evidencias intermedias y empaqueta FAIL global.

La vía alojada conserva su flujo y registra F07 como `NOT_EXECUTED`, con GHCR
pendiente; nunca llama al helper de mutación. El [incremento F07 CI/L04](../L04/record.md) añade una comprobación separada de sustitución antes de resultados. No se añade un escenario al catálogo ni una medición de
campaña. El comando local no despacha workflows ni cambia privilegios de paquetes.
Un fallo de restauración es un error de integración: conserva la copia original
y ambos estados de `recovery.json` para el diagnóstico.

La [compatibilidad F07 alojada](../F07/hosted-compatibility.md) recoge la sonda inactiva, los comandos propuestos y el criterio de parada. Ni `make demo` ni `golden-path.yml` la invocan. La investigación no ejecutó operaciones alojadas.

## F07 CI / L04

`make demo` también prueba la barrera CI por firma ausente del candidato de
sustitución antes de autorizar, restaura el artefacto original y comparte con L04
la admisión, despliegue y HTTP de sustitución L01. Revisa `F07-CI-completed.json`,
`L04-result.json` y `L01-update/F07-CI/`, junto con F13/F07/F11 originales. El
[registro operativo](../L04/record.md) distingue ejecuciones reales, fallos y
comprobaciones alojadas no ejecutadas, e incluye comandos locales/GitHub.
F07 negativo alojado permanece NOT_EXECUTED; no se invoca la sonda GHCR.

## F08 sobre el reemplazo local

`make demo` incorpora [F08](../F08/record.md) en `L01-update`:

```text
firma programada → F07 CI y recuperación → F08 CI y recuperación
→ autorización normal → F08 dirigido de admisión y recuperación
→ reemplazo compartido L01/L04, digest real de Pods y HTTP
```

La firma permanece legible; solo se altera su valor criptográfico. La atribución
requiere aceptación original, aislamiento exacto, autenticación independiente del
resto y rechazo criptográfico real. La recuperación elimina el manifiesto inyectado,
restaura el conjunto original y vuelve a verificar, sin firmar de nuevo. La prueba
de admisión exige primero dry-run de servidor satisfactorio y después rechazo de
la regla de firma; la aceptación real final de L04 sigue siendo obligatoria.

Conserva `L01-update/F08-CI/`, `L01-update/F08-admission/`, `CI-F08*` y
`F08-completed.json`, junto con L04 e identidad del código. Audita el hash del
archivo y todos los hashes internos, incluidos los intentos fallidos. El registro
separa ejecuciones observadas de expectativas. F08 y F07 negativo alojados siguen
`NOT_EXECUTED`; gate/L04 alojado requiere ejecución autorizada y evidencia auditada.

## Incremento de la familia SBOM

Instale el validador con `make setup-validation` antes de las pruebas locales. La sustitución incorpora F05/F06 en CI y admisión dirigida, con recuperación exacta antes de autorizar y aceptación compartida L01/L03/L04. Consulte el [procedimiento SBOM](../F05-F06-L03/runbook.md) y su limitación de integración registrada. F05/F06 negativos alojados permanecen NOT_EXECUTED.

### Inicialización de admisión

La instalación inicial no reinicia Kyverno. El laboratorio espera Pods actuales
Ready y endpoints coincidentes, y hace un dry-run de servidor con el actor
restringido: exige el rechazo exacto por resultados ausentes. Este preflight no
sustituye inventarios ni petición original F13. Los timeouts siguen siendo errores
de integración. Se conservan logs por Pod y EndpointSlices, también después del
fallo. Ver el [registro de corrección](../../../../registros/kyverno_readiness_fix_ES.md).
