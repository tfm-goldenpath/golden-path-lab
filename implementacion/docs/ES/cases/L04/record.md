# L04 y verificación CI temprana de F07

[Registro primario, evidencias y revisión](../../../EN/cases/L04/record.md).

## Preparación y alcance

Base: `3fe4f9e9d595c5f3f34be3021b3c2bc9bd433fbb` (PR #19).
Definiciones académicas suministradas: F07, líneas 319–337, y L04, 583–601,
SHA-256 `efa0b0f2024ed2800217de3099d86dd137acb4dcd91861bc72ad02235a774e45`.

El candidato es `L01-update`: otro digest construido de forma independiente en
el mismo repositorio de la ejecución, con análisis y evidencias propios. Tras
la firma programada, F07 local elimina solo el manifiesto de la firma independiente,
antes de verificar en CI, emitir resultados o desplegar el candidato protegido.
SBOM y procedencia permanecen válidos; todavía no debe haber resultados.

La barrera compartida consulta el inventario completo actual y autentica los
bundles recuperados. No firma, repara ni confía en una copia guardada o un PASS
anterior. Solo `MISSING_IMAGE_SIGNATURE` con código 42 e inventario completo
acredita la ausencia. Registro, transporte, confianza y contenido malformado son
fallos de integración; aceptación inesperada es un resultado desfavorable.

El escenario instala recuperación antes de eliminar. Restaura los bytes originales
y verifica de nuevo; conserva error inicial y error de recuperación. Después,
la vía normal emite resultados para ese digest. La admisión, el despliegue y las
pruebas HTTP de sustitución L01 sirven también a L04: una ejecución compartida,
sin duplicar observaciones ni mediciones de campaña. La caché de admisión sigue
desactivada. Un fallo posterior impide PASS global aunque exista evidencia intermedia.

## Ejecución local

Desde la raíz del repositorio en el devcontainer Linux:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

Resultado esperado: `F07-CI-completed.json` con
`CI_REJECTION_AND_L04_ACCEPTANCE_COMPLETE`; `L04-result.json` con PASS y el digest
nuevo. Conserva `L01-update/F07-CI/{before,negative,after-denial,restored}.json`,
`attempt.json`, `recovery.json`, inventarios y verificaciones `CI-*`, bundles,
políticas, salidas HTTP, identidad fuente y checksums. Verifica el SHA-256 del
archivo y todos los miembros indicados en `SHA256SUMS.txt`, también si falla.

Una consulta adicional de solo lectura requiere que el registro siga disponible;
desde `implementacion/`, elige un prefijo nuevo:

```bash
node scripts/ci-verification-gate.mjs evidence/raw/run-REPLACE/L01-update CI-manual authorized
```

## GitHub y limitaciones

Se conserva `prepare → procedencia nativa → finish → cleanup`. La vía normal
utiliza la barrera fresca con identidad exacta, emisor, certificados, transparencia
y marcas temporales aplicables. Los dos resultados negativos F07 alojados siguen
`NOT_EXECUTED`. No actives la sonda GHCR ni amplíes permisos.

Solo después de autorización separada para publicar y ejecutar, sobre la revisión
revisada:

```bash
gh workflow run golden-path.yml --ref test/f07-ci-verification-l04
gh run list --workflow golden-path.yml --branch test/f07-ci-verification-l04
gh run download RUN_ID --name golden-path-RUN_ID-1 --dir evidence-hosted-RUN_ID
```

Este trabajo no ejecuta ni autoriza esos comandos remotos. La firma local no
acredita OIDC alojado. Consulta las observaciones reales y los fallos conservados
en el registro primario. Asistencia: GPT-6. Revisión humana y aceptación
final pendientes; no se atribuye retrospectivamente un proceso TDD.

## Observaciones reales — 2026-09-28

**`run-I3PWZFUO` terminó con PASS** en Codespaces Linux, con zot, Cosign y Kyverno
reales, sobre el árbol modificado de `3fe4f9e9d595c5f3f34be3021b3c2bc9bd433fbb`.
Docker `29.8.0-1`, cgroup v2; herramientas fijadas sin cambios.

- Huella fuente: `c3b10ce8df43a8b69037b4567a9d0eb0d42080b48ddcfe2f53b6a14232b318e9`.
- Digest inicial: `sha256:489a9728a763767e8267f7774ab6583e08693c53f12d5074082241fee09e91f9`.
- Digest L04: `sha256:cb7b07483916b6723044e26306dd6ab8df41e7fc77aa563bfc03f092a9646c89`.
- F07 temprano: código 42 y `MISSING_IMAGE_SIGNATURE`; SBOM/procedencia
  autenticados, sin resultados todavía. Inventario 3 → 2 → 3 con restauración
  exacta; errores inicial/restauración 0 y nueva verificación satisfactoria.
- L04: resultados propios verificados, admisión, despliegue y HTTP satisfactorios,
  compartidos con L01. F13, F07 de admisión, L01 inicial y F11 también pasaron.
- Archivo: `evidence/packages/run-I3PWZFUO.tar.gz`; 278 hashes internos y los 25
  bundles conservados por la barrera verificados de nuevo (incluyen observaciones
  repetidas). SHA-256 `270084205d76aec9f6760ae5b66817335d6d6e1544aa9972bc0083fd37ab4c65`.

Se conserva el fallo anterior `run-TC8SeiUE`: la primera guarda esperaba un
repositorio distinto e impidió la mutación. Se corrigió para utilizar el mismo
repositorio con digest distinto y propiedad explícita. El archivo FAIL conserva
174 hashes comprobados y ningún PASS global. El registro primario detalla fuente,
checksum y recuperación. Este fallo no acredita detección F07 temprana.

Pasaron 99 regresiones enfocadas, las 29 del subconjunto corregido y la suite
completa final: 6 pruebas de entorno, 401 de servicio/unidad, 15 Python, 52
Conftest, 18 + 14 Kyverno y criptografía Cosign real. También se revisaron sintaxis,
enlaces, diferencias y hashes de implementación. Evidencias ignoradas por Git:
`evidence/raw/run-I3PWZFUO/` y `evidence/raw/f07-ci-l04-development/`.

Las dos reglas temporales de red limitadas al puente kind se retiraron al terminar;
no forman parte del cambio. No hubo publicación ni ejecución alojada. F07 negativo
alojado sigue NOT_EXECUTED; la aceptación alojada del gate normal/L04 necesita su
propia ejecución autorizada y auditoría. Revisión humana y aceptación final
pendientes. Asistencia de este incremento: GPT-6.
