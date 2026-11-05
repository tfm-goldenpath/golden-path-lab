# Implementación de autorización de resultados F13/F14

Rama `test/f13-f14-results-authorization`, desde main local
`d758ef50bdeee57574c8b18330aef8d07a35abfe` (merge de PR #26). Cambios sin commit para
revisión. [Oráculo](../docs/ES/cases/F13-F14/record.md), [comandos exactos](../docs/ES/cases/F13-F14/runbook.md)
y [relación completa de archivos](f13_f14_results_authorization_EN.md#changed-files-and-rationale).

F13 retira únicamente resultados después de una emisión exitosa. F14 prepara P0
legítimamente y reproduce sus bytes firmados sin P1 disponible. CI atribuye solo
ausencia o discrepancia aislada de política, después de recuperar y validar la
evidencia ajena. Kyverno exige la misma P1 y diagnóstico específico. La recuperación
restaura bytes e inventarios y exige CI fresco, admisión, rollout y HTTP del mismo
digest. F13 previo a emisión/readiness se conserva como F13Preissuance.

## Verificación y evidencia

Directorio ignorado por Git: `evidence/tdd/f13-f14/`.

- `01-red.log` y `02-scenarios-red.log`: pruebas creadas antes de implementar;
  fallo inicial sin detalle del subprocess en el sandbox y módulo aún ausente.
  No demuestran un ciclo histórico completo red/green.
- `03`–`06`: observaciones de desarrollo; decoder compartido y empaquetado
  corregidos. `06-focused.log`: 56 comprobaciones enfocadas pasan. Los bloqueos de
  subprocess del sandbox requirieron ejecución autorizada; no son detección.
- `07-doctor.log`: kind no estaba en PATH. `08-doctor-pinned-path.log`: con las
  herramientas existentes, npm 12.1.0 incumple el pin 11.19.0. No se modifica el entorno.
- `09-suite.log`: primera suite detectó fixtures de orquestación desactualizados.
  `12-focused-final.log`: detectó el fallback de resumen F13 previo a emisión
  cuando existía un agregado. Corregidos antes de la suite final; se conservan fallos.
- `10-policies.log` y `11-bundles.log`: políticas y Cosign offline pasan. P0 conserva
  autenticidad y se rechaza por versión de política; firmante/digest incorrectos
  fallan en verificación criptográfica.
- `13-final-suite.log`: suite compartida final con herramientas de seguridad fijadas.
  Los resultados y recuentos finales se añaden abajo.
- `offline-bundles/`: predicados sintéticos, bundles P0/P1 y reproducción exacta,
  clave/raíz pública, artefacto y diagnósticos de autenticación/rechazo. No contiene
  claves privadas ni constituye una entrega al registro o admisión.

No hubo un nuevo fallo de red en las comprobaciones offline. Tras el bloqueo de
versiones no se ejecutó una nueva prueba de red. El [fallo DNS previo](f09_f10_l05_integration_validation_ES.md)
permanece como observación de PR #26, no como medición nueva ni problema resuelto.

## Límites y contribución

CI con registro real, admisión dirigida, restauración real y rollout/HTTP de
F13/F14: **NOT_EXECUTED**. El formato exacto del diagnóstico F14 en verifyImages
sigue pendiente de observación real. Negativos hosted: **NOT_EXECUTED**, sin nuevos
permisos GHCR. La compatibilidad hosted normal tiene regresiones de código y
orquestación, no una nueva ejecución remota.

Las brechas F09/F10/L05 de PR #26 siguen abiertas. No hay nuevos escenarios del
catálogo ni mediciones de campaña. El predicado versionado del laboratorio se
conserva sin afirmar conformidad VSA. Preparación y reproducción comparten proceso
Bash; no son principales aislados. Los inventarios suponen un publicador controlado,
no instantáneas atómicas.

| Actividad | Asistencia real | Revisión humana | Decisión final |
|---|---|---|---|
| Oráculo, implementación, regresiones, verificación offline y guías EN/ES | OpenAI Codex, GPT-6 | Pendiente | Pendiente |

Propuesta de PR en el [registro inglés](f13_f14_results_authorization_EN.md#contribution-and-proposed-pr).
No se hizo push, publicación de PR, dispatch remoto, cambio de releases/campaña ni
edición de la tesis.

## Resultado final

`13-final-suite.log`: exit **0**. Entorno **6/6**, servicio/unitarias **717/717** sin
omisiones, Python **33 pruebas de políticas** (incluye renderer redescubierto por
el adaptador), Conftest **52/52**, Kyverno runtime **9/9**, políticas sobre archivos
reales **18/18** y **14/14**, y los **33** pasos Cosign offline. El adaptador evaluó
además **16** variantes reales de condiciones con Kyverno dentro de las pruebas
Python. Son comprobaciones de software, no ejecuciones del catálogo.

Comando y detalles en el [resultado inglés](f13_f14_results_authorization_EN.md#final-verification-result).
Hashes de fuentes, revisión documental y auditoría pública offline:
`evidence/tdd/f13-f14/14-source-hashes.json`, `15-doc-review.log`,
`16-offline-audit.json`. Identifican el árbol de trabajo sobre la revisión base;
no existe run ID de escenario ni imagen entregada en este trabajo.

## Corrección de npm y reintento local

Por petición expresa del usuario, se cambió npm globalmente de 12.1.0 a
**11.19.0** mediante `npm install --global npm@11.19.0 --ignore-scripts --no-audit
--no-fund`. Instalación y verificación de versión correctas, sin fallos de red.
No se editaron los pines del repositorio.

El nuevo `make -C implementacion doctor`, con las herramientas existentes en PATH,
se detuvo en **kubectl v1.37.0**, frente a **v1.35.8**. Las comprobaciones adicionales
confirmaron Docker CLI/daemon **29.8.0-1** frente a **29.8.0**, y Buildx **v0.37.0**
frente a **v0.37.1**. Node y kind cumplen sus pines. Solo se autorizó corregir npm;
las otras herramientas y la red permanecen sin cambios.

Resultado: **BLOCKED_BEFORE_LIVE_TRIAL**. Smoke, prueba de red BuildKit, inyección
F13/F14, admisión y recuperación del mismo digest: **NOT_EXECUTED**. El fallo DNS
previo no se ha vuelto a probar. No existe un nuevo run ID ni detección de escenario.
Se conservan las pruebas y los hashes de la implementación anterior.

Evidencia: `evidence/raw/f13-f14-live-retry/`, con instalación npm, doctor, versiones,
resultado bloqueado y manifiesto de hashes. Este seguimiento solo cambia npm
instalado y documentación; no repite la suite de implementación ya exitosa.
Asistencia de Codex GPT-6; revisión y aceptación humanas pendientes.
