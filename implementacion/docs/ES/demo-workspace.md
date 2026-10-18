# Navegación de la demo y detalle amplio de evidencia

[English](../EN/demo-workspace.md) · [Perfil F11](f11-comparison.md) · [Operación](defense-demo-operations.md)

Una aplicación ofrece cinco destinos visibles: **Demostración**, **Recorrido técnico**, **Escenarios**,
**Workflows** y **Sesiones**. Cada uno sustituye el área principal. El detalle de
un intento depende de Demostración; no es un inspector inferior ni un modal.
Navegar no inicia, repite ni detiene operaciones del laboratorio.

La cabecera distingue conexión del visor, datos registrados/ejecución observada
y estado del laboratorio. **Identidad y procedencia** contiene la sesión completa,
fuente de evidencia, hash del renderizador, recursos registrados, preparación y
detalle técnico completo. Un visor conectado puede mostrar evidencia antigua de
un laboratorio retirado. **Tiempo registrado de ejecución** no es un cronómetro.

## Abrir en Codespaces

Consulta las sesiones y usa un puerto libre y privado. Se probaron estos comandos
de solo lectura con las evidencias conservadas de este Codespace:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
bash implementacion/scripts/defense-demo.sh --help
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh serve \
  --session f11-20261017t193938z --port 8768
# Otra sesión conservada, perfil defense/F13, también de solo lectura:
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --port 8770
```

Abre el puerto elegido desde **Ports**, con visibilidad **Private**. Estos nombres
existen en este espacio; no son fixtures disponibles en cualquier Codespace nuevo.
El visor muestra observaciones anteriores, sin reanudar su preparación consumida.
Cambiar opciones del visor no permite ejecutar una preparación con fuente distinta.
Para cambiar el puerto de un visor propio, consulta el reinicio seguro de la guía
operativa; no mates procesos ajenos.

Para preparar una comparación nueva antes de la exposición:

```bash
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile f11-comparison \
  --reserve-gib 3 --enable-actions --port 8765
```

Después pulsa **Preparar entorno**. También puedes usar `prepare --serve
--enable-actions` según la guía F11. No se repitió esta preparación costosa para
validar la interfaz. Queda fuera del tiempo de presentación. `up` sigue preparando
**y presentando** automáticamente. Reapertura sin ejecutar:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
# Alternativas CLI a los modos web sobre una preparación nueva e íntegra:
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
bash implementacion/scripts/defense-demo.sh step --session "$DEMO_SESSION"
```

Automático y paso a paso son alternativas, no instrucciones para repetir un
intento consumido. La API web conserva su límite de 120 s por invocación. Cada
paso incluye comprobaciones nuevas; varios pasos no son un ensayo continuo medido.

## Recorrido técnico completo

Abre **Recorrido técnico** en la navegación principal o **Ver proceso completo**
en Demostración. El recorrido sustituye la comparación; los logs siguen abriéndose
en el detalle amplio. **Detalle técnico** dentro de un detalle corresponde a esa
operación o intento y ofrece un enlace al recorrido completo.

- **Mapa de controles** (`#journey/map`): quince fases del catálogo capturado,
  en orden pedagógico de izquierda a derecha y de arriba abajo. No afirma el orden
  cronológico de ejecución. Despliega una fase para consultar condiciones, entradas,
  salidas, archivos de versiones si constan, log original, atribución y recibo.
- **Secuencia ejecutada** (`#journey/sequence`): recibos en su orden registrado,
  incluidas preparación global y conservación. Los avisos NOT_REACHED se conservan,
  pero no son operaciones ejecutadas. Tiempos ausentes siguen desconocidos; no se
  suman intervalos anidados de observadores a los tiempos de sus operaciones.
- Filtra **Toda la sesión**, **Preparación**, un brazo/escenario/intento concreto,
  o **Conservación / cierre** cuando existan recibos. Los resultados mixtos se
  desglosan: una recuperación no vuelve verde un rechazo previo. La preparación
  reutilizada enlaza su origen y no se representa como otra operación en directo.
  Un recibo con varios controles sigue siendo agregado.

**Ver salida original** abre el archivo de esa operación directamente, aunque no
tenga escenario Fxx/Lxx. **Volver al recorrido técnico**, Atrás y Adelante restauran
filtro, fase desplegada, foco y posición de lectura. El detalle global usa números
de recibo seguros (`#demo/operation/<secuencia>/console`), no rutas arbitrarias.
Los metadatos identifican productor de la captura y fuente. Un archivo con iguales
bytes/fuente en un recibo anterior se etiqueta como copia heredada y enlaza ese
origen; esto no demuestra qué operación creó originalmente su contenido. Un log
de tests copiado no acredita un rechazo posterior de admisión.

Una preparación incompleta muestra un aviso en ambas vistas y enlaza la operación
fallida registrada si existe. Los logs de descarga/SBOM/análisis capturados también se enlazan cuando existen;
su presencia no constituye un diagnóstico. La interfaz no deduce causas de disco/red/confianza
a partir del código de salida. Preparar R correctamente no confirma G. Los datos
conservados de `rehearsal-06` muestran cuatro filas G **No alcanzado**, preparación
321,22 s y ejecución sin medición; estos valores no están codificados en la UI.

Comandos de solo lectura comprobados para el recorrido (puertos loopback libres):

```bash
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-01 --port 8771
bash implementacion/scripts/defense-demo.sh serve --session rehearsal-06 --port 8772
bash implementacion/scripts/defense-demo.sh serve --session f11-20261017t193938z --port 8773
```

Abre el puerto con visibilidad Private en Codespaces y pulsa Recorrido técnico, o
añade `/#journey/map` / `/#journey/sequence` a la URL de ese visor. No se inicia
trabajo del laboratorio. El HTML offline conserva rutas hash, filtros y referencias
de origen, con los extractos incluidos, cero peticiones API y sin ejecución.
Los archivos ausentes siguen ausentes. Abrir el mapa no descarga todos los logs.

Guion propuesto, no ensayo humano medido: 0–25 s, explicar estado registrado/vivo,
perfil y preparación previa fuera del intervalo; 25–65 s, abrir mapa y distinguir
fases de operaciones; 65–110 s, filtrar F11 y abrir su original Conftest; 110–140 s,
volver y mostrar Kyverno independiente/F13 y recuperación solo si pertenecen al
perfil; 140–160 s, volver a comparación y explicar alcance; 20 s de reserva. Usa
la preparación incompleta para explicar **No alcanzado**, nunca como prueba de
bloqueo satisfactorio. Esta mejora visual no vuelve a ejecutar el laboratorio.

## Durante la presentación

Pulsa el nombre para fijar el intento y abrir **Resultado**. Una fase roja
abre directamente la consola original del control. El resultado separa la decisión real
de entrega de la confirmación de su expectativa. **Ver log del bloqueo** abre la
salida original cerrada de ese control; **Ver atribución**, su recibo. No necesitas
terminal ni otra aplicación. En **Consola**, los metadatos desplegables muestran
comando/salida de operación, UTC, ruta, hash y redacción. La salida del oráculo es
distinta de la salida de la herramienta, conservada en su recibo. No se sustituye
un archivo ausente o corrupto por una copia heredada de otro intento.

Las pistas muestran orden, no porcentajes ni proporciones temporales. ↶ indica
preparación reutilizada, nunca otro build o firma. Las operaciones con varios
controles se etiquetan como recibos agregados, sin inventar éxitos individuales.
El rojo representa rechazo atribuible incluso si **Bloqueo esperado** confirma
el ensayo. Error de integración, sin ejecutar, evidencia insuficiente, no alcanzado
y controles omitidos en R tienen etiquetas distintas. F11 trata privilegios;
F13 trata resultados ausentes.

`defense` incluye su referencia válida preparada y la recuperación separada de
F13. No demuestra R privilegiado ni L06. `f11-comparison` conserva cuatro
observaciones dirigidas y no incorpora F13. F11 y L06 tienen alcance parcial;
L06 no equivale a la sustitución de imagen de L01. La exposición de R no demuestra
explotación. La vía A con clave local no demuestra OIDC de GitHub ni vía B.

El detalle ocupa el área principal desde el primer clic. **Resultado**, **Consola**,
**Evidencias**, **Detalle técnico** y **Alcance** comparten cabecera compacta. En
escritorio hay una lista lateral de 230 px que se puede ocultar; en pantallas
estrechas o bajas, un selector accesible. Cambiar de intento conserva la pestaña
y retira la evidencia del anterior. La consola usa texto de 15 px, ajuste de
líneas, copia del contenido mostrado (identificada si es extracto), archivo
completo y metadatos desplegables. La consola es su única región de desplazamiento;
las otras pestañas usan flujo normal. No hace falta pulsar «Ampliar».

**Volver a demostración**, Escape y Atrás recuperan el contexto. Rutas hash como
`#demo` y `#demo/attempt/attempt-1/console?op=f11-early` funcionan en el HTML
exportado sin servidor. Solo contienen IDs conocidos de intento/operación y,
cuando procede, de artefacto; nunca credenciales ni rutas libres. Atrás/Adelante
conservan pestaña, archivo, posición de lectura, filtros y secciones técnicas.
Un ID de archivo ausente se indica sin suplirlo por otro. Los títulos técnicos
plegados mantienen escenario/herramienta/intento. Un recibo agregado no acredita
éxitos independientes de todos los controles. Los archivos se agrupan y cargan
al abrirlos; su presencia o hash no acredita verificación criptográfica.

**Seguir ejecución en directo** es explícito. La selección manual fija la
evidencia; la salida provisional no sustituye un log cerrado. El sondeo conserva
intento, pestaña, secciones abiertas, foco y desplazamiento de consola. Un proceso
desaparecido se indica como interrupción/incertidumbre hasta disponer de recibo.
La desconexión o fallo de autenticación deshabilita la ejecución y marca datos
desactualizados. HTTP 202 significa aceptado, no completado. **Detención solicitada**
permanece hasta que el backend establece el resultado; se bloquean dobles lanzamientos.

**Más acciones** en Demostración contiene comprobación de entorno, exportación
y limpieza propia. La preparación está en **Identidad y procedencia**. El modo
solo lectura oculta los controles operativos y su selector; conserva navegación,
evidencias y descargas disponibles. Con acciones autorizadas aparece la barra de
ejecución y **Detener** permanece en la cabecera global durante una operación.
La cabecera y la navegación se redistribuyen con zoom elevado. La limpieza conserva su vista previa de alcance y confirmación. El servidor
calcula las capacidades y vuelve a comprobar las precondiciones; se mantienen
cookie, Origin, CSRF, acciones enumeradas y exclusión mutua. El catálogo no puede
introducir comandos shell.

## Explorar conservando el contexto

Los destinos visibles sustituyen el área principal conservando la selección:

- **Escenarios:** veinte IDs, búsqueda y filtros por tipo/familia/disponibilidad,
  garantía, diagrama de definición, observaciones reales, límites e historia
  separada. Sin observación no significa sin implementar. La disponibilidad de
  L06 se deriva de la operación capturada, sin reescribir snapshots o revisiones.
- **Workflows GitHub:** las cuatro definiciones YAML capturadas, jobs/dependencias,
  pasos, runners/timeouts, permisos, acciones, fuente y hash. Se identifican como
  configuración; ejecución remota no observada. Para snapshots antiguos, el
  desglose se deriva solo de su YAML capturado, nunca del checkout actual. CI
  estático, vía A alojada y confianza OIDC B siguen separados.
- **Sesiones:** se inspeccionan como máximo 100 entradas de directorio,
  JSON regular de hasta 2 MiB por entrada y campos permitidos de resumen. Los
  errores se aíslan; no se siguen enlaces ni se abren paquetes. Otra sesión ofrece
  instrucciones de apertura, sin redirigir acciones, archivos o descargas.
- **Detalle técnico completo**, en **Identidad y procedencia**: controles y recibos filtrados por intento,
  incluyendo la recuperación vinculada cuyo escenario académico es nulo.

## Recursos y alternativa sin conexión

Se conserva el perfil 4 CPU / 16 GB / **32 GB totales**, con sus umbrales vigentes.
Esta interfaz no necesita rebuild del entorno, build de frontend, instalación de
navegador ni otro clúster. El disco mostrado es una lectura registrada, no una
promesa de espacio actual. La preparación comprueba montajes reales, inodos y
reservas. No rebajes márgenes ni borres evidencias para conseguir un pase.

Exporta explícitamente después de la exposición. Los hashes del renderizador son
distintos de la fuente de evidencia. Las exportaciones nuevas incluyen todos los
assets, contexto capturado y extractos acotados: se mantiene el límite total de
2 MiB, priorizando salidas principales. La página registrada no hace peticiones
API/red ni ejecuta acciones; conserva navegación hash, detalle amplio, pistas,
filtros y bloqueos. El
paquete verificado contiene los archivos completos. Los exports existentes son
inmutables y conservan su renderizador anterior. El inventario local exportado
se etiqueta como capturado, no actual.

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

## Ruta propuesta: 160 segundos y 20 de reserva

Es una propuesta de narración, **no un ensayo humano cronometrado** ni una nueva
medición de rendimiento. Preparación, exportación completa y limpieza general
quedan fuera de la presentación.

- 0–20 s: identifica sesión, confianza local y preparación previa; explica las
  cuatro filas de F11 y la petición de admisión independiente.
- 20–60 s: inicia la comparación soportada. Explica exposición/retirada de R y
  barrera roja de Conftest. Si sigue ejecutándose, describe solo lo observado.
- 60–100 s: selecciona F11 temprano y **Ver log del bloqueo** con los dos
  diagnósticos. Cambia a admisión independiente desde la lista de intentos y
  muestra la atribución de Kyverno. Vuelve al resumen conservando la selección.
- 100–135 s: muestra L06 legítimo, misma imagen y alcance parcial. Abre el estado
  original/HTTP, sin deducir aceptación únicamente de un icono verde.
- 135–160 s: abre **Alcance**, identifica la fuente y el export registrado.
- 160–180 s: reserva. Si no termina el directo, abre explícitamente un export
  anterior verificado; nunca lo presentes como éxito vivo.

No se implementan importaciones de GitHub, descarga de artefactos, dispatch remoto,
workflows nuevos ni Pages. No se añade otra ejecución de catálogo, muestra de
campaña ni conclusión sobre esfuerzo humano.
