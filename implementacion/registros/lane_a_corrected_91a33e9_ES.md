# Catálogo de la vía A sobre la fuente corregida — 5 de octubre de 2026

[English](lane_a_corrected_91a33e9_EN.md) · [Índice de identidades y hashes](lane-a-corrected-91a33e9.json) · [Estado de evaluación](../docs/ES/evaluation-readiness.md)

Las dos suites del [run **37353632299**](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299),
intento 1, han pasado. La revisión automatizada independiente de los artefactos
confirma **20/20 escenarios PASS en la vía A**, incluidos F01/F02 estáticos con
entradas inertes. La fuente experimental es
**`91a33e910ee2ba9ded5391393b06ca70005de4d4`**. Es la ejecución autorizada por el
usuario tras la [corrección de compatibilidad Python](lane_a_python_compatibility_ES.md).
El [run fallido 37342413975](catalogue_campaign_source_895a3bd_ES.md) conserva su
resultado 0/20 sobre `895a3bd`, sin bases. La revisión y aceptación humanas de esta
evidencia nueva siguen pendientes; la declaración del 4 de octubre no cambia.

[Descargar ZIP de evidencias](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-37353632299-91a33e9-evidence-v2.zip)
y [archivo SHA-256](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/lane-a-37353632299-91a33e9-evidence-v2.zip.sha256).
La prerelease existente sirve de almacenamiento: su etiqueta sigue identificando
`895a3bd`, mientras este suplemento identifica expresamente la fuente corregida.

## Definición, fuente y ejecución

Se mantuvieron los criterios de aceptación: workflow y ejecutores existentes con
entorno fijado, rechazos atribuibles, recuperaciones legítimas, auditoría de paquetes
y asociaciones con imágenes, y veinte IDs sin convertir entregas compartidas en
muestras independientes. No se cambiaron políticas, fixtures, dependencias,
versiones, severidades ni oráculos. Respecto a `895a3bd`, las únicas diferencias de
implementación/configuración son `scripts/paired-rg.py` y sus regresiones de replay.
El arreglo valida y copia cuatro miembros regulares permitidos sin la API de filtros
no soportada; mantiene hashes y requisitos de confianza. Compartir controles no
convierte dos commits completos en una fuente idéntica.

| Identidad | Valor |
|---|---|
| Fuente de controles/ejecutor; ambos `source.json` limpios y `head_sha` de Actions | `91a33e910ee2ba9ded5391393b06ca70005de4d4` |
| Main descargado por ambos jobs y usado para ascendencia | `c2b403cd436449b1b2818f5fe92983ecf946d072` |
| Workflow / referencia | `lane-a-validation.yml` / `test/catalogue-campaign-source` |
| Creación / finalización, UTC | `2026-10-05T18:07:56Z` / `2026-10-05T18:21:56Z` |
| D: demo | [job 111910409914](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299/job/111910409914); `run-QtLWFwof`; 27 etapas PASS |
| V: vulnerabilities | [job 111910410156](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37353632299/job/111910410156); `run-WjHQj2u4`; 26 etapas PASS |
| Ambos resultados | Salidas original, conservación y final 0; ninguna etapa fallida; ejecución de escenarios STARTED; aceptación humana pendiente |

Se lanzó una sola ejecución nueva con la autenticación de usuario ya guardada.
La URL devuelta y las listas de runs anterior/posterior identifican este run exacto;
no hubo reintentos experimentales. Comando ejecutado:

```bash
gh workflow run lane-a-validation.yml --repo tfm-goldenpath/golden-path-lab --ref test/catalogue-campaign-source
```

Ambos jobs reutilizaron preparación, devcontainer fijado, doctor, pruebas comunes,
smoke, escenarios, auditoría y conservación. Es **vía A dentro de Actions**, con
confianza y registro locales. No se lanzó `paired-rg.yml` ni una campaña de negativos
de vía B. Los commits posteriores de documentación no son la fuente ensayada.

## Exactamente veinte escenarios

D/V designan las suites anteriores, siempre run `37353632299`, intento 1 y fuente
`91a33e9` (SHA completo arriba). `workflows/` está en la exportación de cada suite;
los demás nombres son relativos a su paquete de escenario. El auditor existente
contrasta los cierres con diagnósticos, inventarios, imágenes, evidencias firmadas,
admisión y HTTP referenciados. El índice identifica los ocho digests analizados.

| ID | Entrada / alteración aplicada | Resultado esperado | Resultado observado y evidencia concreta | Control / fase | Barreras adicionales comprobadas o no alcanzadas | Estado técnico / limitación |
|---|---|---|---|---|---|---|
| F01 | Checkout inerte del head externo de PR bajo `pull_request_target` | Solo DENY `PULL_REQUEST_TARGET`; workflow legítimo aceptado | Rechazo exacto y control positivo; D/V `workflows/result.json` | Política estática Conftest | Contrapartida positiva comprobada; el fixture no se ejecuta | PASS; solo evidencia estática |
| F02 | Action checkout inerte cambia SHA por etiqueta mutable | Solo DENY `ACTION_SHA`; workflow legítimo aceptado | Rechazo exacto y control positivo; D/V `workflows/result.json` | Política estática Conftest | Contrapartida comprobada; no hay ataque upstream | PASS; solo evidencia estática |
| F03 | `minimist@1.2.5`, después arreglo conocido `1.2.8` | Bloquear CVE-2021-44906 CRITICAL; entrega reparada protegida y sana | CRITICAL detectado; informe reparado sin hallazgos; V `F03-completed.json` y ambos directorios de escaneo | SBOM/Trivy/Conftest reales tras build | Autorización nueva, admisión, HTTP y compatibilidad reparados PASS; no se autoriza imagen vulnerable | PASS; reparación guionizada, no esfuerzo humano |
| F04 | `ip@2.0.1` | Bloquear CVE-2024-29415 HIGH sin arreglo en este snapshot | HIGH sin FixedVersion; V `F04-completed.json`, `F04/analysis.json` | Escaneo real y umbral CI | Emisión de resultados/despliegue no alcanzados por diseño tras rechazo | PASS; no afirma ausencia universal de arreglo |
| F05 | Retirar solo atestación SBOM | Rechazar ausencia y aceptar restauración exacta | Rechazo CI/admisión atribuible y recuperación; D `F05-completed.json` | CI fresco y CREATE de admisión SBOM dirigido | Aislamiento, evidencias ajenas intactas y entrega positiva comprobados | PASS; sin negativo B |
| F06 | SBOM auténtico donante de otro digest | Rechazar subject ajeno; restaurar destino | Rechazo de subject y recuperación aceptada; D `F06-completed.json` | Subject autenticado en CI y admisión dirigida | Autenticidad donante, asociación, aislamiento y recuperación comprobados | PASS; no prueba completitud SBOM |
| F07 | Retirar solo predicado independiente de firma de imagen | Rechazar firma ausente aunque existan otras evidencias | Rechazo CI/admisión y recuperación; D `F07-CI-completed.json`, `F07-completed.json` | CI fresco y admisión | Control positivo del mismo digest y restauración exacta comprobados | PASS; sin negativo OIDC/GHCR |
| F08 | Alterar solo el valor de firma del bundle de imagen | Rechazo criptográfico atribuible; restaurar bytes originales | Fallo de umbral de firma, rechazo dirigido y recuperación; D `F08-completed.json` | Cosign CI y admisión de firma | Original auténtico, variante rechazada offline, solo cambia firma; restauración comprobada | PASS; no cuenta error de certificado/transporte |
| F09 | Retirar solo procedencia | Rechazar ausencia y aceptar recuperación exacta | Rechazo CI/admisión y recuperación; D `F09-completed.json` | CI fresco y admisión de procedencia dirigida | Descarga completa, evidencias ajenas y aislamiento comprobados | PASS; error de descarga no prueba ausencia |
| F10 | Procedencia local auténtica con repositorio no autorizado | Rechazar origen; aceptar original restaurado | Rechazo de repositorio y recuperación esperados; D `F10-completed.json` | Campos autenticados en CI y admisión | Firma del fixture y aislamiento comprobados | PASS; confianza local, sin negativo B |
| F11 | Activar privilegios y escalada simultáneamente | DENY exactos PRIVILEGED/ESCALATION y rechazo runtime | CI y las tres operaciones rechazan; D `F11-completed.json` | Conftest; Deployment CREATE/UPDATE y Pod CREATE | Estado sin modificar/ausencia y contrapartidas legales comprobados | PASS; alteración coordinada de dos campos |
| F12 | Sustituir digest por su etiqueta mutable original | DENY DIGEST y rechazo de repositorio/digest en admisión | CI y las tres operaciones rechazan; D `F12-completed.json` | Conftest; Deployment CREATE/UPDATE y Pod CREATE | Resolución de etiqueta antes/después y estado intacto comprobados | PASS; no altera procedencia |
| F13 | Resultados ausentes antes de emisión; retirar solo resultados después | Rechazo por ausencia; aceptar entrega restaurada | Ambas fronteras rechazan correctamente; D `F13-after-denial.json`, `F13-completed.json` | Admisión previa; CI/CREATE dirigido posterior | Restauración y entrega positiva comprobadas | PASS; dos observaciones de un escenario |
| F14 | Replay P0 etiquetado y autenticado bajo P1 confiable | `RESULTS_POLICY_VERSION_MISMATCH`; solo rechaza regla results | Rechazo CI/CREATE dirigido y recuperación; D `F14-completed.json` | CI autorizado y CREATE aislado nuevo | Autenticidad P0, aislamiento y CREATE positivo nuevo comprobados | PASS; P0 es fixture de laboratorio |
| L01 | Imagen legítima inicial y digest de reemplazo con evidencia propia | Ambas admitidas, listas y funcionales | Dos entregas protegidas PASS; D `L01-image-update.json` | CI, admisión, rollout y HTTP | Evidencia nueva de imagen y digests de Pods comprobados | PASS; reemplazo de misma fuente, no evolución funcional |
| L02 | `lodash.unset@4.5.2` | CVE-2026-2950 MEDIUM, sin HIGH/CRITICAL; entrega protegida aceptada | Dos hallazgos MEDIUM, umbral y entrega PASS; V `L02-result.json`, `L02/` | Escaneo, evidencia firmada nueva, admisión y HTTP | Firma, SBOM, procedencia y resultados comprobados independientemente | PASS; hallazgos dependen de base conservada |
| L03 | Añadir `is-number@7.0.0` al reemplazo | Aceptar SBOM nuevo asociado y contrato funcional intacto | Componente/evidencia/entrega PASS; D `L03-result.json`, `L01-update/` | CI SBOM, admisión y HTTP | Subject y componente conocido comprobados | PASS; comparte L01/L04, sin muestra independiente |
| L04 | Firma independiente válida con verificación fresca | Aceptar entrega firmada autorizada | Verificación, resultados y entrega PASS; D `L04-result.json` | Gate CI, resultados, admisión y HTTP | Contrato independiente de firma reautenticado offline | PASS; comparte L01/L03 |
| L05 | Revisiones de aplicación autorizadas `7243334` → `fc58e22` | Árboles distintos y dos entregas nuevas sanas | Fuente y ambas entregas PASS; D `L05-result.json`, `L05-from/`, `L05-to/` | Fuente, CI, admisión y HTTP para cada revisión | 10/11 archivos, árboles Git, ascendencia y hashes de snapshots comprobados | PASS; conserva dos entradas; par B sin ejecutar |
| L06 | Actualizar legalmente anotación de plantilla con misma imagen | Cambio de generación, digest listo y HTTP sano | UPDATE legal y limpieza de Pod positivo PASS; D `L06-result.json` | CREATE inicial compartido, UPDATE, rollout y HTTP | Correspondencia Deployment/Pod y limpieza de Pod directo comprobadas | PASS; CREATE compartido no añade muestra |

L05 conserva el par de aplicaciones completo
`7243334fe4ee7073801a86b25c90986b7d3c5ece` →
`fc58e220e2d3f38d13216b23e61ffc31271f112f`, ambos ancestros de main registrado.
Controles/ejecutor comparten fuente; las dos revisiones de aplicación son entradas
distintas necesarias. L01/L03/L04, recuperaciones y CREATE compartido de L06 no
aumentan los veinte escenarios ni constituyen muestras independientes.

## Bases reales y hallazgos

Ambas suites descargaron bases nuevas. Comparten el hash `trivy.db`
`d0b30302df0af5b967f542393733c4c17eccd22aa97a5b802f937202e656f784`,
versión de esquema 2, actualización `2026-10-05T13:07:51.292695513Z`. Los metadatos
difieren porque cada suite conserva su instante de descarga:

| Suite | DownloadedAt UTC | SHA-256 metadata.json | SHA-256 tar de base |
|---|---|---|---|
| D | `2026-10-05T18:14:20.624379437Z` | `af4ce38126e8ab62549de68f2d861d5d49115891a47c78cd5391493588cda2d6` | `f1cb118db9533ba2af384c8d2c31ff09932051f12e0be03e8aec9a806caac82d` |
| V | `2026-10-05T18:13:35.872879988Z` | `730db3416b46e936c454c0bd2a1150bda5c81149b9753f2a9859bee3e8d60e9e` | `f28b4218d8942171ed364921a8141a609ae4f71f3b0781b64c124b8490ab0bba` |

Los hashes de base y metadatos **difieren de los registrados en campaña**, procedentes
de `37199309814`: `trivy.db`
`f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`, metadatos
`b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.
La comparación reutiliza el [índice de campaña versionado](paired-rg-campaign-895a3bd.json);
no recalcula hashes ni escanea aquellos bytes históricos. Esta ejecución no usó
la base congelada de campaña ni reproduce condiciones idénticas.

F03 registra CVE-2021-44906 CRITICAL (arreglo `1.2.6, 0.2.4`), eliminado con
`minimist@1.2.8`. F04 registra CVE-2024-29415 HIGH sin versión corregida. L02 registra
CVE-2025-13465 MEDIUM sin versión corregida y CVE-2026-2950 MEDIUM con arreglo
`4.18.0`. Se cumplen los oráculos originales F03/F04/L02. Cuatro reescaneos offline
con Trivy fijado `0.74.0` y la base V conservada reproducen todos los `Results`,
normalizando solo en memoria la ruta trasladada de entrada para compararla.
Informes y hashes de base quedan intactos; no se seleccionó otra base o fixture
para mejorar el resultado.

## Revisión independiente y conservación

Originales e informes derivados están separados en la ruta ignorada
`evidence/raw/lane-a-corrected-91a33e9-20261005/`. El ZIP contiene los cuatro
artefactos Actions originales, ambas bases reales, logs nativos, metadatos y revisiones.
Los archivos anidados conservan los bytes originales; no precisa duplicar copias
expandidas. Los artefactos Actions caducan el 19 de octubre de 2026; el índice
recoge tamaños, hashes y caducidades exactas.

Comprobaciones efectuadas ahora, además del workflow verde:

- Cuatro hashes ZIP coinciden con GitHub y pasan CRC. Los auditores existentes
  verifican **151 hashes externos** (76 D/75 V) y **2.312 hashes internos** de
  escenarios (1.963 D/349 V). Coinciden run/fuente/main y ocho recibos de imágenes.
- El auditor de escenarios pasa independientemente 27 fronteras D y 12 V: son
  comprobaciones, no 39 escenarios. Pasan catorce fronteras de aislamiento con
  validadores existentes. El `state.json` privado se excluye del paquete; sus
  comprobaciones originales en vivo se conservan, sin recalcularlas offline.
- Cosign fijado `3.1.3` revisa 28 bundles locales distintos: **27 auténticos** y
  el rechazo criptográfico esperado de la firma F08 alterada. Después se verifican
  **24 contratos positivos** contra contenido autenticado, subjects, repositorio,
  fuente y hashes de resultados. La confianza local no demuestra OIDC.
- Las dos bases reales se restauran mediante la función corregida existente y
  pasan inventario, hashes externos/internos e identidad/metadatos exactos. Coinciden
  cuatro reescaneos offline. Ambas exportaciones L05 corresponden a sus entradas Git.
- Se conservaron y corrigieron dos aserciones auxiliares del revisor: en L05
  `applicationTree` es el subárbol `src/`, no el servicio completo; el bundle F08
  alterado también figura en `L01-update/CI-F08-*`. Los contratos y bytes existentes
  resuelven ambas. Son errores del ayudante de revisión, no etapas experimentales
  fallidas; no se cambiaron originales, expectativas ni código de producción.
- Se comprobó espacio/inodos antes de descargar/extraer, entre suites y al terminar
  la revisión, manteniendo reserva de 3 GiB/20.000 inodos. No hubo limpieza global
  ni borrado de originales, fallos, bases canónicas o declaraciones humanas.

Las verificaciones previas A1/campaña se reutilizan como registros históricos.
El índice separado recoge la comprobación de publicación y la inspección de datos
sensibles.

## Interpretación y párrafo propuesto para la memoria

La validación funcional completa de la vía A queda acreditada técnicamente para
la fuente corregida `91a33e9`, con veinte escenarios satisfactorios y evidencia
verificada. No queda acreditada la ejecución completa del catálogo sobre la fuente
temporal `895a3bd`: el arreglo de compatibilidad cambia el commit y las bases de
vulnerabilidades son distintas. Los controles y oráculos conservados permiten
relacionar ambos trabajos sin equiparar sus datos o condiciones. Siguen pendientes
la evaluación humana y económica, los negativos alojados no soportados y la
aceptación humana de esta evidencia complementaria posterior al cierre del
4 de octubre. Este párrafo es una propuesta; no se ha editado la memoria.

Los datos funcionales y los diez pares temporales permanecen separados; no se
repitió la campaña ni se modificaron las declaraciones históricas de aceptación.

| Actividad | Asistencia | Revisión humana | Decisión |
|---|---|---|---|
| Ejecutar workflow autorizado sobre fuente corregida; revisar originales, criptografía, bases y fuentes; preparar registros EN/ES y descarga | OpenAI Codex / GPT-6 | Pendiente | Revisión técnica automatizada PASS, 20/20 vía A; nueva aceptación humana pendiente |

Nota de publicación: v2 corrige el nombre de evidencia F04 a `F04/analysis.json`. Se conserva intacto el suplemento inicial; los bytes y resultados experimentales originales son idénticos.
