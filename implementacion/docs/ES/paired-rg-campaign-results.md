# Resultados de la campaña R/G de diez pares — 2026-10-04

[English](../EN/paired-rg-campaign-results.md) · [Protocolo](paired-rg-measurements.md) · [Preparación funcional](evaluation-readiness.md)

Se completaron **10/10 posiciones autorizadas**, secuencialmente y con revisión técnica automatizada antes del siguiente dispatch. El analizador existente informa **OBSERVED_ALL_POSITIONS**, diez pares favorables y cero exclusiones, reintentos, interrupciones o posiciones ausentes. Evaluación técnica e integridad: **PASS**. **La aceptación humana y la aceptación global siguen pendientes**.

## Fuente, autorización y evidencia

La fuente medida es [`895a3bde79089b7544c1dad76a6cd8f48eede0a8`](https://github.com/tfm-goldenpath/golden-path-lab/tree/895a3bde79089b7544c1dad76a6cd8f48eede0a8), PR #45 integrada. Esta documentación posterior no cambia la atribución de las mediciones. Desarrollo [RG 37199309814](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37199309814) y [GR 37200632844](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37200632844) superaron revisión técnica sobre esa fuente y aportan **cero muestras de campaña**.

Francisco aportó autorización explícita para diez pares exploratorios, semilla `final-campaign-895a3bd-v1`, orden **RG, RG, RG, RG, GR, GR, GR, RG, GR, GR**, publicación del plan y ejecución secuencial con revisión automatizada y condiciones de parada. La declaración conservada no autentica independientemente su identidad ni acepta los resultados. La [publicación exclusiva del plan 37202322661](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202322661) coincide con el control congelado y omitió las entregas.

- Plan vinculado: `16de58e45504e333d810d9f891ef740c91d997ed7300927628da8d79f21f73fc`.
- Control congelado: `15c7508d96b05751e9a0913674c03f1ee63f8ca80d989ae5b0a29c2ddb79dc26`.
- Base de RG `37199309814`, restaurada por GR de desarrollo y cada par: SHA256 de `trivy.db` `f684c51b045908383ef92b1ad55b1723e6f9db6cad7479602f3f51dae6b3c179`; de `metadata.json` `b13d003bf452cc52343ca98360433ae64e8657e258cf88c332b4ef551e9ca3d8`.

La [prerelease de evidencias](https://github.com/tfm-goldenpath/golden-path-lab/releases/tag/evidence-campaign-895a3bd-20261004), en la fuente medida, conserva ZIP originales de desarrollo/campaña, archivos de base, autorización congelada, logs, revisiones técnicas, la corrección inferior y análisis combinado más allá de la retención Actions (los artefactos originales caducan el 2026-11-03). Publica evidencias; no es una versión de software ni una decisión de aceptación. El [índice documental](../../registros/paired-rg-campaign-895a3bd.json) vincula runs, hashes ZIP originales y hashes publicados. La evidencia cruda queda fuera de Git.

## Observaciones

Segundos redondeados para lectura; el [JSON original del análisis](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/analysis.json) conserva precisión completa y campos de exclusión. Todos son intento original 1, conclusión GitHub `success`, revisión técnica y limpieza PASS.

| Posición | Orden | Run | R primario s | G primario s | G−R s |
|---|---|---|---:|---:|---:|
| 1 | RG | [37202413477](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202413477) | 5.548 | 52.255 | 46.707 |
| 2 | RG | [37202927807](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37202927807) | 5.523 | 49.643 | 44.120 |
| 3 | RG | [37203375745](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37203375745) | 6.443 | 68.885 | 62.442 |
| 4 | RG | [37203826554](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37203826554) | 6.178 | 57.804 | 51.627 |
| 5 | GR | [37204323164](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37204323164) | 6.127 | 56.830 | 50.703 |
| 6 | GR | [37204709536](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37204709536) | 5.859 | 53.308 | 47.449 |
| 7 | GR | [37205158171](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37205158171) | 6.005 | 67.881 | 61.876 |
| 8 | RG | [37205613639](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37205613639) | 7.941 | 66.495 | 58.554 |
| 9 | GR | [37206042810](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37206042810) | 7.953 | 66.600 | 58.647 |
| 10 | GR | [37206506779](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/37206506779) | 7.045 | 74.310 | 67.265 |

Mediana pareada G−R: **55.090 s**; incremento relativo mediano: **831.650%**. Desviación absoluta mediana de diferencias: **7.069 s**; rango **44.120–67.265 s**. Tiempo observado de jobs de pares: **55.717 minutos**. Minutos facturados y gasto desconocidos. No se eliminó ningún valor extremo.

El intervalo primario empieza inmediatamente antes de las pruebas de servicio de cada brazo y termina cuando vuelve el CREATE nuevo de Deployment con actor restringido, antes de interpretar la respuesta. G incluye provenance nativa y esperas entre pasos. Preparación compartida, rollout/HTTP, limpieza y empaquetado quedan fuera. El éxito funcional posterior es obligatorio y se comprueba por separado. El job completo incluye ambos brazos y trabajo compartido; no es coste facturado repartido entre R/G. Desarrollo y los 24 segundos de publicación del plan son preparación.

## Verificación y corrección conservada

En la fuente medida, `make -C implementacion doctor` y `make -C implementacion test` terminaron con exit 0, logs y fechas reales. La suite incluyó seis pruebas de entorno, 930 casos de servicio/unidad, 43 casos Python de políticas, 62 decisiones Conftest, grupos Kyverno de 36 y 14 y criptografía Cosign offline real. Cada intento alojado también ejecutó las regresiones comunes.

Se revisaron workflow/fuente/dataset/orden/intento, asociación brazo/archivo, configuración fijada y bytes reales de base; veinte imágenes/builders distintos y reutilización/reconstrucción de caché; controles R/G reales; imagen/SBOM/provenance nativa/resultados autenticados y ubicación nativa; políticas cargadas, CREATE fresco, rollout/HTTP, extremos monotónicos y limpieza propia. Totales: 360 hashes externos, 2020 internos, 30 de base, **920 comprobaciones técnicas que incluyen 110 invocaciones de validadores existentes**, 40 bundles distintos reautenticados y 2657 hashes de revisiones. No son muestras independientes. `paired-rg.py analyze` verificó de nuevo las diez exportaciones y restauró cada base archivada; exit 0. Se eliminaron las bases temporales restauradas.

Los snapshots de limpieza preceden la destrucción del clúster. Posiciones 3/5/6/8 conservan Pods completados con exit 0; posición 4 conserva un Pod ejecutándose con fecha de borrado durante el periodo de gracia. Los recibos posteriores de limpieza estricta y logs de eliminación de nodos/builders propios pasan; no se afirma consulta Kubernetes posterior a la destrucción. Una aserción adicional de revisión exigió incorrectamente que el snapshot previo de posición 4 ya estuviera completado. Se conserva su fallo y reconciliación con `paired-cleanup.sh` sin cambios en `logs/campaign-operations-20261004T122234Z-syFRKt/position-04-cleanup-supplement.json`. No se cambió original, temporizador ni control; no hubo reintento del workflow.

Se comprobó espacio durante preparación, descargas, restauración y cada revisión. Solo se eliminó una copia histórica restaurada redundante de base de 1,472,086,016 bytes, idéntica al archivo canónico conservado. Quedaron 6.555 GiB libres tras el análisis; no hubo Docker prune global. La publicación usó `/tmp`, en otro filesystem, para preservar la reserva del workspace.

## Descarga y revisión

```bash
# Run from the repository root; use a new directory on a filesystem with space.
df -h . /tmp
df -i . /tmp
EXPORT=$(mktemp -d /tmp/campaign-evidence-895a3bd.XXXXXX)
gh release download evidence-campaign-895a3bd-20261004 \
  --repo tfm-goldenpath/golden-path-lab --dir "$EXPORT"
(cd "$EXPORT" && sha256sum -c SHA256SUMS.txt)
# Follow PUBLICATION-README.md to extract, restore exports and re-analyze.
```

El paquete conserva originales sin cambios y revisiones derivadas separadas. Solo omite exportaciones expandidas duplicadas tras compararlas byte a byte con sus ZIP incluidos; el README de publicación detalla restauración y validadores existentes. Antes de extraer/analizar, prever aproximadamente 6 GiB para descarga/expansión/una base restaurada **además de** 6 GiB de reserva. Conservar hashes originales y usar un directorio nuevo para otro análisis. Algunos logs mantienen rutas absolutas originales de Codespaces; no se reescriben. Las entregas anteriores que indicaban publicación pendiente siguen siendo snapshots históricos.

## Límites y decisiones pendientes

- Diez pares balanceados fueron aprobados como exploratorios, sin garantía de precisión. El orden empieza por cuatro RG y no alterna.
- Se mide entrega legítima alojada; no se ejecutan todos los escenarios, reemplazos ni fixtures negativos. Negativos alojados no soportados siguen **NOT_EXECUTED**. Controles positivos compartidos no añaden muestras L01/L03/L04.
- Los blobs grandes de caché omitidos no se pueden restaurar independientemente desde estos paquetes. Se comprobaron manifiestos, recibos hash del runner y logs de build. Se repitieron validadores de bundles/contenido/políticas/respuestas; no se repitieron workloads ni todos los escaneos después.
- Ensayos funcionales, seis reparaciones conocidas, piloto histórico de cuatro pares y campaña conservan datasets y fuentes separados. Esfuerzo humano, calibración manual elegible y límites siguen aplazados. Scripts no se convierten en evidencia de productividad/calibración humana.
- Revisión humana de resultados y aceptación global pendientes. Otra campaña, cambio de fuente o reintento exige su propia decisión; la publicación y esta PR no la aportan.

La tesis deberá alinear fuente/muestra/orden y frontera temporal exactos, separar sobrecoste exploratorio de entrega de productividad y cobertura de veinte escenarios, y conservar fallos, casos no soportados y aceptación pendiente. No se editaron archivos de tesis. OpenAI Codex asistió ejecución, revisión técnica, publicación y documentación; Francisco aportó autorización de campaña/publicación. Revisión humana de resultados pendiente.
