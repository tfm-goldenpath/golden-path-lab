# F08: alteración controlada de la firma de imagen

[Registro principal y evidencias](../../../EN/cases/F08/record.md).
Base real: `1369a0c322cf5f5f0f68747f168d630ae7f0bb22`; rama
`test/f08-altered-signature`; hito **Scenario coverage and pilot**.

El oráculo se fijó antes de implementar: partir del reemplazo L04 firmado y
verificado, alterar únicamente el valor criptográfico de su firma independiente,
conservar base64 y DER legibles, payload, digest, material de verificación y
políticas. El operador puede sustituir un referrer del zot local de la ejecución;
la mutación no utiliza la clave privada. Se recalculan hashes y tamaños OCI y se
retira la firma original durante la comprobación negativa. Las firmas adicionales
se rechazan como preparación ambigua.

La siguiente verificación CI debe rechazar antes de emitir resultados o desplegar.
La atribución combina inventarios completos, aceptación del original, comparación
criptográfica directa, rechazo real de Cosign y autenticación independiente de
las evidencias no alteradas. Un código distinto de cero o un mensaje genérico no
bastan. Errores de registro, transporte, formato o confianza no acreditan F08.

EXIT/INT/TERM restauran los bytes originales, retiran el referrer inyectado y
exigen nueva verificación. Se conservan ambos errores. SIGKILL o pérdida del host
requieren recuperación manual desde el respaldo. Después de la autorización
normal se repite una prueba dirigida de admisión con caché deshabilitada y actor
restringido. L04 comparte admisión, rollout, digest real de Pods y HTTP con L01;
no crea otra observación experimental independiente.

F08 y F07 negativo alojados: **NOT_EXECUTED**. La aceptación del gate/L04 alojado
sigue pendiente de ejecución autorizada y auditoría. No se ha autorizado publicar,
despachar workflows ni ejecutar la campaña. Consulta los resultados locales,
intentos fallidos y hashes en el registro principal.

Asistencia de esta sesión: Codex (GPT-6). Revisión humana y decisión final:
pendientes. Se conserva la secuencia real de pruebas; no se atribuye trabajo no
observado a GitHub Copilot ni se reconstruye retrospectivamente una historia TDD.

## Observación local — 2026-09-29

**`run-IIWR8RLL`: PASS** con zot, Cosign 3.1.3 y Kyverno 1.19.1 reales.
F08 rechazó la firma alterada en CI y en `tfm-signature` /
`autogen-require-image-signature`, restauró exactamente ambos conjuntos y verificó
de nuevo antes de continuar. L04 completó admisión, rollout, digest de Pods y HTTP.
Se conservaron F13, F07, F11 y L01. Es una ejecución funcional compartida.

El archivo `evidence/packages/run-IIWR8RLL.tar.gz` tiene SHA-256
`79e7d71fcd1bbc32ce181d84d2fe1b8c4ecc29126ba2e5b467d5785f08e1ea7f`.
Se verificaron sus 452 hashes internos, 44 bundles válidos y el rechazo de ambas
variantes. La auditoría confirmó que solo cambió el valor de firma, que el resto
permaneció intacto y que los datos auditados coinciden con el archivo. El registro
principal conserva los digests, revisión y snapshot completos.

El intento `run-lnUGtdTB` quedó FAIL por timeout DNS de BuildKit, antes de F08;
se auditaron sus 12 hashes internos. El reintento utilizó reglas temporales de
forwarding limitadas al puente kind con aprobación explícita. Se retiraron al
terminar; no hay cambios de firewall en el repositorio.

La ficha precedió a las primeras pruebas, que fallaron por módulo ausente y luego
pasaron. Las pruebas posteriores se registran como regresiones. La suite final
pasó: 6 pruebas de entorno, 443 de servicio/unidad, 15 Python, 52 decisiones
Conftest, 9 casos del motor Kyverno, 18 + 14 comprobaciones de políticas y Cosign
real sin conexión. Los logs conservan fallos de sandbox y correcciones de fixtures.
Los hashes de producción coinciden con el árbol final; cuatro pruebas diagnósticas
y un ajuste de aislamiento posteriores explican la diferencia con las 439 pruebas
del preflight observado. Evidencias y auditorías: `evidence/raw/f08-development/`.

La aceptación alojada y revisión humana siguen pendientes. No se publicaron cambios,
creó PR, despachó workflow, modificó la tesis ni ejecutó la campaña.

## Preparación de la publicación

Tras la validación local, el contribuidor autorizó el commit y la apertura del PR
e identificó **GitHub Copilot (GPT-6)** como herramienta principal de desarrollo
asistido. Esta atribución procede del contribuidor; se conserva la contribución
de la sesión Codex (GPT-6) descrita arriba. La revisión humana sigue pendiente.
