# Demostración de defensa

Los casos F11 compatibles admiten intentos independientes sobre preparación válida conservada; F13 requiere una fixture preparada por separado. Consulta [intentos y bundles auténticos de vía A](demo-workspace.md#intentos-independientes-y-bundles-de-vía-a). La presentación original no se reinicia.

[English](../../EN/defense/README.md) · [Índice documental](../README.md)

Usa `main` actualizado y el perfil opcional de Codespaces para defensa: **4 CPU,
16 GB RAM y 32 GB de disco total**. Conserva cambios sin confirmar al actualizar.
La preparación ocurre antes de los tres minutos de presentación. Reconstruir no
redimensiona el Codespace. Comprueba bytes e inodos libres; conserva la reserva
de custodia de 3 GiB y la salvaguarda de 8 GiB antes de preparar.

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

## Guion propuesto, sin ensayo humano cronometrado

- 0–20 s: identificar sesión/perfil, preparación previa y confianza local A.
- 20–80 s: iniciar Automático o el siguiente paso permitido; abrir Consola en
  directo. Diferenciar salida provisional de recibo final. Detener sigue visible.
- 80–115 s: leer el log exacto del bloqueo, separar Conftest de la petición
  independiente a Kyverno y mostrar recuperación solo si está confirmada.
- 115–140 s: Workflows → paired-rg.yml → ejecución histórica capturada. Explicar
  intervalo primario R/G frente a duración GitHub, sin mezclarlo con la demo.
- 140–160 s: mostrar una atestación local y su recibo histórico; volver a la
  comparación y explicar límites. Reservar los últimos 20 s.

Si las operaciones superan el tiempo disponible, usa un respaldo registrado
identificado. El presupuesto web es de 120 segundos **por invocación**, no una
garantía de tres minutos incluyendo explicación. Esta mejora de interfaz no
acredita un ensayo humano ni una nueva ejecución del laboratorio.
