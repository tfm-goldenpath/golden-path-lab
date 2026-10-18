# Demostración visual local para la defensa

Ruta principal del presentador: [preparar y ejecutar desde el navegador](web-rehearsal.md). Los ejemplos CLI siguientes siguen siendo alternativas compatibles.
Los casos F11 compatibles admiten intentos independientes sobre preparación válida conservada; F13 requiere una fixture preparada por separado. Consulta [intentos y bundles auténticos de vía A](demo-workspace.md#intentos-independientes-y-bundles-de-vía-a). La presentación original no se reinicia.

[Guía vigente de defensa](README.md) · [Controles web y capturas](demo-workspace.md#browser-controls-and-live-console)
La interfaz actual usa [navegación interna y detalle amplio de evidencia](demo-workspace.md); consulta controles, acceso a logs originales y guion propuesto.

Para el perfil local acotado de cuatro intentos F11/L06, consulta [Comparación F11](f11-comparison.md). Los registros históricos siguientes conservan su alcance y recursos originales.

[English](../../EN/defense/defense-demo.md) · [Arquitectura](../architecture.md) · [Contratos](../delivery-contracts.md) · [Matriz de cobertura](../evaluation-readiness.md)

Para los comandos de la sesión preparada y qué guardar antes de aumentar recursos o cambiar de Codespace, consulta [Ejecución y conservación al cambiar de máquina](defense-demo-operations.md).

Demostración dirigida por la **vía A**: kind, zot y clave local. Codespaces no la convierte en vía B. R/G selecciona controles; A/B selecciona ejecución y confianza. No ejecuta workflows remotos, publica cambios, acepta campañas ni mide esfuerzo humano. Registra el SHA real y un hash que incluye fuente del laboratorio, adaptadores, catálogo, web, pruebas y configuración. Las interfaces comprobadas corresponden a `1ec4cb9e89fce412df90510b7f3b3f3ca03bb50f`; no carga `demo.sh` con `source` ni inventa una fase `demo.sh local prepare`.

## Arranque

Desde la raíz del repositorio, en el devcontainer Linux AMD64 con Docker. El helper existente de red puede corregir el conflicto documentado de reenvío del puente kind en Codespaces. Sus reglas acotadas son preparación compartida del entorno, no políticas de entrega. La retirada de su contenedor de diagnóstico espera ahora un plazo acotado a que Docker complete la eliminación; no reintenta ni acepta una prueba de conectividad fallida.

Comandos:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion doctor
make -C implementacion setup-validation

# Ensayo integral: incluye preparación, sin prometer tres minutos desde frío.
bash implementacion/scripts/defense-demo.sh up \
  --session rehearsal-01 --profile defense --auto --port 8765

# Antes de la exposición, con un nombre nuevo:
bash implementacion/scripts/defense-demo.sh prepare \
  --session defense-01 --profile defense --serve --port 8765

# En directo, sólo sobre preparación íntegra y disponible:
bash implementacion/scripts/defense-demo.sh present \
  --session defense-01 --auto --budget-seconds 180
```

Si faltan herramientas, revisa `scripts/install-security-tools.sh` y usa `PREFIX="$PWD/implementacion/.tools" bash implementacion/scripts/install-security-tools.sh --with-platform-tools`. Respeta pins/checksums; el destino del plugin Buildx sigue la configuración Docker de ese instalador. Node/npm/Docker fijados proceden del devcontainer. No instales latest ni omitas doctor. En Docker/devcontainer local se usan los mismos comandos, URL y confianza A.

En **Ports**, reenvía `8765` con visibilidad **Private** y abre su URL. Localmente: `http://127.0.0.1:8765`. El servidor sólo escucha en loopback y continúa tras el resultado del trabajo, incluido un fallo. Usa otro puerto para otro visor o cierra explícitamente el servidor anterior. No reutilices nombres de sesión.

La reserva predeterminada es **1 GiB**, más **2 GiB de margen inicial** y 10.000 inodos libres. Es una elección local para este Codespace de 32 GiB con kind/zot/BuildKit ya descargados, no un requisito universal ni una garantía de tamaño. Auméntala con `--reserve-gib`. Se conservan `df` y uso de Docker antes del build/descargas y empaquetado. La caché de descarga Trivy usa `/tmp/golden-path-defense-SESION/trivy-cache`; la demo conserva una instantánea independiente e identificada bajo `/tmp/golden-path-defense-SESION/snapshots/vulnerability-db-run-*` mediante la opción `GP_VULNERABILITY_SNAPSHOT_ROOT` (otros ejecutores conservan su destino `.tmp` original). Antes del análisis exige 4 GiB libres en `/tmp` para las dos copias observadas de 1,6 GB y margen de trabajo. Conserva esa instantánea aparte para reproducir el análisis: el paquete incluye su identidad, pero el empaquetador existente excluye los bytes de la base. La limpieza no borra instantáneas ni evidencia anterior. GitHub documenta que `/tmp` sobrevive a una reconstrucción, pero **se vacía al detener el Codespace**, incluido el reinicio para cambiar de máquina: transfiere las instantáneas antes. Consulta la [guía de conservación y su fuente oficial](defense-demo-operations.md). La falta de espacio detiene el trabajo; no uses prune global ni borres sesiones desconocidas.

## Qué se ejecuta y cómo leerlo

Preparación ejecuta realmente `make test`: entorno, servicio/contratos, Python, Rego/Kyverno, Cosign criptográfico local y F01/F02 estáticos. Después ejecuta el preflight distinto de entrega, build nuevo, referencia HTTP, políticas tempranas, SBOM/Trivy reales, firmas/gates e instalación de admisión. Deja la imagen **sin resultados**. Esto no aprueba un PR de GitHub. Todo control obligatorio fallido detiene la preparación.

Demostración muestra pistas compactas por intento y controles válidos. Un clic en el bloqueo abre su consola original en la vista principal de detalle. Escenarios, Workflows y Sesiones sustituyen el área principal conservando contexto. Atrás/Adelante, selección y sondeo conservan identidad y lectura. Tiempo registrado y conexión del visor no equivalen a ejecución actual. Consulta la guía de navegación.

1. **F11 temprano:** `privileged=true` y `allowPrivilegeEscalation=true`. Sólo los diagnósticos exactos PRIVILEGED y ESCALATION acreditan Conftest. Esta solicitud termina antes de admisión/despliegue protegido. El build y análisis previos siguen mostrados como antecedentes preparados.
2. **F13 previo a emisión:** manifiesto válido, firma/SBOM/procedencia autenticados e inventarios completos, consistentes y sin resultados. CREATE debe rechazarse sólo por `tfm-results/require-results`. NotFound explícito antes/después confirma ausencia del Deployment. Certificados, registro, transporte, API o evaluación fallidos son errores, no detección. La recuperación sigue pendiente.
3. **DEMO_VALID_ACCEPT:** relee registro, autoriza, firma y verifica resultados; admite **el mismo digest con las mismas políticas**. Comprueba Pods Ready, imagen efectiva y HTTP real. Completa la recuperación vinculada a F13; no es L01 completo, que requiere sustituir por otro digest.
4. **F11 en admisión:** nueva solicitud UPDATE privilegiada sobre la imagen ya autorizada. Rechazo sólo por `tfm-runtime`; UID, generación y spec iguales; HTTP disponible. Sólo se salta el paso temprano del ensayo dirigido; ninguna política del producto se desactiva.

`privileged` afecta a privilegios del contenedor; `allowPrivilegeEscalation` controla adquirir más privilegios que el proceso padre. Ninguno concede el rol RBAC Kubernetes `cluster-admin`. El actor sigue restringido. Las políticas reales son `tfm-runtime`, `tfm-signature`, `tfm-sbom`, `tfm-provenance`, `tfm-results`.

El catálogo distingue control implementado, adaptador disponible, sesión actual e historia. Los otros casos no se ejecutan por figurar allí. Los workflows muestran triggers, permisos, acciones fijadas y límites extraídos del YAML real. Rulesets, aprobación humana, Copilot review, CodeQL, Dependabot y secret scanning quedan como controles externos no observados; no se consultó configuración remota. Revisión humana: **No solicitada para esta demostración**.

## Control, presupuesto y guion

```bash
bash implementacion/scripts/defense-demo.sh status --session defense-01
bash implementacion/scripts/defense-demo.sh list
bash implementacion/scripts/defense-demo.sh step --session defense-01
# Alternativa sobre otra preparación nueva:
bash implementacion/scripts/defense-demo.sh present --session defense-01 --interactive --budget-seconds 180
```

`--auto` no solicita notas ni aceptación. El interactivo sólo pausa entre operaciones; las pausas consumen presupuesto. `step` avanza una operación, comprobando de nuevo disponibilidad; varias invocaciones no se presentan como un intervalo continuo. `present` comprueba fuente/configuración, arranque, digest/tag, confianza, identidades de recursos, controlador, políticas Ready e iguales y permisos. No reconstruye ni firma en secreto. Las emisiones no se repiten automáticamente. Hay exclusión por sesión y de preparaciones concurrentes.

Ctrl+C o el límite envía TERM al grupo propio, espera cinco segundos y después termina los hijos restantes. Conserva ABORTED y NOT_REACHED. Docker/Kubernetes pueden haber completado una solicitud antes de la interrupción: no supongas que nada se publicó ni repitas una firma. Inspecciona, limpia explícitamente y prepara otra sesión. Un nuevo arranque invalida preparación y continuidad del reloj. SIGKILL deja RUNNING interrumpido y tampoco permite repetir. La limpieza rechaza un trabajador propio todavía activo.

Objetivo: **160 segundos incluyendo explicación**, con 20 de margen. El ensayo local de la fuente final del 16 de octubre de 2026 midió **27,38 s en directo** y **713,80 s de preparación**; el registro de validación conserva fuente, evidencias y límites. Recomienda el perfil completo aquí, sin garantizar ese tiempo en otro entorno. La medida real incluye disponibilidad y conservación, no preparación fría. Si una operación ronda 20 segundos sin responder, continúa explicando; cambia al respaldo grabado antes de comprometer el límite. El perfil explícito `--profile defense-short`, elegido en preparación, omite F11 tardío y mantiene F13 con recuperación completa. La barrera omitida sólo se respalda con una ejecución real guardada y rotulada. Nunca hay sustitución histórica automática.

- 0–25 s: «La imagen y las evidencias ya estaban preparadas. Esta es la vía A; aquí están la fuente y el digest».
- 25–50 s: «F11 cambia dos campos. Conftest bloquea esta solicitud antes del despliegue protegido».
- 50–90 s: «F13 tiene las otras evidencias, pero carece de resultados firmados. Sólo esa regla lo rechaza; no hay Deployment».
- 90–130 s: «Los controles deterministas revalidan y emiten resultados. El mismo digest se admite y responde por HTTP».
- 130–160 s: «Otra actualización privilegiada llega a Kyverno. Se rechaza sin alterar el Deployment que funciona».
- 160–180 s: margen para abrir un recibo o usar respaldo. No comparar este tiempo con muestras de campaña ni esfuerzo humano.

## Conservar, limpiar y preparar la defensa

```bash
bash implementacion/scripts/defense-demo.sh export --session rehearsal-01
bash implementacion/scripts/defense-demo.sh cleanup --session rehearsal-01 --stop-server
# Después: prepare de defense-01 en el puerto libre.
```

Exporta a `implementacion/evidence/packages/defense-SESION/export-NNNN/`: `recorded.html`, `evidence.tar.gz`, `manifest.json`, `SHA256SUMS.txt`. El HTML es autocontenido, funciona sin red y dice **«Ejecución guardada; no en directo»**. Incluye extractos acotados; el paquete contiguo conserva los bytes completos y el mapa de IDs. Descarga ambos desde el panel o explorador y guarda una copia fuera de Codespaces. No se fabrica ni graba automáticamente un vídeo.

Originales del laboratorio: `implementacion/evidence/raw/run-*`. Copias cerradas, recibos y logs: `implementacion/evidence/raw/defense-SESION/`. Registro final: `implementacion/.tmp/defense-demo/SESION/session.json`. `lab-path.txt`, `ownership.json` y `server.json` son privados del coordinador y no se sirven. Claves/kubeconfig quedan excluidos. Una vista saneada tiene hash propio y procedencia; un hash no prueba autenticidad, semántica ni revisión humana.

La limpieza verifica exportación con el empaquetador existente, comprueba propiedad, reutiliza la limpieza compartida y confirma ausencias. Produce otra exportación **después** del recibo de limpieza: conserva el último `export-NNNN` y el registro de sesión. Si no hubo laboratorio, no inventa paquete del laboratorio ni recursos eliminados. Es explícita e idempotente; no borra recursos globales, evidencia ni DB. Si falla conservación o retirada, no se declara limpia. El resultado original del trabajo no se convierte en éxito por limpiar. Tras autorizar resultados, esa imagen no sirve para repetir F13: prepara una sesión nueva para la defensa.

## Archivos, ampliación y alternativa estática

Entrada: `scripts/defense-demo.sh`. Coordinación/presupuesto: `scripts/defense-demo/coordinator.py`; adaptadores: `adapters.sh`; evidencia: `core.py`, `observer.py`, `exporting.py`; servidor: `server.py`. Catálogo: `demo/catalogue.json`. Web sin build/CDN: `demo/index.html`, `style.css`, `model.js`, `app.js`. El observador optativo de `scripts/lib/attestations.sh` no actúa sin `gp_observe` y conserva invocaciones directas bajo errexit.

Para ampliar: define ID/límite y oráculo aprobado; registra un adaptador fijo en la lista permitida y secuencia; implementa usando controles compartidos; añade metadatos, pruebas y ejecución real. El catálogo no admite comandos shell. No hace falta modificar servidor ni renderizador. DEMO_VALID_ACCEPT no añade un escenario académico.

```bash
make -C implementacion test-defense
make -C implementacion test
bash implementacion/scripts/defense-demo/f11-static.sh
```

El fallback separado ejecuta Conftest real sobre un **manifiesto sintético identificado y un digest de ejemplo**. Necesita Node/jq/Conftest, no Kubernetes; no acredita build, firma, F13 ni admisión. Si falla el clúster, F13 sólo puede mostrarse como ejecución real anterior claramente identificada, o sin ejecutar. Los sustitutos unitarios no acreditan integración. Consulta el [registro local de validación](../../../registros/defense_demo_validation_EN.md) para resultados reales y revisión pendiente.

Para repetir una demo ya terminada en 8765, consulta [volver a ejecutar en el mismo puerto](defense-demo-operations.md#volver-a-ejecutar-la-demo-en-el-mismo-puerto): requiere una sesión nueva; `serve` solo reabre el visor.
