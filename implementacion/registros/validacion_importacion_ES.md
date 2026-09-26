# Validación de la importación en golden-path-lab

La base se ha importado en el clon local de `https://github.com/tfm-goldenpath/golden-path-lab`. El punto de partida era el commit `923fe5e6f7d99fcb74377079a56f946eb57036ea`, con el README inicial. Las modificaciones de esta importación permanecen sin commit; no se han creado ramas, tags, releases ni cambios remotos.

## Alcance de los cambios

- Se han copiado 74 archivos de fuentes y configuración, conservando `implementacion/`, los workflows de la raíz y el adaptador de Codespaces.
- Se han excluido cachés, herramientas descargadas, paquetes y datos de evidencias, credenciales y borradores de asistencia. No se han modificado los archivos de origen.
- La imagen de GHCR se deriva de `GITHUB_REPOSITORY`: `ghcr.io/<owner>/<repository>-quotes-node`. Para este repositorio corresponde a `ghcr.io/tfm-goldenpath/golden-path-lab-quotes-node`.
- La huella de fuentes omite `tests/policies/.tools/`, además de las exclusiones existentes de dependencias y cachés Python. El contenido de herramientas descargadas no debe alterar la identidad de las fuentes.
- Se han incorporado README raíz, exclusiones de Git, atributos de texto y changelog sin versión publicada. Se han adaptado las referencias documentales a la separación de la memoria y se han identificado los resultados anteriores como históricos.

## Comprobaciones realizadas

| Comprobación | Resultado y alcance |
|---|---|
| Node en Windows | 78 pruebas satisfactorias: 75 del servicio/auxiliares y tres de configuración/sonda. Node del anfitrión: 24.18.0. |
| Python en Windows | Siete pruebas del generador satisfactorias con Python 3.10.0. |
| Suite en Linux | `make test` satisfactorio usando la imagen de herramientas local `tfm-devtools:local`, sin acceso de red y con las fuentes montadas en solo lectura. Incluye las 78 pruebas Node, las siete Python y las pruebas de políticas. |
| Conftest en Linux | 35 decisiones positivas/negativas satisfactorias; también pasan los controles sobre los dos workflows reales y el manifiesto generado. |
| Kyverno CLI en Linux | Nueve comprobaciones satisfactorias con `tests/policies/run_kyverno.py`. No requieren ni demuestran un clúster real. |
| Contexto de publicación | Comprobación aislada con identidad y token sintéticos, sin publicar: nombre de imagen propio del repositorio, normalización a minúsculas, identidad exacta del workflow y commit fuente conservados. |
| Huella de fuentes | Una variación del caché `.tools` no cambia la huella; una variación de una fuente sí la cambia. Comprobado en una preparación temporal independiente. |
| Importación | Las huellas de los archivos originales se conservan. No se han copiado claves, datos de ejecución, cachés ni metadatos Git del espacio original. |

El intento con el ejecutable Conftest nativo de Windows no se considera satisfactorio: 24 de 35 decisiones pudieron verificarse y varias ejecuciones terminaron con un fallo del runtime Go (`unexpected return pc` / `unknown caller pc`). Este resultado se conserva como incidencia del entorno de comprobación, no como rechazo atribuible a una política. Las 35 decisiones se verificaron posteriormente en Linux, la plataforma prevista para el laboratorio, sin cambiar las reglas.

## Pendiente de integración

Esta validación comprueba la importación y la regresión de código y políticas; no es una nueva ejecución completa de A, un arranque del Codespace ni una campaña. La vía B necesita ejecutar el workflow real en este repositorio, revisar acceso y visibilidad del paquete GHCR, identidad OIDC, procedencia y verificación por admisión. Los resultados de la base anterior no sustituyen esa comprobación.

Las instrucciones de asistencia, el lint adicional, Dependabot y los rulesets se mantienen como incrementos y configuraciones posteriores. No se han activado por copiar la base. El README raíz contiene los comandos de inicio y los enlaces a las guías.
