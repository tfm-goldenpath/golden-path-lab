# Guía de ejecución: entrega legítima y ausencia de autorización de resultados

[Documentación en español](../../README.md)

[Guía principal en inglés](../../../EN/cases/L01-F13/runbook.md). Los comandos, los identificadores y la salida del programa son los mismos en ambos idiomas.

La primera demostración integra `quotes-node`, registro de imágenes, políticas tempranas, análisis de vulnerabilidades, SBOM, firmas, procedencia y admisión en Kubernetes. Combina **L01**, entrega legítima completa, con **F13**, ausencia de la atestación obligatoria de resultados. La [ficha del ensayo](README.md) describe su oráculo y sus límites.

Las salidas indicadas son **resultados esperados**. Una prueba unitaria satisfactoria no acredita la integración Docker/Kubernetes, y la vía local no acredita la identidad OIDC de GitHub. El resultado observado de cada ejecución queda en sus evidencias.

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

Esta entrada utiliza `scripts/demo.sh` para preparar un laboratorio aislado con **kind, zot y claves locales de desarrollo**. Construye una imagen `linux/amd64`, conserva su digest y ejecuta la secuencia de referencia y controles. Las claves de desarrollo no se guardan en Git ni son identidades válidas para la vía GitHub.

La imagen de ejecución de `quotes-node` usa **Node 24.21.0 sobre Alpine 3.24**, fijada por digest en `SERVICE_NODE_IMAGE`, separada de la imagen Debian del devcontainer. El servicio no tiene dependencias npm de producción; por ello su Dockerfile retira npm, npx y Yarn de la imagen entregada y conserva el runtime Node necesario. Trivy sigue analizando la imagen resultante y sus componentes: esta reducción no implica ausencia de vulnerabilidades ni elimina el umbral HIGH/CRITICAL.

Cuando se ejecuta una copia local fuera de un repositorio Git, el campo de commit utiliza cuarenta ceros como **sentinela de commit no disponible**. La procedencia local lo indica mediante `gitCommitAvailable: false` y conserva `sourceSnapshotSha256`, calculado sobre los archivos de origen seleccionados por el script. Esa huella permite relacionar esa copia de trabajo con la ejecución; no representa un commit real, no cubre automáticamente todos los archivos del repositorio y no acredita procedencia GitHub. En la vía B se utiliza el commit real de la ejecución alojada. Los [contratos de entrega](../../delivery-contracts.md) detallan las diferencias.

La secuencia observable esperada es:

1. El servicio y las políticas superan sus comprobaciones previas.
2. La misma imagen identificada por digest funciona en el namespace de referencia R.
3. G valida los manifiestos, analiza esa imagen con Trivy y comprueba la regla de vulnerabilidades HIGH/CRITICAL. Genera el CycloneDX original y el informe separado.
4. G firma la imagen y produce/verifica las evidencias de SBOM y procedencia correspondientes a la vía local.
5. Antes de emitir el resumen de resultados, se comprueba su ausencia para F13 y se realiza un ensayo dirigido de la barrera posterior: Kyverno en `tfm-golden` debe rechazar la petición por esa atestación ausente, manteniendo válidas las demás evidencias. El ensayo dirigido no cuenta como un escenario adicional.
6. Tras verificar los controles previos, se emite y firma el resumen satisfactorio. L01 debe ser admitido y el servicio desplegado debe responder con el resultado funcional esperado.
7. F11 se comprueba como entrada prohibida en la política temprana y mediante una actualización dirigida en admisión. También se comprueba una actualización legítima de la carga.
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

La demostración completa reutiliza el mismo digest para comparar el comportamiento funcional y la decisión de admisión. **No es una pareja de la campaña temporal**, porque construir una sola vez y reutilizar su artefacto no mide dos construcciones independientes. Los tiempos del ensayo sirven para diagnóstico; no se presentarán como la sobrecarga experimental definitiva.

## 4. Ejecutar la integración real de GitHub: vía B

Publica tú mismo el contenido en tu repositorio, conservando `.github/workflows` en su raíz. No basta con subir esa carpeta dentro de `implementacion/`. Comprueba que GitHub Actions está habilitado y que las políticas del repositorio u organización permiten los permisos declarados por el workflow y la publicación en GHCR.

1. Abre **Actions** en GitHub.
2. Selecciona **Golden Path GitHub integration**, definido en `.github/workflows/golden-path.yml`.
3. Usa **Run workflow** sobre la revisión que deseas probar. El workflow manual debe existir en la rama predeterminada para aparecer en la interfaz de ejecución.
4. Revisa los pasos de preparación, emisión de procedencia con `actions/attest` y finalización de la demostración.
5. Descarga el artefacto **`golden-path-<run-id>-<attempt>`** y conserva una copia fuera de Codespaces. El workflow configura una retención de 14 días; la copia local evita depender de esa caducidad.

El runner crea su propio clúster kind. **No necesita acceder al API del clúster del Codespace**. Publica en GHCR, firma mediante la identidad OIDC del workflow y genera procedencia alojada como bundle de Sigstore. La admisión debe verificar el emisor y la identidad autorizados, el digest y los predicados aplicables. La preparación local usa un contrato de procedencia de laboratorio; no sustituye esta prueba de emisión y consumo reales.

No se introducen tokens personales en los archivos del proyecto. Los permisos mínimos del job de entrega permiten publicación de paquetes, identidad OIDC y atestaciones; una política organizativa que los impida debe diagnosticarse como preparación del entorno. Las credenciales transitorias de acceso a GHCR no deben acabar en el paquete de evidencias.

La disponibilidad de atestaciones y las cuotas de Actions dependen de la visibilidad y del plan del repositorio. La base está orientada al repositorio público previsto para el TFM; no se deduce que cualquier combinación de repositorio privado y plan disponga de las mismas prestaciones. Usar una firma keyless o `actions/attest` **no acredita por sí solo SLSA Build L3**. Esta demostración comprueba propiedades concretas y conserva sus límites.

`act` puede ayudar a revisar pasos compatibles de workflows. No proporciona la identidad OIDC ni los servicios alojados de GitHub y, por tanto, no cierra la vía B. Para la primera prueba local completa se utiliza `make demo`.

## 5. Evidencias y limpieza

Los resultados de ejecución se guardan bajo `evidence/raw/` y los paquetes bajo `evidence/packages/`. Ambas rutas están excluidas de Git. Conserva el identificador de ejecución y la referencia inmutable de imagen para relacionar informes, firmas, respuesta de admisión y prueba HTTP.

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
| GitHub no muestra Run workflow | Comprueba la ubicación raíz, la presencia del workflow manual en la rama predeterminada y que Actions está habilitado. |
| GHCR o la atestación rechazan permisos | Revisa permisos del job y restricciones de organización/repositorio. No añadas credenciales de larga duración al código como solución rápida. |
