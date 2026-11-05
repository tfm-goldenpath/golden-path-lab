# Fallo hosted de PR #27: respuesta OIDC antes de firmar el reemplazo

[Ejecución 36741081776, job 109975343289](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36741081776/job/109975343289),
commit `d39086cf0330801130d2c4beedd0c143c4b0ef3c`, laboratorio `run-NcTHN0Rh`.
Resultado global: **FAIL**. Véase el [registro completo](pr27_hosted_oidc_failure_EN.md).

A las `16:05:12Z` Cosign no pudo interpretar como JSON la respuesta al solicitar
el token de identidad GitHub para firmar la imagen de reemplazo:

```text
fetching ambient OIDC credentials: invalid character 'u' looking for beginning of value
```

No llegó a `Signing artifact...` ni produjo el bundle de imagen. El log no contiene
el estado HTTP ni la respuesta original: no demuestra si fue un fallo transitorio,
de autorización u otra respuesta no JSON. El diagnóstico DNS local previo no
explica por sí solo este error hosted.

Antes del fallo se observaron CI-delivery y CI-authorized VERIFIED para la imagen
inicial, rechazo F13 previo a emisión con inventario estable de tres referrers,
admisión/rollout/HTTP iniciales de L01 y rechazo dirigido F11 por su regla concreta.
La firma del reemplazo falló después. Autorización y rollout del reemplazo no se
alcanzaron; los negativos hosted posteriores a emisión F13/F14 siguen NOT_EXECUTED.
Esas observaciones parciales no convierten la ejecución completa en PASS.

## Corrección local acotada

El [proveedor GitHub de Cosign 3.1.3](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/providers/github/github.go)
reintenta errores de transporte, pero devuelve inmediatamente el error al decodificar
JSON. `scripts/lib/attestations.sh` añade hasta tres intentos idénticos de emisión
hosted, con esperas de dos y cuatro segundos, exclusivamente para ese fallo OIDC
antes de firmar. Exige exit 1, marcador de generación de claves, error específico,
ausencia de señales de firma/publicación y ausencia de bundle. No sobrescribe
evidencia existente y conserva cada intento y su estado final.

Otros fallos se propagan inmediatamente. No cambian firma local, confianza,
digest, procedencia nativa, certificados/transparencia, gates CI ni admisión.
Un intento exitoso sigue necesitando la verificación exacta del bundle y la
autorización. La corrección no demuestra que el problema externo sea transitorio
ni que haya quedado resuelto; requiere una ejecución hosted nueva.

## Evidencia y límites

`implementacion/evidence/raw/pr27-hosted-failure/` conserva log, ZIP y paquete del
artefacto `11109768266`. Se verificaron checksum del archivo y sus **153** hashes
internos. La auditoría de integridad no repite la verificación criptográfica.
`01-red.log` registra el fallo previo a implementar; `02-focused.log`, **46/46**
pruebas enfocadas; `03-suite.log`, la suite compartida final; `audit.json`, la
integridad y la barrera de fallo observada.

Los tests usan respuestas sintéticas del proceso Cosign y ejecutan el helper real,
incluida la emisión normal de resultados. Comprueban límites, argumentos, bundles
parciales/existentes, fallos ajenos, marcadores de publicación, códigos de
interrupción y verificación obligatoria. No prueban recuperación OIDC en GitHub.
No se despachó un workflow remoto. Se mantienen las brechas F09/F10/L05 y los
negativos hosted F13/F14 pendientes.

| Actividad | Asistencia | Revisión humana | Decisión final |
|---|---|---|---|
| Auditoría, reintento acotado, regresiones y registro EN/ES | OpenAI Codex, GPT-6 | Pendiente | Pendiente |

## Verificación local final

La suite compartida final terminó con exit 0: **732/732** pruebas de servicio/unitarias,
**6/6** de entorno, **33** Python de políticas, **52/52** decisiones Conftest,
**9/9** Kyverno runtime, **18/18** y **14/14** sobre archivos reales, y todas las
pruebas Cosign offline. El recuento Python incluye renderer redescubierto por el
adaptador existente. No son recuentos de escenarios ni de campaña.

Corrección en `fix/hosted-oidc-token-response`; la revisión humana y la validación
hosted siguen pendientes. No se volvió a ejecutar el workflow. SHA-256 del archivo:
`59e6b9d1f08e63aa3c1bc9f78887272bd4d18a1350dc7ee48f4b0e84ccdf660d`.
