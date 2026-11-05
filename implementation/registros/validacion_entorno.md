# Validación del entorno

Registro de comprobaciones separado de las instrucciones de uso.

Este registro conserva las comprobaciones de la base anterior a su importación en `golden-path-lab`. No acredita por sí solo una ejecución en este checkout ni en su Codespace. Las comprobaciones de la importación se documentan en el [registro correspondiente](validacion_importacion_ES.md).

| Comprobación | Resultado | Alcance |
|---|---|---|
| Referencias oficiales | Versiones, huellas de descargas y digests consultados en publicaciones y registros oficiales | Selección documental; no equivale a ejecutar los binarios |
| Resolución OCI de la feature | La CLI de Dev Containers resuelve `docker-in-docker:4.1.0` y genera el digest conservado en ambos `devcontainer-lock.json` | Comprobada con `upgrade --dry-run`; no requiere construir el contenedor |
| Esquema Dev Containers | Configuraciones local y de Codespaces válidas frente al [esquema base oficial](https://github.com/devcontainers/spec/blob/main/schemas/devContainer.base.schema.json) | Validación estructural; no prueba una construcción |
| Enlaces y formato de scripts | Enlaces locales resueltos y finales de línea LF en scripts, Makefile y versiones | Comprobación documental y compatibilidad de archivos con Linux |
| Pruebas de configuración y sonda | 3 pruebas satisfactorias con Node disponible en el equipo de preparación | Coherencia de referencias, adaptador de Codespaces y salida de la sonda; runtime anfitrión distinto del futuro contenedor |
| Sintaxis Bash | Correcta en los tres scripts | Comprobada en Linux mediante WSL |
| Diagnóstico de herramienta ausente | Rechazo correcto: `ERROR: Falta node; reconstruye el devcontainer.` | Linux anfitrión sin Node; no es una ejecución dentro del devcontainer |
| Registro del fallo | `FAIL`, código 1, log y versiones conservados | `evidence/environment/run-T0FR3uip/`; sin clúster creado ni kubeconfig residual |
| Motor Docker anfitrión | No disponible: tubería `docker_engine` inexistente | Cliente Docker instalado; motor sin ejecución |
| Construcción del devcontainer y prueba completa | No ejecutadas | Requieren un motor Docker Linux operativo o un Codespace |

La sonda de infraestructura no representa la implementación de `quotes-node`, una prueba del corpus ni un resultado de la campaña.

## Revisión para la base integrada

En la revisión del 21 de septiembre de 2026 se repitieron las pruebas de configuración y sonda con Node `v24.18.0` del anfitrión: **3 satisfactorias, 0 fallos**. No se ejecutó la construcción del devcontainer ni la prueba completa de Docker y kind. Este resultado no acredita la versión `v24.21.0` fijada para el contenedor ni cambia el alcance del fallo histórico conservado.

La revisión identifica como pendientes el servicio `quotes-node`, el registro, los recorridos R/G y los controles de entrega. El [plan de la base integrada](../docs/ES/implementation-plan.md) recoge su orden de implementación y las evidencias necesarias para cerrarlos.

## Cierre operativo

1. Seleccionar **Golden Path - implementación** en Codespaces, o abrir `implementacion` en Dev Containers con Docker Linux operativo.
2. Comprobar la construcción del contenedor y la validación automática de herramientas.
3. Ejecutar `make doctor` y `make smoke-env`.
4. Revisar el resultado, los logs y la limpieza de recursos; añadir la evidencia al incremento 0 del TODO.

El cierre del entorno exige el `PASS` real de la prueba completa. Las pruebas estáticas y el diagnóstico de fallo conservan su alcance propio.

## Compatibilidad del identificador OCI

El validador del editor rechazaba el carácter `@` de la referencia directa por digest con el mensaje `OCI Feature id contains invalid characters`. La clave de la feature utiliza ahora una etiqueta exacta; el digest se mantiene en el archivo de bloqueo. Se comprobó primero el fallo de las pruebas de configuración y después su resolución con las dos configuraciones y sus archivos de bloqueo coherentes. La validación del esquema JSON, por sí sola, no detectaba esta restricción del editor.
