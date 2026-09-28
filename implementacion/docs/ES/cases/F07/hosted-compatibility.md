# Investigación de compatibilidad F07 alojada

[English](../../../EN/cases/F07/hosted-compatibility.md).

## Decisión y límite de la sesión

**Sin demostrar: F07 alojado permanece `NOT_EXECUTED`.** Se consultó documentación
oficial, se preparó una sonda optativa y se ejecutaron regresiones locales. No se
publicó ninguna imagen ni se solicitó un token GHCR, eliminó un artefacto o despachó
un workflow. El siguiente trabajo acotado recomendado es
**`test/f07-ci-verification-l04`**. F07 dirigido local sigue cubierto por
`run-xFGRe6X1`; la barrera CI de F07 académico y L04 siguen pendientes.

GitHub documenta publicación con el token del workflow y eliminación/restauración
REST condicionadas por acceso administrativo al paquete. `packages: write` no
acredita por sí solo la operación OCI solicitada. La API REST usa identificadores
numéricos de versiones; no se ha demostrado su equivalencia con eliminar un solo
manifiesto de firma conservando imagen, blobs compartidos y atestaciones.
OCI permite deshabilitar la eliminación. La compatibilidad de formatos no prueba
DELETE ni restauración PUT exacta en GHCR. Las fuentes oficiales, consultadas el
2026-09-28, se enlazan en la [investigación inglesa](../../../EN/cases/F07/hosted-compatibility.md#what-the-sources-establish).
No se ha observado un HTTP 403/405 real de GHCR: las respuestas simuladas solo
prueban el manejo local de errores.

## Sonda preparada, sin conectar al coordinador

`tests/helpers/f07-ghcr-protocol.mjs` exige un recibo de un solo uso creado antes
de preparar una imagen nueva. Comprueba modo alojado, rama, workflow, commit,
ejecución/intento, imagen de las salidas de prepare, directorio nuevo y etiqueta
`tfm.lab.run`. Requiere finalización normal satisfactoria y reautentica los bundles;
no fabrica resultados PASS ni omite requisitos de emisión. La procedencia nativa
debe autenticar exactamente la ejecución y el intento actuales.

Se conserva la identidad/issuer exactos, confianza de certificados, transparencia
y comprobaciones normales de timestamp/SCT. No se usa una clave local. El token
solicitado queda limitado al repositorio y a `pull,push,delete`, usando únicamente
el token existente del job. Solicitar capacidades no concede permisos adicionales.
No se añaden PAT, privilegios, API REST de paquetes ni eliminación masiva.

La sonda exige la API nativa de referrers: si se utiliza una etiqueta de respaldo,
se detiene sin modificar el índice. Solo elimina el manifiesto independiente
identificado en la copia verificada; comprueba imagen y blobs, y restaura los bytes
originales mediante PUT. Rechaza redirecciones de mutación y nunca envía credenciales
a destinos de redirección de blobs. Conserva `before.json`, `pre-delete.json`,
`negative.json`, `restored.json`, salidas criptográficas y ambos errores de recuperación.
Intenta restaurar también ante pérdida de respuesta DELETE e interrupciones
capturables. SIGKILL, pérdida del runner o caducidad del token pueden impedirlo.

`tests/integration/f07-ghcr-protocol.sh` gestiona el login temporal y el paquete.
`tests/integration/f07-ghcr-workflow.patch` está **sin aplicar**: propone armar el
recibo antes de prepare y ejecutar la sonda después de finish, sin cambiar permisos.
No cambia `demo.sh`, la configuración de caché ni el helper local.

Esta sonda posterior a la entrega solo estudia el protocolo. La aceptación L01
anterior no es un control positivo tras restaurar. Una integración futura necesita
su propia autorización, revisión y la secuencia completa F13 → resultados → F07
rechazo/restauración → L01 con el mismo digest y HTTP → F11 → sustitución.

## Comandos para una futura ejecución autorizada

Desde la raíz, se puede revisar el parche sin ejecutar nada alojado:

```bash
git apply --check implementacion/tests/integration/f07-ghcr-workflow.patch
cat implementacion/tests/integration/f07-ghcr-workflow.patch
```

Los comandos completos de aplicación, commit, publicación, dispatch, seguimiento
y descarga están en la [guía inglesa](../../../EN/cases/F07/hosted-compatibility.md#commands-prepared-for-a-separately-authorized-hosted-trial).
**Requieren autorización separada**; no deben ejecutarse todavía. Usan la rama
`test/f07-hosted-admission-compatibility`, un único publicador y un intento nuevo.
No reutilizar estados anteriores ni sustituir el token del job por un PAT.

Comandos preparados para el job, desde `implementacion/`:

```bash
# Antes de prepare:
node tests/helpers/f07-ghcr-protocol.mjs arm "$RUNNER_TEMP/f07-ghcr-receipt.json"
# Después de finish, con GP_STATE_DIR y GP_F07_IMAGE de prepare:
GP_F07_PROTOCOL=authorized bash tests/integration/f07-ghcr-protocol.sh \
  "$RUNNER_TEMP/f07-ghcr-receipt.json"
```

Se conserva el paquete de la entrega normal. El paquete separado
`run-f07ghcr-<run ID>-<attempt>.tar.gz` debe verificarse mediante su `.sha256` y cada
entrada de `SHA256SUMS.txt`. `PROTOCOL_ONLY_COMPLETE` solo acredita la operación
observada; F07 alojado sigue `NOT_EXECUTED`. Los errores producen salida no cero e
`INTEGRATION_FAILURE`. No se afirma rechazo de admisión ni L01 positivo restaurado.
No se eliminan paquetes remotos automáticamente.

Detenerse tras un intento autorizado si hay denegación, índice de respaldo,
restauración fallida o ambigüedad; conservar evidencias desfavorables y continuar
con `test/f07-ci-verification-l04`, sin ampliar privilegios.

Asistencia: Codex (GPT-6) en investigación, preparación, regresiones y documentación.
Revisión humana, autorización de ejecución y aceptación final: pendientes.
