# Familia de procedencia: F09 / F10 / L05

Desde la raíz, con Docker disponible:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

El reemplazo local conserva F05/F06/F07/F08/F11/F13 y añade F09/F10 en CI antes
de resultados, y en admisión dirigida después de emitir resultados válidos.
F09 retira solo procedencia. F10 prepara un fixture explícito de laboratorio,
firmado por la clave local confiable sin publicarlo todavía, que cambia solo el
repositorio de origen seleccionado. Simula un productor confiable defectuoso;
no representa acceso de un atacante a la clave. La evaluación negativa no firma.

CI exige inventario completo y estable y evidencias ajenas válidas. F10 autentica
exactamente el fixture recibido antes de comprobar contenido. Los diagnósticos
son `MISSING_PROVENANCE` y `PROVENANCE_REPOSITORY_UNAUTHORIZED` (salida 42).
Otros errores, incluidos firma, digest, formato, transporte o varias condiciones
fallidas, son errores de integración (salida 1).

La admisión dirigida usa el actor restringido, caché de verificación desactivada,
prueba positiva inicial y políticas/configuración/confianza sin cambios. Solo
puede rechazar la regla de procedencia; F10 debe identificar
`PROVENANCE_REPOSITORY`. Un error genérico de firmas no demuestra F10. Un mensaje
no reconocido detiene el ensayo. Recuperar restaura bytes e inventario exactos y
verifica de nuevo; los ensayos autorizados además admiten el mismo digest,
comprueban rollout y HTTP, guardando respuestas por ensayo. Se conservan fallos
originales y de recuperación. EXIT/INT/TERM activan recuperación; SIGKILL o pérdida
del host requieren intervención usando el respaldo.

## L05 con fuentes reales

Seleccionar ambos commits completos, en orden de ascendencia y alcanzables desde
el `main` local registrado. Sus árboles `services/quotes-node/src` deben diferir.
Este par histórico modifica `server.js` y sus pruebas:

```bash
GP_L05_FROM_COMMIT=7243334fe4ee7073801a86b25c90986b7d3c5ece \
GP_L05_TO_COMMIT=fc58e220e2d3f38d13216b23e61ffc31271f112f \
make -C implementacion demo
```

Se exportan blobs Git reales a almacenamiento temporal propio sin modificar HEAD,
índice ni cambios del usuario. Se registran commits, árboles y hashes; cambios
posteriores a la selección invalidan la construcción. Se mantiene la imagen Node
actual fijada por digest, pasada explícitamente al Dockerfile histórico. No se
reconstruye todo el entorno histórico.

Tras los ensayos existentes, `L05-from/` y `L05-to/` ejecutan pruebas de control y
de sus fuentes, construcción, análisis, firmas, procedencia y resultados nuevos.
Cada revisión se autoriza de forma exacta antes de su admisión. Se exigen digests
distintos, rollout y HTTP válidos. Las políticas cambian entre entregas legítimas,
nunca durante un ensayo de fallo/recuperación. Sin el par, L05 queda
`NOT_EXECUTED`. Un cambio solo de metadatos no basta.

## Hosted y evidencia

CI y admisión exigen repositorio, revisión, tipo de construcción y constructor
coherentes. El constructor hosted es la identidad del workflow configurada;
se conservan certificados, OIDC, ref/digest, runner y transparencia.
F09/F10 hosted permanecen **NOT_EXECUTED**: no se añade mutación ni despacho remoto.
L05 hosted requiere dos ejecuciones manuales autorizadas, cada una en su revisión
Actions real, con sus IDs, `GITHUB_SHA`, digest, procedencia nativa, pruebas,
políticas, resultados y admisión/HTTP. Revisar ambos paquetes. Otro checkout dentro
de una ejecución no genera una nueva revisión nativa autenticada. L01/L03 del
mismo commit no demuestra L05.

El paquete incluye `L01-update/F09-CI`, `F10-CI`, `F09-admission`, `F10-admission`,
los informes del gate, `L05-source-authorization.json`, `L05-from/`, `L05-to/` y
`L05-result.json`. Excluye claves privadas, credenciales, estado y fuentes
exportadas temporales. Ver [oráculo](record.md), [guía EN](../../../EN/cases/F09-F10-L05/runbook.md)
y [validación](../../../../registros/f09_f10_l05_validation_EN.md). Son comprobaciones
funcionales, no datos de campaña; revisión humana pendiente.
