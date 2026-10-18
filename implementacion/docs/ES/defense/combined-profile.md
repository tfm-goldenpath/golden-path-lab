# Todas las familias de la demo en una sesión

El perfil `defense-all` reúne los casos en Demostración y Recorrido técnico.
Conserva los perfiles `defense`, `defense-short`, `f11-comparison` y
`early-security`. Seleccionar una fila consulta evidencias; no cambia la sesión
que controlan los botones.

## Abrir una sesión nueva

Desde la revisión actual, elige un puerto libre y mantenlo **Private**:

```bash
cd /workspaces/golden-path-lab
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export DEMO_SESSION="all-$(date -u +%Y%m%dT%H%M%SZ | tr '[:upper:]' '[:lower:]')"
bash implementacion/scripts/defense-demo.sh serve --new \
  --session "$DEMO_SESSION" --profile defense-all \
  --reserve-gib 3 --enable-actions --port 8783
```

Si el puerto está ocupado, elige otro; no cierres un visor ajeno. Para reabrir:
`serve --session "$DEMO_SESSION" --enable-actions --port 8783`, sin `--new`.
No conviertas una preparación antigua o incompatible editando su JSON.

## Uso desde el navegador

1. **Preparar entorno**, antes de presentar: prepara el laboratorio común y
   conserva la ausencia de resultados que necesita F13. Un clúster kind, registro,
   builder e imagen principal.
2. En el selector único **Caso de la sesión**, selecciona F02, F12 o F03 y su botón **Preparar**.
   F02/F12 también funcionan antes del laboratorio, sin Docker ni Kubernetes.
   F03 requiere la preparación común: construye sus dos imágenes con el registro,
   builder y base fijada existentes. No crea otro clúster, sustituye el digest
   principal ni emite autorización de resultados.
3. **Iniciar comparación** ejecuta la secuencia principal; **Paso a paso** avanza
   solo la siguiente operación permitida: F11 temprano → F13 → autorización →
   recuperación y HTTP → F11 admisión de defense → comprobar entradas autorizadas
   → R con retirada de la carga alterada → F11 admisión dirigida de comparación
   → actualización legítima L06.
4. **Ejecutar comparación / Repetir comparación** para F02/F12/F03 evalúa,
   por separado, el negativo y positivo seleccionados. No se añaden silenciosamente
   a la secuencia automática principal. Tienen preparación, identidades y tiempos
   propios. Los botones de repetición F11 mantienen el comportamiento de defense;
   la secuencia adicional R/L06 se consume una sola vez. Repetir F13 sigue
   necesitando una fixture independiente y capacidad adicional.
5. Abre **Ver log del bloqueo** o **Ver atribución** para leer la evidencia amplia.
   Vuelve a Demostración para cambiar de intento. **Más** conserva exportación y
   retirada de recursos propios con vista previa y las protecciones habituales.

El selector también incluye F11, F13, autorización, recuperación, R y L06.
Para la secuencia inicial solo habilita **Ejecutar siguiente paso** cuando ese
caso es el siguiente autorizado por el coordinador. No permite saltar F13 ni
autorizar resultados antes de observarlo. Tras ejecutarse, F11 ofrece **Nuevo
intento**; R/L06 indican que no admiten repetición aislada. La preparación de
una fixture F13 adicional está en **Más acciones**, separada de la preparación
del laboratorio común. Cambiar de caso no inicia trabajo.

Las dos filas F11 de admisión son solicitudes nuevas distintas de los perfiles
originales; mantienen identidades y logs separados. La recuperación no borra F13.
L06 demuestra una actualización de plantilla con alcance parcial, no L06 completo
ni L01. F12 es temprano; F03 analiza nuevamente SBOM preparados. R demuestra solo
la exposición observada y su retirada, sin explotación. Vía A con clave local no
es vía B con identidad OIDC.

## Recursos, tiempos y respaldo

Se mantienen 4 CPU / 16 GB / 32 GB totales, el margen de 8 GiB libres para preparar
el laboratorio y la reserva de 3 GiB. Los casos tempranos conservan sus controles
de crecimiento. No reduzcas márgenes. Si falla la preparación común, sus intentos
quedan No alcanzado; F02/F12 preparados independientemente siguen disponibles.
Un fallo temprano conserva su diagnóstico sin sustituir el resultado del
laboratorio. Las siguientes invocaciones comprueban fuente, arranque, identidad
sellada, políticas y recursos.

Preparación y builds de F03 quedan fuera de la presentación. Los tiempos de la
secuencia principal y las comparaciones tempranas son independientes. No se ha
medido que todos los casos más la explicación quepan en tres minutos. Para una
exposición breve, selecciona un caso temprano, recuperación F13 y una evidencia
F11/L06. El ensayo narrado humano sigue pendiente. El presupuesto de la secuencia
incluye disponibilidad y retirada de R.

```bash
bash implementacion/scripts/defense-demo.sh status --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh export --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh verify --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup-plan --session "$DEMO_SESSION"
bash implementacion/scripts/defense-demo.sh cleanup --session "$DEMO_SESSION" --stop-server
```

El HTML exportado conserva filas, navegación y logs disponibles como resultados
registrados, sin acciones ejecutables. La base retenida se necesita aparte para
reanalizar. El export no constituye un análisis ni verificación criptográfica
nuevos. Consulta [validación y pendientes](../../../registros/demo_combined_profile_EN.md).

### Límite actual del HTML combinado

Con muchos artefactos, el presupuesto de extractos del HTML puede omitir logs
tempranos. Consulta el original en el visor o en `evidence.tar.gz`, verificado
por `verify`. No uses un extracto vacío como prueba de aceptación o rechazo.
