# Navegación de la demo y detalle amplio de evidencia

Tarjeta de acción persistente, recibos exactos, comprobación/detención y recuperación segura: [ciclo de vida web](defense-demo-operations.md#ciclo-de-vida-de-acciones-web-y-recuperación). La consola sigue una identidad de comando; no cambios ajenos de `lastCommand`.

[English](../../EN/defense/demo-workspace.md) · [Perfil F11](f11-comparison.md) · [Operación](defense-demo-operations.md)

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
solo lectura muestra deshabilitados los controles operativos y su selector, con explicación; conserva navegación,
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
- **Workflows GitHub:** separa observaciones importadas de configuración capturada; consulta el procedimiento inferior. Sin importaciones no hay estado remoto observado.
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

La importación GitHub de lectura está disponible en la sección siguiente. Dispatch, workflows nuevos y Pages siguen fuera de alcance.

<a id="browser-controls-and-live-console"></a>
## Controles web y consola en directo

La barra identifica sesión/perfil vinculados, estado del entorno y próximo paso
indicado por el servidor. Automático y Paso a paso reutilizan el coordinador.
Elegir modo o navegar nunca envía una acción. Los botones deshabilitados indican
el motivo; Detener permanece en la cabecera global durante la ejecución. HTTP 202
significa aceptado, no terminado. Se mantienen comprobaciones de fuente, arranque,
recursos y preparación sellada. No se editan campos para revivir sesiones consumidas.

**Consola en directo** abre `#demo/live` en el área principal. Lee el extracto
provisional saneado del servidor (hasta 8 KiB), el estado observado del proceso y
la hora de modificación de la salida. Ausencia de salida nueva no demuestra que
el proceso se haya detenido. Ausencia de observación no demuestra que siga vivo.
Al desconectarse, conserva la salida y marca estado desactualizado; deshabilita
acciones hasta recuperar información fiable.

**Pausar seguimiento**, subir por el texto y **Volver al final** solo afectan a la
lectura. Ajuste de líneas y copia se refieren al extracto mostrado. No se sustituye
un artefacto cerrado consultado en otra vista. Al finalizar, **Ver recibo y salida
final** abre la operación exacta registrada. El texto provisional no se convierte
en resultado definitivo. HTML offline siempre registrado, sin acciones ni polling.
Una fixture sintética de interfaz no equivale a un ensayo del laboratorio.

<a id="observed-github-runs-and-attestations"></a>
## Ejecuciones GitHub y atestaciones observadas

Workflows separa **Resultado**, **Jobs y pasos**, **Evidencias**, **Atestaciones** y
**Configuración**. Las capturas son de lectura y nunca cambian la sesión controlada.
La definición corresponde al SHA del run, no a main actual. Los estados GitHub de
éxito, fallo, cancelación u omisión no atribuyen por sí mismos un rechazo a Fxx.
Se enlazan los logs originales del job en GitHub; no se reconstruyen desde YAML
ni se descargan automáticamente.

Importa una ejecución por CLI, sin exponer tokens al navegador:

```bash
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --publication-summary
```

El ejemplo comprobado captura la fuente histórica `895a3bd…`, intento 1, y los
resúmenes publicados pequeños `analysis.json`/`report.json`, con hashes contrastados
contra el índice. Consulta tamaños antes de descargar. **No** descarga el artefacto
del run de 117 MB, el paquete de campaña de 1,4 GB, imágenes ni bases Trivy.
Integridad y asociación de resúmenes no equivalen a auditar el paquete completo ni
a reverificar firmas. La tabla R/G selecciona solo el run correspondiente; detalles
por brazo ausentes permanecen desconocidos. El intervalo primario va desde antes
de las pruebas del servicio al retorno de CREATE del Deployment; preparación,
rollout, HTTP, empaquetado y limpieza quedan fuera. Duración GitHub, facturación
y tiempo primario son magnitudes distintas.

Para metadatos ya descargados, prepara un directorio con `run.json` (objeto GitHub
con identidad del repositorio), `jobs.json` (objeto con array `jobs`) y el nombre
del YAML de ese workflow en esa revisión:

```bash
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --from-directory /ruta/captura-publica
# Opcional: --pair /ruta/pair.json o --archive /ruta/pequeno-publico.zip
```

Los metadatos locales se identifican como aportados por el operador, sin nueva
autenticación GitHub. El importador admite solo este repositorio y sus cuatro
workflows. ZIP local: máximo 128 MiB comprimidos, 32 MiB expandidos y 2048 entradas;
rechaza enlaces, traversal, nombres duplicados y resúmenes ambiguos. Copia solo
documentos públicos enumerados, sin aplicar rutas del ZIP ni extraer bases.
Cada documento tiene límite de 2 MiB y cada captura de 8 MiB; el inventario lee
como máximo 32 capturas / 4 MiB. Mantén 3 GiB de reserva y 10 000 inodos libres.
Las capturas parciales conservan errores HTTP y definiciones no disponibles;
403/404 o paquetes ausentes no son verificación satisfactoria. Un run que solo
publica un plan no demuestra una pareja. Cuando pair.json está completo se usan
los contratos de análisis existentes; un fallo permanece visible. Cada captura
crea un directorio nuevo en `implementacion/evidence/raw/github-observations/`,
fuera de Git.

**Atestaciones** distingue documentos aportados sin paquete comprobado (subject/tipo sin verificar) del paquete G asociado que se describe más abajo.
No se descargaron bundles alojados B para el ejemplo inicial de resúmenes. Usa
**Consultar atestaciones de la sesión local vinculada**, o **Identidad y procedencia
→ Atestaciones de la sesión**, para ejemplos auténticos locales A conservados.
Pertenecen a esa sesión, no al run GitHub. Firma de imagen, SBOM, procedencia y
resultados son contratos separados. Se distinguen presencia, integridad de bytes,
recibo criptográfico histórico y autorización semántica. **Comprobar y explicar
recibos históricos** lee el límite observado, declaración y gate; después permite
abrir bundle y salida originales. No vuelve a ejecutar criptografía. Un original
ausente no se suple con otra copia; JSON/hash visibles no demuestran autenticidad.
Una clave local no acredita OIDC alojado; R omite esas atestaciones del Golden Path.

Refresca tras importar por CLI. La exportación conserva metadatos/extractos acotados
y añade los originales capturados al paquete; navegar y filtrar offline no envía
peticiones de red. Los extractos siguen identificados y los originales completos
quedan en el paquete. No se modifican exportaciones anteriores:

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
# Tras revisar el alcance concreto:
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

No se implementa dispatch, rerun, publicación, cambios a revisiones históricas ni
otra campaña. Revisión humana y ensayo narrado de este cambio permanecen pendientes.

### Actualizar los últimos datos de Workflows

Desde la raíz del repositorio, importa la última ejecución disponible de cada
workflow (incluye fallos o ejecuciones en curso; no busca solo éxitos):

```bash
for workflow in ci.yml golden-path.yml lane-a-validation.yml; do
  python3 implementacion/scripts/defense-demo/observations.py --latest "$workflow" || break
done
```

Después recarga el visor y abre **Workflows**. Se ordena por fecha de ejecución,
intento y captura; una importación tardía de un run antiguo no desplaza al nuevo.
La selección manual permanece fijada durante el polling. «Última» significa la
última observada al consultar GitHub, no una sincronización continua. Cada captura
es nueva: conserva las anteriores, incluidas las incompletas. `--latest paired-rg.yml`
también está disponible; si el último run solo publica un plan no se inventa una pareja.

Comprobado el 18-10-2026: CI `39119782917` (`b056423…`), Golden Path `38762578664`
(`1ec4cb9…`) y validación A `37353632299` (`91a33e9…`). No son tres ejecuciones de
main actual. Capturar estado/jobs no descarga sus paquetes ni verifica sus firmas.

La pareja histórica `37202413477` sí conserva las cuatro evidencias del brazo G.
Para importar sus originales y recibos históricos de forma reproducible:

```bash
# Comprueba margen e inodos; se conserva la reserva de 3 GiB.
df -h /workspaces /tmp
df -i /workspaces /tmp
python3 implementacion/scripts/defense-demo/observations.py \
  --run 37202413477 --publication-summary --paired-artifact 11303646242
```

La descarga **explícita** de este ZIP mide 116 999 171 bytes e incluye una base
comprimida que no se extrae. El límite de descarga es 128 MiB y se consulta primero
su tamaño, pertenencia y disponibilidad. Se exige el SHA-256 registrado por GitHub.
Solo se descomprime el paquete G señalado por `pair.json`: máximo 8 MiB comprimidos,
32 MiB expandidos, 512 archivos y 2 MiB por documento. Se rechazan enlaces,
traversal y duplicados. El verificador común comprueba los hashes internos; se
contrasta la medición con la pareja, el run, la fuente y los subjects. El inventario
ZIP admite como máximo 2048 entradas y 512 MiB declarados, sin descomprimir las bases.
No se auditan los paquetes R/infraestructura ni toda la campaña.

Para reutilizar un ZIP ya descargado, sustituye `--paired-artifact 11303646242`
por `--paired-archive /ruta/paired.zip --artifact-id 11303646242`. La asociación y
el hash siguen consultándose en GitHub. No se reutiliza el modo de ZIP pequeño
`--archive`, que mantiene su límite histórico de 32 MiB expandidos.

En **Atestaciones**, abre el bundle, su declaración o la salida original del
verificador. La procedencia nativa mantiene el nombre `CI-authorized-2.bundle.json`;
no se inventa un `provenance.bundle.json`. Las cuatro tarjetas distinguen presencia,
integridad, verificación criptográfica histórica y autorización agregada histórica.
No se vuelve a verificar criptografía ni se interpreta un JSON visible como prueba
actual. El brazo R indica «No aplicado»; las atestaciones locales A siguen separadas.

## Intentos independientes y bundles de vía A

La presentación original sigue siendo de un solo uso. **Ejecutar siguiente paso**
y **Iniciar comparación** consumen su secuencia pendiente; **Nuevo intento** crea
un caso independiente, con ID, directorio, comandos, salidas, atribución y tiempos
propios. No reinicia `completed`, `demoResult` ni mediciones históricas. Consultar
un intento no cambia la sesión que controlan los botones. En solo lectura se ven
controles deshabilitados y la explicación de `--enable-actions`; el navegador no
puede elevar permisos.

| Caso | Qué reutiliza | Qué se observa de nuevo |
|---|---|---|
| F11 / Conftest | Manifiesto, fuente y preparación sellada | Copia aislada identificada, comando, salida y atribución nuevos |
| F11 / Kyverno | Digest autorizado, políticas, actor y Deployment saludable | Disponibilidad y confianza, UPDATE real restringido, estado intacto y HTTP |
| F13 | Coordinador y escenarios, no la imagen ya autorizada | Preparación hija `defense-short`, laboratorio y referencia de imagen propios sin resultados |
| Recuperación F13 | Solo imagen y confianza de esa fixture | Autorización y aceptación vinculadas a su rechazo |

Antes de F11 se comprueban fuente/configuración, arranque, propiedad y recursos.
La copia contiene entradas enumeradas y referencias; no modifica el laboratorio
original. El tiempo continuo original no incorpora repeticiones ni pausas: cada
invocación conserva su intervalo separado.

En **Preparación y recursos del nuevo caso F13** puedes preparar, ejecutar,
recuperar y retirar la fixture. Sin una válida se explica “Requiere preparación
de un nuevo caso F13”. Su preparación es completa y ocurre **antes de la charla**:
reutiliza la implementación de pruebas/build/análisis/firma, pero crea un
laboratorio independiente. No elimina referrers ni reaplica una imagen que ya
tenga resultados. Consume recursos adicionales y no es un relanzamiento inmediato.
Exige el margen inicial configurado de 8 GiB, conserva 3 GiB y sondea cada 10 s.
Si no cabe, se detiene sin declarar la fixture preparada. Antes de preparar otra,
retira explícitamente la actual. Se previsualizan IDs propios; se conservan
recibos, evidencia, claves privadas y snapshots. Retira la fixture antes de la
sesión principal. No se ejecuta ningún workflow remoto.

Con la fuente finalizada, crea una sesión nueva antes de presentar:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense --reserve-gib 3 \
  --enable-actions --port 8765
```

Mantén 8765 **Private**. Pulsa **Preparar entorno**, espera su finalización y usa
**Más → Comprobar entorno**. Prepara también la fixture F13 antes de la charla si
necesitas otro caso F13. Durante la presentación, elige Automático o Paso a paso,
inspecciona el resultado y pulsa **Nuevo intento** en una fila F11 compatible.
La solicitud de ejecución abre la consola amplia. Detener sigue siendo una
solicitud hasta el recibo final; HTTP 202, desconexión o proceso desaparecido no
acreditan resultado. Un original fijado para lectura no sigue otra operación.
Preparación fallida, fuente cambiada o recursos retirados no se reparan habilitando
acciones: requieren preparación válida nueva.

Reabre con `serve --session "$DEMO_SESSION" --enable-actions --port 8765`. Si el
visor de esa sesión ya está en solo lectura, `stop-server --session
"$DEMO_SESSION"` detiene únicamente ese visor verificado; después reábrelo con
acciones. No mates al propietario ajeno de un puerto. Cambiar la fuente invalida
la preparación ejecutable, pero permite consultar los resultados conservados.

### Importar el ejemplo auténtico de vía A

El run `37353632299`, intento 1, fuente
`91a33e910ee2ba9ded5391393b06ca70005de4d4`, estaba disponible el 18-10-2026:

```bash
df -h /workspaces /tmp
df -i /workspaces /tmp
python3 implementacion/scripts/defense-demo/observations.py --run 37353632299 \
  --lane-a-artifact 11363314552 --lane-a-artifact 11363283724
```

Se descargan explícitamente demo (4.176.767 bytes) y vulnerabilidades (639.212
bytes), **sin bases de datos**. Sus paquetes contienen 24 bundles finales canónicos,
en seis grupos de suite/contexto/digest: principal, L01-update, L05-from, L05-to,
F03-repaired y L02. Las capturas anteriores de solo metadatos siguen disponibles.

Se comprueban asociación repositorio/run/intento/fuente, SHA-256 del ZIP registrado
por GitHub, hashes exteriores seleccionados, auditoría del paquete y todos sus
hashes internos (1.963 y 349). Límites por artifact: ZIP 16 MiB; 2.048 entradas y
32 MiB expandidos exteriores; paquete anidado comprimido 8 MiB, 4.096 archivos,
32 MiB expandidos, profundidad 8 y documento 2 MiB. Se rechazan rutas inseguras,
enlaces, duplicados y discrepancias. Se conservan rutas originales; no se importan
claves privadas ni bases. La captura mantiene el límite de 8 MiB y admite hasta
128 documentos. El HTML contiene extractos acotados y el paquete exportado los
originales capturados; no se reescriben exports anteriores.

En **Workflows → lane-a-validation.yml → Atestaciones**, selecciona run e imagen.
Las cuatro tarjetas separan firma de imagen, SBOM, procedencia y resultados.
Pestaña seleccionada azul, foco visible, flechas/Home/End y contador contextual
permiten reconocer la navegación sin usar los colores de resultados. El recibo
criptográfico histórico debe corresponder al documento exacto del mismo contexto;
la autorización semántica exige además digest/predicado coincidentes en su gate.
No se transfieren recibos entre imágenes L01/L05. Si no se registró fecha exacta de
verificación, permanece desconocida. Es **vía A con clave pública local incluso
en GitHub**, no OIDC B ni reverificación actual. Se conservan por separado gates
previos a resultados; la captura final no incluye todos los snapshots negativos.

Guion propuesto de 160 s, sin ensayo humano cronometrado: 0–20, identificar sesión
preparada y alcance; 20–80, ejecutar pasos y abrir el bloqueo original; 80–115,
crear otro intento F11 compatible y contrastar IDs/resultados; 115–145, mostrar
atestaciones de vía A y sus cuatro niveles de comprobación; 145–160, volver a la
comparación y señalar el export registrado. Reserva de 20 s. Si disponibilidad,
recursos o duración lo impiden, usa un respaldo expresamente registrado. No se
establece una garantía nueva de ejecución completa en tres minutos.
