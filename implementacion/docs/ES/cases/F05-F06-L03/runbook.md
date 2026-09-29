# Familia SBOM: F05 / F06 / L03

Desde la raíz del repositorio, en Linux/Codespaces:

```bash
make -C implementacion setup-validation
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion test
make -C implementacion demo
```

`demo` requiere Docker y crea recursos temporales kind/zot/Kyverno del ensayo.
L03 añade el componente real y fijado `is-number@7.0.0` mediante una imagen fixture;
el servicio no lo importa y conserva su comportamiento. Se retienen ambos
contextos de construcción, los informes Trivy originales y evidencia propia de
cada digest. La regla HIGH/CRITICAL permanece obligatoria.

La validación completa utiliza el esquema oficial CycloneDX 1.7, dialecto
draft-07, Ajv y extensiones de formatos fijados. Los esquemas oficiales y sus
referencias se resuelven localmente y se comprueban por SHA-256. No se descargan
URLs `$schema` aportadas por el documento. CI valida antes de firmar y después de
autenticar el bundle exacto. Los informes identifican esquema, validador,
documento y resultado. Kyverno comprueba firma, sujeto y campos seleccionados;
**no** realiza validación completa del esquema.

Se distinguen validez del esquema, requisitos adicionales del laboratorio,
autenticidad, asociación al digest y observación del cambio conocido. Ninguna
combinación de estos controles demuestra la integridad completa del inventario.

F05 retira exclusivamente la atestación SBOM, con recuperación instalada antes
de mutar. Exige recuperación completa y estable del registro y autenticación de
la evidencia restante. Un fichero CycloneDX local no sustituye la atestación.
F06 presenta los mismos bytes del bundle auténtico de la otra imagen: solo cambia
la asociación OCI no firmada. El consumidor conserva los bytes y la causa de
discrepancia de sujeto en el punto de rechazo; no se afirma que alcance Cosign.
Un diagnóstico independiente autentica el donante con su digest original.

Tras cada fallo se restaura exactamente el conjunto original y se repite CI.
Los errores primarios y de recuperación se guardan por separado. INT/TERM activa
la recuperación; SIGKILL o pérdida del host requiere los respaldos conservados.
La autorización solo se emite después de recuperar y superar los controles.
La admisión dirigida se prueba tras emitir resultados, con actor restringido,
caché deshabilitada, control positivo y rechazo exclusivo atribuible al SBOM.
Errores genéricos de registro, transporte o certificado no prueban detección.

El paquete incluye `L01-update/F05-CI`, `F06-CI`, `F05-admission`,
`F06-admission`, informes de esquema, bytes OCI, autenticación del donante,
recuperación y resultados L03. Se auditan la suma del archivo y todos sus hashes
internos, además de la evidencia firmada relevante. L01/L03/L04 comparten una
ejecución: no son observaciones independientes ni mediciones de campaña.

F05/F06 negativos alojados: **NOT_EXECUTED**. No se amplían permisos GHCR ni se
activa la sonda diferida. Consulte el [procedimiento detallado EN](../../../EN/cases/F05-F06-L03/runbook.md)
y los registros [F05](../../../EN/cases/F05/record.md),
[F06](../../../EN/cases/F06/record.md) y [L03](../../../EN/cases/L03/record.md)
para resultados reales, limitaciones y revisión humana pendiente.

## Observación inicial antes de revisar la red

La batería completa pasó: 510 pruebas de servicio/unidad, 6 de entorno, 16 de
políticas Python y comprobaciones Conftest, Kyverno CLI y Cosign real. El ensayo
`run-DknjtwWd` se detuvo por DNS de BuildKit en la red kind antes de construir la
imagen inicial. F05/F06 en registro y admisión, y la aceptación integrada de L03,
permanecen **NOT_EXECUTED**. Una prueba suplementaria con el constructor Docker
del host confirmó el cambio real de componente, ambos esquemas y firmas SBOM
asociadas a los digests; no sustituye la integración. Véase el
[registro de validación EN](../../../../registros/f05_f06_l03_validation_EN.md).

## Integración local completada tras revisar la red

**`run-nWpDa9ZN` pasó**: F05/F06 rechazados en CI y admisión Kyverno, restauración
exacta y aceptación compartida L01/L03/L04 con despliegue y respuesta HTTP correctos.
F06 conservó los bytes auténticos del donante en el rechazo temprano por sujeto;
la verificación independiente no significa que el consumidor objetivo alcanzase
Cosign. F07/F08/F13/F11 también pasaron. Se auditaron 776 hashes del paquete,
108 bundles válidos y dos rechazos esperados de F08.

La causa de DNS fue la coexistencia de reglas legacy FORWARD DROP y el backend
nftables de Docker. Con aprobación explícita, un wrapper permitió temporalmente
tráfico saliente del puente kind y respuestas establecidas. Al terminar retiró
sus dos reglas y verificó que la cadena original quedaba restaurada. El repositorio
no cambia la política del firewall; nuevas ejecuciones necesitan conectividad
correcta o aprobación equivalente. Se conservan los intentos fallidos. Las pruebas
negativas alojadas siguen NOT_EXECUTED y la revisión humana permanece pendiente.

[Explicación del firewall, recuperación y propuesta a largo plazo](../../kind-network-firewall.md).
