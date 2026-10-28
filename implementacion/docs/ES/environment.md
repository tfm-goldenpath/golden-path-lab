# Entorno de desarrollo y primera comprobación

[Documentación en español](README.md)

[Guía principal en inglés](../EN/environment.md). Este documento se conserva como apoyo en español; los mensajes de las herramientas se muestran en su idioma original.

## Diseño

El devcontainer proporciona Linux AMD64 con Node, herramientas de construcción y un motor Docker interno. kind crea Kubernetes sobre ese motor. Docker-in-Docker mantiene los contenedores del laboratorio separados de los gestionados directamente por el motor anfitrión; su modo privilegiado implica que no constituye una frontera de seguridad frente a código hostil.

La primera prueba utiliza una sonda de infraestructura independiente de `quotes-node`. Comprueba la instalación antes de empezar las pruebas del servicio, sin adelantar las integraciones de seguridad ni confundir la sonda con un escenario del corpus.

## Versiones y origen

| Componente | Referencia fijada | Razón y fuente |
|---|---|---|
| Node / npm | 24.22.1 / 11.19.1 | Rama LTS y pruebas nativas sin un framework adicional. [Publicación de Node](https://nodejs.org/en/blog/release/v24.22.1), [npm incluido](https://github.com/nodejs/node/blob/v24.22.1/deps/npm/package.json). |
| Imagen base | `node:24.22.1-bookworm`, manifiesto AMD64 por SHA-256 | [Imagen oficial Node](https://hub.docker.com/_/node). Referencia completa en `versions.env`. |
| Imagen de ejecución del servicio | Node 24.22.1 / Alpine 3.23, manifiesto AMD64 por SHA-256 | Rama `main` de Alpine con soporte y reconocida por los metadatos de fin de soporte de Trivy 0.76.1. Referencia `SERVICE_NODE_IMAGE` en [versions.env](../../versions.env) y [justificación de compatibilidad](../../services/quotes-node/README.md). |
| Docker Engine y CLI | 29.9.2 | [Publicación oficial](https://docs.docker.com/engine/release-notes/29/#2992). Instalación desde el repositorio de Docker para Debian. |
| Feature Docker-in-Docker | 4.1.3 con archivo de bloqueo | [Feature oficial](https://github.com/devcontainers/features/tree/main/src/docker-in-docker). Identificador con etiqueta en `devcontainer.json` y digest en `devcontainer-lock.json`; Buildx y Compose automáticos desactivados. |
| Buildx | 0.38.1 | [Publicación oficial](https://github.com/docker/buildx/releases/tag/v0.38.1). Descarga AMD64 con SHA-256 fijado. |
| kind | 0.33.0 | [Publicación oficial](https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0). Descarga con SHA-256 fijado. |
| Kubernetes y kubectl | 1.35.8 | Imagen de nodo publicada para kind 0.33.0. Se conserva esta rama dentro del soporte 1.33–1.35 de Kyverno 1.19; su migración pertenece a otra rama. Cliente y servidor coinciden, dentro de la [política de compatibilidad](https://kubernetes.io/releases/version-skew-policy/). |
| Git, curl, jq, make, certificados y sudo | Paquetes Debian | Utilidades auxiliares. Las versiones resueltas se conservan en `os-packages.txt` al ejecutar la prueba. |

El instalador compara las descargas de kind, kubectl y Buildx con huellas incluidas en `versions.env`. La imagen Node y el nodo kind se identifican por digest. La feature utiliza `docker-in-docker:4.1.3` como identificador compatible con el editor; su referencia resuelta e integridad se conservan en `devcontainer-lock.json`, junto a cada configuración. Los tres archivos de bloqueo forman parte del repositorio. [Especificación de lockfiles](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md). Un hash fijo detecta cambios en el objeto descargado; no demuestra por sí mismo la seguridad de su productor.

Los paquetes Debian del build proceden de snapshots firmados de Debian y Debian-security de `20261025T000000Z`, definidos en `.devcontainer/debian.sources`. `Check-Valid-Until: no` permite usar el archivo fechado, manteniendo la verificación con el llavero de Debian. La feature Docker usa el repositorio firmado de Docker para Debian y fija Engine/CLI; no congela todas sus dependencias transitivas. Conservar `dpkg-query -W`; no se afirma reproducibilidad bit a bit.

Trivy 0.76.1 ya incluye Alpine 3.24 en su [tabla de fin de soporte](https://github.com/aquasecurity/trivy/blob/v0.76.1/pkg/detector/ospkg/alpine/alpine.go). El servicio conserva Alpine 3.23: cambiar la distribución requiere construcción, pruebas del servicio y análisis real propios. No se ocultan avisos ni se rebaja el umbral HIGH/CRITICAL.

El mantenimiento selecciona Trivy 0.76.1, Conftest 0.71.1, Cosign 3.1.4, Kyverno 1.19.2/chart 3.9.2 y Helm 4.3.1. El único [registro de mantenimiento](../../../docs/EN/maintainers/security-toolchain-refresh-validation.md) recoge fuentes, firmas, pruebas reales y validación alojada pendiente. [tools.lock.json](../../tools.lock.json) conserva los pins. El comprobador muestra el ejecutable elegido por PATH: una copia antigua en `.tools/bin` no debe ocultar la nueva. Reinstala desde el lock o reconstruye la imagen y ejecuta doctor. Los registros históricos conservan sus versiones.

## Recursos y apertura

La configuración solicita al menos 4 CPU, 16 GB de RAM y 32 GB de almacenamiento. Son recursos iniciales para un nodo y una carga pequeña, sujetos a la prueba real. Las imágenes, capas y cachés consumen espacio adicional. La primera construcción descarga paquetes e imágenes; las siguientes pueden reutilizar caché.

### Equipo local

Abrir `implementacion` como carpeta de trabajo en Visual Studio Code, con Dev Containers y Docker configurado para contenedores Linux. En Windows, Docker debe disponer de su entorno Linux operativo. Seleccionar **Dev Containers: Reopen in Container**. No es necesario instalar Node, kind o kubectl globalmente en Windows.

### Codespaces

La implementación se sitúa en `implementacion/`. La configuración seleccionable de Codespaces está en `.devcontainer/implementacion/devcontainer.json`, en la raíz del repositorio, y utiliza el Dockerfile de la subcarpeta. Ambas ubicaciones deben estar en la misma rama. Al crear el Codespace, seleccionar **Golden Path - implementation** en las opciones de configuración.

La configuración local `implementacion/.devcontainer/devcontainer.json`, con nombre **Golden Path - initial environment**, se utiliza cuando se abre directamente esa carpeta con Dev Containers. Mantener las opciones de herramientas coherentes entre las tres configuraciones; `make test-env` comprueba esa correspondencia. El [README](../../README.md#commands-and-expected-results) detalla comandos y resultados esperados.

Codespaces debe disponer de los recursos solicitados y de acceso a los registros y publicaciones oficiales. Las prestaciones de estudiante dependen de la cuenta, la elegibilidad y la cuota disponible. Consultar [facturación y consumo de Codespaces](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces) antes de crear la máquina; parar los Codespaces sin uso y revisar el almacenamiento retenido. No se presupone gratuidad ilimitada.

## Comandos

| Comando | Comprobación | Efectos |
|---|---|---|
| `make test-env` | Coherencia de referencias y comportamiento de la sonda | No usa Docker ni Kubernetes |
| `bash scripts/check-environment.sh --tools-only` | Versiones fijadas y pruebas de archivos | Se ejecuta al crear el devcontainer |
| `make doctor` | Herramientas, versiones y motor Docker | No crea clúster |
| `make smoke-env` | Imagen, ejecución Docker y ejecución Kubernetes | Crea recursos temporales y conserva evidencias locales |

La prueba completa requiere una orden explícita. Crea un nombre único, un kubeconfig propio y un namespace `tfm-environment` dentro del clúster temporal. No selecciona ni modifica el contexto Kubernetes habitual. La imagen se carga directamente con `kind load docker-image`; el Job usa `imagePullPolicy: Never`, por lo que no necesita publicar en un registro.

## Criterio de aceptación

La ejecución termina con `PASS` si se cumplen todas estas condiciones:

1. Las herramientas principales coinciden con las versiones fijadas y Docker responde en Linux AMD64.
2. La imagen se construye y supera la prueba Node durante la construcción.
3. El contenedor devuelve la salida esperada con el runtime y la plataforma previstos.
4. El nodo kind alcanza `Ready` con la versión Kubernetes elegida.
5. La creación y actualización de un ConfigMap conservan el valor esperado.
6. El Job termina correctamente y produce la misma salida de la sonda.

Las esperas máximas son límites operativos de diagnóstico, no umbrales de aceptación temporal de la campaña. Esta prueba no evalúa políticas de admisión, firma, SBOM, vulnerabilidades ni procedencia. La imagen de sonda se referencia por una etiqueta temporal local; la política de despliegue por digest se implementa con los controles del Golden Path.

## Evidencias y limpieza

Cada intento conserva `result.json`, `run.log`, `versions.env`, versiones del motor, paquetes instalados, inspección de la imagen y salidas de Docker/Kubernetes en `evidence/environment/run-*`. En un fallo de clúster se intenta exportar también el diagnóstico de kind. Estas carpetas quedan excluidas de Git.

El identificador de imagen de Docker y `imageID` de Kubernetes se registran tal como los informa cada herramienta: pueden designar objetos diferentes y esta prueba no los presenta como prueba de igualdad de digests de entrega.

Al terminar se elimina el clúster temporal y la etiqueta de la imagen de sonda. Se conservan imágenes base y cachés. Si falla la eliminación del clúster, el resultado es `FAIL` y se conserva su kubeconfig para el diagnóstico. No se ejecuta una limpieza global de Docker. Revisar los logs antes de compartirlos; no se añade un sistema de custodia adicional.

## Diagnóstico

- **OCI Feature id contains invalid characters:** comprobar que la clave de la feature termina en `docker-in-docker:4.1.3`. El digest se conserva en el archivo de bloqueo, no en esa clave. Actualizar las tres configuraciones y sus archivos de bloqueo antes de reconstruir.
- **Timeout DNS de BuildKit en kind:** consultar el [diagnóstico y recuperación del firewall](kind-network-firewall.md), con la solución temporal y la propuesta para Codespaces.
- **Docker no responde:** comprobar el motor anfitrión para abrir el contenedor; dentro de él, revisar el servicio Docker-in-Docker y reabrir el devcontainer.
- **Versión distinta:** reconstruir el devcontainer después de modificar las referencias. No sustituir valores por `latest` para continuar.
- **Descarga o checksum incorrectos:** comprobar red, proxy y publicación oficial. La instalación se detiene ante una discrepancia.
- **Nodo sin recursos o espera agotada:** revisar logs, memoria y espacio; el fallo sigue siendo una incidencia de infraestructura.
- **Plataforma ARM:** esta base requiere AMD64; ARM se mantiene como ampliación opcional.

## Incorporación de herramientas posteriores

| Incremento | Herramientas y comprobación |
|---|---|
| Servicio mínimo | Contrato de `quotes-node`, pruebas y dependencias con archivo de bloqueo |
| Procedencia y admisión | Kyverno, Cosign y mecanismos de Actions; verificar formato, identidad, recuperación y digest con OIDC real |
| Controles tempranos | Conftest y entradas separadas por tipo |
| Vulnerabilidades y SBOM | Trivy, base de datos y esquema CycloneDX comprobados |
| Vía A completa | act y zot; compatibilidad del workflow y conectividad del registro |

Las versiones de estos componentes se fijan al incorporar cada integración. `act` sirve para el recorrido local; la identidad OIDC y los servicios de la vía B se comprueban en GitHub Actions.

## Validación reproducible del carril A

[Ejecute ambas suites independientes](lane-a-validation.md) en el devcontainer fijado, con parada por prerrequisitos, prueba acotada de BuildKit y artefactos separados de bases congeladas. Es integración funcional; aceptación humana pendiente.

## Codespace limpio y Codex opcional

En GitHub: **Code → Codespaces → … → New with options**. Seleccionar la rama revisada,
**Golden Path - implementation** y una máquina de **4 cores / 16 GB RAM / al menos
32 GB de disco**. Los tres perfiles comparten instalador y mínimos. No restaurar
evidencias, mediciones, sesiones, bases ni cachés anteriores para validar el entorno.
`hostRequirements` expresa [mínimos](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/configuring-dev-containers/setting-a-minimum-specification-for-codespace-machines):
no cambia la máquina existente ni limita el consumo; elegir la máquina real en
Codespaces. 32 GB totales no equivalen a espacio libre.

Un Codespace nuevo tiene almacenamiento independiente. **Codespaces: Full Rebuild
Container** reconstruye sin caché de build, pero conserva el workspace: no crea
un Codespace limpio ni cambia su tamaño. Guardar y publicar la rama antes de
interrumpir la sesión, dejando SHA y comprobaciones realizadas/pendientes.
[Guía oficial de reconstrucción](https://docs.github.com/en/codespaces/developing-in-a-codespace/rebuilding-the-container-in-a-codespace).
Tras reconectar:

```bash
nproc
free -h
df -h
df -i
docker_root=$(docker info --format '{{.DockerRootDir}}')
df -h "$docker_root"
df -i "$docker_root"
docker system df
make -C implementacion setup-validation
make -C implementacion doctor
codex --version
codex --help
```

No sumar espacio libre de rutas del mismo filesystem. Ejecutar builds, smoke e
integraciones secuencialmente y mantener como máximo un laboratorio Kubernetes.
Se mantienen los 3 GiB de reserva y márgenes de crecimiento, incluidos 5 GiB para
Docker antes de crear infraestructura. Detener la operación si no cabe. El hook
solo instala dependencias de validación y comprueba herramientas; es repetible.
No inicia Kubernetes, descarga bases de vulnerabilidades ni lanza agentes.

La imagen común instala **Codex CLI 0.164.0** desde npm oficial con manifiesto/lock
separados en `.devcontainer/codex/`, incluida la dependencia nativa Linux AMD64.
Está en PATH para `node`; versión y ayuda no requieren login. La entrega, doctor y
CI no dependen de Codex ni de una cuenta. La extensión **openai.chatgpt** es otro
cliente para el editor: los perfiles declaran su identificador, comprobado en la
[documentación oficial](https://learn.chatgpt.com/docs/codex/ide), sin fijar su
versión reproduciblemente ni configurar un ejecutable externo.

La autenticación es opcional y personal. Según las guías oficiales de
[CLI](https://learn.chatgpt.com/docs/codex/cli) y [autenticación remota](https://learn.chatgpt.com/docs/auth),
usar `codex login` para el navegador o `codex login --device-auth` en remoto cuando
esté habilitado en la cuenta/workspace. Completar el código de un solo uso en
privado. Esta rama no habilita permisos de organización, modifica sandbox/reglas
de aprobación ni sobrescribe configuración personal. No guardar tokens, claves,
`auth.json` o sesiones en imagen, Git, logs ni paquetes. La validación no autentica
al usuario ni hace solicitudes a modelos.

Desde un candidato confirmado y entradas de entrega limpias:

```bash
make -C implementacion test-env
make -C implementacion test
make -C implementacion smoke-env
# Confirmar que smoke terminó su limpieza antes de continuar.
make -C implementacion deliver
```

La [guía de entrega legítima](../../../docs/ES/legitimate-delivery.md) define el
resultado y paquete. Smoke carga directamente en kind y no sustituye registro,
DNS/BuildKit, firma, admisión, rollout y HTTP. Para repetir limpieza de una entrega
terminada e identificada, usar su ruta absoluta:

```bash
bash implementacion/scripts/deliver.sh cleanup "$PWD/implementacion/evidence/raw/delivery-RUN_ID"
```

Comprobar estado, recibos inmutables y procesos/sesiones antes de limpiar; para
otros perfiles usar su propio comando documentado. Inventariar rutas exactas con
`du -xh --max-depth=2 implementacion/evidence implementacion/.tmp` y recursos con
`docker system df`, `docker ps -a`, `docker volume ls`. Retirar solo ejecuciones de
desarrollo terminadas o cachés regenerables identificadas, tras comprobar rutas
absolutas, enlaces simbólicos y usuarios activos. Ignorado por Git no significa
descartable. Conservar código sin publicar, credenciales y archivos versionados;
resolver aparte paquetes históricos únicos o datos desconocidos. No usar borrados
ni prune generales, ni retirar activos remotos.

Conservar para la siguiente PR SHA, máquina/perfil/imagen, versiones, comandos y
resultados, diagnósticos pendientes, digest del servicio, identidad de DB, checksum
del paquete final y recibos de limpieza. Solo el paquete final relevante fuera de
Git y un registro compacto; indicar originales intermedios descartados. Las nuevas
validaciones no sustituyen observaciones históricas. Véase el
[registro de actualización](../../../docs/EN/maintainers/devcontainer-refresh-validation.md).
