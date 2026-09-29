# Validación F09 / F10 / L05

Fecha: 2026-09-29. Rama: `test/f09-f10-l05-provenance`.
Base: `38631e14a6f44838b32c959f138c13ac06b5cecd`. Cambios locales sin commit;
revisión humana y decisión final pendientes. [Registro principal y hashes EN](f09_f10_l05_validation_EN.md).

Se implementaron F09 (ausencia aislada de procedencia), F10 (fixture auténtico para
el digest correcto con solo el repositorio seleccionado no autorizado) y L05
optativo (dos commits inmutables explícitos con fuentes de aplicación distintas).
CI y admisión exigen repositorio, revisión, tipo y constructor configurados.
Los ensayos dirigidos requieren resultados válidos previos, rechazo atribuible,
restauración exacta y verificación/admisión/rollout/HTTP posteriores. Se conservan
las comprobaciones anteriores y los límites de confianza hosted.

Evidencia TDD real: `02-red.log` contiene siete fallos esperados anteriores a la
implementación (32 pruebas, 25 pasan); `03-policy-red.log` conserva el fallo del
constructor en el renderer. Las comprobaciones posteriores pasan. Los intentos
bloqueados por el sandbox no cuentan como TDD, y no se reconstruye una historia
red-green para pruebas posteriores. Logs ignorados: `evidence/tdd/f09-f10-l05/`.

La suite compartida pasó: **605 pruebas de servicio/unidad**, 6 de entorno,
16 Python, 52 decisiones Conftest, 9 casos Kyverno CLI y probes Cosign reales,
incluyendo autenticación de F10, rechazo por repositorio y rechazo por otro digest.
Después de aclarar un campo del informe de aislamiento, pasaron otras **57**
regresiones pertinentes. Sintaxis Bash, `git diff --check` y enlaces nuevos revisados.

La ejecución local **`run-CKbpvhof` falló** antes de construir la imagen inicial:
BuildKit no pudo resolver `registry-1.docker.io` mediante `127.0.0.11:53`.
Completó preflight, selección/exportación real del par
`7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f` y creación de kind.
Se conservaron log y paquete FAIL; se verificaron SHA-256 del archivo y **14**
hashes internos. Se limpiaron los contenedores propios sin cambiar firewall ni
configuración del daemon.

F09/F10 en registro/admisión y las dos entregas L05 permanecen **NOT_EXECUTED** en
este incremento. Los probes offline no cierran esa aceptación. F09/F10 hosted y
L05 hosted también siguen **NOT_EXECUTED**; L05 hosted necesita dos ejecuciones
Actions reales autorizadas en revisiones distintas. La ejecución previa que indicó
el usuario en `38631e1` no verifica estos cambios ni fue auditada de nuevo aquí.

Asistencia actual: **Codex (GPT-6)**. El usuario confirmó **GitHub Copilot con GPT-6**
para el desarrollo anterior; se corrigió el texto contradictorio de su registro,
sin presentarlo como auditoría independiente de logs del cliente. Revisión humana
pendiente. No se publicaron cambios, PR ni workflows; no se modificaron ajustes del
repositorio, archivos de prompt existentes ni la tesis.
