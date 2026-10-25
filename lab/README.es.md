# Laboratorio

[Introducción del producto](../README.es.md) · [English](README.md)

El laboratorio ejecutable sigue en `implementacion/`. Este directorio es solo una
entrada de navegación, separada de la [explicación de entrega](../docs/ES/how-it-works.md).

## Ejecutar el laboratorio

El [runbook L01/F13](../implementacion/docs/ES/cases/L01-F13/runbook.md) define
prerrequisitos, respuestas y limpieza propia. Consulta [entorno](../implementacion/docs/ES/environment.md)
y [README de implementación](../implementacion/README.md). Desde la raíz en el
devcontainer Linux AMD64 configurado:

```bash
make -C implementacion doctor
make -C implementacion test
make -C implementacion demo
```

La demo crea kind, registro, builder y namespaces; construye imágenes inicial/de
reemplazo, ejercita fallos/positivos, conserva evidencia y limpia infraestructura
propia. Necesita Docker, red y espacio libre suficiente. La configuración de
implementación pide 2 CPU / 8 GB / 32 GB; defensa pide 4 CPU / 16 GB / 32 GB.
Son solicitudes, no garantías de capacidad libre. Leer documentación no requiere
esos recursos. No borres evidencias ni hagas una limpieza global de Docker.

La [integración alojada](../.github/workflows/golden-path.yml) es manual y publica
en GHCR con attestations GitHub; una edición o ejecución local no autoriza lanzarla.

## Escenarios y configuraciones

La [matriz de veinte escenarios](../implementacion/docs/ES/evaluation-readiness.md)
es la entrada a **F01–F14 y L01–L06**, revisiones/ejecuciones reales, observaciones
compartidas, fronteras sin ejecutar y aceptación. El [índice técnico](../implementacion/docs/ES/README.md)
enlaza runbooks; los [módulos](../implementacion/tests/scenarios/) poseen fixtures y oráculos.

- **R/G** selecciona referencia o controles Golden Path. `make reference` omite controles de evidencia G y es una comparación experimental.
- **A/B** selecciona confianza de clave local o GitHub OIDC real. Un devcontainer alojado con claves locales sigue siendo A; `act` no prueba B.
- F01/F02 son estáticos. Los negativos alojados no soportados, incluido F07, siguen `NOT_EXECUTED`.
- Entregas compartidas L01/L03/L04 y positivos no son muestras independientes. Recuperar F13 con el mismo digest no es reemplazo L01.

## Mediciones y límites

Tras [preparación de evaluación](../implementacion/docs/ES/evaluation-readiness.md),
consulta el dataset correspondiente: [reparaciones automatizadas](../implementacion/docs/ES/automated-remediation.md),
[piloto de cuatro pares](../implementacion/docs/ES/paired-rg-pilot-review.md) o
[campaña de diez pares](../implementacion/docs/ES/paired-rg-campaign-results.md).
El [protocolo](../implementacion/docs/ES/paired-rg-measurements.md) y
[análisis de recursos](../implementacion/docs/ES/economic-evaluation.md) definen las
magnitudes. Los ensayos funcionales son otro dataset. Esfuerzo humano, calibración
elegible y congelación de límites siguen aplazados; reparaciones conocidas no son
productividad humana.

## Registros y aceptación

Los [registros originales](../implementacion/registros/) mantienen bytes, fechas y
límites. La [decisión del 4 de octubre](../implementacion/registros/evaluation_acceptance_20261004_ES.md)
cierra alcance reducido. Las observaciones posteriores del catálogo corregido
conservan su revisión propia. Éxito técnico, release o merge no amplían esa declaración.

## Defensa y demostración

La [guía por objetivo](../implementacion/docs/ES/defense/README.md) explica preparación,
controles, grabación, exportación offline y ciclo de vida. La [demo grabada publicada](https://tfm-goldenpath.github.io/golden-path-lab/demo/)
muestra evidencia histórica seleccionada sin Kubernetes; no es un panel vivo ni el
freeze privado completo. Se mantiene el vídeo silencioso original. Narración y
reproducción en el ordenador de presentación fueron excluidas de la tarea de release
por el propietario; no bloquean P00/P01.

## Release congelada y recuperación

[lab-v2026.10.24](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/lab-v2026.10.24)
conserva fuente seleccionada y transportes originales. La [guía](../implementacion/docs/ES/lab-release-freeze.md)
y la [especificación](../implementacion/releases/lab-freeze.inputs.json) definen
anclas, capacidad y custodia pública/privada. El [estado P00 (EN)](../docs/EN/maintainers/repository-map.md#p00-baseline)
recoge el informe de verificación independiente y los huecos humanos/de custodia.
La release es mutable (`immutable=false`). Custodia de frozen-0002 no implica
custodia de todo el expediente de evaluación.
