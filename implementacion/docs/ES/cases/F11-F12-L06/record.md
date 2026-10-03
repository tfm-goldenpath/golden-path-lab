# F11 / F12 / L06: operaciones de ejecución

El [procedimiento manual F11 en A](../../manual-task-calibration.md) conserva
este oráculo y comprueba la corrección humana con los mismos controles.
El ensayo guiado de F11/G se registra abajo; la calibración elegible de las seis
tareas y la validación de los demás escenarios siguen pendientes.

## Seguimiento del mecanismo de revisión humana

Tras integrar PR #40 en `f5eb8dd528b1b26a49f31cf81915963e0bb166c8`, el
[mecanismo explícito de revisión](../../manual-task-review.md) separa finalización
técnica, decisión humana, asistencia, propósito y elegibilidad. La tarea F11/G,
evidencia de limpieza, paquete original y tres notas de texto conservados superan
una comprobación de integridad de solo lectura y permanecen intactos. No se
registró una revisión nueva en nombre de la persona ni se importaron las notas.
El ensayo guiado sigue excluido de selección de límites. Quedan pendientes el
uso humano del nuevo comando y las seis calibraciones elegibles.

El usuario comunicó haber descargado el paquete indicado abajo. Se retiró esa
copia local a petición suya; se conservan evidencia original de tarea/ejecución
y notas de revisión. La verificación de la descarga externa corresponde al usuario.

## Ensayo funcional guiado revisado el 2026-10-03

Francisco aceptó `task-b069656237fc`, sesión `calibracion-54b7fa8-01`, como
**ensayo funcional guiado** a las `2026-10-03T12:28:23Z`. Su nota anterior de las
`12:27:20Z` excluye expresamente la selección de límites por la influencia de
asistencia IA y notas de ejemplo. Se conservan las tres notas originales. La
aceptación corresponde al ensayo; la revisión final de la PR #40, la preparación
de escenarios y la aceptación del piloto completo siguen separadas.

- Código: `54b7fa8864291aa86ddd32aaf15b5f2da71b5856`; línea A, F11/G;
  ejecución `run-2g86oSnT`.
- Imagen: `sha256:98a5ab3ca3f75baeecd2c044f63dc650082d53c348d077bdfe03703c717a9c76`.
- `0003-check` rechazó correctamente los privilegios que permanecían.
  `0004-check` aceptó los dos cambios permitidos y validó evidencia firmada,
  admisión, Pods listos con el mismo digest y salud/versión/cotización.
  `0005-cleanup` terminó; el registro sellado conserva `COMPLETED`.
- La auditoría posterior verificó 52 hashes de tarea, seis enlaces de eventos,
  archivo original y 263 hashes internos, cuatro bundles con el perfil de clave
  pública de A, identidad de código/base, rollout/HTTP y capturas de políticas y
  namespaces sin cambios. No se repitió una tarea real para esta auditoría.

Tiempos registrados: detección 11.917898082 s; total 552.442976361 s; resolución
desde detección 540.525078279 s; sin observar 450.854366486 s. Se conservan,
**excluidos de selección de límites y análisis de tareas medidas**. Se rechazó
un evento de investigación anterior a `start`; después se etiquetó una descripción
de diagnóstico como corrección y se usaron notas de ejemplo en espera/pausa.
Cero diagnóstico activo registrado no demuestra ausencia de diagnóstico real.
Denominador aquí: un ensayo funcional, cero calibraciones elegibles y cero tareas
medidas.

La tarea y el snapshot de finalización conservan `humanAcceptance: pending`.
La decisión humana posterior está en una nota separada. TODO incluye una futura
acción explícita de revisión vinculada a la evidencia que actualizará el estado
mostrado automáticamente, preservando los originales sellados. No se ha
implementado ese comportamiento en este cierre documental.

Copias y auditoría: `evidence/measurements/manual-review-task-b069656237fc/`.
Descargar todos los archivos de `evidence/packages/manual-review-task-b069656237fc/`,
incluida la base de calibración conservada, y verificar `SHA256SUMS.txt` fuera de
Codespaces. SHA-256 del paquete original:
`4d6963b8cb3d90c89f91a1c44841e348443a242aa940d0022dc8befbadac5472`.
La copia externa queda pendiente de descarga. El paquete excluye claves privadas
y kubeconfig; los registros completos permanecen fuera de Git.

Asistencia: OpenAI Codex auditó evidencia conservada y documentó la decisión
aportada por el usuario. La guía durante el ensayo queda declarada; esta auditoría
no generó decisiones ni mediciones humanas.

## Observación manual del 2026-10-03

F11/G, `task-a400cfbcaa31` de `calibracion-red-01`, usó el commit `29f099f` con
la identidad del árbol local conservada en el intento. `0004-check` rechazó el
manifiesto con los diagnósticos esperados ESCALATION y PRIVILEGED; siguió en
`REVIEW` hasta que la limpieza explícita lo cerró como `INCOMPLETE`. La limpieza
terminó correctamente. Las notas humanas contienen literalmente los ejemplos;
no demuestran investigación o corrección real ni una calibración satisfactoria.

El ajuste posterior muestra explícitamente `CORRECTION_REJECTED`, el estado
`REVIEW` y la ruta del recibo. Las guías separan edición humana, comprobación y
limpieza. Se conservan controles y evidencia original; no se repitió una tarea
real para este cambio de mensajes. Aceptación humana pendiente.

## Oráculo y operaciones

La [matriz compartida](../../../EN/cases/F11-F12-L06/operations.json) se definió
antes de implementar sobre `d86465410d74e39ef8e77a9979995bcb268abf9a`, según los
requisitos del usuario. Se conservan los identificadores académicos. No se revisó
ni modificó la tesis. Revisión humana del oráculo y aceptación final: pendientes.

- **F11:** `privileged=true` junto con `allowPrivilegeEscalation=true`. El valor
  inicial `false` de escalada es incompatible con privilegios; son dos cambios
  coordinados para conservar validez Kubernetes, sin acceso al host ni exploits.
  Conftest debe devolver exactamente PRIVILEGED y ESCALATION. Admisión debe
  señalar únicamente `tfm-runtime/restricted-containers` y uno de esos campos.
- **F12:** cambiar solo la referencia de imagen al tag original de construcción,
  persistido en `buildTag`. GET de registro antes y después debe resolver al
  mismo digest autorizado; se conservan bytes y hashes. Conftest exige solo
  DIGEST; admisión, `authorized-image-repository` con IMAGE_REPOSITORY. No se
  retaggea, firma ni modifica el registro. `mutateDigest=false` y el alcance por
  repositorio/digest se mantienen. Las firmas autentican el digest de respaldo;
  no se afirma verificación de firmas sobre el tag, fuera de su alcance.
- **L06:** comparte CREATE de L01. Tras los UPDATE negativos, cambia únicamente
  una anotación de plantilla. Debe aumentar generación, cambiar plantilla,
  completar rollout y HTTP, y observar Pods Ready con digest y anotación nuevos.
  Un apply sin cambios no cumple. Se prueba además CREATE de Pod legal aislado
  y su limpieza, con nombres y etiquetas fuera del selector de quotes-node.

Orden: evidencia válida y autorización → CREATE negativos con objeto ausente →
CREATE L01/L06 → UPDATE legales de plantilla negativos → UPDATE L06 → Pod legal.
Los Pods del controlador se observan por separado. No hay UPDATE de campos
inmutables de Pod. Cada CREATE rechazado exige un NotFound real antes y después;
los errores API no prueban ausencia. UPDATE rechazado debe conservar UID,
generación y spec deseado; status y resourceVersion pueden cambiar normalmente.

Las solicitudes usan `actor` con privilegios existentes; `k` se limita a observar
y limpiar recursos propios. Políticas, identidad, namespace y evidencias se
mantienen constantes. Errores de API, RBAC, firmas, transporte o webhook, denegaciones
adicionales y aceptación inesperada detienen el ensayo y conservan evidencias.
La limpieza no convierte un fallo en éxito. Los resultados compartidos L01/L06
no aumentan los veinte escenarios. Véase el [oráculo detallado en inglés](../../../EN/cases/F11-F12-L06/record.md).
