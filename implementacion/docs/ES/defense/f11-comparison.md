# Comparación F11 en un laboratorio local preparado

[Guía vigente de defensa](README.md) · [Controles web y capturas](demo-workspace.md#browser-controls-and-live-console)
La interfaz actual usa [navegación interna y detalle amplio de evidencia](demo-workspace.md); consulta controles, acceso a logs originales y guion propuesto.

El perfil `f11-comparison` amplía el coordinador y dashboard existentes. Reutiliza
los cinco módulos, el actor restringido, el oráculo F11 y la actualización positiva
de L06. Una sola imagen autorizada por digest sirve para las cuatro observaciones.
R/G identifica controles; A/B identifica ejecución/confianza. Este perfil es **A**.

**La comparación local real terminó correctamente:** preparación de 423,02 s
y ejecución viva de 19,01 s en el Codespace observado de 4 CPU / 16 GB. El
[registro de validación](../../../registros/f11_comparison_validation_EN.md) conserva
fuente exacta, fallos anteriores y alcance parcial F11/L06. Este único ensayo no
garantiza rendimiento. El ensayo hablado completo de 160 s y la revisión humana
de los cambios posteriores siguen pendientes; el usuario aceptó el alcance de
la PR en `e675325`. Una preparación fallida no permite afirmar ejecución viva.

## Preparar, abrir y ejecutar

El perfil opcional `.devcontainer/defense/devcontainer.json` reutiliza el Dockerfile,
contexto, Features bloqueadas y herramientas fijadas. Declara mínimos de 4 CPU,
16 GB RAM y 32 GB de disco **total**. `hostRequirements` no redimensiona la máquina
al reconstruirla. El perfil base conserva 2 CPU / 8 GB / 32 GB; los ajustes de
defensa están solo en el perfil opcional. Ambos fijan Docker CE 29.8.0, no el
paquete Moby más reciente de otra imagen de Codespaces. Ejecuta
`make -C implementacion doctor` antes de preparar para comprobar CLI y daemon.
No reinicies ni reconstruyas durante la presentación.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="f11-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf '%s\n' "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh prepare \
  --profile f11-comparison --session "$DEMO_SESSION" \
  --reserve-gib 3 --serve --enable-actions --port 8765
```

Guarda el nombre exacto de sesión. Abre 8765 desde Ports con visibilidad **Private**.
El servidor escucha en loopback. Este comando prepara y abre; **no presenta**.
`--enable-actions` es la variante necesaria para los botones de escritura; al
omitirlo el visor es de solo lectura. `up` conserva su comportamiento histórico
de preparar **y presentar**.

Preparación incluye pruebas compartidas, clúster/registro/builder propios, un build,
análisis real con snapshot identificado, firma, SBOM, procedencia, resultados,
verificación, políticas, rollout válido y HTTP. No construye la segunda imagen de
L01. F13 conserva su preparación sin resultados. El tiempo y coste previos están
separados y visibles.

```bash
# Reabrir: no ejecuta build ni crea otro clúster.
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port 8765
# O pulsar Ejecutar comparación.
bash implementacion/scripts/defense-demo.sh present \
  --session "$DEMO_SESSION" --auto --budget-seconds 120
```

Para cambiar el modo de un visor ya abierto utiliza `serve --stop-server` con la
opción deseada; solo reinicia el visor identificado. Para preparar desde la web:
`serve --new --profile f11-comparison --session NOMBRE --enable-actions --port 8765`,
y después **Preparar**. Cada preparación se consume una vez. Repetir exige otra
sesión preparada; no edites JSON ni copies estado para simular continuidad tras
reboot, rebuild o limpieza.

## Tarjetas y botones

| Intento | Expectativa que exige observaciones nuevas | Límite |
| --- | --- | --- |
| R, advertencia | Actor restringido actualiza, rollout/Pods Ready ejecutan ambos privilegios, digest coincide, HTTP es correcto y carga retirada | Configuración de riesgo ejecutada; sin explotación, escapes ni afirmación de compromiso. R conserva Kubernetes/RBAC. Un bloqueo PSA u otro error conserva el diagnóstico y no confirma la expectativa. |
| G temprano, rojo | Conftest devuelve exclusivamente PRIVILEGED y ESCALATION | Esta petición no llega a Kubernetes. El build previo ya ocurrió. |
| G admisión, rojo | UPDATE independiente rechazado solo por `tfm-runtime/restricted-containers`; UID/generation/spec intactos; servicio sano y políticas iguales | F11 parcial: no prueba CREATE ni Pod directo. No es continuación del pipeline detenido por Conftest. |
| Legítimo, verde | Anotación permitida, Conftest y admisión aceptan, generation aumenta, rollout/Pods nuevos, mismo digest y HTTP | **L06 — actualización legítima demostrada; alcance parcial**. No ejecuta Pod directo ni completa el contrato del catálogo. |

R se ejecuta primero y se retira antes de las otras tarjetas. El resultado de la
entrega y la confirmación de la expectativa se muestran por separado. Error o
aborto es ámbar; no ejecutado y no alcanzado son grises con etiquetas distintas.
El selector de intento también filtra detalle técnico. La preparación se presenta
plegada. La consola conserva salida, ofrece selector y archivo completo, hash,
UTC y recibo de comando; diferencia extracto, provisional y copia redactada.

Botones: **Preparar**, **Comprobar entorno**, **Ejecutar comparación**, **Siguiente
paso**, **Detener**, **Exportar**, **Limpiar recursos propios**. La limpieza muestra
el plan concreto. Cookie de sesión HttpOnly/SameSite y CSRF en memoria autorizan
acciones enumeradas con comprobaciones Host/Origin y bloqueo por sesión. El token
de health no autoriza escritura. No se guardan credenciales en URL/localStorage.
Cerrar una pestaña no detiene ni repite trabajo. Detener señala solo el coordinador
y grupo de procesos propios; timeout/aborto no es detección. Si se interrumpe la
retirada R, inspecciona sus recibos y ejecuta la limpieza propia antes de abandonar
el laboratorio.

## Espacio, exportación y cierre

Márgenes provisionales F11: reserva 3 GiB, preparación 8 GiB libres, aviso bajo
5 GiB, crecimiento conservador vivo 256 MiB e inodos libres ≥10 000. Se parametrizan
con `--reserve-gib`, `--prepare-free-gib`, `--warning-free-gib` y `--live-growth-mib`.
No son una capacidad científicamente validada ni se reducen automáticamente. Los
perfiles históricos mantienen su reserva predeterminada.

Se registran dispositivos reales y alias de montajes sin sumar dos veces el mismo
sistema. Docker desconocido se etiqueta como desconocido. Hay muestras antes/después
y cada 10 segundos: máximo **muestreado**, no pico exacto. Durante el directo no se
hace `du` recursivo, `docker system df`, build, escaneo ni descarga de bases. Cruzar
la reserva detiene trabajo nuevo y cancela el proceso propio. Recibos de fallo y
limpieza quedan exentos; ENOSPC libera una pequeña reserva propia de metadatos.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh check --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Exportar estima crecimiento y reserva; transmite archivos y snapshot F11 sin cargar
paquetes completos en RAM, verifica hashes y conserva todos los intentos. Guarda
juntos `recorded.html`, `evidence.tar.gz`, `manifest.json` y `SHA256SUMS.txt`;
ejecuta `sha256sum -c SHA256SUMS.txt` dentro de esa carpeta. `verify` comprueba
integridad del archivo; no reemplaza los recibos criptográficos originales.
El HTML indica ejecución registrada y oculta controles de ejecución.

Si exportar no cabe, se conserva el recibo pendiente y se pueden retirar únicamente
contenedores con identidad registrada, manteniendo evidencia original. No hace
falta crear primero otro paquete. Tras limpiar F11, los recibos de cierre se
incluyen en una exportación posterior explícita. El resultado fallido se conserva.
Se rechazan IDs reemplazados, referencias de otra sesión y recursos sin propiedad
registrada. No hay recolector de carpetas ni prune global. Se conservan evidencia,
recibos, exportaciones, revisiones, planes, snapshots, claves/kubeconfigs, cachés de
imágenes y volúmenes Docker; por tanto no se garantiza recuperar todo su espacio.
Un recurso parcial sin identidad registrada requiere revisión, no borrado por prefijo.

## Guion orientativo: 160 segundos

Guion ajustado a la automatización observada de **19,01 s**, tras **423,02 s**
de preparación previa. Si arrancas en el segundo 20, esa observación terminaría
hacia el 39; utiliza el resto del bloque para explicar los logs. No es una garantía
para otro ensayo. La narración completa aún no se ha cronometrado con una persona.
Puede solaparse con automatización; no se descuentan esperas.

- **0–20 s:** «Comparamos la misma imagen en 4 CPU y 16 GB. El disco total es
  32 GB. Preparar, construir, analizar y firmar ocurrió antes: aquí está su coste.
  R y G son controles; estamos en confianza local A».
- **20–110 s:** pulsa Ejecutar comparación. «R intenta ejecutar los dos campos de
  riesgo y retira esa carga. G temprano exige exactamente estos dos diagnósticos.
  La petición a Kyverno es nueva e independiente; no continuamos el pipeline que
  Conftest detuvo». Abre el log concreto cuando esté disponible.
- **110–145 s:** «El rechazo debe dejar UID, generation y spec intactos. La
  actualización legítima cambia una anotación, conserva imagen, aumenta generation
  y exige rollout, Pods y HTTP. Es L06 parcial. R admitió riesgo solo si sus
  observaciones lo confirman; no hemos explotado ni comprometido el clúster».
- **145–160 s:** muestra recibos/hash y Qué demuestra y qué no. «F11 cubre UPDATE,
  no todo CREATE/Pod. No demuestra OIDC, productividad ni aceptación humana».
- **160–180 s:** reserva. Si la ejecución falla o excede presupuesto, conserva el
  resultado y muestra exclusivamente un export real identificado como registrado.

El cronómetro empieza antes del chequeo final de readiness e incluye esperas,
cierre de evidencia y retirada R. Los 120 s de la CLI son límite operativo, no el
objetivo de 90 s ni garantía para la explicación. `step` produce segmentos separados.
Exportación y cierre general quedan fuera; su coste también se registra.

El export real de esta observación está identificado en el registro de validación.
Ábrelo como «Ejecución registrada». Sin ese archivo, el respaldo es solo estático:

```bash
bash implementacion/scripts/defense-demo/f11-static.sh
```

Usa manifiesto sintético etiquetado y Conftest real. No prueba R, firma, Kyverno,
L06 ni entrega viva. No añade muestras al catálogo/campaña ni conclusiones económicas
o humanas. El usuario confirmó revisión y aceptación de `e675325`; los cambios
posteriores de visor/puerto requieren su propia revisión.

Para puerto ocupado y reapertura segura, consulta [la guía operativa](defense-demo-operations.md#puerto-ocupado-reabrir-el-visor-sin-repetir-la-entrega).
