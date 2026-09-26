# Entorno de desarrollo y primera comprobación

[Documentación en español](README.md)

[Guía principal en inglés](../EN/environment.md). Este documento se conserva como apoyo en español; los mensajes de las herramientas se muestran en su idioma original.

## Diseño

El devcontainer proporciona Linux AMD64 con Node, herramientas de construcción y un motor Docker interno. kind crea Kubernetes sobre ese motor. Docker-in-Docker mantiene los contenedores del laboratorio separados de los gestionados directamente por el motor anfitrión; su modo privilegiado implica que no constituye una frontera de seguridad frente a código hostil.

La primera prueba utiliza una sonda de infraestructura independiente de `quotes-node`. Comprueba la instalación antes de empezar las pruebas del servicio, sin adelantar las integraciones de seguridad ni confundir la sonda con un escenario del corpus.

## Versiones y origen

| Componente | Referencia fijada | Razón y fuente |
|---|---|---|
| Node / npm | 24.21.0 / 11.19.0 | Rama LTS y pruebas nativas sin un framework adicional. [Publicación de Node](https://nodejs.org/en/blog/release/v24.21.0), [npm incluido](https://github.com/nodejs/node/blob/v24.21.0/deps/npm/package.json). |
| Imagen base | `node:24.21.0-bookworm`, manifiesto AMD64 por SHA-256 | [Imagen oficial Node](https://hub.docker.com/_/node). Referencia completa en `versions.env`. |
| Docker Engine y CLI | 29.8.0 | [Publicación oficial](https://docs.docker.com/engine/release-notes/29/#2980). Instalación desde el repositorio de Docker para Debian. |
| Feature Docker-in-Docker | 4.1.0 con archivo de bloqueo | [Feature oficial](https://github.com/devcontainers/features/tree/main/src/docker-in-docker). Identificador con etiqueta en `devcontainer.json` y digest en `devcontainer-lock.json`; Buildx y Compose automáticos desactivados. |
| Buildx | 0.37.1 | [Publicación oficial](https://github.com/docker/buildx/releases/tag/v0.37.1). Descarga AMD64 con SHA-256 fijado. |
| kind | 0.33.0 | [Publicación oficial](https://github.com/kubernetes-sigs/kind/releases/tag/v0.33.0). Descarga con SHA-256 fijado. |
| Kubernetes y kubectl | 1.35.8 | Imagen de nodo publicada para kind 0.33.0. Se elige explícitamente esta rama; la compatibilidad con Kyverno se comprobará al incorporarlo. Cliente y servidor coinciden, dentro de la [política de compatibilidad](https://kubernetes.io/releases/version-skew-policy/). |
| Git, curl, jq, make, certificados y sudo | Paquetes Debian | Utilidades auxiliares. Las versiones resueltas se conservan en `os-packages.txt` al ejecutar la prueba. |

El instalador compara las descargas de kind, kubectl y Buildx con huellas incluidas en `versions.env`. La imagen Node y el nodo kind se identifican por digest. La feature utiliza `docker-in-docker:4.1.0` como identificador compatible con el editor; su referencia resuelta e integridad se conservan en `devcontainer-lock.json`, junto a cada configuración. Ambos archivos de bloqueo forman parte del repositorio. [Especificación de lockfiles](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md). Un hash fijo detecta cambios en el objeto descargado; no demuestra por sí mismo la seguridad de su productor.

Las dependencias transitivas de los paquetes Debian y Docker no están congeladas mediante un repositorio histórico. El entorno fija las herramientas principales y registra los paquetes efectivos; no se presenta como una reconstrucción idéntica bit a bit. Antes del piloto se revisan y conservan también las versiones de las integraciones añadidas.

## Recursos y apertura

La configuración solicita al menos 2 CPU, 8 GB de RAM y 32 GB de almacenamiento. Son recursos iniciales para un nodo y una carga pequeña, sujetos a la prueba real. Las imágenes, capas y cachés consumen espacio adicional. La primera construcción descarga paquetes e imágenes; las siguientes pueden reutilizar caché.

### Equipo local

Abrir `implementacion` como carpeta de trabajo en Visual Studio Code, con Dev Containers y Docker configurado para contenedores Linux. En Windows, Docker debe disponer de su entorno Linux operativo. Seleccionar **Dev Containers: Reopen in Container**. No es necesario instalar Node, kind o kubectl globalmente en Windows.

### Codespaces

La implementación se sitúa en `implementacion/`. La configuración seleccionable de Codespaces está en `.devcontainer/implementacion/devcontainer.json`, en la raíz del repositorio, y utiliza el Dockerfile de la subcarpeta. Ambas ubicaciones deben estar en la misma rama. Al crear el Codespace, seleccionar **Golden Path - implementation** en las opciones de configuración.

La configuración local `implementacion/.devcontainer/devcontainer.json`, con nombre **Golden Path - initial environment**, se utiliza cuando se abre directamente esa carpeta con Dev Containers. Mantener las opciones de herramientas coherentes entre ambas configuraciones; `make test-env` comprueba esa correspondencia. El [README](../../README.md#commands-and-expected-results) detalla comandos y resultados esperados.

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

- **OCI Feature id contains invalid characters:** comprobar que la clave de la feature termina en `docker-in-docker:4.1.0`. El digest se conserva en el archivo de bloqueo, no en esa clave. Actualizar ambas configuraciones y sus archivos de bloqueo antes de reconstruir.
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
