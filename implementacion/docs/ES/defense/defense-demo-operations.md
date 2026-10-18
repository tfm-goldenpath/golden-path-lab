# Ejecutar la demo y conservarla al cambiar de máquina

## Margen de disco y laboratorios retirados

Crear una sesión no libera espacio. Preparar un caso F13 independiente exige el
margen configurado de preparación (inicialmente 8 GiB: 3 GiB de reserva más 5 GiB
de crecimiento estimado). Un rechazo `RESOURCE_EXHAUSTED` antes de iniciar trabajo
no es un bloqueo de política F13. Comprueba el espacio real antes de reintentar.
Para la primera presentación, la secuencia preparada de `defense` ya incluye F13:
usa **Iniciar comparación** o el siguiente paso. **Preparar nuevo caso F13** prepara
una repetición independiente adicional; no es necesario para iniciar esa primera
secuencia. El espacio recuperado antes de preparar puede dejar de cumplir el
umbral de 8 GiB de la repetición después de crear el primer laboratorio.

Para un laboratorio obsoleto, consulta `cleanup-plan --session NOMBRE` y utiliza
`cleanup --session NOMBRE` para conservar evidencias y retirar sus contenedores.
La retirada comprueba IDs registrados y etiquetas aunque el registro parado haya
perdido su IP; la comprobación de disponibilidad sigue exigiendo la dirección
preparada. La limpieza estándar conserva volúmenes Docker y cachés de imágenes.
Recuperar más espacio requiere un inventario explícito que demuestre montajes
exclusivos en esos contenedores, retirada verificada y ausencia de consumidores
u otras sesiones propietarias. No deduzcas propiedad por el nombre ni uses podas
globales. Conserva evidencias, snapshots y material privado. Una preparación
retirada o incompatible con la fuente requiere una sesión nueva; no reinicies
su estado para reutilizarla.

## Ciclo de vida de acciones web y recuperación

Cada comando web aceptado recibe un `commandId` del servidor, salida saneada y
recibo propios. La tarjeta de acción distingue el resultado de la presentación
original, la preparación conservada y la acción actual. **Abrir consola / recibo**
abre esa solicitud, aunque termine entre dos consultas. Recargar o abrir otra
pestaña recupera la misma identidad. Consultar una salida anterior no cambia el
destino de los controles. HTTP 202 confirma la aceptación, no la finalización.

**Comprobar entorno** ejecuta `resume-check-N` con el presupuesto web de 120 segundos
propagado a la operación. El recibo se asocia por identidad de comando. Si acaba
correctamente sin stdout: “Comprobación completada; consulta el informe de
disponibilidad”. Los errores anteriores a una operación también tienen recibo y
salida saneada propios: nunca se ofrece el log privado acumulado como su salida.
La consola es provisional hasta cerrar evidencia. Detener tiene un `requestId`
propio y señala el comando objetivo; su acuse no acredita cancelación. Se distinguen
“Detención en curso”, “Cerrando evidencia”, “Detenida” y “Ya había finalizado”. Un
controlador desaparecido sin recibo final queda sin confirmar, nunca como PASS.

El visor recoge siempre a sus hijos terminados antes de consultar la identidad
persistida. Deben coincidir PID, inicio y boot; un zombi no mantiene ocupado el
visor. El coordinador libera únicamente su propio controlador bajo el bloqueo de
sesión. Las fixtures mantienen sus comprobaciones de pertenencia. No se necesita
forzar desbloqueos ni editar JSON. Una comprobación cancelada puede repetirse si
se conserva la preparación; esto no restaura automáticamente la preparación ni
habilita una presentación fallida.

### Preparar antes de presentar; iniciar los casos desde la web

Crea una sesión nueva con la fuente definitiva. Mantén 4 CPU / 16 GB RAM / 32 GB
de almacenamiento total y la reserva de custodia de 3 GiB. Comprueba espacio e
inodos: la preparación exige además su margen de crecimiento configurado.
La ruta principal crea una sesión pendiente y abre el visor autenticado.
**La preparación comienza al pulsar Preparar entorno**, antes de la exposición.
Consulta el [procedimiento web y respaldo offline](web-rehearsal.md).

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Sesión: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense --reserve-gib 3 \
  --enable-actions --port 8765
```

Abre **Ports → 8765**, visibilidad **Private**. Reabre sin ejecutar con
`bash implementacion/scripts/defense-demo.sh serve --session "$DEMO_SESSION" --enable-actions --port 8765`.
En cambio, `up --auto` prepara **y ejecuta** la presentación original; cuando termina,
no deja los casos originales pendientes de su primera ejecución web.

Antes de presentar, usa **Más acciones → Preparación → Comprobar entorno** y consulta
el informe final. Durante la presentación elige Automático o Paso a paso, ejecuta
la secuencia pendiente o el siguiente paso y abre la consola de esa acción. Después
usa **Nuevo intento** en F11 cuando esté disponible: genera evidencia nueva. F13
necesita una fixture independiente preparada antes de la presentación, que puede
crear otro laboratorio; no es repetición instantánea del digest autorizado.
**Conservación** agrupa exportación y retirada propia, con la vista previa y
confirmación de limpieza existentes.

Guion propuesto, sin ensayo narrado medido: 0–20 s explica perfil, preparación previa
y conexión; 20–100 s ejecuta los pasos y lee un rechazo exacto; 100–140 s consulta
aceptación/recuperación y recorrido técnico; 140–160 s muestra recibo y alcance;
reserva 20 s. La preparación fría queda fuera. El presupuesto por comando no
garantiza la duración de toda la narración.

### Recuperar el visor del incidente sin perder evidencia

El diagnóstico conservado de `defense-20261018t141707z` encontró `check` terminado
con exit 0 y un controlador zombi con PID/inicio/boot coincidentes. La operación
había cerrado; el visor anterior impedía recoger el hijo. Es una observación
concreta, no una causa atribuida automáticamente a cualquier sesión desactualizada.

Primero consulta **status**, el último recibo y el estado del proceso. Un recibo
cerrado y ausencia de controlador/worker propio vivo permiten reiniciar solamente
el visor. No lo reinicies durante trabajo activo o cierre de evidencia:

```bash
bash implementacion/scripts/defense-demo.sh status --session defense-20261018t141707z
# Solo tras comprobar que no hay operación viva:
bash implementacion/scripts/defense-demo.sh stop-server --session defense-20261018t141707z
bash implementacion/scripts/defense-demo.sh serve \
  --session defense-20261018t141707z --enable-actions --port 8765
```

Estos comandos comprueban la propiedad del visor y conservan infraestructura y
evidencia. No equivalen a `cleanup`, borrar `session.json`, matar un PID arbitrario
ni podar Docker. Las comprobaciones de fuente/boot se mantienen: una preparación
histórica incompatible con la corrección requiere **sesión nueva** y espacio
suficiente. Los resultados conservados pueden consultarse en solo lectura. Esta
corrección no reescribe los recibos históricos de la sesión.

[Validación y límites](../../../registros/demo_action_lifecycle_EN.md).


Los casos F11 compatibles admiten intentos independientes sobre preparación válida conservada; F13 requiere una fixture preparada por separado. Consulta [intentos y bundles auténticos de vía A](demo-workspace.md#intentos-independientes-y-bundles-de-vía-a). La presentación original no se reinicia.

[Guía vigente de defensa](README.md) · [Controles web y capturas](demo-workspace.md#browser-controls-and-live-console)
La interfaz actual usa [navegación interna y detalle amplio de evidencia](demo-workspace.md); consulta controles, acceso a logs originales y guion propuesto.

Para el perfil local acotado de cuatro intentos F11/L06, consulta [Comparación F11](f11-comparison.md). Los registros históricos siguientes conservan su alcance y recursos originales.

[English](../../EN/defense/defense-demo-operations.md) · [Guía completa y guion](defense-demo.md) · [Validación real](../../../registros/defense_demo_validation_EN.md)

Todos los comandos parten de `/workspaces/golden-path-lab`. La demo usa la **vía A**, con kind, zot y confianza local, también en Codespaces. Esta guía no requiere publicar cambios ni ejecutar workflows remotos.

## 1. Presentar la sesión que ya está preparada

El 16 de octubre de 2026, `defense-01` quedó preparada, sin resultados firmados, con el visor en el puerto 8765 y vinculada a la revisión `1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f` y al snapshot documentado. Crear el commit de publicación cambia el SHA: para ejecutar desde la rama publicada, prepara una sesión nueva siguiendo la sección 2. Estos comandos corresponden al laboratorio y la revisión originales; el visor permite consultar sus registros después:

```bash
cd /workspaces/golden-path-lab
bash implementacion/scripts/defense-demo.sh status --session defense-01
# Sólo si siguen coincidiendo la revisión y la preparación originales:
bash implementacion/scripts/defense-demo.sh present \
  --session defense-01 --auto --budget-seconds 180
```

En VS Code abre **Ports → 8765 → Open in Browser**, manteniendo visibilidad **Private**. En un devcontainer local abre `http://127.0.0.1:8765`. Si sólo falta el visor, puedes arrancarlo sin reconstruir el laboratorio:

```bash
bash implementacion/scripts/defense-demo.sh serve --session defense-01 --port 8765
```

El panel muestra F11 bloqueado por Conftest, F13 bloqueado por ausencia de resultados, autorización y aceptación del mismo digest, y una nueva solicitud F11 rechazada por Kyverno con el Deployment intacto. La aceptación inicial es `DEMO_VALID_ACCEPT`, no L01 completo. El ensayo final midió **27,38 s de directo** y **713,80 s de preparación**; son observaciones de esa máquina, no garantías de tiempo.

`status` lee el registro; `present` comprueba además la disponibilidad e identidad actuales. Tras reiniciar o migrar, un registro `PREPARED` por sí solo no permite continuar. No repitas `present` sobre una sesión que ya emitió resultados ni reconstruyas su imagen para recrear F13: prepara otra sesión.

## 2. Arrancar desde un entorno nuevo

Usa `main` actualizado, que incluye la navegación amplia y el recorrido técnico. Conserva los cambios locales antes de cambiar de rama. Selecciona el devcontainer **defense**, en [`.devcontainer/defense/devcontainer.json`](../../../../.devcontainer/defense/devcontainer.json): 4 CPU / 16 GB RAM / 32 GB de disco total. La rama antigua `feat/defense-demo-visual` identifica observaciones históricas, no el procedimiento vigente.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
df -h "$PWD" /tmp
df -i "$PWD" /tmp
docker system df
make -C implementacion doctor
make -C implementacion setup-validation
```

Si `doctor` detecta herramientas ausentes, consulta sus diagnósticos y usa el instalador fijado; después repite `doctor` y `setup-validation`. Node/npm/Docker proceden del devcontainer. No sustituyas versiones por `latest`.

```bash
PREFIX="$PWD/implementacion/.tools" \
  bash implementacion/scripts/install-security-tools.sh --with-platform-tools
```

Los siguientes nombres están libres en la entrega del 16 de octubre. Comprueba `list` y cámbialos después de utilizarlos. Ejecuta sólo un laboratorio a la vez; el puerto 8765 debe estar libre. Para retirar la preparación anterior, sigue primero la conservación de las secciones 4–5 y luego la limpieza de la sección 3.

**Ensayo integral automático**, incluida la preparación larga:

```bash
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh up \
  --session rehearsal-06 --profile defense --auto --port 8765
```

Al terminar ese ensayo, conserva y limpia sus recursos antes de preparar la defensa:

```bash
bash implementacion/scripts/defense-demo.sh export --session rehearsal-06
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-06 --stop-server
```

**Preparación previa y presentación**, en dos momentos distintos:

```bash
# Antes de la exposición: deja imagen, evidencias, políticas y visor preparados.
bash implementacion/scripts/defense-demo.sh prepare \
  --session defense-02 --profile defense --serve --port 8765

# Durante la exposición: exige esa preparación íntegra.
bash implementacion/scripts/defense-demo.sh present \
  --session defense-02 --auto --budget-seconds 180
```

Para pausar entre etapas, sustituye la última orden por `present --session defense-02 --interactive --budget-seconds 180`. Las pausas cuentan. Alternativamente, `step --session defense-02` avanza una operación por invocación. Son formas alternativas de consumir una preparación nueva, no instrucciones para repetir emisiones. Ctrl+C conserva la interrupción; no la convierte en rechazo correcto ni autoriza reintentar una firma. El [guion de tres minutos](defense-demo.md#control-presupuesto-y-guion) explica cuándo pasar al respaldo guardado.

## 3. Exportar y retirar recursos

```bash
bash implementacion/scripts/defense-demo.sh export --session defense-01
# Sólo cuando termines de usar o decidas retirar esa preparación:
bash implementacion/scripts/defense-demo.sh cleanup --session defense-01 --stop-server
```

La limpieza exporta antes de retirar recursos propios y genera otra exportación después de comprobar su ausencia. Conserva el **último** `implementacion/evidence/packages/defense-SESION/export-NNNN/`, con `recorded.html`, `evidence.tar.gz`, `manifest.json` y `SHA256SUMS.txt`. Si el empaquetado o la limpieza falla, conserva el diagnóstico: no significa que el laboratorio esté limpio. No uses `docker system prune -a --volumes`.

Ya existe un respaldo completo y verificado de `rehearsal-05`: `implementacion/evidence/packages/defense-rehearsal-05/export-0003/`. Descarga esa carpeta completa. `recorded.html` funciona sin red y muestra **«Ejecución guardada; no en directo»**; el paquete contiguo contiene las evidencias completas. No se grabó un vídeo. Una exportación de `defense-01` antes del directo mostrará sólo su preparación, nunca resultados de otro ensayo.

## 4. Qué guardar de `.tmp`, y qué está fuera

**Para volver a ejecutar la demo necesitas el código actual y un entorno preparado de nuevo. Para conservar lo demostrado necesitas además las evidencias; para reproducir exactamente el análisis, también la base Trivy original.** Copiar sólo `.tmp` no cubre estos tres objetivos.

| Ruta desde la raíz, salvo `/tmp` | Qué conservar y para qué |
|---|---|
| Código modificado y archivos nuevos | Recupera el código publicado vigente desde `main` (las referencias a `feat/defense-demo-visual` identifican observaciones históricas) y conserva cualquier cambio local posterior. Un clon no recupera archivos sin publicar; `git diff` solo no incluye archivos nuevos sin seguimiento. La copia incluye `scripts/`, `demo/`, pruebas, documentación, pins y configuración. |
| `.tmp/defense-kit/` | Guarda `README.md` y `f11-static.sh` como contexto original. La alternativa estática implementada ya vive en `implementacion/scripts/defense-demo/f11-static.sh`. |
| `implementacion/.tmp/defense-demo/` | Conserva registros de sesiones, propiedad y punteros a originales. Son datos privados del coordinador; no equivalen a un laboratorio portable. PID, arranque e identidades antiguas no se restauran copiándolos. |
| `implementacion/.tmp/private-*` | Material sensible de la preparación activa: clave local, kubeconfig y configuración Docker. No lo publiques ni lo metas en el paquete compartible. Si abandonas esa preparación y empiezas otra, se genera material nuevo. La limpieza autorizada retira el de su sesión. |
| `implementacion/.tmp/vulnerability-db-*` | Conserva las instantáneas reales referidas por evidencias que quieras reproducir, incluidos destinos de enlaces simbólicos. No supongas que una carpeta antigua es descartable por llamarse `.tmp`. |
| `/tmp/golden-path-defense-*/snapshots/` y el snapshot trasladado de `rehearsal-02` | Aquí están las bases de las ejecuciones recientes. Conserva **`db/trivy.db` y su propio `db/metadata.json`**, junto al `database-identity.json` original del laboratorio. El paquete de evidencia excluye los bytes de la base. |
| `implementacion/evidence/` | Originales, copias inmutables, informes y paquetes, también de otros trabajos. No están en `.tmp`. Para compartir la demo usa su exportación saneada; una copia general se trata como respaldo privado. |
| Otros `.md`, `.patch` y materiales propios en `.tmp` | Revísalos y conserva lo que no esté en Git; hay borradores y parches anteriores ajenos a esta demo. Esta guía no los declara desechables. |
| `implementacion/.tmp/doctor-alignment-*/docker-packages/lists/` | Caché de índices APT de una reparación anterior. `lock` y `partial/` pueden pertenecer a `root` y bloquear una descarga de toda `.tmp`. Excluye esta caché del respaldo; conserva los informes de reparación, incluidos los de `implementacion/evidence/environment/doctor-alignment-*/`. |
| `.tools`, `node_modules`, cachés de descargas y `/tmp/golden-path-defense-*/trivy-cache` | Se pueden regenerar con los pins. Una caché de Trivy no sustituye a la instantánea identificada y conservada. Las imágenes de Docker también se reconstruyen; eso crea otra sesión, no reanuda la anterior. |

Ejemplos comprobados en esta entrega:

- `defense-01`: originales `implementacion/evidence/raw/run-Btqi4P62`; snapshot `/tmp/golden-path-defense-defense-01/snapshots/vulnerability-db-run-Btqi4P62`.
- `rehearsal-05`: originales `implementacion/evidence/raw/run-fL1E6K9d`; snapshot `/tmp/golden-path-defense-rehearsal-05/snapshots/vulnerability-db-run-fL1E6K9d`.
- `implementacion/.tmp/vulnerability-db-run-aqwfL3F7` es un **enlace** a `/tmp/golden-path-defense-rehearsal-02/preserved-from-workspace/vulnerability-db-run-aqwfL3F7`. Guardar sólo el enlace pierde los bytes al vaciar `/tmp`.

## 5. Copia antes de detener o cambiar el Codespace

Primero exporta la sesión que quieras conservar. Si vas a retirar el laboratorio, ejecuta su limpieza y espera a su exportación final **antes** de copiar los registros. No hagas el respaldo mientras una preparación/presentación está escribiendo. Los comandos siguientes crean archivos; no publican ni eliminan nada. Son una receta de copia, no una afirmación de que ya exista una copia externa.

Este entorno tenía 1,7 GiB libres en `/workspaces` y unos 25 GiB en `/tmp`; evidencia y `.tmp` ocupaban aproximadamente 4,2 GiB y 1,4 GiB respectivamente. Revisa `df` antes. Usa `/tmp` sólo para preparar los archivos y **descárgalos a tu ordenador antes de detener el Codespace**. Si ya tienes un destino persistente externo montado, úsalo en lugar de `/tmp`.

Ejecuta los bloques en la misma terminal. El subshell de cada bloque termina ante errores; si falla un bloque, no continúes ni cambies de máquina.

```bash
cd /workspaces/golden-path-lab
backup_dir="$(mktemp -d /tmp/golden-path-handoff-XXXXXXXX)"
chmod 700 "$backup_dir"
(
  set -euo pipefail
  git rev-parse HEAD > "$backup_dir/source-revision.txt"
  git status --short --branch > "$backup_dir/source-status.txt"
  git diff --binary HEAD > "$backup_dir/working-tree.patch"
  git ls-files --cached --others --exclude-standard -z > "$backup_dir/source-files.list"
  tar -czf "$backup_dir/source-working-tree.tar.gz" \
    --null --verbatim-files-from -T "$backup_dir/source-files.list"
  tar -czf "$backup_dir/records-private.tar.gz" \
    .tmp/defense-kit implementacion/.tmp/defense-demo implementacion/evidence
)
```

La primera copia incluye archivos nuevos no ignorados y todo el contenido versionado del árbol actual; no incluye `.git` ni archivos ignorados. Si hay borrados locales, `tar` fallará al intentar incluirlos: revisa la lista y conserva el borrado en el parche antes de continuar. La segunda copia incluye originales e historia, **no** claves de `private-*`. Guarda aparte los borradores/parches ignorados que necesites y cualquier instantánea anterior que no pertenezca a estas sesiones.

Este bloque conserva las instantáneas **de las sesiones de demo** a partir de su identidad original, resuelve el enlace trasladado y comprueba ambos hashes antes de empaquetar. No confunde una sesión que no llegó a producir una base con una base perdida:

```bash
(
  set -euo pipefail
  : "${backup_dir:?Ejecuta primero el bloque anterior}"
  for record in implementacion/.tmp/defense-demo/*/session.json; do
    demo_session="$(basename "$(dirname "$record")")"
    lab_relative="$(jq -r '.labEvidenceRoot // empty' "$record")"
    if [ -z "$lab_relative" ]; then
      printf '%s: sin laboratorio registrado\n' "$demo_session"
      continue
    fi
    identity="implementacion/$lab_relative/database-identity.json"
    if [ ! -f "$identity" ]; then
      printf '%s: sin identidad de base emitida; revisar sus recibos\n' "$demo_session"
      continue
    fi
    snapshot="$(realpath -e -- "$(jq -er '.retrieval.directory' "$identity")")"
    cp -- "$identity" "$backup_dir/$demo_session-database-identity.json"
    printf '%s\n' "$snapshot" > "$backup_dir/$demo_session-database-original-path.txt"
    jq -r '.sha256 | to_entries[] | "\(.value)  db/\(.key)"' "$identity" \
      > "$backup_dir/$demo_session-database-files.sha256"
    (cd "$snapshot"; sha256sum -c "$backup_dir/$demo_session-database-files.sha256")
    tar -C "$snapshot" -czf "$backup_dir/$demo_session-database.tar.gz" db
  done
  (cd "$backup_dir"; sha256sum -- *.tar.gz > SHA256SUMS.txt)
  (cd "$backup_dir"; sha256sum -c SHA256SUMS.txt)
)
printf 'Descarga esta carpeta completa antes de detener el Codespace: %s\n' "$backup_dir"
```

Una identidad que referencia una ruta ausente o unos bytes distintos hace fallar la copia. Revisa también cualquier mensaje «sin identidad» contra el recibo de la sesión. Descarga la carpeta indicada mediante el explorador de VS Code; al verificar los archivos descargados, ejecuta `sha256sum -c SHA256SUMS.txt` desde ella. En macOS puedes usar `shasum -a 256 -c SHA256SUMS.txt`. No consideres externa una copia que aún esté sólo en el mismo Codespace.

Al restaurar, conserva los paquetes históricos separados y restaura el código sobre un checkout limpio del SHA guardado, revisando el estado y el parche. Los bytes de una base se pueden trasladar, pero su identidad registra una ruta absoluta: conserva el original y un recibo con la ruta nueva y hashes; no reescribas el original para aparentar una reanudación. Prepara una **nueva sesión**. El código copiado y los registros no recrean automáticamente el clúster, el registro ni la clave anterior.

### Si descargar toda `.tmp` da «permiso denegado»

El `doctor-alignment-4qhIRRLp/docker-packages/lists/lock` observado es un bloqueo vacío de APT, propiedad de `root`; también existe un directorio `partial/` con acceso restringido. No necesitas esos índices para restaurar la demo. No cambies recursivamente los permisos de `.tmp`: contiene claves privadas y registros del laboratorio activo.

Para una copia adicional de los archivos de `.tmp`, usa una carpeta nueva de descarga y excluye sólo el material privado y esa caché:

```bash
(
  set -euo pipefail
  tmp_download="$(mktemp -d /tmp/golden-path-tmp-download-XXXXXXXX)"
  tar -czf "$tmp_download/implementacion-tmp-private.tar.gz" \
    --exclude='implementacion/.tmp/private-*' \
    --exclude='implementacion/.tmp/doctor-alignment-*/docker-packages/lists' \
    implementacion/.tmp
  (cd "$tmp_download"; sha256sum implementacion-tmp-private.tar.gz > SHA256SUMS.txt)
  printf 'Descarga los archivos de %s antes de detener el Codespace\n' "$tmp_download"
)
```

Este comando conserva los enlaces como enlaces: sigue siendo necesario guardar sus destinos y las instantáneas externas con el bloque anterior. La copia no incluye el código ni `implementacion/evidence/`. Descarga los archivos empaquetados, en lugar de recorrer con el explorador la carpeta original que contiene el bloqueo de APT.

## 6. Elegir más recursos

Más cores ayudan al build y a las pruebas; para resolver la falta de espacio necesitas **más almacenamiento**, además de RAM suficiente. Comprueba cores, memoria y disco de la opción concreta. En Codespaces abre la paleta de VS Code → **Codespaces: Change Machine Type**, o `github.com/codespaces` → menú `…` → **Change machine type**. Un cambio de capacidad de disco detiene el Codespace; si la capacidad es la misma, el cambio se aplica al reiniciarlo. Las opciones dependen de la cuenta/organización. [Procedimiento oficial de GitHub](https://docs.github.com/en/codespaces/customizing-your-codespace/changing-the-machine-type-for-your-codespace).

El perfil de defensa declara **4 CPU, 16 GB RAM y 32 GB de disco total**; el perfil base de contribuidores mantiene sus propios mínimos. `hostRequirements` selecciona máquinas compatibles: reconstruir no redimensiona un Codespace existente. Comprueba bytes e inodos libres. Conserva la reserva de custodia de 3 GiB y la salvaguarda de 8 GiB antes de preparar; 32 GB totales no son 32 GB libres. No aumentes los requisitos de máquina ni reduzcas márgenes para obtener un pase.

En el mismo Codespace, `/workspaces` se conserva al detener/iniciar y reconstruir. **`/tmp` sobrevive a una reconstrucción, pero se vacía al detener el Codespace, incluso por inactividad**; por eso debes descargar las bases antes del cambio. Crear otro Codespace o eliminar el actual exige recuperar tus archivos desde una copia externa; un clon sólo trae contenido publicado. [Persistencia documentada por GitHub](https://docs.github.com/en/codespaces/developing-in-a-codespace/persisting-environment-variables-and-temporary-files).

Con Docker/devcontainer en tu equipo, los recursos proceden del host o de la VM de Docker: aumentar CPU no aumenta el disco del host. Después del cambio vuelve a comprobar `df -h`, `df -i`, `docker system df`, `doctor` y `setup-validation`, y usa los comandos de sesión nueva de la sección 2. No copies un `session.json` antiguo para saltarte la validación de preparación.

## Puerto ocupado: reabrir el visor sin repetir la entrega

`up` prepara **y presenta**. Al terminar deja el visor abierto: cerrar la pestaña
no libera el puerto. En el caso comunicado, `rehearsal-01` seguía usando 8765;
`defense-01` no llegó a prepararse. Por eso `present` rechazó esa segunda sesión.
`defense` incluye F13; para las cuatro intentos R/F11/L06 selecciona
`f11-comparison`, no `defense`.

Antes de la presentación, identifica el visor y consulta la sesión:

```bash
cd /workspaces/golden-path-lab
ss -ltnp '( sport = :8765 )'
curl -fsS http://127.0.0.1:8765/api/health | jq -r '.session'
bash implementacion/scripts/defense-demo.sh status --session rehearsal-01
```

El filtro muestra solo el nombre de sesión, no el token de identidad. Si no es
un visor reconocido, no mates el proceso: identifica su propietario o elige otro
puerto. Para reabrir el visor de una sesión existente con controles web:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --stop-server --enable-actions --port 8765
```

`serve --stop-server` reinicia **solo el visor verificado** para aplicar el puerto
y modo solicitados. No repite build, clúster ni presentación. Para liberar el
puerto sin limpiar el laboratorio, o trasladar ese mismo visor:

```bash
bash implementacion/scripts/defense-demo.sh stop-server --session rehearsal-01
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --enable-actions --port 8766
```

Abre el puerto elegido desde Ports como **Private**. No uses `killall`, `pkill`
ni `fuser -k` para liberar 8765. El comando `stop-server` comprueba la identidad
del proceso y conserva estado y evidencias. No modifica la preparación ni permite
repetir una presentación ya consumida.

Para **otro ensayo**, prepara todo antes del intervalo en directo. Revisa y retira
primero la infraestructura de la sesión anterior, conservando sus evidencias:

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session rehearsal-01
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-01 --stop-server
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
bash implementacion/scripts/defense-demo.sh prepare \
  --profile f11-comparison --session "$DEMO_SESSION" \
  --reserve-gib 3 --serve --enable-actions --port 8765
# Solo cuando el estado sea PREPARED:
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
```

La preparación puede tardar minutos. No la ejecutes para resolver un puerto ocupado
en mitad de la exposición. La sesión antigua `defense-01` se conserva como intento
sin preparar: no borres su JSON ni lo marques preparado. Si se actualizó el código,
usa un nombre nuevo. Ahora `prepare --serve` y `up` comprueban el puerto antes de
crear la sesión; un conflicto no deja otra sesión pendiente. Una carrera posterior
al chequeo sigue pudiendo fallar, con su diagnóstico conservado.

## Volver a ejecutar la demo en el mismo puerto

Si `present --session defense-01` responde `A complete, unfailed prepared session
is required`, no repitas `present`: primero consulta el estado. En el caso
comprobado, `defense-01` tiene `operational=PENDING` y `prepared=false`; nunca
completó la preparación. `rehearsal-01` tiene `demoResult=CONFIRMED`: ya terminó
su ensayo, aunque su visor siga abierto. Ninguna de esas condiciones permite
una nueva presentación con `present` sobre la misma sesión.

**Para ejecutar de nuevo el perfil `defense` en 8765**, revisa el inventario y usa
este bloque desde la raíz. La limpieza retira exclusivamente infraestructura
propia de `rehearsal-01`, conserva sus evidencias y cierra su visor. El encadenado
se detiene si falla la limpieza; no arranca otro laboratorio encima del anterior.

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session rehearsal-01
```

```bash
bash implementacion/scripts/defense-demo.sh cleanup \
  --session rehearsal-01 --stop-server &&
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')" &&
printf 'Nueva sesión: %s\n' "$DEMO_SESSION" &&
bash implementacion/scripts/defense-demo.sh up \
  --session "$DEMO_SESSION" --profile defense --auto \
  --enable-actions --port 8765 --budget-seconds 180
```

`up` vuelve a preparar **y ejecuta automáticamente la presentación**. No es un
reinicio instantáneo: incluye pruebas, clúster, build, análisis y firma. Su límite
de 180 s corresponde a presentación, no a toda la preparación. Hazlo fuera de la
exposición; conserva el nombre impreso y abre/refresca 8765 como **Private**.
Para otro ensayo posterior, sustituye `rehearsal-01` en los comandos de limpieza
por la sesión que estés retirando. No borres ni reutilices `defense-01`.

**Para preparar ahora y presentar después**, sustituye `up` por `prepare` y
`--auto --budget-seconds 180` por `--serve`. Una vez termine correctamente:

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 180
```

**Para ver de nuevo los resultados sin ejecutar peticiones**, usa únicamente:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session rehearsal-01 --stop-server --enable-actions --port 8765
```

Esto reinicia el visor en el mismo puerto, no repite la demo ni convierte una
sesión pendiente en preparada. Para las cuatro intentos R/F11/L06, sigue el bloque
anterior de preparación con `--profile f11-comparison`; `defense` es el recorrido
F11/F13/entrega válida. Una sesión preparada con fuente o entorno modificados
requiere nueva preparación, no edición de su estado interno.

## Lectura visual de resultados

Los títulos resaltan escenario y vía de control. Verde significa permitido o
comprobación satisfactoria; rojo, entrega bloqueada; ámbar, riesgo admitido en R,
incidencia o paso no alcanzado. El distintivo «Detección esperada» indica por
separado que el bloqueo confirmó el ensayo. Gris significa sin ejecutar; «No
alcanzado» significa que la secuencia se detuvo antes, no que ese control rechazara
la entrega. El detalle técnico solo muestra operaciones del perfil y del intento
seleccionados. Dependencias y nombres de archivos quedan plegados.


Las etiquetas de los intentos bloqueados indican vía y punto de rechazo:
«G · Entrega bloqueada en Conftest» o «G · Entrega bloqueada en Kyverno». R tiene
una franja de referencia aparte en `defense`: es el servicio válido observado en
preparación, no un ensayo de R con privilegios. `f11-comparison` conserva su
tarjeta R en directo y su alcance registrado.

Los títulos plegados del detalle técnico muestran F11/F13 en rojo únicamente
en el control que produjo el bloqueo, indicando qué se rechazó. El prerrequisito
de resultados de F13 no se muestra como otro rechazo, ni se traslada el rechazo
de admisión al despliegue. El selector de intento también filtra estos marcadores.
Los errores de integración se distinguen de los controles no alcanzados en gris; no se
convierten en detecciones confirmadas.

Usa los accesos a evidencia bajo cada escenario o los nombres enlazados en
«Entrada» / «Salida» para abrir el detalle amplio del intento en la misma aplicación. Por
ejemplo, F11 expone el JSON original de Conftest, la atribución JSON y el diff de
seguridad. El detalle muestra intento, UTC, salida de la operación (la salida del
control permanece en su recibo), hash y estado de redacción. Presenta texto
inerte acotado y enlace al archivo completo en el visor conectado; las
exportaciones registradas usan extractos conservados e identifican el paquete
completo. Una referencia sin archivo cerrado correspondiente queda como texto;
no se sustituye por un archivo de otro intento. Abrir estos enlaces no envía
peticiones nuevas al laboratorio.

Refresca el visor para cargar estos cambios de presentación. Los recibos
conservan su identidad de fuente original; refrescar la interfaz no es otro ensayo.

## Fallo de descarga de la base Trivy durante la preparación

Si `analysis` falla antes de generar el SBOM, consulta los archivos conservados
`database-download.log`, `database-download-request.txt` y
`database-download-exit.txt` en `labEvidenceRoot` de la sesión (visible en `status`).
Un HTTP 404 del registro es un error de preparación/integración, no un rechazo de
la política de vulnerabilidades. El comando compartido ahora también muestra un
extracto identificado (últimos 16 KiB) en el log de la operación cuando falla;
el original completo se conserva separado y su código de salida detiene la fase.

Las descargas nuevas usan explícitamente `ghcr.io/aquasecurity/trivy-db:2`, la
[ubicación documentada por el proveedor](https://trivy.dev/docs/latest/configuration/db/),
sin depender del fallback del mirror ante capas ausentes. Si el operador define
`TRIVY_DB_REPOSITORY`, se respeta esa ubicación y queda en el recibo del comando.
Se mantienen la versión fijada de Trivy, la comprobación de identidad de la base
y el bloqueo HIGH/CRITICAL. Los snapshots ya identificados y las entradas
`GP_VULNERABILITY_DB` se reutilizan sin descargarlos ni actualizarlos. No se
sustituye un fallo por análisis históricos ni se reintenta incondicionalmente.

Conserva el error y las evidencias de `rehearsal-06`: no está preparada y no puede
continuarse con `present`. Fuera de la presentación, inspecciona y retira solo su
infraestructura propia y prepara una **sesión nueva** con el código corregido
(estos comandos no borran evidencias):

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session rehearsal-06
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-06 --stop-server
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Nueva sesión: %s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh prepare \
  --session "$DEMO_SESSION" --profile defense --serve --enable-actions --port 8765
# Solo cuando la preparación termine correctamente:
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 180
```

Revisa el plan antes de ejecutar la limpieza. Si otro visor ocupa el puerto,
sigue la instrucción `stop-server --session <propietario>` que indique el error;
no mates procesos arbitrarios. Conserva las salvaguardas de disco e inodos.
Un análisis aislado satisfactorio valida descarga/análisis, no una demo completa
ni un ensayo narrado.

La entrada visible **Recorrido técnico** separa el mapa completo de controles de la secuencia registrada. Consulta [navegación del recorrido](demo-workspace.md#recorrido-técnico-completo) para filtros, originales, retorno y preparación incompleta.
