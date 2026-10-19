# Defensa portable y congelación reproducible

[Índice de defensa](README.md) · [English](../../EN/defense/static-freeze.md)

El recorrido principal es F11/Conftest → F13/resultados ausentes → recuperación
autorizada → F11/Kyverno independiente. **DEMO_VALID_ACCEPT conserva la imagen;
no demuestra L01 completo.** `defense-all` mantiene R con privilegios y retirada,
L06 parcial y las comparaciones F02/F12/F03 preparadas por separado, opcionales
para preguntas. El mapa explica quince fases de arquitectura; la secuencia
muestra el orden registrado. Filtrar o explorar nunca ejecuta operaciones.

## Preparar antes de presentar

Termina los cambios de código primero. Usa una preparación compatible, 4 CPU,
16 GB RAM y 32 GB de disco total. Conserva 3 GiB de reserva más los márgenes de
crecimiento. Mide bytes/inodos libres antes de preparar, exportar y grabar. No
confundas montajes distintos de Docker, `/tmp` y `/workspaces`.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
nproc
free -h
df -h /workspaces /tmp
df -i /workspaces /tmp
docker system df
ss -ltnp 'sport = :8765'
export DEMO_SESSION="freeze-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense-all --reserve-gib 3 \
  --enable-actions --port 8765
```

Si el puerto está ocupado, elige otro libre; no termines procesos ajenos. Ábrelo
como **Private** en Codespaces. En Demostración selecciona la secuencia principal
y **Preparar laboratorio común**. Espera la finalización confirmada. F03 opcional
reutiliza builder, registro y base fijada de este perfil, sin crear otro clúster.
F02/F12 se preparan por separado. Todo ello queda fuera de los tres minutos.

Reabre sin preparar ni ejecutar:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
```

Tras desconexión consulta la misma identidad de acción y su informe final; no
reenvíes automáticamente. Reboot, cambio de fuente, retirada de recursos o
preparación fallida requieren preparación compatible, nunca editar el estado.
`up --auto` prepara **y ejecuta**. Una secuencia consumida no se reinicia.

## Guion propuesto: 160 segundos y 20 de reserva

Elige **Foco → Defensa · F11 / F13 / recuperación**, también accesible mediante
`#demo?focus=defense`. Solo filtra el resumen; las ampliaciones siguen disponibles.

| Tiempo | Explicación y acción |
|---|---|
| 0–20 s | Identifica sesión, fuente, vía A y máquina. Declara que se preparó antes. |
| 20–50 s | Pulsa Iniciar comparación una vez. Abre el log F11/Conftest: PRIVILEGED y ESCALATION. |
| 50–80 s | Abre F13/Kyverno y su atribución: faltaban resultados, no era un problema de privilegios. |
| 80–110 s | Muestra recuperación con el mismo digest, rollout y HTTP. No la llames L01 completo. |
| 110–135 s | Abre F11/Kyverno: petición independiente, bloqueo esperado y estado conservado. |
| 135–160 s | Ver proceso completo, procedencia y cierre. Conserva 20 s de margen. |

Un bloqueo rojo puede confirmar la expectativa; un fallo de infraestructura no.
Si el siguiente resultado no está confirmado, explica la incidencia y cambia
explícitamente al respaldo registrado. El presupuesto de 120 s por acción no
garantiza tres minutos con explicación. La narración humana sigue pendiente.

Para preguntas de L01 completo abre Workflows → Atestaciones → `L01-update` en la
captura histórica seleccionada. Comprueba run, fuente y digest distinto del
principal. Ese contexto no es la recuperación F13 ni vía B/OIDC: sigue siendo
confianza local A, aunque se ejecutara en GitHub.

## Exportación seleccionada

Las observaciones importadas son explícitas: no se añaden automáticamente las
últimas capturas ni otras sesiones. Este ejemplo probado conserva todos los
intentos de la sesión y una captura auténtica de lane A:

```bash
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION" \
  --export-observation 37353632299-fa7f7e2ecb58
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
```

Si no tienes esa captura local, omite el argumento o usa antes el
[importador existente](demo-workspace.md#observed-github-runs-and-attestations).
Repite `--export-attempt` con IDs realmente registrados para acotar intentos;
se conserva la preparación. Se rechazan IDs desconocidos. Sin estos argumentos
se exportan los intentos de esta sesión, sin observaciones GitHub.

Cada exportación tiene un directorio numerado nuevo. El inventario determinista
reutiliza las referencias de operaciones del visor. Los originales esenciales
pequeños, hasta 64 KiB cada uno, tienen prioridad dentro de **2 MiB** de texto HTML.
Si no caben, se solicita acotar la selección; no se vacían silenciosamente.
Los archivos grandes tienen hasta 12.000 bytes de extracto; algunos secundarios
pueden no incluirse en HTML. Cada archivo indica **FULL**, **EXCERPT** o
**NOT_EMBEDDED**, tamaño, ruta lógica, hash y motivo. Un extracto vacío no aparece
como log disponible. Las referencias esenciales ausentes marcan respaldo incompleto.
Todos los originales seleccionados permanecen en carpeta/paquete portable. Los
mayores de 16 MiB se consultan fuera del visor para limitar memoria. Una copia
redactada conserva hash propio y relación con su origen; no se presenta como el
original sin modificar. Integridad no equivale a verificar firmas de nuevo.

## Respaldos independientes

Desde el directorio de exportación indicado:

```bash
sha256sum -c SHA256SUMS.txt
python3 portable/verify.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory portable
```

- **recorded.html**: ábrelo directamente con `file://`. No necesita servidor,
  API, polling, CDN, red ni caché. Logs esenciales pequeños completos; los grandes
  pueden requerir la carpeta portable. Los extractos están identificados.
- **portable/**: copia la carpeta, verifica y sirve por HTTP estático. Abre
  `http://127.0.0.1:8000/`. También funciona bajo `/golden-path-lab/demo/` si se
  coloca allí dentro del directorio servido. Rutas relativas, sin backend
  `/api` ni `/download`; el visor verifica hashes al abrir los originales.
- **video.mp4** del paquete congelado: navegación continua de evidencias
  registradas, sin voz ni aceleración. Reproducción local sin servidor/red en un reproductor H.264. El Chromium de
  pruebas instalado no decodifica H.264; se conserva también el WebM original.

Los enlaces externos a GitHub necesitan red; los documentos incluidos no.
La revisión del renderizador y la fuente productora de las evidencias se muestran
por separado. No se atribuye una nueva ejecución al mero hecho de abrirlas.

## Grabar, congelar y retirar

Usa los directorios reales indicados por la exportación. Los scripts requieren
Playwright/Chromium y FFmpeg con H.264 ya disponibles; no instalan herramientas:

```bash
node implementacion/tests/defense_demo/static-export-check.mjs "$EXPORT_DIR" "$CHECK_DIR"
node implementacion/tests/defense_demo/record-defense.mjs "$EXPORT_DIR/recorded.html" "$VIDEO_DIR"
python3 implementacion/scripts/defense-demo/freeze-demo.py \
  --export "$EXPORT_DIR" --video "$VIDEO_DIR/defense.mp4" \
  --original-video "$VIDEO_DIR/original.webm" --recording "$VIDEO_DIR/recording.json" \
  --validation "$CHECK_DIR/result.json" --output "$FREEZE_DIR"
python3 "$FREEZE_DIR/verify.py"
```

Asigna las variables a destinos nuevos con espacio suficiente. El
[registro de validación](../../../registros/demo_static_freeze_EN.md) contiene
rutas y comandos ejecutados. La congelación verifica asociaciones y hashes,
decodifica todo el H.264, conserva WebM original y registra fuente, renderizador,
selección, comprobaciones y ensayo humano pendiente. Exige 3 GiB más el crecimiento
estimado. No publica tags, Pages ni ejecuta workflows remotos. Un archivo alterado
falla la verificación; no se recalculan hashes para aceptar corrupción.

Después de presentar:

```bash
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Retira únicamente recursos propios comprobados. Conserva evidencias, intentos,
snapshots, claves y exportaciones. No uses podas globales. Mide el espacio realmente
recuperado. Ficha humana pendiente: persona/fecha ___; sesión/fuente ___; inicio/fin
narración ___; duración ___; incidencias/respaldo ___; decisión/revisor ___.

[Publicar evidencias registradas en Pages](github-pages.md) — transporte, pasos explícitos tras merge y recuperación; sin ejecutar laboratorio.
