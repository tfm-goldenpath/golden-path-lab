# Revisión de ejecución del piloto pareado R G

[English](../EN/paired-rg-pilot-review.md) · [Protocolo](paired-rg-measurements.md) · [Estado actual](../../TODO.md)

## Resultado y condiciones fijas

El **piloto temporal automatizado del carril B está completo**: el 2026-10-02 se
realizaron cuatro pares secuenciales en el orden almacenado GR, GR, RG, RG. Cada artefacto se revisó antes del siguiente lanzamiento. Los cuatro intentos son
**valid-favorable**: 4/4 incluidos, 0 excluidos/incompletos/reintentados. Ningún
problema de instrumentación impidió interpretar los resultados. Aceptación humana pendiente.

`main` remoto coincidía con `02674a57d290083648a9af44c48fd049808b2d70` antes de cada
lanzamiento y al terminar la serie. Todos usaron `dataset=pilot`, ese
`expected_source` exacto y `database_run=36926824792`. Guardas, controles, versiones, criterios y plan se mantuvieron. Las ocho imágenes
independientes tuvieron digests distintos; coincidieron locks y hashes de políticas
en todos los brazos. Los runners tenían cuatro CPU, unos 16.8 GB de RAM y Docker
28.0.4; se conservan las versiones efectivas.

## Observaciones individuales y consumo

El intervalo principal va desde antes de las pruebas del servicio hasta la
respuesta de CREATE nuevo de Deployment mediante el actor restringido. Incluye
la procedencia nativa G y los intervalos entre pasos de Actions. Rollout, HTTP,
empaquetado y limpieza son posteriores. El sobrecoste relativo es
`100 × (G−R) / R`. Las tablas redondean; JSON/CSV conservan la precisión completa.

| Par | Ejecución | Orden | R segundos | G segundos | G−R segundos | Sobrecoste % | Minutos de job |
|---|---|---|---:|---:|---:|---:|---:|
| 1 | [36964061878](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36964061878) | GR | 6.618 | 68.689 | 62.072 | 937.986 | 5.833 |
| 2 | [36964593732](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36964593732) | GR | 5.211 | 53.818 | 48.607 | 932.807 | 5.250 |
| 3 | [36965104583](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36965104583) | RG | 7.034 | 69.158 | 62.124 | 883.240 | 5.550 |
| 4 | [36965606734](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36965606734) | RG | 5.910 | 50.405 | 44.494 | 752.805 | 5.417 |

| Medida | Mediana | Desviación absoluta mediana | Rango |
|---|---:|---:|---:|
| R segundos | 6.264 | 0.562 | 5.211–7.034 |
| G segundos | 61.254 | 7.670 | 50.405–69.158 |
| G−R pareado, segundos | 55.339 | 6.759 | 44.494–62.124 |
| Sobrecoste pareado % | 908.023 | 27.373 puntos porcentuales | 752.805–937.986 |

Los jobs terminados consumieron **22.050 minutos observados** en total, con mediana
5.483 y rango 5.250–5.833 minutos. Se calculan mediante `started_at` y `completed_at`
de cada job e incluyen preparación y ambos brazos. Dependencias, regresiones
compartidas y preparación de infraestructura/cachés/disponibilidad registraron
171.297, 167.104, 165.479 y 176.303 segundos, por orden de par, fuera de los
intervalos principales. No se asignan los costes compartidos a R o G.
**Los minutos facturados y el gasto monetario son desconocidos.**

## Desglose de G y prioridades de optimización

Los cuatro `pair.json` originales aportan las duraciones siguientes: **4/4 pares
incluidos, ninguno excluido**. Las medias aritméticas permiten sumar las
contribuciones; cada porcentaje divide la suma de esa fase por la suma de los
intervalos principales G. Son tiempos transcurridos, no consumo facturado ni
tiempo de CPU.

| Fase de G | Media segundos | Rango segundos | Porcentaje del tiempo principal |
|---|---:|---:|---:|
| Autorización de resultados (`authorize-results`) | 19.08 | 15.40–22.64 | 31.5% |
| Firma y verificación de entrega (`verify-delivery`) | 16.29 | 13.77–18.55 | 26.9% |
| Admisión del Deployment | 7.87 | 6.01–10.48 | 13.0% |
| Generación de SBOM y análisis de vulnerabilidades | 5.51 | 4.94–6.14 | 9.1% |
| Construcción y publicación de imagen | 5.22 | 4.19–6.53 | 8.6% |
| Emisión de procedencia nativa de GitHub | 5.19 | 3.69–5.88 | 8.6% |
| Pruebas del servicio, políticas iniciales, manifiesto e intervalos restantes | 1.36 | — | 2.2% |
| **Total principal** | **60.52** | **50.40–69.16** | **100%** |

El último componente incluye el residuo entre el intervalo principal y las fases
registradas. Rollout y HTTP promedian **12.35 s** y **1.16 s**, respectivamente,
después del extremo principal; ninguno está incluido en la tabla.

**La verificación de entrega y autorización de resultados representan el 58.4%
del tiempo principal G.** Sus nombres agrupan varias operaciones:
`verify-delivery` firma y verifica bundles de imagen/SBOM y ejecuta la
comprobación fresca de entrega; `authorize-results` repite una comprobación fresca
antes de emitir, firma/verifica resultados, recupera el inventario autorizado y
ejecuta la comprobación final. Véase la
[implementación](../../scripts/lib/attestations.sh). Los logs actuales no miden
esas operaciones por separado, por lo que no permiten atribuir este coste a
GHCR, servicios de firma o verificadores criptográficos individuales.

Los logs de Kyverno permiten reconstruir intervalos dentro de la admisión del
Deployment:

| Verificación de evidencia | Media segundos | Rango segundos |
|---|---:|---:|
| Firma de imagen | 2.01 | 1.39–2.93 |
| Procedencia | 1.95 | 1.37–2.53 |
| SBOM | 1.92 | 1.42–2.49 |
| Resultados | 1.86 | 1.43–2.41 |

En cada ejecución se emparejan `verifying image signatures` e `image attestations
verification succeeded` por política, imagen G exacta y `Deployment/quotes-node`
en `tfm-golden`, dentro del intervalo registrado de admisión. Cada política tiene
un único par inicio/éxito; los intervalos no se solapan. Se excluye la admisión de
Pods posterior al extremo principal. Estos intervalos derivados del log incluyen
recuperación y verificación; no separan red y CPU. Ningún requisito de evidencia
domina claramente estas cuatro observaciones.

Seguimiento recomendado, sujeto a una revisión posterior separada:

1. Añadir tiempos por operación dentro de `authorize-results` y `verify-delivery`:
   recuperación del inventario, firma/publicación y cada verificador de evidencia.
2. Evaluar verificación paralela acotada de bundles independientes dentro de cada
   comprobación fresca. El [verificador actual](../../scripts/ci-verification-gate.mjs)
   los procesa secuencialmente. Conservar recuperación fresca, vinculación al
   bundle exacto, clasificación de errores y aprobación de todas las comprobaciones
   obligatorias antes de autorizar. El ahorro potencial sigue sin medirse.
3. Dar menor prioridad a las políticas iniciales de workflow/manifiesto: juntas
   promedian solo **0.18 s**. Conservar este piloto como referencia de cualquier
   comparación futura; aquí no se probó ningún cambio de controles o instrumentación.

## Revisión de evidencias

Se verificaron los digests de los cuatro ZIP originales de GitHub, **140 hashes
externos, 808 hashes internos de paquetes** y cuatro archivos de base de datos
con sus sumas externas, listas permitidas estrictas y **12 hashes internos**.
Todas las identidades coinciden con la fuente de desarrollo: Trivy DB SHA256
`04da019ee567fb7389ec7d4ca9c534ea25feae3b377c4579870b30fd98357120`; metadatos SHA256
`193b640a2e0642bb28e900e6e3f64ad83e0382b1b729866caa9c3ec0ca8cd6c3`.

Se comprobaron independientemente digests, builders/importaciones de caché
aislados, árboles fijados, manifiestos y logs de reutilización de base y
reconstrucción de aplicación. El runner verificó hashes completos de caché antes
de cada intervalo; los bytes grandes se omiten, conservando la receta inmutable.

Se reautenticaron criptográficamente **16 bundles únicos de imagen/SBOM/procedencia
nativa/resultados** y sus contratos de digest/contenido, incluida la identidad
alojada y fuente exactas. Pasaron las tres verificaciones frescas del registro G,
esquema SBOM, recibos de análisis, asociaciones del informe y hashes firmados.
Las doce firmas de imagen/SBOM/resultados se completaron en el primer intento.

También pasaron disponibilidad y rechazo atribuible de repositorio de su sonda,
NotFound original, UID/generación/campos nuevos en CREATE, rollout/digests de Pods
Ready, HTTP de salud/versión/cotización, extremos monotónicos y limpieza de
cargas/credenciales/infraestructura. La revisión no repitió escaneos. Estas
entregas legítimas no acreditan la ejecución del catálogo de veinte escenarios.

## Desarrollo y fallos conservados

En [desarrollo GR 36927943550, job 110589806005](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36927943550/job/110589806005),
**Native provenance for first arm G terminó correctamente**. El paso de la segunda
posición se omitió correctamente porque ese brazo era R. Los pares piloto 1–2
repiten ese comportamiento; los pares 3–4 emiten correctamente la procedencia
nativa en segunda posición.

Desarrollo [RG 36926824792](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36926824792)
y GR 36927943550 superaron la revisión: 70 hashes externos/407 internos,
identidades de base y ocho bundles autenticados. Sus jobs consumieron 5.650/5.983
minutos. Ambos quedan fuera de los denominadores y totales piloto.

El [fallo de desarrollo 36924958484](https://github.com/tfm-goldenpath/golden-path-lab/actions/runs/36924958484)
sigue indeterminado en su fuente original: falló la preparación de caché antes de
ambos intervalos. Se conservan ZIP/logs originales y revisión de 20 hashes externos
y 42 internos. La primera solicitud de lanzamiento piloto recibió HTTP 403 sin
crear un job; la autenticación de usuario guardada resolvió el acceso. No fue una
ejecución del workflow ni un reintento completo. No se descartó ninguna observación
por ser lenta.

## Recomendación de campaña y aceptación pendiente

**Mantener provisionales los diez pares balanceados de campaña.** Siguen siendo
razonables para una comparación temporal exploratoria: la diferencia pareada
mediana es 55.339 segundos, pero el rango 44.494–62.124 respalda obtener más
observaciones. Variaron las duraciones registradas de verificación, autorización
de resultados y admisión G; la evidencia no identifica una causa externa concreta.
Dos observaciones por orden no permiten resolver un efecto del orden ni la
precisión de una estimación futura.

Extrapolar el rango de jobs observado da aproximadamente **52.5–58.3 minutos de
job para diez ejecuciones temporales equivalentes**. Es una estimación de
planificación sin garantía para ejecuciones futuras; excluye calibración manual,
trabajo de escenarios y revisión. El número final y la precisión requerida
necesitan una decisión humana. No se ejecutó campaña.

Completar esta serie automatizada **no cierra el piloto global**. La calibración
de tareas manuales, revisión de preparación de escenarios y aceptación humana
siguen siendo requisitos separados y pendientes.

## Conservación y contribución

La carpeta ignorada `implementacion/evidence/measurements/pilot-review/` contiene
siete ZIP originales, originales extraídos, metadatos/logs y copias separadas en
`analysis/`. Resultados conjuntos: `pilot-analysis.json`, `pilot-observations.csv`
y `series-review.json`. `README.txt` y `DOWNLOAD-SHA256SUMS.txt` apoyan la entrega.
**La conservación fuera de Codespaces espera la descarga del usuario.** Los
artefactos de desarrollo caducan el 2026-10-31; los piloto, el 2026-11-01.

| Actividad | Asistencia | Revisión humana | Decisión | Evidencia |
|---|---|---|---|---|
| Auditoría de desarrollo, cuatro lanzamientos secuenciales autorizados, revisión de evidencias, desglose por fases e informe EN/ES | OpenAI Codex / GPT-6 | Pendiente | Serie temporal completa; piloto global y número de campaña pendientes | Ejecuciones enlazadas; JSON locales de revisión, registros de lanzamiento y análisis conjunto |

La rama de documentación es `docs/paired-rg-pilot-review`. Los cambios de controles
de producción, versiones, contenido de la base de datos o instrumentación requieren
una revisión posterior separada y su verificación correspondiente.
