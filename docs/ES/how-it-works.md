# Cómo funciona la entrega implementada

[Índice](README.md) · [English](../EN/how-it-works.md) ·
[Contratos canónicos](../../implementacion/docs/ES/delivery-contracts.md)

El flujo protegido vincula controles y evidencias a un digest y origen autorizado.
Un control obligatorio que no termina detiene la entrega. Rechazo de política,
fallo de verificación y error operativo siguen siendo observaciones diferentes.
Estas fases describen código actual, no una nueva API ni nuevas políticas.

## Fases y puntos de parada

Las rutas citadas parten de `implementacion/`. Los cinco módulos Bash comparten
contexto; no son servicios aislados.

| Fase e input | Responsable/control | Resultado y siguiente paso | Evidencia |
| --- | --- | --- | --- |
| Fuente, configuración y entorno | `context.sh`, `lab.sh`, `check-environment.sh`: identidad, estado/recursos propios y herramientas | Contexto válido continúa; herramienta ausente, estado inválido o fallo de entorno detiene. El sentinel local sin commit no es identidad Git. | Estado privado, snapshot, versiones e inputs |
| PR/CI: cambios del repositorio | `ci.yml`, Make y Conftest | Pruebas/política válidas permiten revisión; fallos detienen CI. Errores del runner no prueban detección. El merge depende de reglas externas; aquí no hay admisión/publicación de imagen. | Logs CI y artefacto de workflows estáticos |
| Preflight de entrega: fuente/workflows | `delivery.sh`: pruebas y política de workflow | PASS permite infraestructura/build; fallo o herramienta incompleta detiene. Es adicional a CI de PR. | `unit-tests.log`, `workflow-policy.json`, logs de políticas |
| Build e identidad: fuente/base fijada | Buildx, `delivery.sh`: AMD64 y digest resuelto | Digest válido continúa; base inválida o error de build/registro detiene. Compilar no autoriza. | `build-inputs.json`, `build-metadata.json`, digest/tag |
| Manifiesto protegido | Contratos y Conftest | Forma/digest/restricciones válidos continúan; rechazo atribuible bloquea; error de parser/evaluador detiene por separado. | `tfm-golden.json`, `manifest-policy.json` |
| SBOM original de imagen | Trivy, esquema CycloneDX 1.7 y contrato de contenido | Validez permite análisis; documento inválido o generación fallida detiene. No demuestra completitud. | `sbom.cdx.json`, informe de esquema, comando/log/exit |
| Vulnerabilidades del SBOM original | Trivy, DB conservada, Conftest y asociación de evidencias | HIGH/CRITICAL bloquea incluso sin reparación; informe permitido habilita firma; incoherencia de imagen/hash/DB o error detiene. | `vulnerabilities.json`, identidad DB, `analysis.json`, política |
| Firma independiente, SBOM y procedencia | `attestations.sh`, Cosign; clave A o confianza B. Procedencia nativa B entre prepare/finish | Todos los contratos deben verificarse. Ausencia, contenido inválido o errores detienen. SBOM/resultados no sustituyen firma de imagen. | Bundles originales, material público, logs verificados y `verified-*.json` |
| Verificación fresca y autorización | `ci-verification-gate.mjs`: inventario, autenticación exacta y campos | PASS continúa; ausencia/mismatch solo se atribuyen con evidencia suficiente. Errores de registro/verificación detienen sin probar ausencia. Se repite antes de emitir resultados. | `CI-delivery.*`, `CI-authorization.*`, inventarios |
| Attestation de resultados | Revalidación de análisis, contrato `golden-path-v1`, firma y nueva verificación | Solo éxitos obligatorios permiten emitir; fallo detiene. Admisión ocurre después, sin requisito circular. | Predicado/bundle de resultados, `CI-authorized.*`, perfil |
| Admisión de petición real | Kyverno y `actor` restringido; runtime, repositorio, firma, SBOM, procedencia y resultados | Reglas permiten o deniegan; indisponibilidad de webhook/registro/confianza detiene y no demuestra detección. No escanea vulnerabilidades. | Políticas aplicadas, petición, respuesta, inventarios |
| Despliegue, rollout y HTTP | `workload.sh`, kubectl/curl y comprobación de digest de Pods | Pods listos con digest esperado y respuesta correcta prueban observación funcional acotada. Timeout/digest/HTTP incorrectos fallan aunque hubo admisión. | Deployment/Pods, health/version/quote, reemplazo L01 |
| Conservación y limpieza | Trap de `demo.sh`, `lab.sh`, `package-evidence.py` | Conserva fallo original y primer archivo/diagnóstico; elimina solo recursos propios validados. Error de limpieza/empaquetado sigue siendo fallo. | Paquete permitido y hashes; sin credenciales/estado privado |

La [tabla EN](../EN/how-it-works.md#phases-and-stopping-points) enlaza productores y
salidas detalladas. [Arquitectura](../../implementacion/docs/ES/architecture.md),
[contratos](../../implementacion/docs/ES/delivery-contracts.md) y
[políticas](../../implementacion/policies/README.md) siguen siendo las fuentes
canónicas. Integridad del paquete no repite verificación criptográfica ni acepta resultados.

## Orden explícito del laboratorio

`demo.sh` ejecuta preflight, infraestructura, build, manifiestos y **despliegue/HTTP
de referencia** antes del flujo protegido. Prepara la imagen de reemplazo antes
de devolver `prepare`. La referencia es una comparación experimental.

Orden alojado: `prepare` → procedencia nativa de ambos digests → `finish` → `cleanup`.
Firma/verificación preceden al rechazo dirigido **F13 antes de emitir resultados**.
Después se autoriza, se ejecutan retirada/restauración F07 local, CREATE negativos,
admisión/HTTP legítimos, UPDATE de runtime, reemplazo y L05 opcional con revisiones
seleccionadas. Los fallos y oráculos pertenecen a escenarios, no a un futuro consumidor.

L01 conserva evidencias frescas de su segundo digest en `L01-update/`; puede compartir
pruebas de fuente para el mismo commit. Prueba mecánica de reemplazo, no una mejora
funcional. Recuperación F13 de la misma imagen no es reemplazo L01. El runner de
medición tampoco es el futuro motor consumidor.

## Localizar controles de bloqueo

Son ejemplos de navegación con IDs existentes; no duplican una lista normativa.
El catálogo ampliado P15 queda previsto. Conftest y Kyverno requieren pruebas
separadas por ser implementaciones distintas.

| Riesgo/valor | Lugar e ID existente | Válido → inválido | Evidencia, pruebas y límite |
| --- | --- | --- | --- |
| Dependencias mutables/permisos de workflow | Conftest `ACTION_SHA`, `PR_WRITE`, `PULL_REQUEST_TARGET` | Action SHA completo → tag; PR lectura → escritura | [F01/F02](../../implementacion/docs/ES/cases/F01-F02/runbook.md). Análisis estructural, no flujo de datos general. |
| Imagen mutable/privilegios | Conftest `DIGEST`, `PRIVILEGED`; Kyverno `authorized-image-repository`, `restricted-containers` | Digest autorizado/no privilegiado → tag o privilegio | [Runtime](../../implementacion/docs/ES/cases/F11-F12-L06/record.md). Namespace/operaciones protegidos, no toda la seguridad del clúster. |
| Vulnerabilidad severa conocida | Conftest `VULNERABILITY_BLOCK`, `TRIVY_REPORT_INVALID` | MEDIUM permitido → HIGH/CRITICAL | [Análisis](../../implementacion/docs/ES/cases/F03-F04-L02/runbook.md). Depende de DB y detección; admisión no vuelve a escanear. |
| Firma independiente ausente/alterada | Gate `MISSING_IMAGE_SIGNATURE`; `tfm-signature` / `require-image-signature` | `cosign/sign/v1` auténtico → ausente aunque haya SBOM | [F07 (EN)](../../implementacion/docs/EN/cases/F07/record.md), [F08](../../implementacion/docs/ES/cases/F08/record.md). Firma válida no garantiza seguridad de vulnerabilidades. |
| SBOM ausente/ajeno | Esquema/contenido y `tfm-sbom` / `require-sbom` | CycloneDX auténtico del digest → donante ajeno | [SBOM](../../implementacion/docs/ES/cases/F05-F06-L03/runbook.md). Esquema completo en CI, campos seleccionados en admisión; ninguno prueba completitud. |
| Origen no autorizado | `tfm-provenance` / `require-provenance`; `PROVENANCE_REPOSITORY`, `PROVENANCE_REVISION`, `PROVENANCE_BUILD_TYPE`, `PROVENANCE_BUILDER` | Origen/revisión/builder configurados → repositorio distinto firmado | [Procedencia](../../implementacion/docs/ES/cases/F09-F10-L05/runbook.md). A no demuestra OIDC B ni SLSA L3. |
| Autorización ausente/obsoleta | Gate `MISSING_RESULTS`, `RESULTS_POLICY_VERSION_MISMATCH`; `tfm-results` / `require-results`, `RESULTS_POLICY_VERSION` | PASS `golden-path-v1` → ausente o replay P0 de laboratorio | [Resultados](../../implementacion/docs/ES/cases/F13-F14/record.md). Contrato propio, no conformidad VSA; salud separada. |

La [tabla EN con enlaces de código y pruebas](../EN/how-it-works.md#finding-a-blocking-control)
permite ir de cada ejemplo a implementación y validación. Atribuye fallos por fase,
fuente/digest, estado del comando, decisión estructurada y regla exacta. Un error
de recuperación no demuestra ausencia; un negativo necesita rechazo atribuible
y recuperación positiva. Lo desconocido/no alcanzado no se convierte en PASS.
Estos controles no establecen conformidad DORA completa.
