# Ensayo desde el navegador y respaldo registrado

[Índice de defensa](README.md) · [English](../../EN/defense/web-rehearsal.md)

Usa una sesión `defense` nueva sobre la fuente definitiva. La vía A utiliza una
clave local de confianza: no acredita OIDC de GitHub, cobertura completa del
catálogo, sustitución de imagen L01, esfuerzo humano ni una muestra de campaña.
La secuencia inicial ya incluye F13. Su repetición independiente requiere otra
preparación y capacidad adicional.

## Antes de la exposición

Mantén 4 CPU / 16 GB RAM / 32 GB de disco total. Comprueba bytes e inodos libres;
conserva la reserva de 3 GiB y los márgenes configurados. Clúster, build, descargas,
análisis, firma y calentamiento quedan fuera de los tres minutos.

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
nproc
free -h
df -h /workspaces /tmp
df -i /workspaces /tmp
docker system df
ss -ltnp 'sport = :8765'
export DEMO_PORT=8765
# Si está ocupado, identifica su propietario y elige otro libre: DEMO_PORT=8776.
export DEMO_SESSION="defense-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
printf 'Sesión: %s  Puerto: %s\n' "$DEMO_SESSION" "$DEMO_PORT"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense --reserve-gib 3 \
  --enable-actions --port "$DEMO_PORT"
```

Guarda la identidad y el puerto para otra terminal. En Codespaces reenvía ese puerto
con visibilidad **Private**; el servidor escucha en loopback. Este comando crea el
visor, no el laboratorio. Pulsa **Preparar entorno** y abre **Consola en directo**.
Cerrar la pestaña no cancela la preparación: vuelve a abrir la misma acción sin
reenviarla. Preflight puede escribir sus pruebas en archivos propios y emitir poca
salida; sus informes están en Evidencias de la operación final.

Espera **Completada** y ejecuta **Más acciones → Comprobar entorno** dos veces.
Cada acción debe tener ID, salida y recibo propios, y liberar los controles. La
sesión debe permanecer preparada, con los casos de presentación pendientes. Cambios
de fuente, configuración o arranque requieren preparar una sesión nueva, no editar
su estado.

`up --auto` prepara **y ejecuta**; no es esta ruta. `prepare --serve --enable-actions`
sigue disponible como alternativa de preparación por CLI. Sin `--enable-actions`
el visor solo permite consultar; el navegador no puede elevar permisos.

## Durante la presentación

Elige **Automático → Iniciar comparación**. Ejecuta la disponibilidad actual,
F11/Conftest, F13/Kyverno, autorización, despliegue válido/HTTP y una petición
independiente F11/Kyverno. Un rechazo rojo atribuido con expectativa confirmada
es una prueba satisfactoria del control; un fallo de integración no lo es. Build,
análisis y firma preparados no se presentan como ejecutados otra vez. R aquí es
la referencia válida preparada, no la exposición privilegiada de `f11-comparison`.

**Paso a paso → Ejecutar siguiente paso** ejecuta solo la siguiente operación
permitida. Las pausas y segmentos separados no forman una duración continua.
No cambies de modo para eludir un fallo. La presentación consumida no se reinicia
sobre sus recibos. Los botones F11 **Nuevo intento** crean identidades y evidencias
nuevas tras comprobar preparación; los intentos anteriores se consultan aparte.

**Detener** solicita cancelación: espera el recibo final. Ensaya cancelación solo
con una comprobación segura de disponibilidad. Si termina antes, conserva su
finalización normal. No interrumpas firma o autorización para demostrar el botón.

**Ver proceso completo** abre las quince fases. **Secuencia ejecutada** muestra
cronología; el mapa es pedagógico. **Ver salida original** abre una consola amplia.
**Volver al recorrido técnico** recupera filtros y desplegables; **Demostración**
regresa a la comparación. Consultar no cambia la sesión controlada.

Como referencia CLI fuera del ensayo web, la secuencia pendiente se ejecuta con
`bash implementacion/scripts/defense-demo.sh present --session "$DEMO_SESSION"
--auto --budget-seconds 120` (una línea de shell). No lo ejecutes además del botón
ni sobre una secuencia consumida.

## F13 adicional y capacidad

Tras emitir resultados, el mismo digest ya no demuestra ausencia. **Preparar nuevo
caso F13** prepara una fixture independiente fuera del tiempo de presentación.
Su salvaguarda inicial exige 8 GiB libres, incluyendo reserva y crecimiento, más
inodos suficientes. Vuelve a medir después de preparar el primer laboratorio.
Si no hay margen, conserva el diagnóstico y marca la repetición bloqueada por
recursos. El F13 inicial no valida su repetición. No borres atestaciones ni evidencias
para conseguir un pase. Solo ejecuta, recupera y retira la fixture propia cuando su
preparación haya terminado correctamente.

## Respaldo y cierre

Después del ensayo usa **Más acciones → Exportar HTML y evidencia** una vez y
espera su finalización. La exportación queda fuera del cronómetro. Verifica sin
crear otro paquete:

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
# Alternativa CLI al botón; no la repitas solo para verificar:
# bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
```

Conserva juntos `recorded.html`, `evidence.tar.gz`, `manifest.json` y `SHA256SUMS.txt`
del directorio indicado. En el ordenador del presentador ejecuta
`sha256sum -c SHA256SUMS.txt` y abre `recorded.html` directamente en el navegador.
Debe identificar resultados registrados, sesión, fuente y fecha; no requiere API
ni servidor y no permite ejecutar acciones. Los extractos son acotados y se
etiquetan: los originales completos y la correspondencia de sus IDs/rutas están
en el paquete y manifiesto verificados. No presentes un extracto como completo.
Los enlaces externos a GitHub necesitan red. Las observaciones importadas conservan
su identidad histórica y están separadas de esta ejecución local. Un bundle visible
no acredita una nueva verificación criptográfica.

Para reabrir el visor vinculado sin ejecutar:

```bash
bash implementacion/scripts/defense-demo.sh serve \
  --session "$DEMO_SESSION" --enable-actions --port "$DEMO_PORT"
# Para consulta solamente, omite --enable-actions al abrir otro visor.
# Después de presentar, consulta el alcance y retira solo esta sesión:
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

Retira primero la fixture F13 vinculada si existe. La limpieza conserva evidencias,
material privado y volúmenes Docker; recuperaciones adicionales requieren propiedad
probada. No uses podas globales. Una preparación retirada no vuelve a ejecutarse.
Transfiere los snapshots necesarios antes de detener Codespaces: su identidad
exportada no contiene los bytes de la base.

Para leer un bundle completo sin extraer todo el paquete, utiliza
`tar -xOf evidence.tar.gz artifacts/<artifact-id>/<filename>` con el nombre exacto
incluido en el manifiesto. El HTML puede contener un extracto; el original completo
permanece en el paquete verificado.

## Guion propuesto: 160 segundos y 20 de reserva

| Tiempo | Explicación y acción |
|---|---|
| 0–20 s | Identifica perfil, vía A, máquina, sesión/fuente y preparación completada previamente. |
| 20–55 s | Pulsa Iniciar comparación y abre Consola en directo. Distingue salida provisional y recibo final. |
| 55–85 s | Vuelve a Demostración. Abre el bloqueo Conftest de F11 y su atribución: dos campos prohibidos y fases posteriores no alcanzadas. |
| 85–115 s | Abre el rechazo Kyverno de F13 y su recuperación separada. Explica ausencia de resultados y posterior autorización/despliegue/HTTP. |
| 115–140 s | Enseña F11/Kyverno independiente, su rechazo exacto y el servicio válido intacto. Vuelve por el recorrido técnico. |
| 140–160 s | Enseña recibo y límites, identifica el respaldo registrado y cierra. Quedan 20 s de reserva. |

Si el directo falla o no permite continuar la explicación antes de 85 s, identifica
el fallo y pasa al HTML registrado ya abierto. Nunca sustituyas silenciosamente
un resultado fallido. Si no hay respaldo real completado, presenta el fallo con
claridad. El presupuesto de 120 s por acción no garantiza tres minutos narrados.

Ficha del presentador, pendiente hasta ensayo humano: fecha/persona ___;
sesión/fuente ___; preparación ___; intervalo automático ___; navegación ___;
inicio/fin y duración de exposición humana ___; incidencias/respaldo ___;
decisión/revisor ___. No incorporar a campaña ni medición de esfuerzo humano.

Resultados y límites: [registro de validación](../../../registros/demo_web_rehearsal_EN.md).
