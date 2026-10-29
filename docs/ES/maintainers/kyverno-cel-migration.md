# Migración de Kyverno a CEL — bloqueo de capacidades

El [registro único de migración](../../EN/maintainers/kyverno-cel-migration.md)
contiene la matriz de equivalencia, versiones, fuentes, observaciones y pasos
pendientes. La rama parte de `e0fbe6490794b0da679777d465117a43bdb482ad`, después
de PR64. **La migración está bloqueada y la PR debe permanecer en borrador.**

Kyverno 1.19.2 ofrece las APIs estables `policies.kyverno.io/v1`, pero su
verificador Cosign para ImageValidatingPolicy intenta la ruta clásica cuando no
encuentra bundles utilizables. La CRD no permite exigir exclusivamente bundles.
La prueba local observó peticiones reales a `.att`; ese caso terminó en rechazo,
por lo que no se afirma una aceptación indebida. La función genérica de firma
sí acepta otros predicados firmados; la selección explícita de sign/v1 rechaza
la firma independiente ausente. No hay una versión publicada compatible
verificada que resuelva el bloqueo del formato.

El renderer, los adaptadores, clasificadores y lectores históricos conservan su
comportamiento. ClusterPolicy sigue siendo la ruta activa: no se presenta una
migración parcial como completada ni se relaja la confianza. No se modifican
oráculos, escenarios, Actions ni el dashboard.

Con las herramientas fijadas, sin otro laboratorio activo y un directorio de
salida nuevo:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
export GP_SOURCE_REPOSITORY=https://github.com/tfm-goldenpath/golden-path-lab
make -C implementacion setup-validation
make -C implementacion doctor
python3 -I -S implementacion/tests/integration/kyverno-cel-capabilities.py \
  --admission --output implementacion/evidence/environment/kyverno-cel/fresh-probe
```

El código **2** identifica el bloqueo de fallback observado. Un error del probe
o de infraestructura no cuenta como detección. Los predicados son sintéticos,
con firmas reales y registro local: no autorizan una entrega. La opción
`--admission` crea y retira un único kind; requiere al menos 8 GiB libres para
conservar la reserva de 3 GiB y el margen existente. No usa DB de Trivy.

No se han validado `deliver`, `demo`, `vulnerabilities` ni la vía B con una
migración CEL. Tampoco se afirma L01/L05, catálogo completo o aceptación humana.
Una futura validación alojada necesita autorización concreta y el SHA/ref exacto;
la ejecución de PR64 no sirve como evidencia CEL.

Para adoptar la migración cuando se desbloquee, retira los recursos propios de
la preparación anterior mediante su coordinador, preserva su paquete y prepara
un laboratorio nuevo. Consulta `validatingpolicies.policies.kyverno.io` e
`imagevalidatingpolicies.policies.kyverno.io`, conserva estado/diagnósticos y
comprueba la ausencia de ClusterPolicy activas del Golden Path. Volver a una
revisión anterior exige otro entorno nuevo, sin mezclar preparaciones selladas.
No se automatiza una migración en caliente. La actualización general de Actions
queda como incremento separado.
