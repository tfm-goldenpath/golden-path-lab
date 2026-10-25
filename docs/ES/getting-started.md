# Primeros pasos

[Índice](README.md) · [English](../EN/getting-started.md)

## Leer e inspeccionar sin clúster

1. Lee [el flujo de entrega](how-it-works.md). Sigue un digest desde el build hasta autorización y admisión; separa el informe de vulnerabilidades del SBOM.
2. Abre la [matriz de preparación](../../implementacion/docs/ES/evaluation-readiness.md). Elige una observación y anota SHA, carril, ejecución y frontera. Código o CI verde no demuestran ejecución de escenario.
3. Consulta el [registro A corregido](../../implementacion/registros/lane_a_corrected_91a33e9_ES.md) y su [índice JSON](../../implementacion/registros/lane-a-corrected-91a33e9.json). Los [resultados de campaña](../../implementacion/docs/ES/paired-rg-campaign-results.md) miden tiempos y no repiten el catálogo funcional.
4. Lee la [declaración canónica](../../implementacion/registros/evaluation_acceptance_20261004_ES.md) con sus fechas. No acepta nuevas revisiones ni negativos alojados sin ejecutar.
5. Para logs seleccionados y el vídeo silencioso original, abre la [demo grabada](https://tfm-goldenpath.github.io/golden-path-lab/demo/). Es una presentación congelada, no una ejecución activa ni el archivo completo. La [recuperación de release](../../implementacion/docs/ES/lab-release-freeze.md) requiere anclas independientes y capacidad; el [estado P00 (EN)](../EN/maintainers/repository-map.md#p00-baseline) distingue lo verificado.

Estos pasos solo necesitan navegador. En un checkout existente, estos comandos
solo leen la implementación y el índice pequeño versionado:

```bash
git ls-files implementacion/scripts/lib implementacion/policies
cat implementacion/registros/lane-a-corrected-91a33e9.json
```

Leer índices/hashes no vuelve a autenticar firmas. Atribuye fallos usando informe
original, regla y contexto; un código no cero no prueba rechazo de política.
Usa herramientas revisadas, no código recuperado de los archivos.

## Ejecutar deliberadamente el laboratorio

Sigue la [entrada al laboratorio](../../lab/README.es.md) y su runbook.
El devcontainer de implementación solicita 2 CPU / 8 GB RAM / 32 GB disco; el entorno
solicitado para P01 es 4 CPU / 16 GB / 32 GB. Hay que comprobar espacio libre real.
Ejecutar requiere Linux AMD64, herramientas fijadas, Docker y red.
Tras preparar el entorno, desde la raíz:

```bash
make -C implementacion doctor
make -C implementacion test
make -C implementacion demo
```

`doctor` comprueba herramientas y Docker. `test` ejecuta pruebas compartidas de
entorno, servicio/unidad, políticas, criptografía offline, workflows estáticos,
defensa y release; no es una entrega Kubernetes. `demo` construye imágenes,
crea kind/registro/builder y namespaces, ejecuta referencia y controles con fallos
y recuperación, limpia infraestructura propia y conserva evidencias en
`implementacion/evidence/raw/` y `implementacion/evidence/packages/`.
Estado privado/claves y bases congeladas tienen reglas de conservación separadas.
`make reference` es referencia experimental sin controles G, no una alternativa
segura para consumidores. La integración alojada publica imágenes/evidencias y
requiere autorización remota deliberada.

## Plantilla de consumidor: prevista

El [coordinador local P03](legitimate-delivery.md) permite una entrega legítima
con estado nuevo en este checkout. Su interfaz es interna; no hay instalador
autónomo ni plantilla de consumidor. El runner de una entrega medida conserva
su finalidad investigadora. Siguen P01b separación física → P03b consolidación
de interfaz → P04 plantilla y las ramas independientes de actualización; véase el [contrato](../EN/maintainers/repository-map.md#migration-sequence).

## Reutilización y soporte

En la base P01 no hay `LICENSE` raíz, `SECURITY.md`, `SUPPORT.md` ni SLA declarado.
La visibilidad pública no concede reutilización sin restricciones. El propietario
debe decidir los términos. Se mantienen las licencias de
[CycloneDX](../../implementacion/schemas/cyclonedx-1.7/LICENSE) e
[is-number](../../implementacion/tests/fixtures/l03/is-number/LICENSE);
los locks no sustituyen los términos de las dependencias.

Usa [incidencias](https://github.com/tfm-goldenpath/golden-path-lab/issues) para
preguntas no sensibles y defectos reproducibles, con revisión y diagnósticos
sin secretos. No hay contacto privado de seguridad verificado declarado; queda
pendiente su elección. Esta rama no inventa direcciones ni cambia licencias o
ajustes. La contribución y revisión humana siguen [CONTRIBUTING](../../CONTRIBUTING.md).
