# Preflight de integración local F09 / F10 / L05

Fecha: 2026-09-29. Rama: `test/f09-f10-l05-integration-validation`.
Base main actualizada: `80c12bcf7b8337ea0448fcdc60447995b14b66aa`.
Resultado: **BLOCKED antes de demo**; no existe un nuevo ID de ejecución demo.
Revisión humana y decisión final pendientes. [Registro completo EN](f09_f10_l05_integration_validation_EN.md).

## Observaciones reales

- `doctor` falló por npm `12.1.0` frente a `11.19.0`. Node coincide (`24.21.0`),
  pero Docker informa `29.8.0-1` frente a `29.8.0` y Buildx `0.37.0` frente a
  `0.37.1`. No se modificaron versiones ni se omitió la comprobación.
- Docker responde en Linux AMD64, cgroup v2. DNS y HTTPS del cliente funcionan
  (HTTP 401 del registro sin autenticación); no demuestran descarga de imágenes.
- Un único builder temporal, con BuildKit fijado y red `kind`, falló al resolver
  la imagen Node fijada: DNS `registry-1.docker.io` vía `127.0.0.11:53`, timeout.
  El límite de 60 segundos terminó con código 124. No se lanzó el demo completo.
- Se eliminó el builder; no quedaron contenedores y solo existe el builder
  `default`. No se cambió firewall, daemon, confianza, oráculos ni implementación.
- `test-env` pasó (dos entradas de archivos de prueba). No se ejecutaron
  `smoke-env`, la suite completa ni pruebas criptográficas nuevas.

Ambos commits existen y son ancestros ordenados de main. El selector existente
exportó sus blobs, modos y hashes reales; los árboles de aplicación son distintos:

| Commit | Árbol de aplicación |
|---|---|
| `7243334fe4ee7073801a86b25c90986b7d3c5ece` | `32530853938823492672ade08ddce23a1995023b` |
| `fc58e220e2d3f38d13216b23e61ffc31271f112f` | `26aeee4965e0b36721235f802a75aa8009a2967c` |

F09/F10 CI y admisión, restauración/verificación nueva y recuperación legítima,
ambas entregas L05 y su actualización/reinicio/disponibilidad de Kyverno quedan
**NOT_EXECUTED**. No hay nuevas observaciones Kyverno ni firmas que verificar.
El síntoma DNS está reproducido; su causa de firewall no se estableció de nuevo.

El usuario informa éxito hosted `36640544300` en `80c12bc` para entrega normal y
disponibilidad inicial. No se descargó ni auditó aquí. No ejecuta F09/F10, L05 ni
su ruta de actualización/reinicio. Los negativos y L05 hosted siguen pendientes.

## Evidencia y reanudación

Rutas relativas a `implementacion/`, excluidas de Git:

- `evidence/raw/f09-f10-l05-integration-validation/`: diagnóstico, exportación,
  versiones, logs reales BuildKit, limpieza y resultado bloqueado.
- `evidence/packages/f09-f10-l05-integration-validation.tar.gz` y `.sha256`.
- `evidence/raw/f09-f10-l05-integration-validation-audit.json`.

Checksum del archivo y **15 hashes internos** verificados. SHA-256:
`e3f213bef71d1a4259e6d7c6d6f06a2893c8c56641307bfae61cf127b872beb1`.
Es integridad de un paquete de diagnóstico; no verificación criptográfica nueva
ni ejecución de escenarios. Los intentos anteriores permanecen conservados.

Seguir los [comandos de preflight y demo](../docs/ES/cases/F09-F10-L05/runbook.md#preflight-del-entorno-antes-de-reintentar)
en **Golden Path - implementation**, con versiones fijadas y conectividad
BuildKit funcional. El propietario debe resolver el entorno antes de reintentar.

Revisión documental: 61 enlaces locales en 11 archivos Markdown, ambos bloques
de comandos con `bash -n` y `git diff --check`, correctos.

Asistencia real: **Github Copilot (GPT-6)**, diagnóstico, auditoría y documentación EN/ES.
Revisión humana y decisión pendientes. Sin push, PR publicado, workflow remoto,
cambios de configuración del repositorio, tesis ni mediciones de campaña.
La descripción propuesta del PR se conserva en el registro EN.
