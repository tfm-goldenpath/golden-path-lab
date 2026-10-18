# Demostración de defensa

[Controles tempranos F02/F12/F03](early-security.md).

[Ensayo web real, guion de 160 segundos y respaldo offline](web-rehearsal.md).
Los casos F11 compatibles admiten intentos independientes sobre preparación válida conservada. La secuencia inicial defense incluye F13; repetir F13 requiere una fixture preparada por separado. Consulta [intentos y bundles auténticos de vía A](demo-workspace.md#intentos-independientes-y-bundles-de-vía-a). La presentación original no se reinicia.

[English](../../EN/defense/README.md) · [Índice documental](../README.md)

Usa `main` actualizado y el perfil opcional de Codespaces para defensa: **4 CPU,
16 GB RAM y 32 GB de disco total**. Conserva cambios sin confirmar al actualizar.
La preparación ocurre antes de los tres minutos de presentación. Reconstruir no
redimensiona el Codespace. Comprueba bytes e inodos libres; conserva la reserva
de custodia de 3 GiB. Con esa reserva, los márgenes vigentes exigen 5 GiB para
preparar defense y 8 GiB para f11-comparison o una fixture F13 independiente.
Son márgenes operativos, no garantías de capacidad.

| Objetivo | Guía canónica |
|---|---|
| Preparar Codespaces y conservar evidencias | [Operaciones](defense-demo-operations.md) |
| Elegir comparación F11 o defensa/F13 | [Perfiles](defense-demo.md), [Alcance F11](f11-comparison.md) |
| Ejecutar desde el navegador | [Controles y consola](demo-workspace.md#browser-controls-and-live-console) |
| Leer originales y el recorrido completo | [Navegación](demo-workspace.md#recorrido-técnico-completo) |
| Mostrar ejecuciones GitHub y atestaciones | [Importación de lectura](demo-workspace.md#observed-github-runs-and-attestations) |
| Exportar y retirar recursos propios | [Operaciones](defense-demo-operations.md) |

## Procedimiento vigente desde el navegador

Desde la raíz del repositorio, después de terminar los cambios de fuente:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Sesión: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense \
  --reserve-gib 3 --enable-actions --port 8765
```

Abre 8765 con visibilidad **Private**. Antes de presentar, pulsa **Preparar entorno**,
consulta su consola y luego **Más → Comprobar entorno**. Espera la finalización
confirmada. `defense` muestra F11/F13 y recuperación; usa `f11-comparison` para la
exposición controlada R y L06 parcial. Abrir el catálogo no ejecuta otro escenario.
La inspección ordinaria y la ejecución admitida se realizan desde la web.

Reabre sin ejecutar con `serve --session "$DEMO_SESSION" --enable-actions --port
8765`. Sin `--enable-actions`, el visor es de lectura; ningún interruptor web puede
elevar permisos. Si otro visor ocupa el puerto, usa el `stop-server --session
<propietario>` que indique el diagnóstico o elige un puerto libre. No mates procesos
ajenos. `up` continúa preparando **y** presentando; no es preparación solamente.

Una sesión consumida, fallida, retirada o con fuente incompatible no se reinicia
sobre los recibos anteriores. Para repetir, crea otra sesión. No se implementa
reutilización de infraestructura entre sesiones nuevas. Paso a paso registra
segmentos separados y pausas del presentador; no inventa una duración continua.

## Guion de tres minutos (propuesto, sin ensayo humano cronometrado)

Sigue el [guion único de 160 segundos y la ficha del presentador](web-rehearsal.md#guion-propuesto-160-segundos-y-20-de-reserva): F11/F13 y recuperación iniciales, logs originales y recorrido técnico. Deja Workflows para las preguntas; sus tiempos históricos pertenecen a otro conjunto de datos.

El [registro del ensayo real](../../../registros/demo_web_rehearsal_EN.md) separa preparación, ejecución automática y navegación medidas de la narración humana todavía pendiente. El presupuesto web de 120 segundos corresponde a cada invocación; no garantiza una exposición de tres minutos. Cambia explícitamente al respaldo verificado si la ejecución falla o no permite continuar la explicación.

[Perfil combinado: todas las familias en una sesión](combined-profile.md).
