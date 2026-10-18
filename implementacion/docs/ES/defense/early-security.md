# Comparaciones de seguridad temprana

[English](../../EN/defense/early-security.md) · [Índice de defensa](README.md)

El perfil `early-security` es independiente de `defense`, `defense-short` y
`f11-comparison`. Reutiliza supervisor, autenticación, exclusión de acciones,
identidad de comandos, comprobación de fuente, consola amplia, recorrido técnico
 y exportación. No alarga F11/F13 ni añade escenarios al catálogo académico.
La interfaz llama **informe** o **informe de ejecución** al registro estructurado
antes denominado «recibo». Conserva nombres de archivo y registros históricos.

## Preparar antes de presentar

Termina primero los cambios de código. En Codespaces de 4 CPU, 16 GB RAM y 32 GB
**totales**, usa un puerto libre y mantenlo **Private**:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="early-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Sesión: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile early-security \
  --reserve-gib 3 --enable-actions --port 8782
```

Para reabrir: `serve --session "$DEMO_SESSION" --enable-actions --port 8782`, sin
`--new`. Sin acciones, el visor solo permite consultar; no existe un interruptor
web que eleve permisos. `up`, `prepare` y `present` generales no se aplican a este
perfil: se preparan y ejecutan sus casos mediante acciones enumeradas de la web.

En **Demostración**, selecciona F02, F12 o F03 y pulsa **Preparar** antes del directo.
Cada caso tiene preparación independiente. F02/F12 usan Conftest fijado, Node,
entradas estáticas y fuente compatible: no llaman Docker ni readiness Kubernetes.
F03 necesita Docker, registro y builder propios, imágenes y SBOM reales, Trivy y
una base congelada identificada. No crea kind ni instala Kyverno. Reutiliza build,
análisis, validación de esquema/asociación y oráculos existentes. Las comprobaciones
preliminares se conservan como preparación.

La reserva mínima es 3 GiB más crecimiento provisional: 2 GiB para preparar F03 y
64 MiB para las demás operaciones. F03 comprueba además 4 GiB y 10 000 inodos en
`/tmp` para base/caché; los montajes pueden compartir espacio. Son márgenes
operativos, no garantías de capacidad. Se muestrean bytes/inodos cada diez segundos.
Si no hay margen, se conserva el diagnóstico; no se reducen umbrales ni se podan
recursos automáticamente. Un fallo F03 no impide usar F02/F12 preparados.

## Comparar, repetir y consultar

1. Selecciona el caso preparado y pulsa **Ejecutar comparación**. Se evalúan dos
   entradas con operaciones y resultados independientes, vinculados por el ID de
   comparación. La consola amplia muestra la operación supervisada. Puedes pausar
   el seguimiento para leer líneas anteriores.
2. Abre **Ver log del bloqueo**, **Ver atribución** o **Evidencias**. Rojo indica
   bloqueo; «expectativa confirmada» indica que fue el previsto. Ámbar indica una
   incidencia técnica. Un fallo del scanner no demuestra detección.
3. **Repetir comparación** conserva la anterior y crea dos identidades y archivos
   nuevos. El historial sigue accesible. **Detener** utiliza la cancelación existente;
   la señal enviada no equivale a una detención ya confirmada.
4. **Recorrido técnico** muestra las quince fases, con acceso a sus originales.
   Las fases ajenas a estos casos no se dan por aprobadas. Los inputs reutilizados
   enlazan su preparación; no son una segunda generación del SBOM.

| Caso | Qué cambia y qué se exige | Qué no demuestra |
|---|---|---|
| F02 | Workflow inerte con SHA completo → etiqueta mutable; Conftest acepta el original y rechaza exactamente `ACTION_SHA` | Ejecución del workflow inseguro, entrega L01 o protección de ramas |
| F12 | Mismo manifiesto estático con digest → etiqueta; aceptación del original y rechazo exacto `DIGEST` | Existencia de la imagen de ejemplo, firmas, admisión Kyverno o L06 completo |
| F03 | Imágenes reales minimist 1.2.5 / 1.2.8, SBOM originales y análisis Trivy nuevos con la misma base; política de producción y oráculo vigente | Firma, autorización de resultados o despliegue; F03 reparado no es L02 |

F03 muestra **un nuevo análisis Trivy de un SBOM original generado previamente de
una imagen real**. Trivy detecta; Conftest decide el umbral HIGH/CRITICAL. La base
se comprueba antes/después y no se copia entera con cada clic. Debe coincidir el
CVE, severidad y corrección del oráculo; el reparado debe superar todo el umbral,
no solo eliminar el CVE objetivo. Si la base invalida las fixtures, se conserva
el fallo y no se declara preparada la comparación. Una preparación fallida requiere
otra sesión compatible para ese caso. Nunca edites informes, fuente ni flags para
forzar reutilización. Una fuente nueva requiere preparación nueva.

## Respaldo y retirada

Usa **Más → Exportar**. El HTML dice resultados registrados, conserva navegación y
no ejecuta acciones ni necesita red. El paquete incluye originales y SBOM preparados
con hashes; la base grande se conserva en su ruta identificada, sin duplicarla por
exportación. Verificar el paquete no es repetir el análisis ni verificar firmas.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

La retirada comprueba IDs y etiquetas de contenedores propios. Conserva evidencias,
snapshots, recursos ajenos, volúmenes y cachés. No uses podas globales.

## Guion sugerido de 160 segundos

- **0–20 s:** fuente y perfil; declarar preparación fuera del directo.
- **20–55 s:** F02, pulsar comparación, explicar referencia mutable y abrir el log.
- **55–90 s:** volver, elegir F12, comparar digest/etiqueta y enseñar `DIGEST`.
- **90–140 s:** F03, explicar SBOM previo/análisis nuevo, CVE y aceptación del reparado.
- **140–160 s:** abrir atribución y respaldo registrado; explicar límites. Reservar
  20 s. Si hay error o demora, pasar explícitamente al respaldo, nunca simular vivo.

No es un ensayo humano medido. Tiempos automáticos y navegación se registran aparte.
[Validación y pendientes](../../../registros/demo_early_security_EN.md).

[Perfil combinado: todas las familias en una sesión](combined-profile.md).
