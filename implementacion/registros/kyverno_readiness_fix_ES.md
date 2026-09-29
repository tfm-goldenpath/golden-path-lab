# Corrección de disponibilidad de admisión Kyverno

Rama `fix/kyverno-admission-readiness`, base `df376de`.
Asistencia real: Github Copilot (GPT-6). Revisión humana y decisión pendientes.
[Registro principal EN](kyverno_readiness_fix_EN.md).

Los dos intentos de `36636319864` fallaron con timeout de 30 segundos del webhook
mutante durante F13, justo después del reinicio. La clasificación rechazó
correctamente ese error de integración. Los logs seleccionados mediante Deployment
correspondían al Pod antiguo; no permiten establecer la causa interna del timeout
del controlador nuevo. El reinicio queda implicado, no demostrado como causa única.

La instalación inicial ya no reinicia. Las actualizaciones L05 conservan renovación
de caché entre revisiones legítimas. Se exigen Pods actuales Ready y no terminantes,
propiedad de la revisión actual y EndpointSlices coherentes. Los logs se capturan
por Pod. Se conservan las políticas y la confianza.

Un dry-run de servidor debe responder antes de los ensayos: rechazo único y exacto
por resultados ausentes al instalar; aceptación legítima tras actualizar. No se
reintentan timeouts ni se contabiliza el preflight como F13. La limpieza guarda
Pods, endpoints y logs después del fallo.

TDD real: cuatro aserciones nuevas fallaron antes de implementar, además del módulo
aún inexistente. Después pasaron 21 pruebas focalizadas; las 28 finales amplían
convergencia y errores. La suite pasó 636 pruebas de servicio/unidad. Son respuestas
Kubernetes sintéticas, no integración real. El registro EN conserva la ejecución
local, evidencias y límites finales. No se ha publicado ni despachado nada remoto.


El intento local **`run-mlqMo9Oq`** pasó las **643 pruebas finales** y creó el
cluster, pero BuildKit volvió a fallar por DNS hacia Docker Hub (`127.0.0.11:53`).
No alcanzó el nuevo gate de admisión: **NOT_EXECUTED**. Se verificaron el checksum
y **15 hashes internos** del paquete FAIL y se confirmó la limpieza. No se
modificaron firewall ni daemon. La resolución del timeout hosted sigue pendiente
de una ejecución real autorizada sobre la revisión corregida. Sintaxis Bash,
enlaces locales y `git diff --check` correctos. Cambios sin commit ni publicación.
