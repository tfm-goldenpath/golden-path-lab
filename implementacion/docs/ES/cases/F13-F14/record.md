# F13 / F14 — oráculo operativo de autorización de resultados

[Registro en inglés](../../../EN/cases/F13-F14/record.md).
Preparado desde main `d758ef50bdeee57574c8b18330aef8d07a35abfe` y los requisitos
expresos de esta tarea. Se conservan F13/F14 y la contraparte L01 del catálogo
académico; la revisión humana sigue pendiente.

| Propiedad | F13 | F14 |
|---|---|---|
| Precondición | Entrega P1 completa, emitida y verificada de nuevo | Misma entrega; preparación legítima de P0 para la misma imagen |
| Capacidad del actor | Eliminar únicamente el manifiesto de resultados del registro local propio | Reproducir los bytes firmados de P0 y retirar P1; no necesita firmar |
| Inyección | Después de emitir resultados exitosos, antes de CI autorizado y admisión dirigida | Mismo punto, separado de la preparación y autenticación de P0 |
| Primer consumidor | CI con recuperación fresca | CI autentica el bundle exacto antes de evaluar la política |
| Última barrera | Antes del despliegue protegido | Antes del despliegue protegido |
| Causa | MISSING_RESULTS y únicamente tfm-results/require-results | RESULTS_POLICY_VERSION_MISMATCH y únicamente esa regla con RESULTS_POLICY_VERSION |
| Contraparte | L01 del mismo digest tras restauración exacta, CI fresco, admisión, rollout y HTTP | Igual |

P1 es `golden-path-v1`. P0 es `laboratory-results-p0-fixture`, política de
preparación del laboratorio con las mismas comprobaciones obligatorias exitosas;
no representa una versión histórica de producción ni regulatoria. La preparación
firma sin publicar; el actor de reproducción conserva esos bytes. P1 junto a P0
invalida el aislamiento. Firmante, origen, digest y demás campos deben ser válidos.

Se conservan bytes OCI originales, predicado y bundle P0, autenticación, inventarios
completos antes/durante/después, bundles consumidos, diagnósticos, contexto de
confianza y políticas, caché, admisión y recuperación. Una interrupción intenta
restaurar y registra tanto el error original como el de recuperación.

F13 previo a emisión y su clasificador compartido con readiness permanecen
separados como F13Preissuance. No hay nuevos escenarios académicos ni mediciones.
No se afirma conformidad VSA. Integración local real y negativos hosted:
**NOT_EXECUTED**. PR #26 registró prerrequisitos bloqueados de F09/F10/L05, no su
aceptación. Véase el [procedimiento](runbook.md).
