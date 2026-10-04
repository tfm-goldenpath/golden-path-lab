# Preparación de la evaluación y cobertura de veinte escenarios

[English](../EN/evaluation-readiness.md) · [Trabajo actual](../../TODO.md) · [Entrega para ejecución final](paired-rg-campaign.md)

## Alcance actual

La consolidación se preparó desde `940582721d0a5bee2fce54272f5dac60a87fad00`
y se integró como PR #45 en `895a3bde79089b7544c1dad76a6cd8f48eede0a8`.
Desarrollo RG/GR nuevo y la [campaña temporal de diez pares](paired-rg-campaign-results.md)
ya tienen evidencia revisada en `895a3bd`. La ruta de entrega legítima no repite
el catálogo funcional completo. Implementación, ejecución, revisión automatizada
y aceptación humana siguen separadas; aceptación global pendiente.

Se mantienen cuatro datasets separados: ensayos funcionales, reparación mediante
script de PR44, piloto temporal de cuatro pares y campaña temporal completada de diez pares. Las
seis tareas de PR44 son observaciones adicionales de F03/F10/F11, no escenarios
nuevos. Las entregas compartidas L01/L03/L04, CREATE de L06 y contrapartes positivas
son observaciones vinculadas, no muestras independientes. F01/F02 evalúan datos
inertes de workflows estáticamente; no ejecutan workflows maliciosos.

La medición de esfuerzo humano y la calibración manual elegible/selección de
límites quedan **aplazadas**. Las reparaciones conocidas miden ejecución del
script, no diagnóstico, productividad ni descubrimiento autónomo. Sus registros
siguen siendo no elegibles para calibración humana incluso tras otra revisión.
Un merge no implica revisión humana realizada, aceptación global ni autorización
de campaña.

## Fuentes de evidencia y procedencia de revisión

Las fuentes históricas A1/A2/B1/AR/P siguen siendo **registros versionados**, sin
nueva auditoría de esos originales. Su inventario de retención no reautenticó
bundles históricos. La fuente posterior C tiene revisión y publicación de originales
separadas. Si falta un original histórico, su registro versionado sigue como fuente:

- **A1:** [registro de ejecución/revisión A](lane-a-validation.md), run
  `36881119588`, fuente `b8eb603e7965e4d58cc9f58ec78f74971944a547`; demo
  `run-TxAlzChs`, vulnerabilidades `run-SeGfzbLB`. Describe la revisión independiente
  automatizada anterior de integridad/criptografía y auditorías satisfactorias.
  Raíz local: `evidence/raw/lane-a-run-36881119588/`. Aceptación humana pendiente.
  Un devcontainer en GitHub con claves locales sigue siendo carril A.
- **A2 (solo comunicado):** la [guía de medición](paired-rg-measurements.md) recoge
  suites A exitosas comunicadas por el contribuyente en `36885654089`, fuente
  `5ae6f84a01407789933bd36bcdb05250a6d6c4f5`. Su artefacto original no está
  conservado aquí; no se le asigna nueva prueba por escenario.
- **B1 (revisión aportada):** [registro runtime](cases/F11-F12-L06/record.md), run
  `36768108684`, incremento fusionado en
  `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`. El contribuyente aportó la revisión
  alojada F11/F12/L06; no constituye nueva auditoría ni aceptación de fuente final.
- **AR:** [registro PR44](../../registros/automated-remediation-validation.md),
  `automated-six-01`, semilla `automated-six-v1`, fuente
  `ea790781990766a3cb20bae5a302e1175edd3bd0`. Seis tareas VALIDATED, finalización,
  limpieza e integridad PASS; sin reintentos, interrupciones ni intervención humana.
  Originales en `evidence/manual-tasks/automated-six-01/`, runs raw asociados y
  paquetes seguros. Aceptación humana pendiente; las seis son no elegibles.
- **P:** [piloto temporal de cuatro pares](paired-rg-pilot-review.md), fuente
  `02674a57d290083648a9af44c48fd049808b2d70`, runs `36964061878`, `36964593732`,
  `36965104583`, `36965606734`, base del desarrollo `36926824792`. El registro
  describe 4/4 favorables, cero reintentos/exclusiones, mediana G−R 55,339 s y
  22,050 minutos de jobs observados. Las descargas locales originales de revisión
  se retiraron a petición del usuario; no se verificó aquí la copia externa.
  No se pueden reasignar esta fuente/datos ni agruparlos con la campaña.

- **C:** [resultados y originales publicados de diez pares](paired-rg-campaign-results.md),
  fuente `895a3bde79089b7544c1dad76a6cd8f48eede0a8`, diez runs enlazados,
  base del desarrollo `37199309814`. 10/10 favorables sin exclusiones/reintentos;
  revisión técnica automatizada e integridad PASS; aceptación humana pendiente.
  Solo respalda la frontera de entrega legítima alojada, no reemplazo, evolución
  de componente, negativos ni muestras positivas independientes adicionales.

## Matriz de cobertura — exactamente veinte escenarios

Las rutas identifican implementación y pruebas existentes; `make -C
implementacion test` ejecuta también sus comprobaciones comunes. Cada fila usa la
identidad completa fuente/run de su clave anterior. **Los fixtures completos no
se han repetido sobre la fuente de campaña; la aceptación humana sigue pendiente.**
C solo aporta las fronteras positivas compartidas identificadas expresamente. Los negativos B no soportados siguen NOT_EXECUTED aunque A
pase. Las regresiones y CI solo demuestran su frontera indicada.

| ID | Propiedad / resultado esperado | Implementación / prueba enfocada | Frontera | Carril soportado | Fuente/run y evidencia registrados | Observación / estado de revisión | Limitación restante / fuente final |
|---|---|---|---|---|---|---|---|
| F01 | Rechazar workflow privilegiado pull_request_target | [workflows.py](../../tests/scenarios/workflows.py); [test_workflow_scenarios.py](../../tests/policies/test_workflow_scenarios.py) | Workflow estático / CI de PR | Estático, independiente de carril | A1 demo; [registro estático](../../registros/f01_f02_workflows_ES.md) | DENY exacto del evento registrado. Revisión automatizada histórica; humana pendiente. | El fixture no se ejecuta; las reglas de protección son externas. Fuente final pendiente. |
| F02 | Rechazar etiqueta mutable de Action externa | [workflows.py](../../tests/scenarios/workflows.py); [test_workflow_scenarios.py](../../tests/policies/test_workflow_scenarios.py) | Workflow estático / CI de PR | Estático, independiente de carril | A1 demo; registro estático anterior | DENY ACTION_SHA exacto registrado. Revisión automatizada histórica; humana pendiente. | No se ejecuta ataque contra etiqueta remota. Fuente final pendiente. |
| F03 | Rechazar dependencia HIGH/CRITICAL reparable; aceptar imagen corregida | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | Escaneo real SBOM / CI; admisión corregida + HTTP | A; fixture B no soportado | A1 vulnerabilities; AR F03/G run-G0n1bJ9K, R run-gKNMKGI0 | A1 PASS; AR ambos VALIDATED. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; hallazgo minimist ligado a base congelada. Fuente final pendiente. |
| F04 | Rechazar HIGH/CRITICAL sin reparación en el snapshot elegido | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | Escaneo real SBOM / CI | A; fixture B no soportado | A1 vulnerabilities: ip 2.0.1, CVE-2024-29415 | Rechazo atribuible PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; no afirma ausencia universal de solución. Fuente final pendiente. |
| F05 | Rechazar SBOM ausente; aceptar restauración exacta | [sbom.sh](../../tests/scenarios/sbom.sh); [sbom-scenario.test.mjs](../../tests/unit/sbom-scenario.test.mjs) | Gate CI fresco + admisión dirigida | A; negativo B no soportado | A1 demo; [registro SBOM — EN](../EN/cases/F05/record.md) | Rechazo CI/admisión y restauración PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; contraparte L03 compartida. Fuente final pendiente. |
| F06 | Rechazar SBOM ligado a otro digest | [sbom.sh](../../tests/scenarios/sbom.sh); [f06-scenario.test.mjs](../../tests/unit/f06-scenario.test.mjs) | Gate CI fresco + admisión dirigida | A; negativo B no soportado | A1 demo; [registro SBOM — EN](../EN/cases/F06/record.md) | Rechazo de sujeto y restauración PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; validar esquema no prueba inventario completo. Fuente final pendiente. |
| F07 | Rechazar firma independiente de imagen ausente | [f07.sh](../../tests/scenarios/f07.sh); [f07-ci-scenario.test.mjs](../../tests/unit/f07-ci-scenario.test.mjs) | CI fresco + admisión; recuperación exacta | A; negativo B no soportado | A1 demo; [compatibilidad](cases/F07/hosted-compatibility.md) | Rechazo por firma ausente PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; mutación GHCR sin demostrar. Fuente final pendiente. |
| F08 | Rechazar firma de imagen corrupta | [f08.sh](../../tests/scenarios/f08.sh); [f08-scenario.test.mjs](../../tests/unit/f08-scenario.test.mjs) | CI fresco + admisión dirigida | A; negativo B no soportado | A1 demo; [registro firma](cases/F08/record.md) | Rechazo criptográfico dirigido PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; error de transporte no es detección. Fuente final pendiente. |
| F09 | Rechazar procedencia ausente | [provenance.sh](../../tests/scenarios/provenance.sh); [provenance-scenario.test.mjs](../../tests/unit/provenance-scenario.test.mjs) | CI fresco + admisión dirigida | A; negativo B no soportado | A1 demo; [registro origen](cases/F09-F10-L05/record.md) | Rechazo y restauración PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; error de consulta no demuestra ausencia. Fuente final pendiente. |
| F10 | Rechazar procedencia auténtica de repositorio no autorizado | [provenance.sh](../../tests/scenarios/provenance.sh); [provenance-scenario.test.mjs](../../tests/unit/provenance-scenario.test.mjs) | CI fresco + admisión dirigida | A; negativo B no soportado | A1 demo; AR G run-rZHXsd7i, R run-pd8oXkxS | A1 PASS; AR ambos VALIDATED. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; AR selecciona artefacto autorizado sin editar declaraciones. Fuente final pendiente. |
| F11 | Rechazar privileged y allowPrivilegeEscalation activados | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CI; admisión Deployment CREATE/UPDATE + Pod | Runtime A/B; AR solo A | A1 demo; B1; AR R run-Dh0ak8AA, G run-4mg9a28a | A1 PASS; B1 revisión aportada; AR ambos VALIDATED. Revisión automatizada histórica; humana pendiente; B1 aportada. | Alteración coordinada de dos campos; ensayos guiados aceptados siguen no elegibles. Fuente final pendiente. |
| F12 | Rechazar etiqueta mutable aunque resuelva al digest autorizado | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CI; admisión Deployment CREATE/UPDATE + Pod | Runtime A/B | A1 demo; B1 | A1 PASS; B1 revisión aportada. Revisión automatizada histórica; humana pendiente; B1 aportada. | Resolución de etiqueta verificada antes/después; no es fallo de procedencia. Fuente final pendiente. |
| F13 | Rechazar resultados firmados ausentes; restaurar entrega legítima | [results.sh](../../tests/scenarios/results.sh); [results-scenario.test.mjs](../../tests/unit/results-scenario.test.mjs) | Admisión previa; CI/admisión tras emisión | A ambas; B solo previa a emisión | A1 demo (antes/después de emisión); [oráculo resultados](cases/F13-F14/record.md) | Ambas fronteras A PASS. Revisión automatizada histórica; humana pendiente. | Negativo B tras emisión NOT_EXECUTED; prueba previa es otra observación del mismo ID. Fuente final pendiente. |
| F14 | Rechazar replay P0 autenticado bajo política P1 | [results.sh](../../tests/scenarios/results.sh); [results-scenario.test.mjs](../../tests/unit/results-scenario.test.mjs) | CI autorizado + CREATE dirigido nuevo | A; negativo B no soportado | A1 demo; se conserva fallo unchanged-apply de 36830599263 | Rechazo CREATE corregido PASS. Revisión automatizada histórica; humana pendiente. | Negativo B NOT_EXECUTED; P0 es fixture identificado, no política histórica real. Fuente final pendiente. |
| L01 | Aceptar entrega legítima y reemplazo con digest nuevo verificado | [l01.sh](../../tests/scenarios/l01.sh); [l01-update.test.mjs](../../tests/unit/l01-update.test.mjs) | CI + admisión + rollout/HTTP | A/B | A1 demo; entregas P y C apoyan solo ruta B legítima | L01/L03/L04 compartidos PASS; P 4/4 y C 10/10 pares temporales favorables. Revisión automatizada histórica; humana pendiente. | P/C no ensayan reemplazo; reemplazo del mismo commit no es evolución L05. Fuente final pendiente. |
| L02 | Aceptar fixture con vulnerabilidades solo MEDIUM | [vulnerabilities.sh](../../tests/scenarios/vulnerabilities.sh); [vulnerabilities.test.mjs](../../tests/unit/vulnerabilities.test.mjs) | Umbral CI + firma/evidencias + admisión/HTTP | A; fixture B no soportado | A1 vulnerabilities: lodash.unset 4.5.2 | Umbral y entrega positiva PASS. Revisión automatizada histórica; humana pendiente. | Fixture B NOT_EXECUTED; ambos CVE-2026-2950 y CVE-2025-13465 dependen del snapshot. Fuente final pendiente. |
| L03 | Aceptar evolución legítima de componente/inventario con SBOM nuevo | [l01.sh](../../tests/scenarios/l01.sh); [sbom-evidence.test.mjs](../../tests/unit/sbom-evidence.test.mjs) | CI SBOM + admisión + funcionalidad | Ruta positiva A/B | A1 demo; [oráculo L03 — EN](../EN/cases/L03/record.md) | L01/L03/L04 compartidos PASS. Revisión automatizada histórica; humana pendiente. | Adición conocida is-number; no prueba completitud ni muestra independiente. Fuente final pendiente. |
| L04 | Aceptar firma independiente válida tras verificación fresca | [l01.sh](../../tests/scenarios/l01.sh); [ci-verification-gate.test.mjs](../../tests/unit/ci-verification-gate.test.mjs) | Gate CI + resultados + admisión/HTTP | Ruta positiva A/B | A1 demo; C firma fresca/admisión/HTTP; [oráculo L04](cases/L04/record.md) | L01/L03/L04 compartidos PASS. Revisión automatizada histórica; humana pendiente. | Reemplazo/control compartido; C solo apoya entrega firmada de imagen inicial. No demuestra negativo F07 en B. Fuente final pendiente. |
| L05 | Aceptar dos revisiones reales autorizadas de aplicación | [l05.sh](../../tests/scenarios/l05.sh); [l05-scenario.test.mjs](../../tests/unit/l05-scenario.test.mjs) | Control fuente + CI + admisión/HTTP en ambas | A par explícito; B exige dos runs nativos autorizados | A1 demo: 7243334fe4ee7073801a86b25c90986b7d3c5ece → fc58e220e2d3f38d13216b23e61ffc31271f112f | Ambas entregas de fuente A PASS. Revisión automatizada histórica; humana pendiente. | Par de revisiones B NOT_EXECUTED; precalentamiento del piloto no es L05. Fuente final pendiente. |
| L06 | Aceptar actualización de plantilla permitida con la misma imagen | [runtime.sh](../../tests/scenarios/runtime.sh); [runtime-scenario.test.mjs](../../tests/unit/runtime-scenario.test.mjs) | CREATE/UPDATE plantilla + rollout/HTTP + Pod positivo | A/B | A1 demo; B1 | Generación 1→2, digest/HTTP PASS; B1 revisión aportada. Revisión automatizada histórica; humana pendiente; B1 aportada. | CREATE comparte L01; Pods positivos y recuperación no añaden muestras independientes. Fuente final pendiente. |

## Procedimiento y entrega registrada

La entrega PR45 inferior precedió desarrollo y campaña autorizados por separado,
ahora registrados en C. Usar el [procedimiento de campaña](paired-rg-campaign.md)
para otra campaña; sus comandos no autorizan otra ejecución. Fuente o muestra
distinta requieren preparación revisada y autorización propias.

1. Integrar todos los arreglos mediante revisión normal; en main actual limpio,
   registrar `TARGET`, comprobar `doctor`, pruebas comunes y espacio antes de
   descargar. Separar esa futura revisión de A1, AR y P sin reescribir identidades.
2. Autorizar por separado y ejecutar desarrollo nuevo **RG seguido de GR** sobre
   el mismo `TARGET`; GR restaura `database_run=$DEV_RG`. Descargar originales y
   logs Actions, verificar hashes y revisar build/caché, procedencia nativa,
   admisión, rollout/HTTP, extremos temporales y limpieza reales. Un job verde o
   checksum no basta. Conservar cambios/fallos y preparar nueva fuente/plan cuando
   corresponda; nunca repetir silenciosamente.
3. Elegir cantidad/semilla del nuevo borrador explícitamente; diez es un ejemplo
   exploratorio, no aprobación general de futuras campañas.
   Vincular borrador, desarrollo, fuente/configuración y base. Una persona debe
   revisar y aportar la declaración de autorización. El asistente puede registrar una
   declaración explícita con autorización; nunca inventa revisor, razón o decisión.
4. Con permiso para publicar remotamente, publicar el control exacto mediante el
   job existente exclusivo de plan. Verificar/exportar identidad y manifiesto.
5. Ejecutar solo posiciones aprobadas en su orden congelado y revisar/exportar
   cada intento antes del siguiente, incluidos fallos. Solo cabe el reintento
   existente del par completo por fallo externo demostrado y revisado. No repetir
   por rechazo de control, lentitud ni por este defecto del análisis.
6. Analizar **todos** los directorios de intentos de campaña, incluidos originales
   reintentados, incompletos y no finalizados, con su control. Exportar originales
   y análisis derivado por separado; duraciones desconocidas null y cobertura
   parcial explícita. Descargar fuera de Codespaces antes de caducar la retención.

El analizador comprueba coincidencia completa brazo/archivo e identidad obligatoria
incluso en observaciones incompletas. Imagen/inicio/final pueden faltar solo antes
de su punto de producción. No puede omitirse imagen tras fases posteriores al
build; no se deduce duración ni finalización funcional sin extremo de admisión
registrado. El éxito sigue exigiendo evidencia favorable completa. No se inventan
campos desde fechas del archivo, exits de fases o minutos de jobs. Se conservan
restricciones de reintento, fuente/base y bytes originales.

La revisión funcional sigue separada: usar las fronteras A1 para decidir qué
suites necesitan ejecución sobre fuente final. Repetir A no cierra negativos
alojados no soportados. Desarrollo RG/GR nuevo valida el medidor temporal en esa
fuente, no los veinte escenarios.

Solo la clasificación derivada por el finalizador puede diferir del checkpoint
archivado, y debe coincidir con su recálculo desde los mismos hechos (por ejemplo,
fallo de caché antes del temporizador). Un paquete de bootstrap anterior a arm-init
se conserva como preparación si ni par ni archivo declaran observación del brazo;
no aporta duración ni éxito. Los demás campos y su presencia deben coincidir.

## Afirmaciones de tesis a alinear después (sin editar la tesis)

- Sustituir afirmaciones de comparación humana/calibración elegible completadas
  por alcance aplazado; distinguir ensayos guiados y scripts.
- Separar veinte IDs de comprobaciones de frontera, controles positivos compartidos
  y seis observaciones PR44; conservar negativos alojados NOT_EXECUTED.
- Atribuir A a confianza local aunque se ejecute en Actions; no generalizar a
  OIDC/mutaciones GHCR ni a todos los escenarios en ambos carriles.
- Conservar fuente y estimaciones exploratorias del piloto separadas de campaña;
  registrar autorización explícita de diez pares y carácter exploratorio, sin
  afirmar precisión estadística garantizada.
- Diferenciar tiempos de reparación conocida, intervalos G−R y minutos Actions;
  conservar null/incompletos, exclusiones y fallos.
- Separar éxito técnico, integridad, aceptación humana y finalización global;
  actualizar referencias finales fuente/run solo tras ejecución real.
