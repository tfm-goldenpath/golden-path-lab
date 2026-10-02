# Oráculo operativo F09 / F10 / L05

El [procedimiento manual F10 en A](../../manual-task-calibration.md) conserva
este fallo autenticado de origen y exige obtener el artefacto autorizado.
La validación real del nuevo procedimiento y la calibración siguen pendientes.

Definido sobre `38631e1` antes de implementar. Hito: cobertura de escenarios y
piloto. Los identificadores y expectativas proceden de la solicitud del usuario;
no se ha verificado independientemente la revisión documental de la tesis.
Revisión humana y decisión final pendientes. Comparte implementación con el
[registro principal EN](../../../EN/cases/F09-F10-L05/record.md).

| Caso | Preparación y propiedad | Resultado esperado |
|---|---|---|
| F09 | Entrega local válida; retirar únicamente el referrer de procedencia conservando sus bytes originales. | CI: inventario completo, evidencias ajenas autenticadas y válidas, solo procedencia ausente. Admisión dirigida después de resultados válidos: rechazo exclusivo de `tfm-provenance/require-provenance`. |
| F10 | Fixture de laboratorio firmado por la clave local ya confiable, para el digest correcto. Cambiar solo `buildDefinition.externalParameters.workflow.repository`. | Autenticar exactamente el fixture recibido antes de interpretar campos. Rechazo exclusivo por repositorio no autorizado, tanto en CI como en admisión dirigida. Firma inválida, otro digest, constructor, tipo o revisión no cuentan como F10. |
| L05 | Dos commits Git completos, explícitos, distintos y alcanzables desde `main`, con árboles de código de aplicación distintos. Exportar sus blobs reales sin cambiar el checkout. | Pruebas, imágenes y evidencias nuevas por revisión; autorizar exactamente cada revisión antes de admitir, completar rollout y comprobar HTTP. |

Los fallos de transporte, registro, confianza o formato son errores de integración.
Rechazo por varias políticas o aceptación inesperada invalidan el ensayo. Las
políticas y la confianza permanecen fijas durante cada inyección/recuperación.
Recuperar exige inventario original exacto y verificación nueva; en admisión,
además exige despliegue legítimo, rollout y respuestas HTTP correctas. Conservar
por separado el error original y el de recuperación.

Estado inicial de los tres casos: **NOT_EXECUTED**. Negativos hosted:
**NOT_EXECUTED**. L05 hosted necesita dos ejecuciones Actions reales en revisiones
distintas; dos imágenes L01/L03 del mismo commit no lo demuestran. Las pruebas
unitarias sintéticas no establecen ejecución Kubernetes ni mediciones de campaña.

## Validación observada (2026-09-29)

La suite final pasó: 605 pruebas de servicio/unidad más entorno, políticas y
comprobaciones criptográficas Cosign reales. La evidencia inicial red/green está
en el [registro de validación](../../../../registros/f09_f10_l05_validation_EN.md).
La ejecución `run-CKbpvhof` seleccionó y exportó las revisiones reales, pero falló
al construir la imagen inicial por DNS de Docker hacia Docker Hub. Se verificaron
el archivo fallido y sus 14 hashes internos. F09/F10 en registro/admisión y las
entregas L05 permanecen **NOT_EXECUTED** en este incremento. Aceptación humana pendiente.

La [revisión posterior del PR #24](../../../../registros/pr24_review_ES.md) registra
correcciones y auditoría de CI `36631532871` e integración `36631562615`. Esta
última ejecutó la base `38631e1`; no cierra la aceptación de esta familia.

La ejecución merged `36636319864` falló dos veces en F13 por timeout webhook,
antes de esta familia. La [corrección de disponibilidad](../../../../registros/kyverno_readiness_fix_ES.md)
conserva los mismos oráculos y registra sus límites de validación.

El [preflight local posterior sobre main `80c12bc`](../../../../registros/f09_f10_l05_integration_validation_ES.md)
verificó/exportó ambos commits distintos, pero falló por versiones y DNS de BuildKit
en kind. No se lanzó demo: F09/F10 y recuperación, entregas L05 y disponibilidad
tras actualización/reinicio siguen **NOT_EXECUTED**. Se verificaron checksum y
15 hashes internos del diagnóstico; no se generaron firmas nuevas.
