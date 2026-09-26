# Validación de la primera integración

Este registro distingue resultados observados y comprobaciones pendientes. Los paquetes locales completos se generan en `evidence/packages/`; los archivos grandes y temporales no forman parte del código que se publica.

Las ejecuciones descritas a continuación pertenecen a la base previa a la importación en `golden-path-lab`. Sus paquetes no se copian al nuevo repositorio. No constituyen resultados de su integración alojada; las comprobaciones efectuadas en el nuevo checkout se recogen en el [registro de importación](validacion_importacion_ES.md).

## Comprobaciones realizadas

- Construcción correcta de la imagen de herramientas del devcontainer: Node 24.21.0, kind 0.33.0, kubectl 1.35.8, Trivy 0.74.0, Conftest 0.70.1, Cosign 3.1.3, Helm 4.3.0, Kyverno 1.19.1 y act 0.2.89. Se verificaron los checksums configurados durante la instalación.
- 41 pruebas del servicio y 27 de contratos, procedencia GitHub, preparación de F13 y empaquetado: correctas en Linux. Las tres pruebas de configuración/sonda del entorno también pasaron.
- 35 decisiones positivas/negativas ejecutadas con Conftest: correctas. Los dos workflows reales cumplen las reglas de SHA y permisos.
- Siete pruebas del generador Kyverno, diez documentos contrastados con el CRD oficial y nueve comprobaciones de configuración con Kyverno CLI: correctas. La prueba del motor permitió corregir una interacción entre autogen y la prohibición de contenedores efímeros.
- La imagen final del servicio, basada en Node 24.21.0 sobre Alpine, ejecuta las 41 pruebas con UID 10001, sistema de archivos de solo lectura y capacidades eliminadas. También se comprobó su API empaquetada: salud, versión y cotización.
- Dos paquetes de ejecuciones fallidas conservan hashes internos y externos correctos. La regresión de empaquetar dos veces está probada.

Las pruebas del contenido de procedencia GitHub utilizan fixtures sintéticos identificados. No equivalen a una firma OIDC real ni a la aceptación de esos bundles por el clúster.

## Imagen de ejecución

Se analizaron variantes oficiales de Node con Trivy y datos de vulnerabilidades actualizados el 21 de septiembre de 2026. La variante Debian slim examinada contenía HIGH/CRITICAL. La variante Alpine seleccionada no presentaba hallazgos del sistema operativo en ese análisis, pero incluía hallazgos en npm. El runtime elimina físicamente npm y Yarn porque el servicio no utiliza dependencias de producción ni instala paquetes al arrancar. No se añadieron exclusiones de vulnerabilidades ni se relajó el umbral.

La ausencia de hallazgos en una base no acredita la imagen final: cada ejecución de `make demo` vuelve a analizar el digest realmente publicado antes de autorizarlo. El informe y la identificación de la base de Trivy quedan en las evidencias.

## Entorno anfitrión y ensayos iniciales

La validación local se realiza con las herramientas Linux fijadas dentro de un contenedor, sobre Docker Desktop 24.0.5 y un anfitrión con cgroup v1. No es una apertura completa de Codespaces ni el motor Docker 29.8.0 previsto por la configuración.

1. `run-PxsjmaxK`: el arranque inicial de Kubernetes 1.35 falló antes de desplegar el servicio. Esta versión no inicia kubelet sobre cgroup v1 por defecto. Se conservó el diagnóstico como fallo de entorno.
2. `run-dsoc16hg`: el clúster arrancó con la opción diagnóstica de compatibilidad. La construcción, publicación en zot y descarga por digest funcionaron, pero la espera de disponibilidad del servicio agotó 180 segundos durante una prueba con alta contención de recursos. Una inspección posterior encontró el Pod `1/1 Running`. La ejecución permanece fallida; no se convierte retroactivamente en PASS.
3. `run-WLR5rPrl`: el registro no respondió dentro de su ventana de arranque. Se incorporaron comprobación de proceso, espera acotada mayor y conservación de logs del registro. Se mantiene la ejecución fallida.
4. `run-1TzQYije`: la imagen final superó Trivy sin HIGH/CRITICAL; se generó CycloneDX 1.7 con veinte componentes y se verificaron las firmas y la procedencia. Kyverno rechazó F13 exclusivamente por `tfm-results/autogen-require-results` y aceptó L01 tras publicar el resumen. La comprobación HTTP posterior encontró una carrera al leer el log de port-forward antes de su creación; se corrigió preparando el archivo antes del proceso y controlando directamente su PID. El ensayo completo permanece fallido hasta repetirlo con esa corrección.

La compatibilidad configura `failCgroupV1: false` únicamente en el clúster efímero; no cambia el sistema anfitrión ni las reglas de aceptación. La base recomendada es cgroup v2. [Documentación de Kubernetes](https://kubernetes.io/docs/concepts/architecture/cgroups/).

## Aceptación de extremo a extremo

El ensayo `run-m8WwPmxH` completó la admisión y respuesta HTTP de L01 y el rechazo específico de F13, pero la comprobación adicional F11 fue rechazada por validación estructural de Kubernetes. Se corrigió la combinación de parámetros de la inyección y se añadió un dry-run previo para comprobar que el objeto alcanza la barrera prevista. Ese ensayo tampoco se presenta como ejecución global satisfactoria.

**Vía A: PASS en `run-8N59m8xw`.** La ejecución terminó con código cero y retiró sus recursos temporales. La imagen publicada fue `sha256:855327e182857d5f61c38a246db23060fa24d2824d3541d05cc992d4570b36a3`.

| Comprobación real | Resultado |
|---|---|
| R: publicación, descarga por digest y API | Correcto. |
| Trivy de la imagen final | Ningún hallazgo HIGH/CRITICAL; política satisfecha. |
| SBOM, firma de imagen y procedencia | Generados y verificados; CycloneDX 1.7. |
| F13 previo y admisión | Ausencia acreditada; rechazo exclusivo de la regla de resultados. |
| L01 tras firmar resultados | Admitido; salud, versión y cotización correctas. |
| F11 | Entrada válida para la API; rechazo temprano y rechazo de actualización por `tfm-runtime`. |
| Actualización legítima | Admitida, con servicio funcional. |

Evidencias conservadas fuera de este checkout: `evidence/raw/run-8N59m8xw/result.json`, `F13-admission.log` y `F11-admission.log` de la misma ejecución, y `evidence/packages/run-8N59m8xw.tar.gz` en el espacio original. Estas rutas estaban excluidas de Git; el paquete se conserva por separado. Se verificaron los hashes internos y externo y la exclusión de estado, kubeconfig y claves privadas. El resultado acredita la vía local en el entorno de compatibilidad descrito, no una ejecución de Codespaces ni una campaña temporal.

La vía B está implementada y revisada estáticamente, pero **pendiente de ejecución real en GitHub**. Requiere publicar los archivos y lanzar el workflow manual para comprobar GHCR, identidad OIDC, procedencia nativa y consumo de SigstoreBundle en Kyverno. No se ha publicado ni modificado ningún repositorio remoto durante esta preparación.

## Regresión tras la separación modular

La reorganización conserva la CLI y los controles: `demo.sh` coordina los cinco módulos de `scripts/lib/` y los escenarios L01, F13 y F11 de `tests/scenarios/`. La huella de fuentes incorpora ahora `tests/`. Los nombres de las evidencias y las fases del workflow se mantienen.

- Sintaxis Bash e importación de los módulos sin efectos: correctas.
- 75 pruebas Node del servicio y auxiliares, incluidas siete nuevas pruebas de orquestación, y tres pruebas del entorno: correctas. Las siete nuevas pasan también en Windows con Git Bash. Usan etapas simuladas para comprobar fases y propagación de fallos; no equivalen a ejecutar GitHub Actions.
- Siete pruebas Python del generador, 35 decisiones con Conftest, controles sobre los workflows reales y nueve comprobaciones con el motor Kyverno: correctas.

**Vía A: PASS en `run-KBAh0L6O`.** La imagen `sha256:7dcf53fb136b161a7ca0738d32279a8c31155f24dc5afb958d62c19340d76850` recorrió R y G sin reconstruirse. Trivy analizó la imagen con la base actualizada; se verificaron firma, SBOM y procedencia; F13 fue rechazado exclusivamente por la regla de resultados; tras firmar la autorización, L01 fue admitido y devolvió la cotización esperada. F11 fue rechazado en la política temprana y al intentar actualizar la carga; la actualización legítima fue aceptada.

La ejecución terminó con código cero. Se comprobaron los hashes internos y externo del paquete, la exclusión de credenciales, la eliminación del directorio privado y la ausencia de contenedores del ensayo. Evidencias conservadas en el espacio original, fuera de este checkout: `evidence/raw/run-KBAh0L6O/result.json` y `evidence/packages/run-KBAh0L6O.tar.gz`. Se utilizó el mismo entorno Linux sobre Docker Desktop con compatibilidad explícita para cgroup v1 descrito anteriormente; sigue siendo una integración funcional, no una campaña de medición. La ejecución alojada de B continúa pendiente.
