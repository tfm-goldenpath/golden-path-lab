# Contratos de la primera entrega integrada

[Documentación en español](README.md)

[Guía principal en inglés](../EN/delivery-contracts.md). Los contratos e identificadores son únicos; este documento aporta su explicación en español.

La demostración utiliza una imagen `linux/amd64` de `quotes-node`, identificada por digest, para el recorrido de referencia R y el protegido G. Reutilizar esa imagen permite comparar el comportamiento funcional; **no constituye una pareja de medición temporal**. La [guía de ejecución](cases/L01-F13/runbook.md) contiene los comandos actuales y el [TODO](../../TODO.md) separa implementación y aceptación observada.

## Entradas, decisiones y evidencias

| Contrato | Comprobación implementada | Límite |
|---|---|---|
| Servicio | Salud, versión/commit y cotización sintética determinista; entradas inválidas rechazadas. | No representa un motor actuarial ni procesa datos personales. |
| Imagen | Referencia `@sha256`, misma imagen en análisis, firmas y despliegue; plataforma AMD64. | No evalúa ARM ni toda la semántica de índices multiplataforma. |
| Vulnerabilidades | Informe real de Trivy separado del SBOM; Conftest bloquea HIGH/CRITICAL aunque no exista corrección. | El resultado depende de los componentes identificados y de los datos disponibles para el analizador. |
| SBOM | CycloneDX JSON original y atestación Cosign; firma, tipo de predicado y sujeto coincidente. El validador local exige formato, versión, componente principal y una lista de componentes no vacía. | La comprobación estructural es parcial: no valida todavía todo el esquema oficial ni la exactitud o completitud semántica del inventario. |
| Firma de imagen | Verificación criptográfica y confianza definida según la vía. | Una firma válida no implica ausencia de vulnerabilidades ni de código malicioso. |
| Procedencia | Sujeto, tipo y origen esperado; contratos de construcción distintos en A y B. | No se declara SLSA Build L3 ni aislamiento frente al compromiso total del constructor. |
| Resultados | Predicado propio firmado, política `golden-path-v1`, origen y comprobaciones obligatorias con resultado PASS. | Es una declaración del proceso autorizado; no es una implementación conforme de VSA ni sustituye las verificaciones directas. |
| Admisión | Kyverno aplica reglas de ejecución, firma, SBOM, procedencia y resultados a las cargas del namespace protegido. | Se comprueban los recursos y operaciones del laboratorio; no toda la seguridad del clúster. |

## Procedencia local de desarrollo: vía A

Las verificaciones de imagen de Kyverno se ejecutan con su caché desactivada para que la secuencia F13 → emisión de resultados → L01 consulte las evidencias correspondientes. Trivy reutiliza su caché de descarga, conservando versión, metadatos y hash de la base empleada. Cada ejecución crea su constructor y una imagen con identificador propio. Estas condiciones sirven a la demostración funcional; la política de caché y el orden de las parejas de la campaña se fijarán según el protocolo experimental.

El script genera una declaración con forma de procedencia SLSA v1 y un `buildType` propio, `https://tfm-goldenpath.dev/buildtypes/local/v1`, y la firma con una clave efímera de desarrollo. Se conserva el repositorio declarado, el commit cuando está disponible, el identificador de ejecución y la huella de los archivos de origen seleccionados. Si no hay repositorio Git, cuarenta ceros identifican un commit no disponible y `gitCommitAvailable` es falso; la huella no transforma ese valor en un commit real.

Esta vía comprueba generación, almacenamiento, recuperación, firma y consumo del contrato local. La misma administración del laboratorio controla el entorno y su clave: no aporta una identidad OIDC alojada, una garantía independiente sobre lo declarado ni SLSA Build L3. El significado de los niveles y sus requisitos se contrasta con la [especificación SLSA](https://slsa.dev/spec/v1.2/).

## Procedencia nativa de GitHub: vía B

El workflow manual construye y publica la imagen candidata en GHCR. `actions/attest`, fijada por SHA, emite procedencia nativa de construcción y la publica como **SigstoreBundle** asociado al digest. La comprobación con GitHub CLI verifica firma, identidad exacta del workflow, emisor OIDC, repositorio, commit y referencia de origen. El validador posterior examina el JSON de una verificación satisfactoria; no verifica criptografía por sí solo. Kyverno recupera el bundle y aplica sus condiciones de procedencia directamente en admisión. [GitHub CLI](https://cli.github.com/manual/gh_attestation_verify), [action oficial](https://github.com/actions/attest), [Kyverno y Sigstore](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/).

Las firmas de imagen y las atestaciones de SBOM y resultados usan el formato clásico de Cosign fijado explícitamente mediante `--new-bundle-format=false`. La procedencia nativa usa el consumidor `SigstoreBundle`; no se presupone que ambos mecanismos se almacenen o recuperen de la misma manera. Las identidades y claves de A no autorizan B. El workflow actual no es un constructor aislado y reutilizable que permita afirmar automáticamente SLSA Build L3.

## Resumen propio de resultados y orden de aceptación

El tipo de predicado es `https://tfm-goldenpath.dev/attestations/verification-results/v1`. Contiene `policyVersion`, `source`, `result`, `checks` y las referencias con SHA-256 de las evidencias utilizadas. El orquestador lo genera después de que terminen satisfactoriamente las comprobaciones previas y sus validadores. La creación del JSON, por sí sola, no vuelve a ejecutar esas comprobaciones; su confianza depende del proceso autorizado que lo produce y firma.

Este diseño está **inspirado en la finalidad de VSA**, pero usa un contrato propio. No se atribuye conformidad con la [especificación Verification Summary Attestation](https://slsa.dev/spec/v1.2/verification_summary). La respuesta de admisión se registra después de emitir el resumen, evitando exigir como entrada el resultado del paso que se intenta autorizar. Kyverno conserva las comprobaciones directas de firma, SBOM, procedencia y configuración, además de verificar el resultado y la política del resumen.

F13 mantiene preparadas las restantes evidencias y omite únicamente ese resumen. La comprobación previa registra su ausencia y el ensayo dirigido de admisión debe identificar `tfm-results`/`require-results` como causa del rechazo. Tras emitir el resumen, L01 debe ser admitido y responder correctamente. F11 comprueba el rechazo de privilegios tanto temprano como en una actualización dirigida; estas comprobaciones no dan por cerrado el resto del catálogo ni sustituyen las futuras mediciones de campaña.
