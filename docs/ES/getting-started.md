# Primeros pasos

[Índice](README.md) · [English](../EN/getting-started.md)

## Localizar la implementación

Lee [las etapas y controles](how-it-works.md) y sigue un digest con la
[tabla de módulos](../../implementation/docs/ES/architecture.md#organización-implementada-y-dependencias).
Estos comandos solo leen la implementación canónica y sus entradas conservadas:

```bash
git ls-files bin src implementation/services/quotes-node implementation/policies implementation/schemas implementation/tooling
# Adaptadores de compatibilidad y laboratorio:
git ls-files implementation/scripts/lib
```

`bin/deliver` es la entrada; `src/run-delivery.sh` ordena el motor compartido y
es propietario de la limpieza. `implementation/scripts/lib/` contiene imports
de compatibilidad y comportamiento de laboratorio, no un segundo motor. Políticas,
esquemas, servicio seleccionado y herramientas siguen bajo `implementation/`.

## Ejecutar la entrega local disponible

Sigue [la guía operativa](legitimate-delivery.md): requisitos, capacidad,
`bash bin/deliver local`, resultados y limpieza. Requiere Linux AMD64,
herramientas fijadas, Docker, red y fuente confirmada en Git. El devcontainer
solicita 4 CPU / 16 GB RAM / 32 GB disco; manda el espacio libre real.
Consulta los [límites actuales](legitimate-delivery.md#alcance-actual).

<a id="leer-e-inspeccionar-sin-clúster"></a>
<a id="ejecutar-deliberadamente-el-laboratorio"></a>

## Explorar la investigación registrada

La [ruta del laboratorio](../../lab/README.es.md) contiene ejecución demo/referencia,
escenarios, mediciones y presentación. Para leer sin clúster, consulta sus registros
y la [matriz de preparación](../../implementation/docs/ES/evaluation-readiness.md).
Identifica SHA, carril, ejecución y frontera antes de interpretar un resultado.
Código, CI verde o merge no prueban una nueva ejecución ni aceptación humana.
Leer un hash no reautentica firmas; usa herramientas revisadas, no código recuperado
del archivo.

<a id="plantilla-de-consumidor-prevista"></a>

## Siguiente implementación

La ruta local funciona hoy. La [consolidación de interfaz propuesta](../../implementation/TODO.md#next-implementation-increment)
precede a la plantilla independiente y después a una prueba Java.

## Reutilización y soporte

En el checkout revisado no hay `LICENSE` raíz, `SECURITY.md`, `SUPPORT.md` ni SLA declarado.
La visibilidad pública no concede reutilización sin restricciones. El propietario
debe decidir los términos. Se mantienen las licencias de
[CycloneDX](../../implementation/schemas/cyclonedx-1.7/LICENSE) e
[is-number](../../implementation/tests/fixtures/l03/is-number/LICENSE);
los locks no sustituyen los términos de las dependencias.

Usa [incidencias](https://github.com/tfm-goldenpath/golden-path-lab/issues) para
preguntas no sensibles y defectos reproducibles, con revisión y diagnósticos
sin secretos. No hay contacto privado de seguridad verificado declarado; queda
pendiente su elección. Esta rama no inventa direcciones ni cambia licencias o
ajustes. La contribución y revisión humana siguen [CONTRIBUTING](../../CONTRIBUTING.md).

¿Tienes una mejora en mente? [Propón un caso de uso](use-case-intake.md).
