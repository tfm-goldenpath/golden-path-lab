# Actualizaciones programadas del tooling

[English](../../EN/maintainers/dependabot-tooling.md) · [TODO](../../../implementacion/TODO.md)

Base: main fusionado `9e68811b13cb202bc0231ba1b9b0de3e8f592ae4`, consultado el
3 de noviembre de 2026; rama `chore/dependabot-tooling`. No se encontró configuración
previa local de Dependabot YAML, Renovate JSON/JSON5/rc ni configuración embebida
en paquetes. Se añade una única definición.

## Alcance y operación

[dependabot.yml](../../../.github/dependabot.yml) conserva exactamente la propuesta:
npm solo en `/implementacion/tooling`, lunes a las 08:00 `Europe/Madrid`, semanal,
límite de tres PR de versiones y estrategia `increase`. `schema-validation` agrupa
solo actualizaciones minor/patch de versiones de `ajv`, `ajv-formats` y
`ajv-formats-draft2019`. Majors y todas las actualizaciones de `@devcontainers/cli`
se revisan en PR individuales. No hay ignores, credenciales, automerge ni aprobación
automática. Los pins exactos, manifiestos y lockfiles no cambian.

La [referencia oficial](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
consultada admite la configuración sin desviaciones. `increase` incrementa requisitos;
no transforma un rango previo en pin exacto. El límite de tres afecta a PR de versiones;
las de seguridad tienen otro límite gestionado por GitHub (actualmente diez).
El directorio acota este calendario, **no las alertas globales ni actualizaciones
de seguridad preexistentes**. No se modificaron ajustes del repositorio.

Fixtures vulnerables y de escenarios, ejemplos de servicio, evidencia histórica,
manifiestos Codex opcionales y configuración devcontainer quedan fuera del directorio.
No se suprimen avisos para conservar fixtures vulnerables. No se añaden calendarios
Actions/Docker/devcontainer/Codex; la CLI de tooling constituye una propuesta npm
separada. Tras merge, consultar **Insights → Dependency graph → Dependabot**,
ubicación npm y logs del job, según la [guía operativa](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates).
Registrar job, revisión, resultado y PR generadas; puede no haber versiones nuevas.
No forzar upgrades ni inferir ejecución del servicio a partir de pruebas locales.

## Revisión de futuras PR

1. Revisar releases, avisos, diff del manifiesto/lock, integridad y transitivas,
   preservando pins exactos y alcance.
2. Comprobar compatibilidad AJV/plugins: versiones aceptadas actuales **8.20.0**,
   **3.0.1** y **1.6.1**.
3. Revisar deliberadamente guardas de versión de
   [validate-sbom-schema.mjs](../../../implementacion/scripts/validate-sbom-schema.mjs),
   [pruebas SBOM](../../../implementacion/tests/unit/sbom-schema.test.mjs) y
   [guía CycloneDX](../../../implementacion/schemas/cyclonedx-1.7/README.md).
   Mantener resolución offline, hashes, rechazo de discrepancias, formatos completos
   e internacionales y ausencia de coerción/defaults. No derivar versiones aceptadas
   del manifiesto editado por el bot ni retirar guardas para lograr CI verde.
4. Ejecutar pruebas pertinentes y suite compartida. CLI **0.89.0** tiene una
   expectativa independiente en [pruebas Lane A](../../../implementacion/tests/unit/lane_a_validation_test.py).
   [El launcher](../../../implementacion/scripts/lane-a-validation.py) instala el lock
   y copia la CLI fuera de la ruta reinstalada durante el lifecycle. Sus upgrades
   pueden requerir integración launcher/devcontainer en su propia PR; este calendario no.
5. Fusionar solo tras revisión. Si falla una guarda en una PR limitada a paquetes,
   diagnosticar y proponer compatibilidad revisada o aplazar/rechazar. No eludir CI.

## PR #23, evidencia y reversión

La [PR #23](https://github.com/tfm-goldenpath/golden-path-lab/pull/23) sigue abierta
en `7d5734000e2b3a71d4585c463c1aead004b9a26d`: su patch de dos archivos actualiza
AJV 8.17.1 → 8.20.0. El manifiesto coincide con main, pero el lock conserva fast-uri
**3.1.8** frente a **3.1.9**; es la única entrada de paquete diferente. Main ya incluye
las guardas, pruebas y documentación correspondientes. Se recomienda al propietario
revisarla y cerrarla como superada, sin fusionar su lock antiguo. Esta tarea no la
cierra, fusiona ni comenta.

Respuestas API, comparación y logs en
`implementacion/evidence/raw/dependabot-tooling-20261103/`, fuera de Git. Las pruebas
usan el parser Conftest existente y unittest stdlib, con mutaciones negativas de
alcance, grupos, ignores/credenciales y segundo updater. Verifican pins exactos y
consistencia del lock sin sustituir guardas independientes. No emulan un resolver
ni constituyen ejecución del bot. Validación local PASS con `PATH="$PWD/implementacion/.tools/bin:$PATH"`:
5 pruebas de configuración, 13 SBOM, 16 Lane A, doctor y suite compartida
(9 entorno, 1.000 servicio/unitarias, 124 políticas Python, 153 defensa, 22 release,
Rego/Kyverno, F01/F02 y Cosign local), inventario de 538 rutas, sus 10 pruebas,
179 enlaces locales y `git diff --check`. La prueba inicial falló por ausencia del
archivo y pasó tras crearlo. Los hashes registran los bytes locales ejecutados;
la PR conserva resultados de CI ordinaria push/PR sobre el commit final; la primera ejecución observada del servicio queda pendiente tras merge.
Una configuración correcta no acredita compatibilidad de futuras dependencias.

Para retirar el calendario, eliminar `.github/dependabot.yml` mediante PR revisada
y ajustar su prueba/inventario; conservar este registro y las evidencias. No
suprimir alertas ni cambiar ajustes de seguridad. No se crearon credenciales,
paquetes, imágenes ni servicios persistentes. Asistencia Codex; revisión humana
pendiente. P00/P01, admisión y límites experimentales permanecen intactos.
