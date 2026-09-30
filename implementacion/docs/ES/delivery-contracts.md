# Contratos de la primera entrega integrada

[Documentación en español](README.md)

[Guía principal en inglés](../EN/delivery-contracts.md). Los contratos e identificadores son únicos; este documento aporta su explicación en español.

La demostración comparte inicialmente una imagen `linux/amd64` de `quotes-node`, identificada por digest, entre la referencia R y el recorrido protegido G. Después, L01 sustituye la imagen de G por otro digest del mismo commit fuente y una etiqueta de construcción distinta, con sus propios análisis y evidencias firmadas. Comprueba la sustitución conservando el comportamiento funcional; **no constituye una pareja de medición temporal**. La [guía de ejecución](cases/L01-F13/runbook.md) contiene los comandos actuales y el [TODO](../../TODO.md) separa implementación y aceptación observada.

## Perfil bundle y estado de validación

Esta rama configura bundles de Cosign 3.1.3 y consumidores `SigstoreBundle` de Kyverno 1.19.1 para todas las evidencias de imagen. La [ejecución local de compatibilidad `run-De88fpWy`](../../registros/cosign_bundles_validation_ES.md) pasó con recuperación estricta y la [validación alojada de `82728c5`](../../registros/pr15_review_ES.md) ejercitó OIDC, SCT y transparencia. F07 dirigido local pasó después en `run-xFGRe6X1`; F07 alojado sigue pendiente. El [registro operativo](../EN/cases/F07/record.md) conserva hashes y límites de aceptación. El intento anterior `run-De88fpWy` utilizó Docker Engine 24.0.5/cgroup v1 y `GP_CGROUP_V1_COMPAT=1` explícito; no es una medición de campaña. La base clásica v0.1.0 y sus ejecuciones conservadas no acreditan el perfil nuevo.

La firma de imagen independiente exige `https://sigstore.dev/cosign/sign/v1` para el digest esperado. Un SBOM, una procedencia o unos resultados firmados no la sustituyen. Se conservan los demás predicados, el contenido CycloneDX, el umbral de vulnerabilidades y las condiciones de autorización.

## Entradas, decisiones y evidencias

| Contrato | Comprobación implementada | Límite |
|---|---|---|
| Servicio | Salud, versión/commit y cotización sintética determinista; entradas inválidas rechazadas. | No representa un motor actuarial ni procesa datos personales. |
| Imagen | Referencia `@sha256`, misma imagen en análisis, firmas y despliegue; plataforma AMD64. | No evalúa ARM ni toda la semántica de índices multiplataforma. |
| Vulnerabilidades | Informe real de Trivy separado del SBOM; Conftest bloquea HIGH/CRITICAL aunque no exista corrección. | El resultado depende de los componentes identificados y de los datos disponibles para el analizador. |
| SBOM | CycloneDX JSON original y atestación Cosign; firma, tipo de predicado y sujeto coincidente. El validador local exige formato, versión, componente principal y una lista de componentes no vacía. | CI valida el esquema oficial CycloneDX 1.7; esto no establece la exactitud o completitud semántica del inventario. Kyverno solo comprueba campos seleccionados. |
| Firma de imagen | Verificación criptográfica, predicado independiente `https://sigstore.dev/cosign/sign/v1` y confianza definida según la vía. | Una firma válida no implica ausencia de vulnerabilidades ni de código malicioso. |
| Procedencia | Sujeto, tipo y origen esperado; contratos de construcción distintos en A y B. | No se declara SLSA Build L3 ni aislamiento frente al compromiso total del constructor. |
| Resultados | Predicado propio firmado, política `golden-path-v1`, origen y comprobaciones obligatorias con resultado PASS. | Es una declaración del proceso autorizado; no es una implementación conforme de VSA ni sustituye las verificaciones directas. |
| Admisión | Kyverno aplica reglas de ejecución, firma, SBOM, procedencia y resultados a las cargas del namespace protegido. | Se comprueban los recursos y operaciones del laboratorio; no toda la seguridad del clúster. |

## Procedencia local de desarrollo: vía A

Las verificaciones de imagen de Kyverno se ejecutan sin caché para que la secuencia F13 → emisión de resultados → rechazo/restauración F07 local → L01 → F11 → UPDATE de imagen consulte las evidencias correspondientes. Trivy puede reutilizar contenido descargado de la base y la caché, pero analiza cada digest por separado y registra versión del analizador, metadatos y hash de la base empleada. Las imágenes inicial y de sustitución tienen etiquetas de ejecución y directorios de evidencias distintos dentro del mismo constructor del laboratorio. Los resultados de pruebas del código fuente pueden reutilizarse porque este no cambia; los informes de imagen y las autorizaciones no se transfieren a otro digest. Estas condiciones sirven a la demostración funcional; la política de caché y el orden de las parejas de la campaña se fijarán según el protocolo experimental.

El script genera una declaración con forma de procedencia SLSA v1 y un `buildType` propio, `https://tfm-goldenpath.dev/buildtypes/local/v1`, y la firma con una clave efímera de desarrollo. Se conserva el repositorio declarado, el commit cuando está disponible, el identificador de ejecución y la huella de los archivos de origen seleccionados. Si no hay repositorio Git, cuarenta ceros identifican un commit no disponible y `gitCommitAvailable` es falso; la huella no transforma ese valor en un commit real.

El productor local usa una configuración explícita sin servicios públicos de firma ni transparencia y un archivo de confianza local sin CA ni registros alojados; la clave pública de desarrollo configurada es el ancla de confianza. Kyverno permite en A `keys.rekor.ignoreTlog: true` y `keys.ctlog.ignoreSCT: true` para este perfil sin sellos temporales públicos. Estas excepciones no autorizan B.

Esta vía comprueba generación, almacenamiento, recuperación, firma y consumo del contrato local. La misma administración del laboratorio controla el entorno y su clave: no aporta una identidad OIDC alojada, una garantía independiente sobre lo declarado ni SLSA Build L3. El significado de los niveles y sus requisitos se contrasta con la [especificación SLSA](https://slsa.dev/spec/v1.2/).

## Procedencia nativa de GitHub: vía B

El workflow manual construye y publica ambas imágenes candidatas en GHCR. Dos pasos de `actions/attest`, fijada por SHA, emiten procedencia nativa como **SigstoreBundle** para sus respectivos digests. GitHub CLI verifica cada firma, identidad exacta del workflow, emisor OIDC, repositorio, commit y referencia de origen. El validador posterior examina el JSON de una verificación satisfactoria; no verifica criptografía por sí solo. Kyverno recupera el bundle y aplica sus condiciones de procedencia directamente en admisión. [GitHub CLI](https://cli.github.com/manual/gh_attestation_verify), [action oficial](https://github.com/actions/attest), [Kyverno y Sigstore](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/).

Las firmas de imagen y las atestaciones de SBOM y resultados usan bundles predeterminados de Cosign y su configuración de firma alojada. Todas las políticas de evidencias usan `SigstoreBundle`, mientras la procedencia nativa conserva su verificador GitHub CLI y contrato de contenido. B mantiene material de confianza Sigstore autenticado, identidad/emisor OIDC exactos, confianza del certificado, transparencia y verificación temporal/SCT aplicable. El recorrido activo ya no modifica anotaciones clásicas `.sig`/`.att`. Compartir formato no prueba igualdad de confianza ni recuperación correcta; siguen siendo comprobaciones de integración real. Las identidades y claves de A no autorizan B. El workflow no es un constructor aislado y reutilizable que permita afirmar automáticamente SLSA Build L3.

## Resumen propio de resultados y orden de aceptación

El tipo de predicado es `https://tfm-goldenpath.dev/attestations/verification-results/v1`. Contiene `policyVersion`, `source`, `result`, `checks` y las referencias con SHA-256 de las evidencias utilizadas. El orquestador lo genera después de que terminen satisfactoriamente las comprobaciones previas y sus validadores. La creación del JSON, por sí sola, no vuelve a ejecutar esas comprobaciones; su confianza depende del proceso autorizado que lo produce y firma.

Este diseño está **inspirado en la finalidad de VSA**, pero usa un contrato propio. No se atribuye conformidad con la [especificación Verification Summary Attestation](https://slsa.dev/spec/v1.2/verification_summary). La respuesta de admisión se registra después de emitir el resumen, evitando exigir como entrada el resultado del paso que se intenta autorizar. Kyverno conserva las comprobaciones directas de firma, SBOM, procedencia y configuración, además de verificar el resultado y la política del resumen.

F13 mantiene preparadas las restantes evidencias y omite únicamente ese resumen. La comprobación previa registra su ausencia y el ensayo dirigido de admisión debe identificar `tfm-results`/`require-results` como causa del rechazo. Tras emitir el resumen, L01 inicial debe ser admitido y responder correctamente. F11 comprueba el rechazo de privilegios tanto temprano como en una actualización dirigida. Por último, la sustitución de L01 recibe su propio resumen firmado y debe superar la admisión, completar el despliegue del nuevo digest y conservar la respuesta de cotización. Estas comprobaciones no dan por cerrado el resto del catálogo ni sustituyen las futuras mediciones de campaña.

F07 local se ejecuta tras la autorización normal de resultados. Autentica el
inventario inicial completo, elimina exactamente el manifiesto de firma
independiente y exige un único rechazo `tfm-signature` con el diagnóstico esperado.
Restaura el artefacto original antes de L01. `F07/result.json` es intermedio;
`F07-completed.json` registra `DIRECTED_ACCEPTANCE_COMPLETE` solo tras superar
admisión y pruebas HTTP de L01 con el mismo digest y comprobar Deployment/Pods.
Un fallo posterior de F11 o de sustitución impide el PASS global. F07 alojado es
`NOT_EXECUTED`; la compatibilidad GHCR sigue sin demostrar. El [registro F07 CI/L04](cases/L04/record.md) describe la comprobación de sustitución previa a resultados.

El verificador bundle de Kyverno 1.19.1 puede mostrar `no matching signatures found` tanto por un predicado ausente como por fallos de confianza. Por ello, F13 exige un único rechazo identificado de `tfm-results`/`require-results` (incluida su regla generada para Deployment), inventarios válidos exclusivamente de bundles obtenidos antes y después, revalidando el original previo antes de la petición, resultados ausentes y predicados de firma/SBOM/procedencia presentes para el mismo digest. Las demás políticas deben superar la admisión y L01 debe admitir después ese mismo digest tras emitir resultados antes de considerar satisfactorio el intento completo. Analizar el inventario aporta evidencia estructural, no autentica firmas. Reglas adicionales, inventarios malformados o inaccesibles y errores de verificación ajenos hacen fallar la prueba.

El [recuperador estricto del inventario](../../scripts/download-bundle-inventory.mjs) elimina la suposición de que una descarga Cosign satisfactoria contiene todos los bundles. Recupera referencias OCI en modo de solo lectura, con paginación/alternativa acotadas; comprueba digests y tamaños de manifiestos/blobs, valida todos los bundles esperados y exige una segunda lista coincidente. Un inventario ilegible, malformado, no admitido o cambiante detiene la prueba, sin interpretar datos omitidos como resultados ausentes. HTTP queda limitado a A; GHCR utiliza permiso de lectura para el repositorio fijado. Conserva `registry-inventory-before-results.json`, `registry-inventory-after-denial.json` y `registry-inventory-authorized.json` con sus arrays de bundles. Integridad de recuperación y confianza criptográfica son comprobaciones distintas; véase la [justificación de la migración](cosign-bundle-migration.md#recuperación-estricta-del-inventario-del-registro).

También deben coincidir los conjuntos estrictos de descriptores anteriores y posteriores; `F13-inventory-consistency.json` conserva la comparación. Descriptores añadidos, eliminados o cambiados provocan fallo; el orden no importa. Se presupone un único publicador controlado y un digest nuevo sin cambios de evidencias durante la petición. No es una instantánea atómica ni excluye cambios transitorios entre observaciones; la admisión L01 posterior del mismo digest sigue siendo obligatoria.

## Representación conservada y límite experimental

Cada imagen conserva `image.bundle.json`, `sbom.bundle.json` y `results.bundle.json`; A conserva además `provenance.bundle.json`. La procedencia nativa de GitHub en B se conserva en los inventarios completos descargados. `attestation-inventory-before-results.json` recoge la preparación de F13 y `bundle-inventory-authorized.json` el inventario autorizado. Estos archivos originales son distintos de los informes satisfactorios `verified-*-bundle.txt` y de las salidas `verified-signature.json`, `verified-sbom.json`, `verified-provenance.json` y `verified-results.json` que consumen los validadores de contenido. Los bundles guardados se autentican de forma independiente con `verify-blob-attestation`, comprobando digest y predicado; analizar su inventario no sustituye esa verificación. La instantánea posterior es `attestation-inventory-after-denial.json`; conserva `bundle-profile-before-results.json`, `bundle-profile-after-denial.json`, `F13-early.json` y `F13-after-denial.json` junto al registro original de admisión. Se conserva `development-public-key.pem` para reproducir la verificación local; las claves privadas quedan excluidas.

Para las evidencias Cosign, `verified-bundle-statement.mjs` extrae el contenido solo después de que el bundle guardado supere la verificación, a los mismos archivos `verified-*.json`. Así, el validador de contenido comprueba la declaración autenticada, no otra salida consultada al registro. El extractor no verifica criptografía. La procedencia nativa de GitHub mantiene su salida satisfactoria de GitHub CLI y sus controles de contenido.

`evidence-profile.json` identifica `sigstore-bundle-v0.3`, digest, fase y predicados. Registra configuración y observaciones estructurales, no un dictamen criptográfico independiente. Consérvalo con CycloneDX original, material de confianza y políticas aplicadas para la imagen inicial y `L01-update/`. Excluye claves y credenciales y verifica los hashes del paquete.

La metodología de veinte escenarios no cambia. R y G deben usar la misma revisión fuente fijada; R omite los controles experimentales de firma, atestación y admisión de G, manteniendo las comprobaciones ordinarias de Kubernetes y funcionamiento. Fija el perfil adoptado después de validar el piloto; no combines tiempos de desarrollo clásico con mediciones de campaña bundle. Adoptar bundles no acredita un nivel SLSA superior ni conformidad VSA completa.

La compatibilidad F07 alojada sigue sin demostrar tras la [investigación acotada](cases/F07/hosted-compatibility.md). La sonda preparada se ejecuta por separado después de la entrega normal; no acredita rechazo de admisión ni L01 positivo restaurado. No cambian confianza, caché, emisión ni F07 local.

## Verificación CI fresca y L04

`attestations_issue_delivery` realiza la firma programada. La barrera CI de solo
lectura recupera el inventario actual completo y autentica cada bundle antes de
aceptar digest, predicado y confianza de la vía. No acepta firmas guardadas ni
informes positivos anteriores. La emisión de resultados repite la barrera antes
de autorizar y autentica después el inventario autorizado. La procedencia nativa
GitHub utiliza el bundle descargado exacto y conserva identidad, origen,
certificados y marcas temporales exigidos.

Después de F11, la sustitución local sigue: firma → copia/eliminación F07 previa
a resultados → rechazo CI → restauración exacta → verificación fresca → emisión
y verificación normal de resultados → admisión, despliegue y HTTP de L01,
compartidos con L04. Durante el intento negativo pueden faltar resultados; SBOM
y procedencia deben seguir siendo válidos. El digest nuevo permanece en el mismo
repositorio de la ejecución. F07 de admisión sigue exigiendo las cuatro evidencias.

Solo el código 42 con inventario completo y evidencias restantes autenticadas
acredita `MISSING_IMAGE_SIGNATURE`. Confianza, registro, transporte o contenido
malformado son fallos de integración; la aceptación inesperada es desfavorable.
La recuperación conserva ambos errores. `L04-result.json` y
`F07-CI-completed.json` requieren superar el control positivo. Son registros
vinculados de una ejecución, no escenarios adicionales ni mediciones. Consulta el
[registro y los comandos](cases/L04/record.md).

## Diagnóstico controlado F08

F08 modifica un valor de firma ECDSA del reemplazo local, conserva DSSE/base64/DER
legibles, payload, material de verificación y demás artefactos. Publica blob y
manifiesto nuevos con tamaños y hashes recalculados y retira el referrer original
durante la comprobación negativa. Exige una única firma objetivo y mantiene las
políticas y confianza.

El gate conserva `verificationFailure` con predicado, estado del proceso y tipo
de fallo, sin autorizar tras un rechazo. F08 combina ese resultado con inventarios
actuales, aceptación original, confianza sin cambios, autenticación independiente
del resto y comparación criptográfica original/variante. Un mensaje genérico no
basta. La restauración exacta y verificación nueva preceden la continuación. La
admisión dirigida exige caché deshabilitada, políticas sin cambios, dry-run positivo,
rechazo exclusivo de la firma y aceptación real final de L04. Consulta el
[registro](cases/F08/record.md); F08 alojado sigue NOT_EXECUTED.

## Incremento F05 / F06 / L03

CI valida el esquema oficial CycloneDX 1.7 antes de firmar y tras autenticar el bundle exacto. Los requisitos del laboratorio y la asociación al digest siguen siendo controles separados. Kyverno comprueba campos seleccionados, no el esquema completo. L03 añade un componente real fijado a la imagen de sustitución; no demuestra completitud del inventario. Consulte el [procedimiento y límites](cases/F05-F06-L03/runbook.md).

## F09 / F10 / L05

CI y admisión exigen repositorio configurado, revisión exacta, tipo de construcción
y constructor de la modalidad. Constructor local:
`https://tfm-goldenpath.dev/builders/local-development`; hosted: identidad exacta del
workflow configurado. Los valores esperados proceden de configuración confiable.
La autenticación del bundle exacto precede a sus campos. F09 exige recuperación
completa y otras evidencias válidas; F10 exige que falle solo la autorización del
repositorio seleccionado. Otros fallos siguen siendo errores de integración.
L05 exporta fuentes reales de dos revisiones inmutables distintas. L01/L03 del mismo
commit no establece L05. Ver [procedimiento](cases/F09-F10-L05/runbook.md).

## F13 posterior a emisión / F14

Se conserva F13 previo a emisión/readiness como `F13Preissuance`. Tras autorizar
normalmente la imagen de reemplazo, F13 retira solo resultados y F14 reproduce
bytes P0 auténticos y exitosos sin P1 disponible. P1 sigue siendo `golden-path-v1`;
P0 es `laboratory-results-p0-fixture`, no una política histórica de producción.

CI autorizado distingue `MISSING_RESULTS` y `RESULTS_POLICY_VERSION_MISMATCH`
únicamente tras recuperación completa y validación de toda evidencia ajena.
Autentica los bytes exactos antes de evaluar campos. Otros campos inválidos,
duplicados o errores de verificación/registro siguen siendo errores de integración.
Kyverno exige la misma P1 y añade `RESULTS_POLICY_VERSION`. Cada ensayo requiere
denegación única de resultados, aislamiento, restauración exacta, CI fresco y
L01 del mismo digest con admisión, rollout y HTTP. Véanse [oráculo](cases/F13-F14/record.md)
y [comandos](cases/F13-F14/runbook.md). Barreras reales locales y negativos hosted:
NOT_EXECUTED; las brechas F09/F10/L05 de PR #26 permanecen abiertas. Se conserva el
predicado versionado del laboratorio sin afirmar conformidad VSA completa.

La emisión hosted reintenta únicamente el fallo observado al decodificar la
respuesta ambient-OIDC de GitHub antes de firmar: hasta tres intentos con esperas
de dos/cuatro segundos. `<bundle>.signing-attempt-N.log` conserva cada intento y
`<bundle>.signing.json` su estado final. Bundles existentes/parciales, señales de
firma/publicación y otros errores impiden reintentar. El éxito de firma sigue
exigiendo verificación criptográfica/de contenido y gate CI. Véase la
[auditoría de PR #27](../../registros/pr27_hosted_oidc_failure_ES.md); la recuperación
hosted real continúa pendiente.
