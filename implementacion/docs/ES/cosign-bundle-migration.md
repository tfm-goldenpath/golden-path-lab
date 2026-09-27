# Propuesta de migración al formato bundle de Cosign

[Documentación en español](README.md) · [English version](../EN/cosign-bundle-migration.md)

**Estado: mejora futura, pendiente de decisión e implementación.** Este documento recoge el alcance de una posible migración con Cosign 3.1.3 y Kyverno 1.19.1. La revisión del código y las comprobaciones sintéticas no acreditan una integración criptográfica completa ni una campaña experimental.

## Base actual y objetivo

La base conserva el formato clásico para las firmas de imagen y las atestaciones emitidas con Cosign. La configuración compartida de firma ya incluye `--new-bundle-format=false` y `--use-signing-config=false`; la propuesta no describe esas opciones como un fallo pendiente. La procedencia nativa de GitHub utiliza su consumidor `SigstoreBundle`. Los [contratos de entrega](delivery-contracts.md) describen esta combinación.

La mejora consistiría en adoptar el formato bundle de Cosign para las evidencias propias, conservando las condiciones exigidas: firma válida, identidad autorizada, digest correcto, tipo y esquema admitidos, política compatible y resultado satisfactorio. La migración debe abarcar publicación, descubrimiento, verificación, admisión y conservación de evidencias; retirar dos opciones del comando no demuestra su compatibilidad.

## Hallazgos de la revisión

| Aspecto | Hallazgo y consecuencia |
| --- | --- |
| Inventario de F13 | La ejecución alojada `36277828157` confirmó el rechazo de un inventario mixto: procedencia GitHub en bundle v0.3 y SBOM clásico. La corrección de la base normaliza `dsseEnvelope` y mantiene la validación existente; no modifica firma ni admisión. |
| Salida de verificación | El código de Cosign indica que la salida de `verify-attestation` puede conservar una representación consumible por parte de los validadores actuales. Debe comprobarse con salidas reales; el inventario descargado y la salida de una verificación satisfactoria no son intercambiables. |
| Admisión con ClusterPolicy | El adaptador clásico y el adaptador `SigstoreBundle` son recorridos distintos. El segundo tiene soporte de clave pública e identidad keyless; su existencia no acredita que las políticas actuales seleccionen o configuren ese recorrido correctamente. |
| Vía A sin registro de transparencia | Para el futuro perfil bundle local, el recorrido inspeccionado requiere revisar conjuntamente `keys.rekor.ignoreTlog: true` y `keys.ctlog.ignoreSCT: true`. La omisión del segundo puede exigir evidencia temporal que la firma local sin registro no aporta. Esta configuración se limita a la vía A. |
| Firma de imagen independiente | Una verificación genérica de bundles puede aceptar otro predicado firmado para la imagen. Se debe exigir específicamente `https://sigstore.dev/cosign/sign/v1` para conservar el control de firma independiente del SBOM, la procedencia y los resultados. |
| Vía B | Deben conservarse identidad OIDC autorizada, confianza del certificado y verificación de transparencia. La compatibilidad con los servicios y sellos temporales seleccionados por la configuración de firma de Cosign requiere una comprobación real; no se resolverá desactivando controles de B. |
| ImageValidatingPolicy | Ofrece otra ruta con detección de bundles. Cambiar de familia de políticas no es un requisito demostrado de esta migración y tampoco garantiza, por sí mismo, distinguir una firma de imagen de otro predicado válido. |

La [ejecución alojada 36277828157](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36277828157/job/108503864945) confirmó este fallo tras completar la firma y verificación. La corrección acepta DSSE clásico y bundles de atestación `application/vnd.dev.sigstore.bundle.v0.3+json`, conserva las comprobaciones de digest, predicado y SBOM y rechaza estructuras malformadas, ambiguas o no admitidas. Los resultados encapsulados para el digest esperado siguen impidiendo atribuir F13 a su ausencia. El material de verificación debe seleccionar exactamente una estructura de certificado, cadena de certificados o identificador de clave pública; también se comprueban estructura, tipos y codificación de bytes de los registros y sellos temporales según la [definición v0.3](https://github.com/sigstore/protobuf-specs/blob/main/protos/sigstore_bundle.proto). Estas comprobaciones no autentican la entrada ni validan la confianza del certificado. Se reproduce el inventario original sin conexión, comprobando previamente el hash del archivo conservado; esto no demuestra la finalización de los controles de admisión posteriores.

Las bases técnicas son el [descargador de Cosign 3.1.3](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/download/attestation.go), sus [tipos de predicado](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/types/predicate.go), el [verificador ClusterPolicy de Kyverno 1.19.1](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/verifier.go), su [adaptador Sigstore](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/sigstore.go) y la [construcción de opciones del motor](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/engine/internal/imageverifier.go). Para la alternativa, consultar el [verificador ImageValidatingPolicy de la misma versión](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/ivpol/cosign/verifier.go).

## Hallazgo sobre certificados y corrección de la base

El registro alojado posterior (`run-ZiAOuAck`) alcanzó la admisión tras superar la verificación CLI y el inventario de F13. Kyverno rechazó la firma y las atestaciones con `x509: certificate signed by unknown authority`. F13 se detuvo correctamente: no se había aislado la ausencia de resultados. Ese registro, por sí solo, no identifica el emisor X.509 ni demuestra qué cadena de CA estaba publicada.

La revisión de versiones fijadas explica el riesgo de compatibilidad. El [adaptador clásico de Kyverno 1.19.1](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/cpol/cosign/cosign.go) descarta el conjunto de certificados intermedios devuelto por `FulcioRoots()`. Su [verificador Cosign 3.1.2](https://github.com/sigstore/cosign/blob/v3.1.2/pkg/cosign/verify.go) puede recuperarlos de la cadena adjunta, excluyendo su último certificado del conjunto de intermedios y manteniendo las raíces configuradas por el verificador. Por otra parte, la [extracción de certificados de Cosign 3.1.3](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/signcommon/common.go) puede obtener únicamente el certificado firmante del bundle interno utilizado en la firma keyless; su conversión a la [firma clásica](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/sign/sign.go) y la [atestación clásica](https://github.com/sigstore/cosign/blob/v3.1.3/cmd/cosign/cli/attest/attest.go) carece entonces de la cadena intermedia. Añadir únicamente `--certificate-chain` no resuelve esa ruta de clave efímera.

La corrección implementada conserva políticas y formatos. En B, el módulo de firma ejecuta `cosign trusted-root create --with-default-services` para exportar material obtenido por el cliente TUF autenticado de Cosign; esa copia también se utiliza en la firma/verificación CLI. [complete-classic-chain.mjs](../../scripts/complete-classic-chain.mjs) selecciona la cadena Fulcio correspondiente a cada certificado y completa exclusivamente la anotación pública `dev.sigstore.cosign/chain` de los manifiestos auxiliares `.sig`/`.att`, con los intermedios primero y la raíz al final. Rechaza certificados sin correspondencia, cadenas existentes divergentes y cambios concurrentes observados.

Conserva contenidos firmados, firmas, certificados, evidencia Rekor, digests de capas/configuración y digest de la imagen. Cambia el digest del manifiesto auxiliar cuya anotación se completa. Los informes `image-chain.json`, `sbom-chain.json` y `results-chain.json` conservan manifiestos y huellas anteriores/posteriores, junto con `sigstore-trusted-root.json`. La raíz adjunta **no** se incorpora como raíz de confianza. Siguen siendo obligatorias la identidad OIDC, la transparencia, la verificación criptográfica y la admisión. La vía local y la procedencia nativa de GitHub permanecen iguales. La comprobación de lectura previa a escritura no es un bloqueo atómico: el adaptador se limita al digest distinto por ejecución, sin publicadores paralelos sobre ese mismo digest.

Esta corrección de compatibilidad es independiente de la migración. El consumidor bundle emplea otra ruta y podría evitar la omisión clásica, pero el formato no establece por sí solo la confianza. El [verificador ImageValidatingPolicy](https://github.com/kyverno/kyverno/blob/v1.19.1/pkg/image/verifiers/ivpol/cosign/verifier.go) detecta bundles a nivel de imagen: la procedencia GitHub ya existente puede afectar a esa selección aunque otras evidencias sigan siendo clásicas. Por ello, cambiar únicamente la familia de políticas requiere un ensayo de inventario mixto.

Las pruebas de regresión utilizan certificados generados con firmas reales y un registro simulado; las de escenarios impiden contabilizar errores de certificados/integración como detección de F13/F11. También se comprobó una exportación real del material de confianza con Cosign 3.1.3. Esto no acredita publicación en GHCR ni admisión completa. Docker no estaba disponible durante esta corrección; queda ejecutar la secuencia de la [guía](cases/L01-F13/runbook.md) sobre una rama publicada y conservar el commit exacto. Puede iniciarse un nuevo workflow en esa rama antes del merge; repetir una ejecución antigua conserva su commit original.

**Observación alojada posterior:** la [ejecución 36303967179](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36303967179/job/108576831438), en `fix/fulcio-chain` y commit `1ae111fc6e1614b32ee86461771836ada60e1d42`, superó la preparación y verificación de cadenas. Kyverno rechazó F13 únicamente por el predicado de resultados ausente y admitió L01 tras emitir los resultados; el despliegue quedó disponible y superó la comparación funcional. También rechazó F11 en `/securityContext/allowPrivilegeEscalation/`. El resultado global sigue siendo **FAIL**: el clasificador interpretó el `to:` del preámbulo UPDATE de kubectl como una política antes de leer el bloque real de rechazo. La corrección del analizador limita la interpretación a ese bloque y conserva la comprobación exacta del motivo. La actualización legítima final y el PASS global necesitan una nueva ejecución alojada; no se reclasifica el intento fallido como satisfactorio. La migración a bundles sigue aplazada.

## Impacto previsto en el repositorio

| Componente | Tipo de cambio | Alcance |
| --- | --- | --- |
| [Firma y atestaciones](../../scripts/lib/attestations.sh) | Necesario | Seleccionar y documentar el nuevo perfil; revisar emisión, publicación, recuperación y verificación en A y B. |
| [Adaptador de cadena clásica](../../scripts/complete-classic-chain.mjs) | Necesario al migrar | Retirar sus llamadas tras verificar realmente los bundles. Sustituir sus informes por bundles originales y evidencia de confianza; no aplicar el adaptador clásico a bundles ni utilizarlo como alternativa silenciosa que oculte errores. |
| [Inventario de F13](../../scripts/check-missing-results.mjs) y [pruebas](../../tests/unit/missing-results.test.mjs) | Base corregida; ampliación condicionada | Conservar el soporte clásico/v0.3 y las pruebas mixtas. Validar las futuras representaciones de firma de imagen y otros bundles con salidas reales, sin confundir ausencia con entrada malformada o error de recuperación. |
| [Generador Kyverno](../../policies/kyverno/render.py) y [pruebas](../../tests/policies/test_render.py) | Necesario | Seleccionar el consumidor bundle, mantener predicados independientes y adaptar la confianza local sin extender sus excepciones a B. |
| [Opciones de compatibilidad](../../tools.lock.json) | Necesario | Sustituir `compatibility.cosignClassic` y su justificación por la configuración efectivamente adoptada. La versión de Cosign ya es 3.1.3. |
| [Validadores de contratos](../../scripts/lab-contracts.mjs) y [adaptador GitHub](../../scripts/github-attestation.mjs) | Condicionado | Cambiar solo si la salida verificada real modifica las entradas que consumen; conservar la separación entre verificación criptográfica y validación de contenido. |
| [Empaquetado](../../scripts/package-evidence.py) y [pruebas](../../tests/unit/packaging.test.mjs) | Condicionado | Conservar los nuevos ficheros y sus hashes si cambia la representación, manteniendo las exclusiones de claves y credenciales. |
| [Workflow alojado](../../../.github/workflows/golden-path.yml) y [orquestación](../../scripts/demo.sh) | Condicionado | Ajustar parámetros o recogida de evidencias solo si lo exige la integración; no ampliar permisos por defecto. |
| [Contratos EN](../EN/delivery-contracts.md), [contratos ES](delivery-contracts.md) y [README de políticas](../../policies/README.md) | Necesario | Reemplazar las afirmaciones explícitas sobre formato clásico y describir productor, representación, consumidor y confianza de cada evidencia. |
| Planes, arquitectura y guías L01/F13 en [EN](../EN/README.md) y [ES](README.md) | Condicionado | Actualizar las explicaciones de almacenamiento, inventario y diagnóstico que cambien. Mantener comandos públicos cuando sigan siendo válidos. |

Los ocho PR de incorporación de la base constituyen un antecedente ya revisado. La migración tendría su propio PR y registro de validación. No se reescribirán sus descripciones ni los [registros históricos](../../registros/) como si hubieran utilizado el formato nuevo.

## Relación con la memoria

La metodología y la selección de los veinte escenarios se basan en propiedades de seguridad, no en el almacenamiento clásico de Cosign. No necesitan una reformulación por este cambio. CycloneDX seguirá siendo el SBOM obligatorio, conservado como fichero original y dentro de una atestación; el resumen seguirá siendo un contrato propio inspirado en VSA, sin atribuir conformidad completa.

Cuando exista una decisión implementada y verificada, bastará con explicarla en el capítulo de resultados, dentro de integridad y evidencias del proceso de entrega y admisión en Kubernetes. Se identificarán representación, versiones, consumidores, límites y evidencia obtenida. La versión personal de la memoria mantiene su edición independiente; no se presupone una sincronización automática con la principal.

F13 seguirá comprobando ausencia del resumen y F14 una política no admitida. F07 deberá seguir detectando la ausencia de la firma de imagen aunque las demás atestaciones sean válidas. Estos criterios no deben relajarse para conseguir que la migración pase.

## Alcance de las comprobaciones disponibles

La revisión previa incluyó **ocho diagnósticos sintéticos del inventario**, **once pruebas unitarias del auxiliar** y **diez pruebas de generación de políticas**. Estos resultados permiten identificar incompatibilidades de representación y comprobar el comportamiento de los auxiliares, no demostrar firmas reales ni la aceptación de bundles por un clúster.

No se ejecutó Docker para esta revisión ni una integración completa de A o B. Tampoco se realizó una campaña nueva, una verificación alojada de identidad o una medición de sobrecarga. Las salidas sintéticas no deben reutilizarse como evidencias experimentales de esas propiedades.

## Secuencia de una futura migración

- [ ] Fijar el perfil de bundle, publicación, recuperación y confianza para cada vía con las versiones seleccionadas; registrar la decisión y las referencias.
- [ ] Preparar fixtures nuevos de inventarios clásicos, bundles y mezclas; incluir entradas malformadas, digest ajeno y ausencia o presencia del predicado requerido.
- [x] Corregir el inventario mixto actual de F13 y añadir pruebas antes de cambiar el flujo de firma. Sigue pendiente repetir la integración alojada completa y validar las representaciones adicionales de la futura migración.
- [ ] Adaptar firma, verificación y políticas, exigiendo el predicado de firma de imagen separado de SBOM, procedencia y resultados.
- [ ] Retirar la corrección de anotaciones clásicas del recorrido migrado y comprobar expresamente la cadena de confianza autenticada sin depender de manifiestos clásicos residuales.
- [ ] Verificar realmente la vía A con clave de desarrollo: publicación y recuperación de bundles, aceptación de L01 y rechazo de F13 por el motivo previsto.
- [ ] Comprobar F07 con las demás atestaciones válidas y sin el predicado de firma; comprobar firma alterada, clave o identidad no admitida y digest incorrecto.
- [ ] Verificar la vía B en GitHub Actions y GHCR con identidad OIDC real, transparencia y evidencia temporal válida, incluyendo L01 y F13 ante Kyverno.
- [ ] Comprobar que errores de recuperación o verificación detienen el paso obligatorio y se distinguen de un rechazo por política.
- [ ] Confirmar que la aceptación utiliza bundles reales y que ninguna evidencia clásica residual o caché oculta una incompatibilidad; el perfil no debe recurrir silenciosamente al formato anterior.
- [ ] Revisar el paquete generado, conservar la versión y sus evidencias fuera del entorno temporal, actualizar las guías y registrar el resultado observado.
- [ ] Fijar una nueva revisión antes de evaluar. Conservar las ejecuciones anteriores sin mezclar mediciones de formatos distintos dentro de una misma campaña.

La mejora permanecerá pendiente hasta completar estas comprobaciones. La compatibilidad deducida del código de las herramientas justifica realizar el piloto; no sustituye sus resultados.
